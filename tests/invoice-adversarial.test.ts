import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import ts from "typescript";
import { limitedFormData, PayloadTooLarge } from "../lib/http/limitedFormData.ts";
import { getOrderRecipient, type EmailOrder } from "../lib/email/orderRecipient.ts";

type EventInput = { eventKey: string; recipient: string; subject: string; attachments: Array<{ filename: string; content: string }> };
const saved: EmailOrder = { id: 42,order_no:"PRS-INVOICE-42",user_email:"Customer@Example.Invalid",shipping_address:{firstName:"Saved",lastName:"Customer"},payment_status:"paid",status:"Teslim Edildi" };

/** Execute the production route with an allowlisted dependency boundary; no DB/email/network can escape. */
function invoiceHarness(options: { authorized?: boolean; order?: EmailOrder | null; dbError?: boolean; delivery?: string; throwDispatch?: boolean; eventStatus?: string; route?: "delivered" } = {}) {
  const calls = { db: 0, queued: [] as EventInput[], rendered: [] as Record<string, unknown>[], dispatched: 0 };
  const query = { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: options.order === undefined ? saved : options.order,error: options.dbError ? {message:"sensitive database internals"} : null }; } };
  const stubs: Record<string,unknown> = {
    "next/server": { NextResponse: { json: (body: unknown,init?: ResponseInit) => Response.json(body,init) } },
    "node:crypto": { createHash },
    "react": { createElement: (_component: unknown,props: Record<string, unknown>) => props },
    "@react-email/render": { render: async (props: Record<string,unknown>) => { calls.rendered.push(props); return "<html>synthetic rendered email</html>"; } },
    "@/lib/adminRequest": { isAdminRequest: async () => options.authorized !== false },
    "@/lib/supabaseAdmin": { supabaseAdmin: { from: () => { calls.db++; return query; } } },
    "@/components/emails/InvoiceEmail": { InvoiceEmail: () => null },
    "@/components/emails/OrderDelivered": { OrderDelivered: () => null },
    "@/lib/email/orderRecipient": { getOrderRecipient },
    "@/lib/email/transactionalOutbox": {
      enqueueTransactionEmail: async (input: EventInput) => { calls.queued.push(input); return { id:"fixture-event",status:options.eventStatus || "pending" }; },
      dispatchTransactionEmail: async () => { calls.dispatched++; if(options.throwDispatch) throw new Error("network outcome unknown"); return {status:options.delivery || "sent"}; },
    },
    "@/lib/http/limitedFormData": { limitedFormData,PayloadTooLarge },
    "@/lib/logger": { logServerEvent: () => undefined },
  };
  const source = readFileSync(new URL(options.route === "delivered" ? "../app/api/admin/orders/send-email/route.ts" : "../app/api/admin/orders/invoice/route.ts",import.meta.url),"utf8");
  const code = ts.transpileModule(source,{ compilerOptions:{ module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} as { POST: (request: Request) => Promise<Response> } };
  new Function("require","module","exports",code)((name: string) => {
    if(!(name in stubs)) throw new Error(`Unexpected dependency must be stubbed: ${name}`);
    return stubs[name];
  },loaded,loaded.exports);
  return { post:loaded.exports.POST,calls };
}

function request(values: { orderId?: string; confirmed?: string; contents?: string | Uint8Array; mime?: string; extra?: Record<string,string> } = {}) {
  const form = new FormData();
  form.set("orderId",values.orderId ?? "42");
  form.set("confirmedOrderNo",values.confirmed ?? "PRS-INVOICE-42");
  const contents = values.contents instanceof Uint8Array ? new Uint8Array(values.contents).buffer : values.contents ?? "%PDF-1.7\nSynthetic test fixture";
  form.set("invoice",new File([contents],"untrusted-name.pdf",{type:values.mime ?? "application/pdf"}));
  for(const [key,value] of Object.entries(values.extra || {})) form.set(key,value);
  return new Request("https://localhost/api/admin/orders/invoice",{method:"POST",body:form});
}

