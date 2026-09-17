begin;
do $$
declare p bigint; o bigint; snapshot jsonb; rows_before bigint;
begin
  perform set_config('request.jwt.claims','{"role":"service_role","email":"private@example.test"}',true);
  insert into public.products("SKU",name,price,stock,description)
  values('PHASE0-AUDIT-TEST','Private Product Label',10,3,'buyer@example.test') returning id into p;
  select count(*) into rows_before from public.admin_operation_audit where entity_table='products' and entity_id=p::text;
  update public.products set description='private@example.test 05551234567' where id=p;
  assert (select count(*) from public.admin_operation_audit where entity_table='products' and entity_id=p::text)=rows_before, 'irrelevant text change not logged';
  update public.products set stock=2 where id=p;
  select to_jsonb(a) into snapshot from public.admin_operation_audit a
  where entity_table='products' and entity_id=p::text order by id desc limit 1;
  assert snapshot->>'actor_role'='service_role', 'audit records credential role, not invented human actor';
  assert snapshot->'before_state'->>'stock'='3' and snapshot->'after_state'->>'stock'='2', 'stock delta before/after persisted';
  assert snapshot::text not like '%example.test%' and snapshot::text not like '%Private Product%', 'PII and product prose excluded';
  insert into public.orders(order_no,merchant_oid,user_email,items,total_amount,paytr_total_amount,shipping_address,status)
  values('PHASE0AUDIT','PHASE0AUDIT','private@example.test',jsonb_build_array(jsonb_build_object('id',p,'quantity',1)),
    10,1000,'{"email":"private@example.test","fullAddress":"Private Road 9"}','Ödeme Bekleniyor') returning id into o;
  update public.orders set payment_status='paid',status='Bekliyor' where id=o;
  select to_jsonb(a) into snapshot from public.admin_operation_audit a
  where entity_table='orders' and entity_id=o::text order by id desc limit 1;
  assert snapshot->'before_state'->>'payment_status'='pending', 'previous money status audited';
  assert snapshot->'after_state'->>'payment_status'='paid', 'new money status audited';
  assert snapshot::text not like '%private@example.test%' and snapshot::text not like '%Private Road%', 'order email/address excluded';
  assert not has_table_privilege('anon','public.admin_operation_audit','SELECT'), 'anonymous cannot read audit';
  assert not has_table_privilege('authenticated','public.admin_operation_audit','SELECT'), 'customer cannot read audit';
  assert not has_table_privilege('service_role','public.admin_operation_audit','UPDATE'), 'application cannot rewrite audit evidence';
  assert not has_table_privilege('service_role','public.admin_operation_audit','DELETE'), 'application cannot erase audit evidence';
  assert has_table_privilege('service_role','public.admin_operation_audit','SELECT'), 'operations can inspect audit';
  raise notice 'PASS: private append-only role-attributed financial/stock audit assertions';
end $$;
rollback;
