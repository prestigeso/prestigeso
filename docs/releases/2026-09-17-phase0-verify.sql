-- Read-only deployment check; returns schema/permissions, not customer data.
select object_name, to_regclass('public.' || object_name) is not null as present
from unnest(array['payment_recovery_exceptions','transactional_email_outbox','admin_operation_audit','products_public_catalog']) as object_name;

select c.relname as table_name, c.relrowsecurity as rls_enabled,
  has_table_privilege('anon',c.oid,'SELECT') as anon_can_read,
  has_table_privilege('authenticated',c.oid,'SELECT') as customer_can_read
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('payment_recovery_exceptions','transactional_email_outbox','admin_operation_audit');
-- Expected: every row rls=true, anon/customer=false.

select p.proname as function_name,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as customer_can_execute,
  has_function_privilege('service_role',p.oid,'EXECUTE') as service_can_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
  'record_verified_paytr_result','claim_transactional_email','finish_transactional_email',
  'enqueue_transactional_email','claim_order_refund');
-- Expected: anon/customer=false, service=true.

select table_name,column_name,data_type
from information_schema.columns where table_schema='public' and
  ((table_name='orders' and column_name='payment_recovery_status') or
   (table_name='return_requests' and column_name='requested_refund_amount'));

select relname,reloptions from pg_class where oid=to_regclass('public.products_public_catalog');
-- Expected: security_invoker=true.

select event_object_table,trigger_name from information_schema.triggers
where trigger_schema='public' and trigger_name='audit_commerce_operation'
group by event_object_table,trigger_name order by event_object_table;
-- Expected tables: orders, return_requests, products, product_variants.
