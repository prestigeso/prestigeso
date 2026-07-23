-- Security, data-quality and operations hardening.

-- Sensitive customer tables are private by default. Service-role operations
-- bypass RLS; browser access is restricted to the authenticated owner.
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('customers', 'addresses', 'coupon_usages', 'contact_messages')
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

alter table public.customers enable row level security;
alter table public.addresses enable row level security;
alter table public.coupon_usages enable row level security;
alter table public.contact_messages enable row level security;

revoke all on public.customers, public.addresses, public.coupon_usages, public.contact_messages
  from public, anon, authenticated;

grant select, update on public.customers to authenticated;
grant select, delete on public.addresses to authenticated;
grant select on public.coupon_usages to authenticated;

revoke insert on public.product_views from anon, authenticated;
drop policy if exists product_views_insert on public.product_views;

create policy customers_read_own
  on public.customers for select to authenticated
  using (id = auth.uid());

create policy customers_update_own
  on public.customers for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy addresses_read_own
  on public.addresses for select to authenticated
  using (user_id = auth.uid());

create policy addresses_delete_own
  on public.addresses for delete to authenticated
  using (user_id = auth.uid());

create policy coupon_usages_read_own
  on public.coupon_usages for select to authenticated
  using (user_id = auth.uid());

-- Public files can be read through the public object endpoint, but every write
-- is performed by a validated server route using the service role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'products',
  'products',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'return-evidence',
  'return-evidence',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists products_storage_public_read on storage.objects;
create policy products_storage_public_read
  on storage.objects for select to public
  using (bucket_id = 'products');

-- No INSERT/UPDATE/DELETE policy is granted to anon or authenticated roles.
-- The return-evidence bucket intentionally has no public read or client policy.

-- Data-quality checks apply to new writes without making deployment depend on
-- legacy rows being clean. Existing data can be repaired and constraints can
-- then be VALIDATEd in a controlled maintenance window.
--
-- Older installations stored some monetary columns as text. Normalize those
-- columns before adding numeric constraints. The explicit validation prevents
-- malformed legacy values from being silently converted or discarded.
do $$
declare
  invalid_price_count bigint;
  invalid_discount_price_count bigint;
  invalid_coupon_value_count bigint;
begin
  select count(*)
    into invalid_price_count
  from public.products
  where price is not null
    and btrim(price::text) !~ '^[0-9]+([.,][0-9]+)?$';

  select count(*)
    into invalid_discount_price_count
  from public.products
  where discount_price is not null
    and btrim(discount_price::text) <> ''
    and btrim(discount_price::text) !~ '^[0-9]+([.,][0-9]+)?$';

  select count(*)
    into invalid_coupon_value_count
  from public.coupons
  where discount_value is not null
    and btrim(discount_value::text) !~ '^[0-9]+([.,][0-9]+)?$';

  if invalid_price_count > 0 then
    raise exception 'products.price contains % non-numeric value(s)', invalid_price_count
      using hint = 'Correct the reported products.price rows, then run the migration again.';
  end if;
  if invalid_discount_price_count > 0 then
    raise exception 'products.discount_price contains % non-numeric value(s)', invalid_discount_price_count
      using hint = 'Correct the reported products.discount_price rows, then run the migration again.';
  end if;
  if invalid_coupon_value_count > 0 then
    raise exception 'coupons.discount_value contains % non-numeric value(s)', invalid_coupon_value_count
      using hint = 'Correct the reported coupons.discount_value rows, then run the migration again.';
  end if;
end $$;

alter table public.products
  alter column price drop default,
  alter column price type numeric(12,2)
    using replace(btrim(price::text), ',', '.')::numeric(12,2),
  alter column discount_price drop default,
  alter column discount_price type numeric(12,2)
    using coalesce(nullif(replace(btrim(discount_price::text), ',', '.'), ''), '0')::numeric(12,2),
  alter column discount_price set default 0;

