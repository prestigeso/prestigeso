import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

function harness(options: { authorized?: boolean; update?: "success" | "zero" | "error" | "transport" } = {}) {
  const calls = { provider:0,updates:0,logs:0 };
  const query = {
    select() { return this; },eq() { return this; },
    async single() { return {data:{id:42,merchant_oid:"FIXTURE42",total_amount:100,refunded_amount:10},error:null}; },
    update() { calls.updates++; return this; },
    async maybeSingle() {
      if(options.update==="transport") throw new Error("token=private-db-secret");
      return {data:options.update==="zero" || options.update==="error" ? null : {id:42},error:options.update==="error" ? {message:"sensitive-db-detail"} : null};
    },
  };
  const stubs: Record<string,unknown> = {
    "next/server":{NextResponse:{json:(body: unknown,init?: ResponseInit)=>Response.json(body,init)}},
    "@/lib/adminRequest":{isAdminRequest:async()=>options.authorized!==false},
    "@/lib/supabaseAdmin":{supabaseAdmin:{from:()=>query}},
    "@/lib/paytr/queryStatus":{
      queryPaytrStatus:async()=>{calls.provider++;return {synthetic:true};},
      comparePaytrStatus:()=>({status:"matched",detail:{localAmount:100,localRefundedAmount:10}}),
    },
    "@/lib/logger":{logServerEvent:()=>{calls.logs++;}},
  };
  const code=ts.transpileModule(readFileSync(new URL("../app/api/admin/reconciliation/route.ts",import.meta.url),"utf8"),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText;
  const loaded={exports:{} as {POST:(req:Request)=>Promise<Response>}};
  new Function("require","module","exports",code)((name:string)=>{
    if(!(name in stubs)) throw new Error(`Unexpected dependency ${name}`);
    return stubs[name];
  },loaded,loaded.exports);
  return {calls,post:()=>loaded.exports.POST(new Request("https://localhost/api/admin/reconciliation",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:42}),
  }))};
}

test("reconciliation succeeds only after its comparison is durably recorded",async()=>{
  const h=harness();const response=await h.post();
  assert.equal(response.status,200);assert.equal((await response.json()).status,"matched");
  assert.equal(h.calls.provider,1);assert.equal(h.calls.updates,1);
});

for(const update of ["zero","error","transport"] as const) {
  test(`reconciliation ${update} cannot claim a stored match or expose DB details`,async()=>{
    const h=harness({update});const response=await h.post();
    assert.ok(response.status>=500);
    const text=await response.text();
    assert.ok(!text.includes('"status":"matched"'));
    assert.ok(!/private-db-secret|sensitive-db-detail/.test(text));
    assert.equal(h.calls.logs,1);
  });
}

test("unauthorized reconciliation makes no provider call or DB mutation",async()=>{
  const h=harness({authorized:false});assert.equal((await h.post()).status,401);
  assert.equal(h.calls.provider,0);assert.equal(h.calls.updates,0);
});
