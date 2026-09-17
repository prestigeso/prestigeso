-- Rollback-only behavioral tests, compatible with real PostgreSQL without pgTAP.
begin;
do $$
declare
  p bigint; o bigint; o2 bigint; o3 bigint; m text; r jsonb; e uuid; claim jsonb; original_stock integer;
begin
  insert into public.products("SKU",name,price,stock) values('PHASE0-PAYMENT-TEST','Payment fixture',10,5) returning id into p;
  insert into public.orders(order_no,merchant_oid,user_email,items,total_amount,paytr_total_amount,shipping_address,status)
  values('PHASE0PAYA','PHASE0PAYA','buyer@example.test',jsonb_build_array(jsonb_build_object('id',p,'price',10,'quantity',2)),
    20,2000,'{"email":"buyer@example.test"}','Ödeme Bekleniyor') returning id into o;
  perform public.reserve_order_stock(o);
  assert (select stock from public.products where id=p)=3, 'initial stock reservation';
  update public.orders set reservation_expires_at=now()-interval '1 minute' where id=o;
  perform public.release_expired_stock_reservations();
  assert (select stock from public.products where id=p)=5, 'expired reservation returned once';
  assert (select payment_status from public.orders where id=o)='failed', 'expiry marks failed';
  r := public.record_verified_paytr_result('PHASE0PAYA','success',2000);
  assert r->>'action'='recovered', 'late signed success reacquires available stock';
  assert (select stock from public.products where id=p)=3, 'recovery reserves only once';
  assert (select payment_status from public.orders where id=o)='paid', 'recovery retains paid receipt';
  e := (r->>'outbox_id')::uuid;
  assert e is not null, 'payment transaction durably enqueues email';
  r := public.record_verified_paytr_result('PHASE0PAYA','success',2000);
  assert (select stock from public.products where id=p)=3, 'duplicate callback does not reserve again';
  assert (select count(*) from public.transactional_email_outbox where order_id=o)=1, 'duplicate callback one email intent';
  perform public.record_verified_paytr_result('PHASE0PAYA','failed',2000);
  assert (select stock from public.products where id=p)=3, 'failed after success cannot return paid inventory';
  assert (select payment_status from public.orders where id=o)='paid', 'failed after success cannot erase receipt';
  begin
    perform public.record_verified_paytr_result('PHASE0PAYA','success',1);
    raise exception 'amount mismatch accepted';
  exception when others then if sqlerrm='amount mismatch accepted' then raise; end if;
  end;
  assert (select stock from public.products where id=p)=3, 'amount mismatch has no stock side effect';

  insert into public.orders(order_no,merchant_oid,user_email,items,total_amount,paytr_total_amount,shipping_address,status)
  values('PHASE0PAYB','PHASE0PAYB','buyer@example.test',jsonb_build_array(jsonb_build_object('id',p,'price',10,'quantity',3)),
    30,3000,'{"email":"buyer@example.test"}','Ödeme Bekleniyor') returning id into o2;
  perform public.reserve_order_stock(o2);
  perform public.record_verified_paytr_result('PHASE0PAYB','failed',3000);
  update public.products set stock=0 where id=p;
  r := public.record_verified_paytr_result('PHASE0PAYB','success',3000);
  assert r->>'action'='manual_review', 'late insufficient stock enters durable exception queue';
  assert (select payment_status from public.orders where id=o2)='paid', 'insufficient stock does not discard money receipt';
  assert (select stock from public.products where id=p)=0, 'insufficient stock never goes negative';
  assert (select count(*) from public.payment_recovery_exceptions where order_id=o2 and status='open')=1, 'one manual exception';
  perform public.record_verified_paytr_result('PHASE0PAYB','success',3000);
  assert (select count(*) from public.payment_recovery_exceptions where order_id=o2)=1, 'exception replay deduped';
  assert (select count(*) from public.transactional_email_outbox where order_id=o2)=0, 'no misleading fulfillment confirmation';
  begin
    update public.orders set status='Kargolandı' where id=o2;
    raise exception 'unresolved fulfillment allowed';
  exception when others then if sqlerrm='unresolved fulfillment allowed' then raise; end if;
  end;
  assert (select status from public.orders where id=o2)='Stok Yetersiz', 'direct SQL shipment transition blocked';

  -- No reservation at all: confirmed money remains visible and no stock invented.
  insert into public.orders(order_no,merchant_oid,user_email,items,total_amount,paytr_total_amount,shipping_address,status)
  values('PHASE0PAYC','PHASE0PAYC','buyer@example.test',jsonb_build_array(jsonb_build_object('id',p,'price',10,'quantity',1)),
    10,1000,'{"email":"buyer@example.test"}','Ödeme Bekleniyor') returning id into o3;
  r := public.record_verified_paytr_result('PHASE0PAYC','success',1000,'status_query');
  assert r->>'action'='manual_review', 'status query recovery also records unavailable inventory';
  assert (select stock_reserved_at from public.orders where id=o3) is null, 'failed acquisition completely rolled back';

  update public.transactional_email_outbox set payload='{"from":"shop@example.test","to":["buyer@example.test"],"subject":"Receipt","html":"ok"}' where id=e;
  claim := public.claim_transactional_email(e);
  assert claim->>'status'='unknown', 'unknown persisted before provider';
  assert (claim->>'attempts')::integer=1, 'first send count persisted';
  assert public.claim_transactional_email(e) is null, 'active lease excludes concurrent worker';
  assert not public.finish_transactional_email(e,gen_random_uuid(),'sent','fake-provider'), 'wrong lease cannot finalize';
  assert public.finish_transactional_email(e,(claim->>'lease_token')::uuid,'unknown',null,'timeout',true), 'unknown kept with bounded retry';
  update public.transactional_email_outbox set next_attempt_at=now()-interval '1 minute' where id=e;
  claim := public.claim_transactional_email(e);
  assert (claim->>'id')::uuid=e, 'retry reuses stable key identity';
  assert (claim->>'attempts')::integer=2, 'retry count increments atomically';
  assert public.finish_transactional_email(e,(claim->>'lease_token')::uuid,'sent','fake-provider'), 'success persisted';
  assert public.claim_transactional_email(e) is null, 'sent never resent';

  r := public.enqueue_transactional_email(o,'invoice:test','BUYER@EXAMPLE.TEST','{"html":"invoice"}');
  m := r->>'id';
  r := public.enqueue_transactional_email(o,'invoice:test','buyer@example.test','{"html":"invoice"}');
  assert r->>'id'=m, 'invoice key deduplicates case-normalized recipient';
  begin
    perform public.enqueue_transactional_email(o,'invoice:test','buyer@example.test','{"html":"changed"}');
    raise exception 'changed replay allowed';
  exception when others then if sqlerrm='changed replay allowed' then raise; end if;
  end;
  update public.transactional_email_outbox set status='unknown',attempts=1,first_attempt_at=now()-interval '24 hours' where id=m::uuid;
  assert public.claim_transactional_email(m::uuid) is null, 'provider dedupe expiry blocks auto resend';
  assert (select next_attempt_at from public.transactional_email_outbox where id=m::uuid) is null, 'old unknown becomes manual delivery reconciliation';
  assert not has_table_privilege('anon','public.transactional_email_outbox','SELECT'), 'anonymous cannot read email payloads';
  assert not has_table_privilege('authenticated','public.payment_recovery_exceptions','SELECT'), 'customer cannot read recovery queue';
  assert not has_function_privilege('authenticated','public.record_verified_paytr_result(text,text,bigint,text,text)','EXECUTE'), 'customer cannot forge verified payment RPC';
  assert not has_function_privilege('anon','public.claim_transactional_email(uuid)','EXECUTE'), 'anonymous cannot claim email';
  raise notice 'PASS: payment recovery, stock, replay, callback ordering, outbox leases, idempotency, expiry and RLS behavioral assertions';
