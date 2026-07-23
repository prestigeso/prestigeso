begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select ok((select relrowsecurity from pg_class where oid = 'public.customers'::regclass), 'customers RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.addresses'::regclass), 'addresses RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.coupon_usages'::regclass), 'coupon usages RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.contact_messages'::regclass), 'contact messages RLS enabled');
select has_table('public', 'inventory_movements', 'inventory movement ledger exists');
select has_table('public', 'product_variants', 'product variants exist');
select has_table('public', 'campaign_products', 'campaign products are normalized');
select has_table('public', 'return_requests', 'return workflow exists');
select has_function('public', 'release_expired_stock_reservations', array[]::text[], 'reservation cleanup exists');
select has_function('public', 'prune_operational_data', array[]::text[], 'retention cleanup exists');
select has_function('public', 'release_return_request_stock', array['bigint'], 'return stock release exists');
select isnt_empty(
  $$select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'products_storage_public_read'$$,
  'storage public-read policy exists'
);

select * from finish();
rollback;
