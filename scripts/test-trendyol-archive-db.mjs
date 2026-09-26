import {execFile} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
if(process.env.PHASE0_DB_TESTS!=='1')throw Error('Synthetic local database only');
const query=(db,input)=>new Promise((ok,fail)=>{const p=execFile(resolve('tmp/phase0-postgres/runtime/pgsql/bin/psql.exe'),['-X','-qAt','-h','127.0.0.1','-p','55432','-U','postgres','-d',db,'-v','ON_ERROR_STOP=1','-f','-'],{timeout:15000,env:{...process.env,PGCLIENTENCODING:'UTF8'}},(e,o,s)=>e?fail(Error(s)):ok(o.trim()));p.stdin.end(input,'utf8');});
const db=`prestigeso_archive_${Date.now()}`;
await query('postgres',`create database ${db} template template0 encoding 'UTF8';`);
for(const file of ['20260919160000_phase2_provider_preparation.sql','20260923220000_trendyol_auto_archive.sql','20260923220000_trendyol_auto_archive.sql'])await query(db,await readFile(`supabase/migrations/${file}`,'utf8'));
const now=Date.now(),job=await query(db,`select trendyol_auto_job('123','stage',${now});`);
assert.equal(await query(db,`select trendyol_auto_job('123','stage',${now+1000});`),job);
const payload=JSON.stringify([{packageId:'42',orderNumber:'1234',orderDate:now,modifiedAt:now,lines:[],schemaVersion:2,amount:100}]);
await query(db,`select trendyol_apply_sync_page('${job}',0,'${payload}',null,false);`);
assert.equal(await query(db,'select count(*) from trendyol_package_mirror;'),'1');
await assert.rejects(()=>query(db,`select trendyol_apply_sync_page('${job}',0,'${payload}',null,false);`));
const next=await query(db,`select trendyol_auto_job('123','stage',${now+1000});`);
assert.notEqual(next,job);
await query(db,`select trendyol_apply_sync_page('${next}',0,'${payload}',null,false);`);
assert.equal(await query(db,'select count(*) from trendyol_package_mirror;'),'1');
assert.equal(await query(db,"select has_table_privilege('anon','trendyol_package_mirror','select');"),'f');
let completed=false;
for(let i=0;i<10;i++){
 const id=await query(db,`select trendyol_auto_job('123','stage',${now+1000});`);
 if(!id){completed=true;break;}
 await query(db,`select trendyol_apply_sync_page('${id}',0,'[]',null,false);`);
}
assert.equal(completed,true,'historical windows must catch up and stop when fresh');
assert.equal(await query(db,"select has_function_privilege('authenticated','trendyol_auto_job(text,text,bigint)','execute');"),'f');
console.log('PASS archive migrations, auto resume, historical continuation, dedupe, stale revisions and restricted permissions: '+db);