end $$;
do $$
declare p bigint; v bigint; o bigint; o2 bigint; c bigint; u uuid:=gen_random_uuid(); r jsonb;
begin
  insert into auth.users(id,email) values(u,'coupon@example.test');
  insert into public.products("SKU",name,price,stock) values('PHASE0-COUPON-TEST','Variant fixture',10,4) returning id into p;
  insert into public.product_variants(product_id,sku,stock,is_active) values(p,'PHASE0-COUPON-VARIANT',4,true) returning id into v;
  insert into public.coupons(code,name,discount_type,discount_value,usage_limit_total)
  values('PHASE0COUPON','Fixture','fixed',1,1) returning id into c;
  insert into public.orders(order_no,merchant_oid,user_id,user_email,items,total_amount,paytr_total_amount,shipping_address,status,coupon_code,coupon_discount_amount)
  values('PHASE0COUPONA','PHASE0COUPONA',u,'coupon@example.test',jsonb_build_array(jsonb_build_object('id',p,'variant_id',v,'price',10,'quantity',1)),
    9,900,jsonb_build_object('email','coupon@example.test','coupon',jsonb_build_object('id',c,'code','PHASE0COUPON','discount_amount',1)),
    'Ödeme Bekleniyor','PHASE0COUPON',1) returning id into o;
  perform public.reserve_order_stock(o);
  perform public.reserve_order_coupon(c::text,u,o,'PHASE0COUPON',1);
  assert (select used_count from public.coupons where id=c)=1, 'coupon initially reserved';
  update public.orders set reservation_expires_at=now()-interval '1 minute' where id=o;
  perform public.release_expired_stock_reservations();
  assert (select used_count from public.coupons where id=c)=0, 'expiry releases coupon reservation too';
  r:=public.record_verified_paytr_result('PHASE0COUPONA','success',900);
  assert r->>'action'='recovered', 'late variant and coupon reservation recovered together';
  assert (select stock from public.product_variants where id=v)=3, 'variant stock recovered exactly once';
  assert (select stock from public.products where id=p)=3, 'parent variant stock synchronized';
  assert (select used_count from public.coupons where id=c)=1, 'late coupon consumes only one slot';
  perform public.record_verified_paytr_result('PHASE0COUPONA','success',900);
  assert (select used_count from public.coupons where id=c)=1, 'coupon callback replay does not consume another slot';

  insert into public.orders(order_no,merchant_oid,user_id,user_email,items,total_amount,paytr_total_amount,shipping_address,status,coupon_code,coupon_discount_amount,stock_released_at)
  values('PHASE0COUPONB','PHASE0COUPONB',u,'coupon@example.test',jsonb_build_array(jsonb_build_object('id',p,'variant_id',v,'price',10,'quantity',1)),
    9,900,jsonb_build_object('email','coupon@example.test','coupon',jsonb_build_object('id',c,'code','PHASE0COUPON','discount_amount',1)),
    'Ödeme Süresi Doldu','PHASE0COUPON',1,now()) returning id into o2;
  r:=public.record_verified_paytr_result('PHASE0COUPONB','success',900);
  assert r->>'action'='manual_review', 'exhausted coupon becomes manual reconciliation';
  assert (select stock from public.product_variants where id=v)=3, 'coupon failure rolls back attempted stock reacquisition';
  assert (select payment_status from public.orders where id=o2)='paid', 'coupon failure still retains confirmed funds';
  raise notice 'PASS: variant-aware late recovery and atomic coupon expiry/recovery assertions';
