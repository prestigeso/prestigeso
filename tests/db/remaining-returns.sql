-- Run only against the isolated Phase 0 PostgreSQL DB, after the migrations.
-- No external services: financial outcomes are explicit synthetic fixture transitions.
\set ON_ERROR_STOP on
begin;
create function pg_temp.check_true(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'ASSERTION_FAILED: %',label; end if; end $$;
create function pg_temp.must_fail(statement text,pattern text) returns void language plpgsql as $$
begin
  begin execute statement; exception when others then
    if sqlerrm ~ pattern then return; end if; raise;
  end;
  raise exception 'EXPECTED_FAILURE: %',statement;
end $$;
insert into auth.users(id,email) values
  ('91000000-0000-4000-8000-000000000001','return-fixture@example.invalid'),
  ('91000000-0000-4000-8000-000000000002','other-fixture@example.invalid');
insert into public.products(id,"SKU",name,price,stock) overriding system value values
  (9100001,'TEST-RETURN-1','Synthetic return item',1,0),
  (9100002,'TEST-RETURN-2','Synthetic variants',1,0);
insert into public.product_variants(id,product_id,sku,stock) overriding system value values
  (9100101,9100002,'TEST-RETURN-V1',0),(9100102,9100002,'TEST-RETURN-V2',0);
insert into public.orders(id,order_no,merchant_oid,user_id,user_email,items,total_amount,paytr_total_amount,
  shipping_address,status,payment_status,delivered_at,stock_reserved_at)
overriding system value
select id,'RETURNFIX'||id,'RETURNFIX'||id,'91000000-0000-4000-8000-000000000001','return-fixture@example.invalid',
  '[{"id":9100001,"quantity":3,"price":1,"name":"Test item"}]'::jsonb,1,100,'{}','Teslim Edildi','paid',now()-interval '1 day',now()-interval '2 days'
from generate_series(9100001,9100010) id;
update public.orders set items='[{"id":9100002,"variant_id":9100101,"quantity":1,"price":10},{"id":9100002,"variant_id":9100102,"quantity":1,"price":20}]',
  total_amount=27,paytr_total_amount=2700 where id=9100004;

do $$ declare uid uuid := '91000000-0000-4000-8000-000000000001'; rid bigint; next_id bigint;
  outcome jsonb; quote numeric; running_money numeric := 0; i integer; item_json jsonb;
begin
  perform pg_temp.check_true((public.get_return_availability(9100001,uid)->>'eligible')::boolean,'fresh delivered order eligible');
  perform pg_temp.must_fail($q$select public.get_return_availability(9100001,'91000000-0000-4000-8000-000000000002')$q$,'ORDER_NOT_FOUND');
  perform pg_temp.must_fail($q$select public.create_return_request_with_evidence(9100001,'91000000-0000-4000-8000-000000000002','Reason test','[{"id":9100001,"quantity":1}]','{}')$q$,'ORDER_NOT_RETURNABLE');
  -- Three successive returns of equal units: 0.33 + 0.34 + 0.33 = exactly 1.00.
  for i in 1..3 loop
    rid := public.create_return_request_with_evidence(9100001,uid,'Reason test','[{"id":9100001,"quantity":1}]','{}');
    select requested_refund_amount into quote from public.return_requests where id=rid;
    perform pg_temp.check_true(quote=case when i=2 then 0.34 else 0.33 end,'cumulative rounding request '||i);
    perform pg_temp.check_true((select reserved=1 and returned=i-1 and remaining=3-i from public.get_order_return_lines(9100001)),'line conservation before approve');
    perform pg_temp.must_fail($q$select public.create_return_request_with_evidence(9100001,'91000000-0000-4000-8000-000000000001','Reason test','[{"id":9100001,"quantity":1}]','{}')$q$,'ORDER_NOT_RETURNABLE');
    perform pg_temp.check_true(public.claim_order_refund(9100001,now(),case when i=1 then 'paid' else 'partially_refunded' end,'İade Talebi',1,running_money,null,1)=false,'whole-order refund cannot bypass active return');
    outcome := public.decide_return_request(rid,'approve',now(),'Reviewed',null);
    perform pg_temp.check_true((outcome->>'refund_amount')::numeric=quote,'approved authoritative quote');
    perform pg_temp.check_true(public.decide_return_request(rid,'approve',now()) is null,'approval replay refused');
    perform pg_temp.check_true(public.decide_return_request(rid,'reject',now()) is null,'reject cannot undo approved/unknown refund');
    perform pg_temp.check_true(not public.claim_order_refund(9100001,now(),case when i=1 then 'paid' else 'partially_refunded' end,'İade Talebi',1,running_money,rid,0.5),'tampered amount rejected');
    perform pg_temp.check_true(public.claim_order_refund(9100001,now(),case when i=1 then 'paid' else 'partially_refunded' end,'İade Talebi',1,running_money,rid,quote),'approved request acquired order lock');
    perform pg_temp.check_true(not public.claim_order_refund(9100001,now(),case when i=1 then 'paid' else 'partially_refunded' end,'İade Talebi',1,running_money,rid,quote),'order claim replay refused');
    perform pg_temp.must_fail(format('select public.release_return_request_stock(%s)',rid),'RETURN_FINANCIAL_RECONCILIATION_REQUIRED');
    running_money := running_money+quote;
    update public.orders set refunded_amount=running_money,payment_status=case when i=3 then 'refunded' else 'partially_refunded' end,
      status=case when i=3 then 'İade Edildi' else 'Kısmi İade' end where id=9100001;
    perform pg_temp.check_true(public.release_return_request_stock(rid),'verified money restocks selected unit once');
    perform pg_temp.check_true(not public.release_return_request_stock(rid),'stock replay no-op');
    perform pg_temp.check_true((select stock=i from public.products where id=9100001),'stock count conserved');
    perform pg_temp.must_fail('select public.release_order_stock(9100001)','ORDER_HAS_LINE_RETURN_REQUIRES_RECONCILIATION');
    update public.orders set refund_started_at=null,stock_released_at=case when i=3 then now() else null end where id=9100001;
    update public.return_requests set status='completed',refund_amount=quote where id=rid;
  end loop;
  perform pg_temp.check_true(running_money=1,'sum of refunds equals original paid total');
  perform pg_temp.check_true((select remaining=0 and returned=3 and reserved=0 from public.get_order_return_lines(9100001)),'no units remain after last request');
  perform pg_temp.check_true(not (public.get_return_availability(9100001,uid)->>'eligible')::boolean,'fully refunded order cannot start new request');

  -- Rejection releases the reservation and restores the original fulfillment state atomically.
  rid := public.create_return_request_with_evidence(9100002,uid,'Reason test','[{"id":9100001,"quantity":2}]','{}');
  perform public.decide_return_request(rid,'reject',now(),'Rejected');
  perform pg_temp.check_true((select status='Teslim Edildi' from public.orders where id=9100002),'reject restores delivered status');
  perform pg_temp.check_true((select remaining=3 and reserved=0 from public.get_order_return_lines(9100002)),'rejected units reusable');
  next_id := public.create_return_request_with_evidence(9100002,uid,'New reason test','[{"id":9100001,"quantity":3}]','{}');
  perform pg_temp.check_true(next_id<>rid,'history retained with a distinct new request');
  perform pg_temp.must_fail('update public.orders set status=''Kargolandı'' where id=9100002','FINANCIAL_OPERATION_IN_PROGRESS');
  perform pg_temp.check_true((select status='pending' from public.return_requests where id=next_id),'fulfillment guard leaves pending request reserved');
  -- Synthetic inconsistent state checks that a failed rejection is all-or-nothing.
  update public.orders set status='İade Edildi' where id=9100002;
  perform pg_temp.must_fail(format('select public.decide_return_request(%s,''reject'',now())',next_id),'RETURN_FINANCIAL_RECONCILIATION_REQUIRED');
  perform pg_temp.check_true((select status='pending' from public.return_requests where id=next_id),'failed atomic reject never releases units');
  update public.orders set status='İade Talebi' where id=9100002;
  perform public.decide_return_request(next_id,'reject',now());

  -- Untrusted IDs/quantities and variants cannot allocate unsold units.
  for item_json in select value from jsonb_array_elements('[
    [{"id":9100001,"quantity":4}],[{"id":9100002,"quantity":1}],
    [{"id":9100001,"quantity":1,"variant_id":9100101}],
    [{"id":9100001,"quantity":1},{"id":9100001,"quantity":1}],
    [{"id":9100001,"quantity":0.5}],[{"id":9100001,"quantity":-1}],
    [{"id":9100001,"quantity":1000000000}],[{"id":"1; DROP TABLE orders","quantity":1}],
    [{"id":9100001,"quantity":true}],[]]')
  loop
    perform pg_temp.must_fail(format('select public.create_return_request_with_evidence(9100003,%L,''Reason test'',%L::jsonb,''{}'')',uid,item_json::text),'RETURN_(QUANTITY_EXCEEDED|ITEMS_INVALID|ITEMS_DUPLICATED)');
  end loop;
  perform pg_temp.check_true((select count(*)=0 from public.return_requests where order_id=9100003),'invalid claims leave no reservations');
  update public.orders set total_amount=0.01,paytr_total_amount=1 where id=9100003;
  perform pg_temp.must_fail($q$select public.create_return_request_with_evidence(9100003,'91000000-0000-4000-8000-000000000001','Reason test','[{"id":9100001,"quantity":1}]','{}')$q$,'RETURN_AMOUNT_INVALID');
  perform pg_temp.must_fail($q$select public.create_return_request_with_evidence(9100003,'91000000-0000-4000-8000-000000000001','Reason test','[{"id":9100001,"quantity":2}]','{}')$q$,'RETURN_AMOUNT_INVALID');
  rid:=public.create_return_request_with_evidence(9100003,uid,'Reason test','[{"id":9100001,"quantity":3}]','{}');
  perform pg_temp.check_true((select requested_refund_amount=0.01 from public.return_requests where id=rid),'sub-cent items can be returned together without premature full-balance closure');
  perform public.decide_return_request(rid,'reject',now());

  -- Variant1 can be returned, then variant2 at its own historical proportional price.
  rid := public.create_return_request_with_evidence(9100004,uid,'Reason test','[{"id":9100002,"variant_id":9100101,"quantity":1}]','{}');
  outcome:=public.decide_return_request(rid,'approve',now());
  perform pg_temp.check_true((outcome->>'refund_amount')::numeric=9,'discount+shipping paid-total ratio preserved');
  perform public.claim_order_refund(9100004,now(),'paid','İade Talebi',27,0,rid,9);
  update public.orders set refunded_amount=9,payment_status='partially_refunded',status='Kısmi İade' where id=9100004;
  perform public.release_return_request_stock(rid);
  update public.orders set refund_started_at=null where id=9100004;
  update public.return_requests set status='completed',refund_amount=9 where id=rid;
  perform pg_temp.check_true((select stock=1 from public.product_variants where id=9100101),'selected variant restored');
  perform pg_temp.check_true((select stock=0 from public.product_variants where id=9100102),'other variant not restored');
  perform pg_temp.must_fail($q$select public.create_return_request_with_evidence(9100004,'91000000-0000-4000-8000-000000000001','Reason test','[{"id":9100002,"variant_id":9100101,"quantity":1}]','{}')$q$,'RETURN_QUANTITY_EXCEEDED');
  rid := public.create_return_request_with_evidence(9100004,uid,'Reason test','[{"id":9100002,"variant_id":9100102,"quantity":1}]','{}');
  perform pg_temp.check_true((select requested_refund_amount=18 from public.return_requests where id=rid),'last variant exact remaining money');
  perform public.decide_return_request(rid,'reject',now());
  perform pg_temp.check_true((select status='Kısmi İade' from public.orders where id=9100004),'later rejection retains partial-refund state');

  -- Original delivery time is authoritative; requests never start a new 14-day window.
  update public.orders set delivered_at=now()-interval '15 days' where id=9100005;
  update public.orders set delivered_at=now()+interval '1 day' where id=9100006;
  for i in 9100005..9100006 loop
    perform pg_temp.check_true(not (public.get_return_availability(i,uid)->>'eligible')::boolean,'invalid delivery window refused');
    perform pg_temp.must_fail(format('select public.create_return_request_with_evidence(%s,%L,''Reason test'',''[{"id":9100001,"quantity":1}]'',''{}'')',i,uid),'ORDER_NOT_RETURNABLE');
  end loop;
  update public.orders set refunded_amount=0.01,payment_status='partially_refunded' where id=9100007;
  perform pg_temp.must_fail($q$select public.create_return_request_with_evidence(9100007,'91000000-0000-4000-8000-000000000001','Reason test','[{"id":9100001,"quantity":1}]','{}')$q$,'RETURN_FINANCIAL_RECONCILIATION_REQUIRED');

  -- Evidence cannot be stolen from a second account or reused after submission.
  perform pg_temp.must_fail($q$select public.reserve_return_evidence_uploads(9100008,'91000000-0000-4000-8000-000000000001',array['returns/91000000-0000-4000-8000-000000000002/9100008/stolen.jpg'])$q$,'RETURN_EVIDENCE_INVALID');
  perform public.reserve_return_evidence_uploads(9100008,uid,array['returns/'||uid||'/9100008/test.jpg']);
  rid := public.create_return_request_with_evidence(9100008,uid,'Reason test','[{"id":9100001,"quantity":1}]',array['returns/'||uid||'/9100008/test.jpg']);
  perform public.decide_return_request(rid,'reject',now());
  perform pg_temp.must_fail(format('select public.create_return_request_with_evidence(9100008,%L,''Reason test'',''[{"id":9100001,"quantity":1}]'',array[%L])',uid,'returns/'||uid||'/9100008/test.jpg'),'RETURN_EVIDENCE_INVALID');
  raise notice 'PASS: sequential cents, quantities, variants, reject rollback, stale/duplicate claims, IDOR, malformed input, delivery window and evidence ownership';
end $$;

-- Seeded property exercise: varying saved prices, discounts/shipping, quantities and return order.
-- Explicit synthetic financial ledger writes below stand in for verified provider outcomes.
do $$ declare uid uuid := '91000000-0000-4000-8000-000000000001'; oid bigint; rid bigint;
  qa integer; qb integer; left_a integer; left_b integer; pa numeric; pb numeric; paid numeric; refunded numeric;
  picked jsonb; quote numeric; requests_count integer := 0;
begin
  perform setseed(0.0619);
  for oid in 9100100..9100199 loop
    qa:=2+floor(random()*5)::integer; qb:=2+floor(random()*5)::integer;
    pa:=round((0.1+random()*50)::numeric,2); pb:=round((0.1+random()*50)::numeric,2);
    paid:=round(((pa*qa+pb*qb)*(0.4+random()*0.59)+random()*10)::numeric,2);
    insert into public.orders(id,order_no,merchant_oid,user_id,user_email,items,total_amount,paytr_total_amount,
      shipping_address,status,payment_status,delivered_at,stock_reserved_at) overriding system value
    values(oid,'RETURNPROPERTY'||oid,'RETURNPROPERTY'||oid,uid,'return-fixture@example.invalid',
      jsonb_build_array(jsonb_build_object('id',9100001,'quantity',qa,'price',pa),jsonb_build_object('id',9100002,'variant_id',9100101,'quantity',qb,'price',pb)),
      paid,(paid*100)::bigint,'{}','Teslim Edildi','paid',now()-interval '1 day',now()-interval '2 days');
    left_a:=qa;left_b:=qb;refunded:=0;
    while left_a+left_b>0 loop
      if left_b=0 or (left_a>0 and random()<0.5) then
        picked:='[{"id":9100001,"quantity":1}]';left_a:=left_a-1;
      else
        picked:='[{"id":9100002,"variant_id":9100101,"quantity":1}]';left_b:=left_b-1;
      end if;
      rid:=public.create_return_request_with_evidence(oid,uid,'Seeded fixture reason',picked,'{}');
      quote:=(public.decide_return_request(rid,'approve',now())->>'refund_amount')::numeric;
      perform pg_temp.check_true(quote>0 and quote=round(quote,2) and refunded+quote<=paid,'seeded proportional refund never exceeds captured cents');
      refunded:=refunded+quote;requests_count:=requests_count+1;
      update public.orders set refunded_amount=refunded,payment_status=case when left_a+left_b=0 then 'refunded' else 'partially_refunded' end,
        status=case when left_a+left_b=0 then 'İade Edildi' else 'Kısmi İade' end where id=oid;
      update public.return_requests set status='completed',refund_amount=quote where id=rid;
    end loop;
    perform pg_temp.check_true(refunded=paid,'seeded completed order exactly conserves paid money');
    perform pg_temp.check_true((select sum(remaining)=0 and sum(returned)=qa+qb and sum(reserved)=0 from public.get_order_return_lines(oid)),'seeded quantities conserved');
  end loop;
  raise notice 'PASS: 100 seeded allocation orders and % sequential partial requests, exact paid cents and unit conservation',requests_count;
end $$;

-- Refunding a late payment that never held stock must not manufacture inventory.
update public.orders set payment_recovery_status='manual_review',status='Stok Yetersiz',stock_reserved_at=null,
  stock_released_at=case when id=9100010 then now()-interval '1 day' else null end where id in(9100009,9100010);
insert into public.payment_recovery_exceptions(order_id,kind,reason_code,confirmed_amount,source)
  select id,'confirmed_payment_fulfillment','synthetic_no_stock',100,'callback' from public.orders where id in(9100009,9100010);
update public.orders set payment_status='refunded',status='İade Edildi',refunded_amount=total_amount,refund_started_at=now()
  where id in(9100009,9100010);
select public.release_order_stock(9100009);
select public.release_order_stock(9100010);
select pg_temp.check_true((select stock=3 from public.products where id=9100001),'unreserved late refunds never inflate stock');
select pg_temp.check_true((select count(*)=2 from public.payment_recovery_exceptions where order_id in(9100009,9100010) and status='resolved'),'fully refunded late payment queue resolved');

-- Public callers cannot invoke server-only return money/stock RPCs.
select pg_temp.check_true(not has_function_privilege('anon','public.claim_order_refund(bigint,timestamptz,text,text,numeric,numeric,bigint,numeric)','EXECUTE'),'anon cannot claim refunds');
select pg_temp.check_true(not has_function_privilege('authenticated','public.get_return_availability(bigint,uuid)','EXECUTE'),'authenticated cannot spoof user-id RPC');
select pg_temp.check_true(not has_function_privilege('authenticated','public.release_return_request_stock(bigint)','EXECUTE'),'authenticated cannot inflate stock');
select pg_temp.check_true(not has_function_privilege('anon','public.quote_order_return(bigint,jsonb,bigint)','EXECUTE'),'internal quote not public');
select pg_temp.check_true(not has_table_privilege('authenticated','public.return_requests','INSERT'),'authenticated cannot bypass atomic reservation');
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
select pg_temp.check_true((select count(*)=0 from public.return_requests where order_id between 9100001 and 9100010),'second customer cannot read first customer returns');
reset role;
rollback;