test("invoice recipient and display name come from the saved order, not forged form fields",async () => {
  const h = invoiceHarness();
  const result = await h.post(request({extra:{ email:"attacker@example.invalid",customerName:"Injected customer",orderNumber:"WRONG-ORDER" }}));
  assert.equal(result.status,200);
  assert.equal(h.calls.queued[0].recipient,"customer@example.invalid");
  assert.equal(h.calls.rendered[0].customerName,"Saved Customer");
  assert.equal(h.calls.rendered[0].orderId,"PRS-INVOICE-42");
  assert.equal(h.calls.queued[0].attachments[0].filename,"fatura-42.pdf");
  assert.ok(!JSON.stringify(h.calls).includes("attacker@example.invalid"));
});

test("unauthenticated invoice upload never reads the order or enqueues mail",async () => {
  const h = invoiceHarness({authorized:false});
  assert.equal((await h.post(request())).status,401);
  assert.equal(h.calls.db,0);
  assert.equal(h.calls.queued.length,0);
});

test("mismatched human-confirmed order number cannot enqueue or dispatch",async () => {
  const h = invoiceHarness();
  assert.equal((await h.post(request({confirmed:"PRS-OTHER-CUSTOMER"}))).status,409);
  assert.equal(h.calls.queued.length,0);
  assert.equal(h.calls.dispatched,0);
});

for(const id of ["0","-1","1.2","true","1;DROP TABLE orders","9007199254740993",""]) {
  test(`invalid invoice order id ${JSON.stringify(id)} fails before DB`,async () => {
    const h = invoiceHarness();
    assert.equal((await h.post(request({orderId:id}))).status,400);
    assert.equal(h.calls.db,0);
    assert.equal(h.calls.queued.length,0);
  });
}

for(const [description,values] of [
  ["wrong MIME",{mime:"text/html"}],
  ["HTML with PDF MIME",{contents:"<html><script>alert(1)</script></html>"}],
  ["empty PDF",{contents:""}],
  ["over 10MB file",{contents:new Uint8Array(10*1024*1024+1)}],
] as const) {
  test(`invalid invoice ${description} never reaches DB`,async () => {
    const h = invoiceHarness();
    assert.equal((await h.post(request(values))).status,400);
    assert.equal(h.calls.db,0);
    assert.equal(h.calls.queued.length,0);
  });
}

for(const status of ["pending","failed","unknown"]) {
  test(`invoice for ${status} payment cannot be sent`,async () => {
    const h = invoiceHarness({order:{...saved,payment_status:status}});
    assert.equal((await h.post(request())).status,409);
    assert.equal(h.calls.queued.length,0);
  });
}

test("missing order and lookup failure do not leak internal details or enqueue mail",async () => {
  const missing = invoiceHarness({order:null});
  assert.equal((await missing.post(request())).status,404);
  const unavailable = invoiceHarness({dbError:true});
  const response = await unavailable.post(request());
  assert.equal(response.status,500);
  assert.ok(!(await response.text()).includes("sensitive database"));
  assert.equal(unavailable.calls.queued.length,0);
});

test("same PDF generates same event key; changed PDF gets another key",async () => {
  const h = invoiceHarness();
  await h.post(request()); await h.post(request());
  await h.post(request({contents:"%PDF-1.7\nCorrected invoice fixture"}));
  assert.equal(h.calls.queued[0].eventKey,h.calls.queued[1].eventKey);
  assert.notEqual(h.calls.queued[0].eventKey,h.calls.queued[2].eventKey);
  assert.match(h.calls.queued[0].eventKey,/^invoice:[0-9a-f]{64}$/);
});

for(const delivery of ["unknown","failed","pending"]) {
  test(`durable invoice ${delivery} returns 202 and does not claim sent`,async () => {
    const h = invoiceHarness({delivery});
    const response = await h.post(request());
    assert.equal(response.status,202);
    assert.equal((await response.json()).deliveryStatus,delivery);
  });
}

test("lost dispatch response is unknown, while already sent event is never redispatched",async () => {
  const lost = invoiceHarness({throwDispatch:true});
  const response = await lost.post(request());
  assert.equal(response.status,202);
  assert.equal((await response.json()).deliveryStatus,"unknown");
  const sent = invoiceHarness({eventStatus:"sent"});
  assert.equal((await sent.post(request())).status,200);
  assert.equal(sent.calls.dispatched,0);
});

