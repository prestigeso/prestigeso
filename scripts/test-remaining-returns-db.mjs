// Explicit, isolated PostgreSQL integration tests. Never accepts a production connection string.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import path from "node:path";
if (process.env.PHASE0_DB_TESTS !== "1") throw new Error("Set PHASE0_DB_TESTS=1 for the isolated localhost:55432/prestigeso_phase0 database.");
const binary = path.resolve("tmp/phase0-postgres/runtime/pgsql/bin/psql.exe");
const args = ["-h","127.0.0.1","-p","55432","-U","postgres","-d","prestigeso_phase0","-X","-qAt","-v","ON_ERROR_STOP=1"];
const sql = (text) => new Promise((resolve,reject) => {
  // stdin avoids Windows argv's legacy ANSI conversion of Turkish status strings.
  const child = execFile(binary,[...args,"-f","-"],{
    timeout: 15_000,maxBuffer: 1024*1024,env:{ ...process.env, PGCLIENTENCODING:"UTF8" },
  },(error,stdout,stderr)=> {
    if(error) { error.stderr=stderr; reject(error); } else resolve(stdout.trim());
  });
  child.stdin.end(text,"utf8");
});
const uid = "92000000-0000-4000-8000-000000000001";
const cleanup = `delete from public.return_inventory_releases where return_request_id in(select id from public.return_requests where order_id between 9200001 and 9200004);
delete from public.return_requests where order_id between 9200001 and 9200004;
delete from public.orders where id between 9200001 and 9200004;
delete from public.inventory_movements where product_id=9200001;
delete from public.products where id=9200001; delete from public.customers where id='${uid}'; delete from auth.users where id='${uid}';`;
await sql(`begin; ${cleanup}
insert into auth.users(id,email) values('${uid}','concurrency-fixture@example.invalid');
insert into public.products(id,"SKU",name,price,stock) overriding system value values(9200001,'RETURN-RACE-ONLY','Synthetic concurrent return',10,0);
insert into public.orders(id,order_no,merchant_oid,user_id,user_email,items,total_amount,paytr_total_amount,shipping_address,status,payment_status,delivered_at,stock_reserved_at)
overriding system value select id,'RETURNRACE'||id,'RETURNRACE'||id,'${uid}','concurrency-fixture@example.invalid','[{"id":9200001,"quantity":2,"price":10}]',20,2000,'{}','Teslim Edildi','paid',now()-interval '1 day',now()-interval '2 days' from generate_series(9200001,9200004) id; commit;`);
const create = (id) => `select public.create_return_request_with_evidence(${id},'${uid}','Concurrent fixture reason','[{"id":9200001,"quantity":1}]','{}')`;
const held = (statement) => `begin; ${statement}; select pg_sleep(0.4); commit;`;
try {
  const creations = await Promise.allSettled([sql(held(create(9200001))),sql(held(create(9200001)))]);
  assert.equal(creations.filter((r)=>r.status==="fulfilled").length,1);
  const rejected = creations.find((r)=>r.status==="rejected");
  assert.match(rejected.reason.stderr,/ORDER_NOT_RETURNABLE/);
  assert.equal(await sql("select count(*) from public.return_requests where order_id=9200001"),"1");
  assert.equal(await sql("select reserved||':'||remaining from public.get_order_return_lines(9200001)"),"1:1");
  console.log("PASS: competing same-unit requests serialize to one active reservation");

  const rid = Number(await sql("select id from public.return_requests where order_id=9200001"));
  await sql(`select public.decide_return_request(${rid},'approve',now())`);
  const claim = `select public.claim_order_refund(9200001,now(),'paid','İade Talebi',20,0,${rid},10)`;
  const claims = await Promise.all([sql(held(claim)),sql(held(claim))]);
  assert.equal(claims.filter((v)=>v.trim()==="t").length,1);
  assert.equal(claims.filter((v)=>v.trim()==="f").length,1);
  console.log("PASS: competing financial claims authorize one provider attempt");

  await sql("update public.orders set refunded_amount=10,payment_status='partially_refunded',status='Kısmi İade' where id=9200001");
  const stocks = await Promise.all([sql(held(`select public.release_return_request_stock(${rid})`)),sql(held(`select public.release_return_request_stock(${rid})`))]);
  assert.equal(stocks.filter((v)=>v.trim()==="t").length,1);
  assert.equal(stocks.filter((v)=>v.trim()==="f").length,1);
  assert.equal(await sql("select stock from public.products where id=9200001"),"1");
  console.log("PASS: concurrent stock release restores exactly one unit");

  const request2 = Number(await sql(create(9200002)));
  const decisions = await Promise.all([
    sql(held(`select public.decide_return_request(${request2},'approve',now())`)),
    sql(held(`select public.decide_return_request(${request2},'reject',now())`)),
  ]);
  assert.equal(decisions.filter((r)=>r.includes('"id"')).length,1);
  assert.equal(decisions.filter((r)=>r==="").length,1);
  console.log("PASS: approve versus reject race has exactly one winner");

  const wholeVersusLine = await Promise.allSettled([
    sql(held(create(9200003))),
    sql(held("select public.claim_order_refund(9200003,now(),'paid','Teslim Edildi',20,0,null,20)")),
  ]);
  const created = wholeVersusLine[0].status==="fulfilled";
  const fullClaimed = wholeVersusLine[1].status==="fulfilled" && wholeVersusLine[1].value.trim()==="t";
  assert.notEqual(created,fullClaimed);
  console.log("PASS: whole-order refund and customer line reservation cannot both win");
} finally {
  await sql(`begin; ${cleanup} commit;`);
}