alter table public.coupons
  alter column discount_value drop default,
  alter column discount_value type numeric(12,2)
    using replace(btrim(discount_value::text), ',', '.')::numeric(12,2);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_discount_not_above_price') then
    alter table public.products
      add constraint products_discount_not_above_price
      check (discount_price = 0 or discount_price <= price) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'coupons_percent_max_100') then
    alter table public.coupons
      add constraint coupons_percent_max_100
      check (discount_type <> 'percent' or discount_value <= 100) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'addresses_phone_format') then
    alter table public.addresses
      add constraint addresses_phone_format
      check (phone::text ~ '^05[0-9]{9}$') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_status_allowed') then
    alter table public.orders
      add constraint orders_status_allowed check (status in (
        'Ödeme Bekleniyor', 'Ödeme Başlatılamadı', 'Ödeme Başarısız',
        'Ödeme Süresi Doldu', 'Stok Yetersiz', 'Bekliyor', 'İşleniyor',
        'Hazırlanıyor', 'Kargolandı', 'Teslim Edildi', 'Tamamlandı',
        'İptal Edildi', 'İade Talebi', 'Kısmi İade', 'İade Edildi'
      )) not valid;
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['products', 'customers', 'addresses', 'orders', 'site_settings']
  loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_set_updated_at', table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      table_name || '_set_updated_at', table_name
    );
  end loop;
end $$;

-- Category names remain compatible with the existing text column while new
-- writes are prevented from referencing a category that does not exist.
create unique index if not exists categories_name_normalized_uidx
  on public.categories (lower(trim(name)));

create or replace function public.enforce_product_category()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.category is not null and trim(new.category) <> '' and not exists (
    select 1 from public.categories c
    where lower(trim(c.name)) = lower(trim(new.category))
  ) then
    raise exception 'UNKNOWN_PRODUCT_CATEGORY';
  end if;
  return new;
end;
$$;

drop trigger if exists products_enforce_category on public.products;
create trigger products_enforce_category
before insert or update of category on public.products
for each row execute function public.enforce_product_category();

-- Immutable stock movement ledger. Every stock change, including checkout,
-- refund and manual admin adjustments, is recorded automatically.
create table if not exists public.inventory_movements (
  id bigint generated by default as identity primary key,
  product_id bigint not null references public.products(id) on delete restrict,
  delta integer not null check (delta <> 0),
  stock_before integer not null check (stock_before >= 0),
  stock_after integer not null check (stock_after >= 0),
  source text not null default 'database',
  created_at timestamptz not null default now()
);

create index if not exists inventory_movements_product_created_idx
  on public.inventory_movements(product_id, created_at desc);

alter table public.inventory_movements enable row level security;
revoke all on public.inventory_movements from public, anon, authenticated;