test("saved recipient parser rejects newline/header injection and malformed addresses",() => {
  for(const email of ["bad", "victim@example.invalid\r\nBcc: other@example.invalid", "a b@example.invalid"]) {
    assert.throws(()=>getOrderRecipient({...saved,user_email:email}));
  }
  assert.throws(()=>getOrderRecipient({...saved,order_no:"PRS\r\nInjected header"}));
  assert.equal(getOrderRecipient({...saved,shipping_address:"invalid-json"}).customerName,"Müşterimiz");
});

test("bounded multipart parser aborts oversized chunked stream without trusting content-length",async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) { controller.enqueue(new Uint8Array(1024)); },
    cancel() { cancelled = true; },
  });
  const init = { method:"POST",body,duplex:"half",headers:{"content-type":"multipart/form-data; boundary=fixture"} };
  await assert.rejects(limitedFormData(new Request("https://localhost/upload",init),1500),PayloadTooLarge);
  assert.equal(cancelled,true);
});

test("bounded multipart parser rejects oversized declared length and malformed multipart",async () => {
  const oversized = new Request("https://localhost/upload",{method:"POST",body:"x",headers:{"content-length":"999999"}});
  await assert.rejects(limitedFormData(oversized,100),PayloadTooLarge);
  const malformed = new Request("https://localhost/upload",{method:"POST",body:"not multipart",headers:{"content-type":"multipart/form-data; boundary=missing"}});
  await assert.rejects(limitedFormData(malformed,100));
});

const deliveryRequest = (body: unknown = { orderId:42,type:"delivered" }) => new Request("https://localhost/api/admin/orders/send-email",{
  method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),
});

test("delivery email ignores forged recipients/name/event type and uses saved delivery state",async () => {
  const h = invoiceHarness({route:"delivered"});
  const response = await h.post(deliveryRequest({orderId:42,type:"delivered",email:"attacker@example.invalid",customerName:"forged",eventKey:"invoice:forged"}));
  assert.equal(response.status,200);
  assert.equal(h.calls.queued[0].recipient,"customer@example.invalid");
  assert.equal(h.calls.queued[0].eventKey,"order_delivered");
  assert.equal(h.calls.rendered[0].customerName,"Saved Customer");
});

test("delivery email authentication runs before any order lookup",async () => {
  const h = invoiceHarness({route:"delivered",authorized:false});
  assert.equal((await h.post(deliveryRequest())).status,401);
  assert.equal(h.calls.db,0);
  assert.equal(h.calls.queued.length,0);
});

for(const [status,payment] of [["Kargolandı","paid"],["Stok Yetersiz","paid"],["Teslim Edildi","pending"],["İade Edildi","refunded"]]) {
  test(`delivery notice rejects ${status}/${payment} without an email event`,async () => {
    const h = invoiceHarness({route:"delivered",order:{...saved,status,payment_status:payment}});
    assert.equal((await h.post(deliveryRequest())).status,409);
    assert.equal(h.calls.queued.length,0);
  });
}

test("delivery email invalid ID, wrong action and null input cannot enqueue",async () => {
  for(const body of [null,{orderId:-1,type:"delivered"},{orderId:"42;DROP TABLE orders",type:"delivered"},{orderId:42,type:"arbitrary_html",html:"forged"}]) {
    const h = invoiceHarness({route:"delivered"});
    assert.equal((await h.post(deliveryRequest(body))).status,400);
    assert.equal(h.calls.db,0);
    assert.equal(h.calls.queued.length,0);
  }
});

for(const delivery of ["unknown","not_configured","not_claimed"]) {
  test(`delivery email ${delivery} remains an accepted queue event, not sent`,async () => {
    const h = invoiceHarness({route:"delivered",delivery});
    const response = await h.post(deliveryRequest());
    assert.equal(response.status,202);
    assert.equal((await response.json()).deliveryStatus,delivery);
  });
}

test("delivery retry uses the same event key and already-sent mail is not dispatched again",async () => {
  const h = invoiceHarness({route:"delivered",eventStatus:"sent"});
  await h.post(deliveryRequest()); await h.post(deliveryRequest());
  assert.equal(h.calls.queued[0].eventKey,h.calls.queued[1].eventKey);
  assert.equal(h.calls.dispatched,0);
});