end $$;
do $$
declare p bigint; o bigint; r bigint; u uuid:=gen_random_uuid();
begin
  insert into auth.users(id,email) values(u,'fulfillment@example.test');
  insert into public.products("SKU",name,price,stock) values('PHASE0-GUARD-TEST','Guard fixture',10,3) returning id into p;
  insert into public.orders(order_no,merchant_oid,user_id,user_email,items,total_amount,paytr_total_amount,shipping_address,status,payment_status,refund_started_at)
  values('PHASE0GUARD','PHASE0GUARD',u,'fulfillment@example.test',jsonb_build_array(jsonb_build_object('id',p,'quantity',1)),
    10,1000,'{"email":"fulfillment@example.test"}','Bekliyor','paid',now()) returning id into o;
  begin
    update public.orders set status='Kargolandı' where id=o;
    raise exception 'locked refund allowed fulfillment';
  exception when others then if sqlerrm<>'FINANCIAL_OPERATION_IN_PROGRESS' then raise; end if;
  end;
  begin
    update public.orders set shipping_carrier='LocalCarrier' where id=o;
    raise exception 'locked refund allowed shipping metadata';
  exception when others then if sqlerrm<>'FINANCIAL_OPERATION_IN_PROGRESS' then raise; end if;
  end;
  update public.orders set status='Kısmi İade' where id=o;
  assert (select status from public.orders where id=o)='Kısmi İade', 'financial outcome writes remain possible';
  update public.orders set refund_started_at=null where id=o;
  insert into public.return_requests(order_id,user_id,reason,items,original_order_status)
  values(o,u,'Local return fixture','[]','Kısmi İade') returning id into r;
  update public.orders set status='İade Talebi' where id=o;
  begin
    update public.orders set status='Hazırlanıyor' where id=o;
    raise exception 'pending return allowed fulfillment';
  exception when others then if sqlerrm<>'FINANCIAL_OPERATION_IN_PROGRESS' then raise; end if;
  end;
  update public.return_requests set status='approved' where id=r;
  begin
    update public.orders set tracking_number='TRACK123' where id=o;
    raise exception 'approved return allowed shipping metadata';
  exception when others then if sqlerrm<>'FINANCIAL_OPERATION_IN_PROGRESS' then raise; end if;
  end;
  update public.return_requests set status='rejected' where id=r;
  update public.orders set status='Kargolandı',tracking_number='TRACK123' where id=o;
  assert (select status from public.orders where id=o)='Kargolandı', 'resolved return unlocks controlled fulfillment';
  raise notice 'PASS: database-level fulfillment guards serialize refund/return conflicts';
end $$;
rollback;