create or replace function public.record_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.stock is distinct from new.stock then
    insert into public.inventory_movements(
      product_id, delta, stock_before, stock_after, source
    ) values (
      new.id, new.stock - old.stock, old.stock, new.stock,
      coalesce(nullif(current_setting('app.inventory_source', true), ''), current_user)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists products_record_inventory_movement on public.products;
create trigger products_record_inventory_movement
after update of stock on public.products
for each row execute function public.record_inventory_movement();

-- Optional product variants. Existing products continue to use products.stock;
-- variants can be introduced product-by-product without a data migration.
create table if not exists public.product_variants (
  id bigint generated by default as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  sku text not null unique,
  barcode text unique,
  option_values jsonb not null default '{}'::jsonb check (jsonb_typeof(option_values) = 'object'),
  price numeric(12,2) check (price is null or price >= 0),
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_variants_product_idx
  on public.product_variants(product_id, is_active);

alter table public.product_variants enable row level security;
revoke all on public.product_variants from public, anon, authenticated;
grant select on public.product_variants to anon, authenticated;
create policy product_variants_public_read
  on public.product_variants for select to anon, authenticated
  using (is_active = true);

drop trigger if exists product_variants_set_updated_at on public.product_variants;
create trigger product_variants_set_updated_at
before update on public.product_variants
for each row execute function public.set_updated_at();

create table if not exists public.variant_inventory_movements (
  id bigint generated by default as identity primary key,
  variant_id bigint not null references public.product_variants(id) on delete restrict,
  delta integer not null check (delta <> 0),
  stock_before integer not null check (stock_before >= 0),
  stock_after integer not null check (stock_after >= 0),
  source text not null default 'database',
  created_at timestamptz not null default now()
);
alter table public.variant_inventory_movements enable row level security;
revoke all on public.variant_inventory_movements from public, anon, authenticated;

create or replace function public.record_variant_inventory_movement()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.stock is distinct from new.stock then
    insert into public.variant_inventory_movements(
      variant_id, delta, stock_before, stock_after, source
    ) values (
      new.id, new.stock - old.stock, old.stock, new.stock,
      coalesce(nullif(current_setting('app.inventory_source', true), ''), current_user)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists product_variants_record_inventory_movement on public.product_variants;
create trigger product_variants_record_inventory_movement
after update of stock on public.product_variants
for each row execute function public.record_variant_inventory_movement();

create or replace function public.sync_product_stock_from_variants()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_product_id bigint;
begin
  target_product_id := coalesce(new.product_id, old.product_id);
  update public.products
  set stock = coalesce((
    select sum(stock)::integer from public.product_variants
    where product_id = target_product_id and is_active
  ), 0)
  where id = target_product_id;
  return null;
end;
$$;

drop trigger if exists product_variants_sync_product_stock on public.product_variants;
create trigger product_variants_sync_product_stock
after insert or update of stock, is_active or delete on public.product_variants
for each row execute function public.sync_product_stock_from_variants();

-- Variant-aware replacements for the stock reservation primitives.
create or replace function public.reserve_order_stock(p_order_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype; v_item record; v_stock integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.stock_reserved_at is not null and v_order.stock_released_at is null then return; end if;
  if v_order.stock_released_at is not null then raise exception 'ORDER_STOCK_ALREADY_RELEASED'; end if;
  if jsonb_typeof(v_order.items::jsonb) <> 'array' then raise exception 'INVALID_ORDER_ITEMS'; end if;
  if exists (
    select 1 from jsonb_array_elements(v_order.items::jsonb) entry
    where not (entry ? 'id') or not (entry ? 'quantity')
      or (entry->>'id') !~ '^[0-9]+$'
      or (entry->>'quantity') !~ '^[1-9][0-9]*$'
      or (entry->>'quantity')::integer > 99
      or (entry ? 'variant_id' and (entry->>'variant_id') !~ '^[0-9]+$')
  ) then raise exception 'INVALID_ORDER_ITEMS'; end if;

  for v_item in
    select (entry->>'variant_id')::bigint variant_id,
           (entry->>'id')::bigint product_id,
           sum((entry->>'quantity')::integer)::integer quantity
    from jsonb_array_elements(v_order.items::jsonb) entry
    where entry ? 'variant_id'
    group by 1, 2 order by 1
  loop
    select stock into v_stock from public.product_variants
    where id = v_item.variant_id and product_id = v_item.product_id and is_active for update;
    if not found then raise exception 'VARIANT_NOT_FOUND:%', v_item.variant_id; end if;
    if v_stock < v_item.quantity then raise exception 'INSUFFICIENT_VARIANT_STOCK:%', v_item.variant_id; end if;
  end loop;

  for v_item in
    select (entry->>'id')::bigint product_id,
           sum((entry->>'quantity')::integer)::integer quantity
    from jsonb_array_elements(v_order.items::jsonb) entry
    where not (entry ? 'variant_id') group by 1 order by 1
  loop
    select stock into v_stock from public.products where id = v_item.product_id for update;
    if not found then raise exception 'PRODUCT_NOT_FOUND:%', v_item.product_id; end if;
    if v_stock < v_item.quantity then raise exception 'INSUFFICIENT_STOCK:%', v_item.product_id; end if;
  end loop;

  for v_item in
    select (entry->>'variant_id')::bigint variant_id,
           sum((entry->>'quantity')::integer)::integer quantity
    from jsonb_array_elements(v_order.items::jsonb) entry
    where entry ? 'variant_id' group by 1
  loop
    update public.product_variants set stock = stock - v_item.quantity where id = v_item.variant_id;
  end loop;
  for v_item in
    select (entry->>'id')::bigint product_id,
           sum((entry->>'quantity')::integer)::integer quantity
    from jsonb_array_elements(v_order.items::jsonb) entry
    where not (entry ? 'variant_id') group by 1
  loop
    update public.products set stock = stock - v_item.quantity where id = v_item.product_id;
  end loop;
  update public.orders set stock_reserved_at = now(),
    reservation_expires_at = now() + interval '40 minutes' where id = p_order_id;
end;
$$;

create or replace function public.release_order_stock(p_order_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype; v_item record;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.stock_released_at is not null then return; end if;
  if v_order.stock_reserved_at is null and v_order.payment_status not in ('paid','refunded','partially_refunded') then return; end if;
  for v_item in
    select (entry->>'variant_id')::bigint variant_id,
           sum((entry->>'quantity')::integer)::integer quantity
    from jsonb_array_elements(v_order.items::jsonb) entry
    where entry ? 'variant_id' and (entry->>'variant_id') ~ '^[0-9]+$'
      and (entry->>'quantity') ~ '^[1-9][0-9]*$' group by 1
  loop
    update public.product_variants set stock = stock + v_item.quantity where id = v_item.variant_id;
  end loop;
  for v_item in
    select (entry->>'id')::bigint product_id,
           sum((entry->>'quantity')::integer)::integer quantity
    from jsonb_array_elements(v_order.items::jsonb) entry
    where not (entry ? 'variant_id') and (entry->>'id') ~ '^[0-9]+$'
      and (entry->>'quantity') ~ '^[1-9][0-9]*$' group by 1
  loop
    update public.products set stock = stock + v_item.quantity where id = v_item.product_id;
  end loop;
  update public.orders set stock_released_at = now(), reservation_expires_at = null where id = p_order_id;
end;
$$;

-- Normalized campaign/product relation. product_ids remains as a compatibility
-- projection for the current clients while all new writes are mirrored here.
create table if not exists public.campaign_products (
  campaign_id bigint not null references public.campaigns(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (campaign_id, product_id)
);

create index if not exists campaign_products_product_idx
  on public.campaign_products(product_id, campaign_id);

alter table public.campaign_products enable row level security;
revoke all on public.campaign_products from public, anon, authenticated;
grant select on public.campaign_products to anon, authenticated;
create policy campaign_products_public_read
  on public.campaign_products for select to anon, authenticated using (true);

create or replace function public.sync_campaign_products()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.campaign_products where campaign_id = new.id;
  if jsonb_typeof(new.product_ids) = 'array' then
    insert into public.campaign_products(campaign_id, product_id)
    select new.id, value::bigint
    from jsonb_array_elements_text(new.product_ids)
    where value ~ '^[0-9]+$'
      and exists (select 1 from public.products p where p.id = value::bigint)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists campaigns_sync_products on public.campaigns;
create trigger campaigns_sync_products
after insert or update of product_ids on public.campaigns
for each row execute function public.sync_campaign_products();

insert into public.campaign_products(campaign_id, product_id)
select c.id, entry.value::bigint
from public.campaigns c
cross join lateral jsonb_array_elements_text(
  case when jsonb_typeof(c.product_ids) = 'array' then c.product_ids else '[]'::jsonb end
) entry(value)
where entry.value ~ '^[0-9]+$'
  and exists (select 1 from public.products p where p.id = entry.value::bigint)
on conflict do nothing;

-- Return requests preserve reason and requested line items instead of reducing
-- the whole workflow to one free-form order status.
alter table public.orders add column if not exists delivered_at timestamptz;
alter table public.orders add column if not exists refunded_amount numeric(12,2) not null default 0;
alter table public.orders add column if not exists last_reconciled_at timestamptz;
alter table public.orders add column if not exists reconciliation_status text
  check (reconciliation_status is null or reconciliation_status in ('matched', 'mismatch', 'error'));
alter table public.orders add column if not exists reconciliation_detail jsonb;

create or replace function public.set_order_delivered_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'Teslim Edildi' and old.status is distinct from new.status then
    new.delivered_at = coalesce(new.delivered_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists orders_set_delivered_at on public.orders;
create trigger orders_set_delivered_at
before update of status on public.orders
for each row execute function public.set_order_delivered_at();

create table if not exists public.return_requests (
  id bigint generated by default as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 5 and 1000),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  evidence_urls jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_urls) = 'array'),
  original_order_status text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'completed')),
  admin_note text,
  decided_at timestamptz,
  return_shipping_code text,
  refund_amount numeric(12,2) check (refund_amount is null or refund_amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id, user_id)
);

alter table public.return_requests enable row level security;
revoke all on public.return_requests from public, anon, authenticated;
grant select on public.return_requests to authenticated;
create policy return_requests_read_own
  on public.return_requests for select to authenticated
  using (user_id = auth.uid());

drop trigger if exists return_requests_set_updated_at on public.return_requests;
create trigger return_requests_set_updated_at
before update on public.return_requests
for each row execute function public.set_updated_at();

create table if not exists public.return_inventory_releases (
  return_request_id bigint primary key references public.return_requests(id) on delete restrict,
  released_at timestamptz not null default now()
);
alter table public.return_inventory_releases enable row level security;
revoke all on public.return_inventory_releases from public, anon, authenticated;

create or replace function public.release_return_request_stock(p_return_request_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.return_requests%rowtype;
  item jsonb;
  v_product_id bigint;
  item_quantity integer;
begin
  select * into request_row
  from public.return_requests
  where id = p_return_request_id
  for update;
  if not found then raise exception 'RETURN_REQUEST_NOT_FOUND'; end if;

  insert into public.return_inventory_releases(return_request_id)
  values (p_return_request_id)
  on conflict do nothing;
  if not found then return false; end if;

  for item in select value from jsonb_array_elements(request_row.items)
  loop
    v_product_id := (item->>'id')::bigint;
    item_quantity := (item->>'quantity')::integer;
    if v_product_id <= 0 or item_quantity <= 0 then
      raise exception 'INVALID_RETURN_ITEM';
    end if;
    if item ? 'variant_id' then
      update public.product_variants
      set stock = stock + item_quantity
      where id = (item->>'variant_id')::bigint
        and product_id = v_product_id;
    else
      update public.products
      set stock = stock + item_quantity
      where id = v_product_id;
    end if;
    if not found then raise exception 'RETURN_PRODUCT_NOT_FOUND'; end if;
  end loop;
  return true;
end;
$$;

revoke all on function public.release_return_request_stock(bigint) from public, anon, authenticated;
grant execute on function public.release_return_request_stock(bigint) to service_role;

-- Called by the protected maintenance endpoint. The time windows intentionally
-- keep recent operational data available while preventing unbounded growth.
create or replace function public.prune_operational_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.otp_verifications where created_at < now() - interval '2 days';
  delete from public.api_rate_limits where window_started_at < now() - interval '2 days';
  delete from public.page_views where created_at < now() - interval '400 days';
  delete from public.product_views where created_at < now() - interval '400 days';
end;
$$;

revoke all on function public.prune_operational_data() from public, anon, authenticated;
grant execute on function public.prune_operational_data() to service_role;
