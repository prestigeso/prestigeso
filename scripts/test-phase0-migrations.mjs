// Reproducible, destructive-operation-free migration/upgrade/restore rehearsal.
// All databases are new, uniquely named, synthetic and pinned to local PostgreSQL.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
if(process.env.PHASE0_DB_TESTS!=="1") throw new Error("Set PHASE0_DB_TESTS=1; only localhost:55432 synthetic databases are supported.");
const bin=path.resolve("tmp/phase0-postgres/runtime/pgsql/bin");
const common=["-h","127.0.0.1","-p","55432","-U","postgres"];
const environment={...process.env,PGCLIENTENCODING:"UTF8"};
const run=(name,args,input)=>new Promise((resolve,reject)=>{
  const process=execFile(path.join(bin,`${name}.exe`),args,{env:environment,timeout:120_000,maxBuffer:8*1024*1024},(error,stdout,stderr)=>{
    if(error){error.stderr=stderr;reject(error);}else resolve({stdout:stdout.trim(),stderr:stderr.trim()});
  });
  if(input!==undefined) process.stdin.end(input,"utf8");
});
const sql=async(db,input)=>(await run("psql",[...common,"-X","-qAt","-d",db,"-v","ON_ERROR_STOP=1","-f","-"],input)).stdout;
const migrations=(await readdir("supabase/migrations")).filter(name=>/^\d+.*\.sql$/.test(name)).sort();
const sources=new Map(await Promise.all(migrations.map(async name=>[name,await readFile(path.join("supabase/migrations",name),"utf8")])));
const id=new Date().toISOString().replace(/\D/g,"").slice(0,17);
const create=async(label)=>{
  const database=`prestigeso_phase0_${label}_${id}`;
  // No DROP DATABASE; refuse to touch a database if a matching run already exists.
  assert.equal(await sql("postgres",`select count(*) from pg_database where datname='${database}'`),"0");
  await sql("postgres",`create database ${database} template template0 encoding 'UTF8'`);
  return database;
};
const apply=async(database,name)=>{
  await sql(database,sources.get(name));
  console.log(`PASS migration ${database}: ${name}`);
};
const suites=["tests/db/remaining-returns.sql","supabase/tests/payment_recovery_outbox_test.sql","supabase/tests/admin_operation_audit_test.sql","tests/sql/catalog-pricing.sql"];
const checkSuites=async(database)=>{
  for(const file of suites){
    const result=await run("psql",[...common,"-X","-qAt","-d",database,"-v","ON_ERROR_STOP=1","-f","-"],await readFile(file,"utf8"));
    console.log(`PASS behavior ${database}: ${file}`);
    if(result.stderr) console.log(result.stderr.split(/\r?\n/).filter(line=>line.includes("PASS:")).join("\n"));
  }
};
const signature=async(database)=>JSON.parse(await sql(database,`select json_build_object(
 'tables',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p')),
 'views',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='v'),
 'functions',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'),
 'rls_tables',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p') and c.relrowsecurity),
 'policies',(select count(*) from pg_policies where schemaname in('public','storage')),
 'fixture_products',(select count(*) from public.products where "SKU" like 'LEGACY-%'),
 'review_images_type',(select data_type from information_schema.columns where table_schema='public' and table_name='reviews' and column_name='images'),
 'product_images_type',(select data_type from information_schema.columns where table_schema='public' and table_name='products' and column_name='images'))`));
const report={fresh:null,legacy:null,restored:null,migrations:migrations.length,reapplied:0,suites:[],backup:null};
const fresh=await create("fresh");report.fresh={database:fresh};
await sql(fresh,await readFile("tests/fixtures/supabase-bootstrap.sql","utf8"));
for(const name of migrations) await apply(fresh,name);
for(const name of migrations.filter(name=>name.startsWith("20260906"))){await apply(fresh,name);report.reapplied++;}
await checkSuites(fresh);report.suites.push({database:fresh,count:suites.length});
report.fresh.signature=await signature(fresh);

const legacy=await create("legacy");report.legacy={database:legacy};
await sql(legacy,await readFile("tests/fixtures/supabase-bootstrap.sql","utf8"));
for(const name of migrations){
  if(name==="20260714100000_security_and_operations.sql"){
    await sql(legacy,await readFile("tests/fixtures/legacy-commerce-types.sql","utf8"));
    await sql(legacy,"update public.products set price='not-a-price' where id=9300002");
    let rejected=false;
    try {await sql(legacy,`begin;\n${sources.get(name)}\nrollback;`);}
    catch(error){assert.match(error.stderr,/products.price contains 1 non-numeric/);rejected=true;}
    assert.equal(rejected,true,"invalid legacy text must fail closed");
    assert.equal(await sql(legacy,"select price from public.products where id=9300002"),"not-a-price");
    await sql(legacy,"update public.products set price='1000.00' where id=9300002");
    console.log("PASS legacy malformed text rejected transactionally without data loss");
  }
  await apply(legacy,name);
}
assert.equal(await sql(legacy,"select price||':'||discount_price from public.products where id=9300001"),"1000.50:900.25");
assert.equal(await sql(legacy,"select discount_price from public.products where id=9300002"),"0.00");
assert.equal(await sql(legacy,"select discount_value from public.coupons where code='LEGACYFIXTURE'"),"10.50");
assert.equal(await sql(legacy,"select effective_price from public.products_public_catalog where id=9300001"),"900.25");
assert.equal(await sql(legacy,"select jsonb_array_length(to_jsonb(images)) from public.public_product_reviews where product_id=9300001"),"1");
for(const name of migrations.filter(name=>name.startsWith("20260906"))) await apply(legacy,name);
await checkSuites(legacy);report.suites.push({database:legacy,count:suites.length});
report.legacy.signature=await signature(legacy);
assert.equal(report.legacy.signature.product_images_type,"ARRAY");
assert.equal(report.legacy.signature.review_images_type,"ARRAY");

const backup=path.resolve(`tmp/phase0-postgres/synthetic-backup-${id}.dump`);
await run("pg_dump",[...common,"-d",legacy,"-Fc","--file",backup]);
const restored=await create("restored");
await run("pg_restore",[...common,"-d",restored,"--exit-on-error",backup]);
report.backup=backup;report.restored={database:restored,signature:await signature(restored)};
assert.deepEqual(report.restored.signature,report.legacy.signature,"restored schema/roles/RLS/fixture data signature must match source");
await checkSuites(restored);report.suites.push({database:restored,count:suites.length});
assert.equal(await sql(restored,"select price||':'||discount_price from public.products where id=9300001"),"1000.50:900.25");
assert.equal(await sql(restored,"select has_function_privilege('authenticated','public.claim_order_refund(bigint,timestamptz,text,text,numeric,numeric,bigint,numeric)','EXECUTE')"),"f");
console.log("PASS synthetic pg_dump/pg_restore: schema, RLS, function permissions, legacy data and all behavioral suites match");
console.log(JSON.stringify(report,null,2));
