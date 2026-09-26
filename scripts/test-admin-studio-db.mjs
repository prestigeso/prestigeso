// Only a new synthetic database on the loopback test cluster. No production credentials.
import {execFile} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
if(process.env.PHASE0_DB_TESTS!=='1')throw Error('Set PHASE0_DB_TESTS=1 for the local synthetic cluster');
const bin=resolve('tmp/phase0-postgres/runtime/pgsql/bin/psql.exe');
const query=(db,input)=>new Promise((ok,fail)=>{
 const child=execFile(bin,['-X','-qAt','-h','127.0.0.1','-p','55432','-U','postgres','-d',db,'-v','ON_ERROR_STOP=1','-f','-'],{timeout:15000,env:{...process.env,PGCLIENTENCODING:'UTF8'}},(error,out,err)=>error?fail(Error(err)):ok(out.trim()));
 child.stdin.end(input,'utf8');
});
const db=`prestigeso_studio_${Date.now()}`;
await query('postgres',`create database ${db} template template0 encoding 'UTF8';`);
await query(db,`create table public.orders(id bigint generated always as identity,user_id uuid,user_email text,paid_at timestamptz,payment_status text);
insert into orders(user_id,user_email,paid_at,payment_status) values
('00000000-0000-0000-0000-000000000001','member@example.invalid',now()-interval '100 days','paid'),
('00000000-0000-0000-0000-000000000001','member@example.invalid',now()-interval '1 day','paid'),
(null,' Guest@example.invalid ',now()-interval '1 hour','paid'),
(null,'guest@example.invalid',now()-interval '30 minutes','paid'),
(null,'pending@example.invalid',null,'pending'),
(null,'refund@example.invalid',now()-interval '10 days','refunded');`);
const migration=await readFile('supabase/migrations/20260921120000_admin_studio_customer_growth.sql','utf8');
await query(db,migration);await query(db,migration);
const report=JSON.parse(await query(db,"select public.admin_customer_growth('28d');"));
assert.equal(report.total,3);assert.equal(report.newCustomers,2);
assert.equal(report.series.reduce((n,row)=>n+row.value,0),2);
const short=JSON.parse(await query(db,"select public.admin_customer_growth('48h');"));
assert.equal(short.newCustomers,1);
assert.equal(await query(db,"select has_function_privilege('anon','public.admin_customer_growth(text)','execute');"),'f');
assert.equal(await query(db,"select has_function_privilege('authenticated','public.admin_customer_growth(text)','execute');"),'f');
assert.equal(await query(db,"select has_function_privilege('service_role','public.admin_customer_growth(text)','execute');"),'t');
await assert.rejects(()=>query(db,"select public.admin_customer_growth('bad');"));
console.log(`PASS: customer aggregation, repeated migration, period validation and role grants. Synthetic database retained: ${db}`);
