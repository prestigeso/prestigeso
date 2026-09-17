// Real two-connection PostgreSQL races. Loopback + explicitly named fixture DB
// only. No HTTP, PayTR, Resend or production environment variables are read.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const db = process.env.PHASE0_DB_NAME || 'prestigeso_phase0';
if (!/^prestigeso_phase0(?:_[a-z0-9]+)*$/.test(db)) throw new Error('Only isolated Phase 0 database names are allowed');
const psql = process.env.PHASE0_PSQL || fileURLToPath(new URL('../tmp/phase0-postgres/runtime/pgsql/bin/psql.exe', import.meta.url));
function sql(statement) {
  return new Promise((resolve, reject) => {
    const child = spawn(psql, ['-X', '-q', '-A', '-t', '-h', '127.0.0.1', '-p', '55432', '-U', 'postgres', '-d', db,
      '-v', 'ON_ERROR_STOP=1', '-c', statement], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = ''; let errors = '';
    child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { errors += chunk; });
    child.on('error', reject); child.on('close', code => code === 0 ? resolve(output.trim()) : reject(new Error(`Fixture SQL failed: ${errors}`)));
  });
}
async function fixture() {
  const merchant = `PHASE0RACE${randomUUID().replaceAll('-', '').toUpperCase()}`;
  const output = await sql(`with p as (
    insert into public.products("SKU",name,price,stock) values('${merchant}','Local concurrency fixture',10,10) returning id
  ), o as (
    insert into public.orders(order_no,merchant_oid,user_email,items,total_amount,paytr_total_amount,shipping_address,status)
    select '${merchant}','${merchant}','local@example.test',jsonb_build_array(jsonb_build_object('id',p.id,'price',10,'quantity',2)),
      20,2000,'{"email":"local@example.test"}',U&'\\00D6deme Bekleniyor' from p returning id
  ) select json_build_object('product',(select id from p),'order',(select id from o));`);
  return { ...JSON.parse(output), merchant };
}
async function snapshot(f) {
  return JSON.parse(await sql(`select json_build_object('stock',(select stock from public.products where id=${f.product}),
    'payment',(select payment_status from public.orders where id=${f.order}),
    'intents',(select count(*) from public.transactional_email_outbox where order_id=${f.order}));`));
}
async function cleanup(f) {
  // These rows were created by this script in the isolated DB, never user rows.
  await sql(`begin;
    delete from public.transactional_email_outbox where order_id=${f.order};
    delete from public.payment_recovery_exceptions where order_id=${f.order};
    do $$ begin if to_regclass('public.order_status_history') is not null then
      execute 'delete from public.order_status_history where order_id=${f.order}'; end if; end $$;
    delete from public.orders where id=${f.order};
    delete from public.inventory_movements where product_id=${f.product};
    delete from public.products where id=${f.product};
    delete from public.admin_operation_audit where (entity_table='orders' and entity_id='${f.order}') or (entity_table='products' and entity_id='${f.product}');
    commit;`);
}

for (const scenario of ['duplicate_success', 'expiry_vs_success']) {
  const f = await fixture();
  try {
    await sql(`select public.reserve_order_stock(${f.order});`);
    if (scenario === 'expiry_vs_success') await sql(`update public.orders set reservation_expires_at=now()-interval '1 minute' where id=${f.order};`);
    const success = `select public.record_verified_paytr_result('${f.merchant}','success',2000);`;
    const contender = scenario === 'duplicate_success' ? success : 'select public.release_expired_stock_reservations();';
    await Promise.all([
      sql(`begin; select id from public.orders where id=${f.order} for update; select pg_sleep(0.25); ${contender} commit;`),
      sql(success),
    ]);
    assert.deepEqual(await snapshot(f), { stock: 8, payment: 'paid', intents: 1 });
    console.log(`PASS real PostgreSQL two-connection ${scenario}: paid, stock=8, exactly one mail intent`);
  } finally { await cleanup(f); }
}
