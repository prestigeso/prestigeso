-- Payment and inventory integrity primitives.
-- Apply this migration before deploying the matching application code.

alter table public.orders
  add column if not exists stock_reserved_at timestamptz,
  add column if not exists stock_released_at timestamptz,
  add column if not exists reservation_expires_at timestamptz,
  add column if not exists post_payment_processing_at timestamptz,
  add column if not exists post_payment_processed_at timestamptz,
  add column if not exists refund_started_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists tracking_token_hash text;

create index if not exists orders_tracking_token_hash_idx
  on public.orders (tracking_token_hash)
  where tracking_token_hash is not null;

-- Orders completed by the previous callback already had their inventory deducted.
update public.orders
set stock_reserved_at = coalesce(paid_at, created_at, now())
where payment_status in ('paid', 'refunded')
  and stock_reserved_at is null;

-- The previous refund route also returned inventory for refunded orders.
update public.orders
set stock_released_at = coalesce(paid_at, created_at, now())
where payment_status = 'refunded'
  and stock_released_at is null;

update public.orders
set refunded_at = coalesce(paid_at, created_at, now())
where payment_status = 'refunded'
  and refunded_at is null;

create or replace function public.reserve_order_stock(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_stock numeric;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_order.stock_reserved_at is not null and v_order.stock_released_at is null then
    return;
  end if;

  if v_order.stock_released_at is not null then
    raise exception 'ORDER_STOCK_ALREADY_RELEASED';
  end if;

  if jsonb_typeof(v_order.items::jsonb) <> 'array' then
    raise exception 'INVALID_ORDER_ITEMS';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_order.items::jsonb) entry
    where not (entry ? 'id')
      or not (entry ? 'quantity')
      or (entry->>'id') !~ '^[0-9]+$'
      or (entry->>'quantity') !~ '^[1-9][0-9]*$'
      or (entry->>'quantity')::integer > 99
  ) then
    raise exception 'INVALID_ORDER_ITEMS';
  end if;

  -- Lock all affected products in a deterministic order before changing any row.
  for v_item in
    select (entry->>'id')::bigint as product_id,
           sum((entry->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(v_order.items::jsonb) entry
    group by (entry->>'id')::bigint
    order by (entry->>'id')::bigint
  loop
    select stock into v_stock
    from public.products
    where id = v_item.product_id
    for update;

    if not found then
      raise exception 'PRODUCT_NOT_FOUND:%', v_item.product_id;
    end if;

    if coalesce(v_stock, 0) < v_item.quantity then
      raise exception 'INSUFFICIENT_STOCK:%', v_item.product_id;
    end if;
  end loop;

  for v_item in
    select (entry->>'id')::bigint as product_id,
           sum((entry->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(v_order.items::jsonb) entry
    group by (entry->>'id')::bigint
  loop
    update public.products
    set stock = stock - v_item.quantity
    where id = v_item.product_id;
  end loop;

  update public.orders
  set stock_reserved_at = now(),
      reservation_expires_at = now() + interval '40 minutes'
  where id = p_order_id;
end;
$$;

create or replace function public.release_order_stock(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found or v_order.stock_released_at is not null then
    return;
  end if;

  -- Paid legacy orders were deducted by the former callback implementation.
  if v_order.stock_reserved_at is null and v_order.payment_status not in ('paid', 'refunded') then
    return;
  end if;

  for v_item in
    select (entry->>'id')::bigint as product_id,
           sum((entry->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(v_order.items::jsonb) entry
    where (entry->>'id') ~ '^[0-9]+$'
      and (entry->>'quantity') ~ '^[1-9][0-9]*$'
    group by (entry->>'id')::bigint
  loop
    update public.products
    set stock = stock + v_item.quantity
    where id = v_item.product_id;
  end loop;

  update public.orders
  set stock_released_at = now(),
      reservation_expires_at = null
  where id = p_order_id;
end;
$$;

create or replace function public.release_expired_stock_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_count integer := 0;
begin
  for v_order in
    select id
    from public.orders
    where payment_status = 'pending'
      and stock_reserved_at is not null
      and stock_released_at is null
      and reservation_expires_at < now()
    order by id
    for update skip locked
  loop
    perform public.release_order_stock(v_order.id);
    update public.orders
    set payment_status = 'failed',
        status = 'Ödeme Süresi Doldu',
        failed_reason = 'Ödeme oturumu zaman aşımına uğradı.'
    where id = v_order.id
      and payment_status = 'pending';
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.claim_order_post_payment(p_order_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found or v_order.payment_status <> 'paid' or v_order.post_payment_processed_at is not null then
    return false;
  end if;

  if v_order.post_payment_processing_at is not null
     and v_order.post_payment_processing_at > now() - interval '5 minutes' then
    return false;
  end if;

  update public.orders
  set post_payment_processing_at = now()
  where id = p_order_id;
  return true;
end;
$$;

create or replace function public.finish_order_post_payment(p_order_id bigint, p_success boolean)
returns void
language sql
security definer
set search_path = public
as $$
  update public.orders
  set post_payment_processing_at = null,
      post_payment_processed_at = case when p_success then now() else post_payment_processed_at end
  where id = p_order_id;
$$;

delete from public.coupon_usages older
using public.coupon_usages newer
where older.ctid < newer.ctid
  and older.order_id = newer.order_id
  and older.coupon_id = newer.coupon_id;

create unique index if not exists coupon_usages_order_coupon_uidx
  on public.coupon_usages (order_id, coupon_id);

create or replace function public.register_order_coupon_usage(
  p_coupon_id text,
  p_user_id uuid,
  p_order_id bigint,
  p_coupon_code text,
  p_discount_amount numeric
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
begin
  insert into public.coupon_usages (
    coupon_id, user_id, order_id, coupon_code, discount_amount
  )
  select id, p_user_id, p_order_id, upper(p_coupon_code), p_discount_amount
  from public.coupons
  where id::text = p_coupon_id
  on conflict (order_id, coupon_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then
    update public.coupons
    set used_count = coalesce(used_count, 0) + 1
    where id::text = p_coupon_id;
    return true;
  end if;
  return false;
end;
$$;

revoke all on function public.reserve_order_stock(bigint) from public, anon, authenticated;
revoke all on function public.release_order_stock(bigint) from public, anon, authenticated;
revoke all on function public.release_expired_stock_reservations() from public, anon, authenticated;
revoke all on function public.claim_order_post_payment(bigint) from public, anon, authenticated;
revoke all on function public.finish_order_post_payment(bigint, boolean) from public, anon, authenticated;
revoke all on function public.register_order_coupon_usage(text, uuid, bigint, text, numeric) from public, anon, authenticated;

grant execute on function public.reserve_order_stock(bigint) to service_role;
grant execute on function public.release_order_stock(bigint) to service_role;
grant execute on function public.release_expired_stock_reservations() to service_role;
grant execute on function public.claim_order_post_payment(bigint) to service_role;
grant execute on function public.finish_order_post_payment(bigint, boolean) to service_role;
grant execute on function public.register_order_coupon_usage(text, uuid, bigint, text, numeric) to service_role;

create or replace function public.save_my_address(p_address_id bigint, p_address jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.addresses%rowtype;
  v_is_default boolean := coalesce((p_address->>'is_default')::boolean, false);
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if v_is_default then
    update public.addresses set is_default = false where user_id = v_user_id;
  end if;

  if p_address_id is null then
    insert into public.addresses (
      user_id, title, first_name, last_name, phone, city, district,
      neighborhood, full_address, is_default
    ) values (
      v_user_id,
      left(trim(p_address->>'title'), 80),
      left(trim(p_address->>'first_name'), 80),
      left(trim(p_address->>'last_name'), 80),
      left(trim(p_address->>'phone'), 20),
      left(trim(p_address->>'city'), 80),
      left(trim(p_address->>'district'), 80),
      left(trim(p_address->>'neighborhood'), 120),
      left(trim(p_address->>'full_address'), 500),
      v_is_default
    ) returning * into v_row;
  else
    update public.addresses
    set title = left(trim(p_address->>'title'), 80),
        first_name = left(trim(p_address->>'first_name'), 80),
        last_name = left(trim(p_address->>'last_name'), 80),
        phone = left(trim(p_address->>'phone'), 20),
        city = left(trim(p_address->>'city'), 80),
        district = left(trim(p_address->>'district'), 80),
        neighborhood = left(trim(p_address->>'neighborhood'), 120),
        full_address = left(trim(p_address->>'full_address'), 500),
        is_default = v_is_default
    where id = p_address_id and user_id = v_user_id
    returning * into v_row;

    if not found then
      raise exception 'ADDRESS_NOT_FOUND';
    end if;
  end if;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.save_my_address(bigint, jsonb) from public, anon;
grant execute on function public.save_my_address(bigint, jsonb) to authenticated;

-- Persistent, atomic rate limiting for serverless instances.
create table if not exists public.api_rate_limits (
  bucket text not null,
  identifier_hash text not null,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  primary key (bucket, identifier_hash)
);

alter table public.api_rate_limits enable row level security;

create or replace function public.consume_api_rate_limit(
  p_bucket text,
  p_identifier_hash text,
  p_max_requests integer,
  p_window_seconds integer
)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.api_rate_limits%rowtype;
  v_now timestamptz := now();
begin
  if p_max_requests < 1 or p_window_seconds < 1 then
    raise exception 'INVALID_RATE_LIMIT';
  end if;

  insert into public.api_rate_limits(bucket, identifier_hash, window_started_at, request_count)
  values (left(p_bucket, 80), p_identifier_hash, v_now, 1)
  on conflict (bucket, identifier_hash) do update
  set window_started_at = case
        when api_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now then v_now
        else api_rate_limits.window_started_at
      end,
      request_count = case
        when api_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now then 1
        else api_rate_limits.request_count + 1
      end
  returning * into v_row;

  allowed := v_row.request_count <= p_max_requests;
  retry_after_seconds := greatest(
    0,
    ceil(extract(epoch from (v_row.window_started_at + make_interval(secs => p_window_seconds) - v_now)))::integer
  );
  return next;
end;
$$;

revoke all on table public.api_rate_limits from public, anon, authenticated;
revoke all on function public.consume_api_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer) to service_role;

alter table public.otp_verifications
  add column if not exists purpose text not null default 'generic',
  add column if not exists attempt_count integer not null default 0,
  add column if not exists verified_at timestamptz;

-- Invalidate legacy rows that contained plaintext codes.
update public.otp_verifications
set is_used = true
where purpose = 'generic' and is_used = false;

create index if not exists otp_verifications_lookup_idx
  on public.otp_verifications (email, purpose, created_at desc);

create or replace function public.verify_otp_code(
  p_email text,
  p_purpose text,
  p_code_hash text,
  p_max_attempts integer default 5
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_otp public.otp_verifications%rowtype;
begin
  select * into v_otp
  from public.otp_verifications
  where email = lower(trim(p_email))
    and purpose = p_purpose
    and is_used = false
  order by created_at desc
  limit 1
  for update;

  if not found or v_otp.expires_at <= now() or v_otp.attempt_count >= p_max_attempts then
    return false;
  end if;

  if v_otp.code <> p_code_hash then
    update public.otp_verifications
    set attempt_count = attempt_count + 1
    where id = v_otp.id;
    return false;
  end if;

  update public.otp_verifications
  set is_used = true,
      verified_at = now()
  where id = v_otp.id;
  return true;
end;
$$;

revoke all on function public.verify_otp_code(text, text, text, integer) from public, anon, authenticated;
grant execute on function public.verify_otp_code(text, text, text, integer) to service_role;

delete from public.reviews older
using public.reviews newer
where older.ctid < newer.ctid
  and older.user_id = newer.user_id
  and older.product_id = newer.product_id;

create unique index if not exists reviews_user_product_uidx
  on public.reviews (user_id, product_id);

-- Replace unknown/permissive policies on sensitive tables with least-privilege rules.
do $$
declare p record;
begin
  for p in select schemaname, tablename, policyname from pg_policies
           where schemaname = 'public' and tablename in ('orders','messages','questions','reviews','favorites','product_views','page_views','otp_verifications')
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

alter table public.orders enable row level security;
alter table public.messages enable row level security;
alter table public.questions enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.product_views enable row level security;
alter table public.page_views enable row level security;
alter table public.otp_verifications enable row level security;

revoke all on public.orders, public.messages, public.questions, public.reviews, public.favorites, public.product_views, public.page_views, public.otp_verifications from anon, authenticated;
grant select on public.orders to authenticated;
grant select, insert on public.messages to authenticated;
grant select on public.questions to anon, authenticated;
grant insert on public.questions to authenticated;
grant select on public.reviews to anon, authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant insert on public.product_views to anon, authenticated;

create policy orders_read_own on public.orders for select to authenticated using (user_id = auth.uid());
create policy messages_read_own on public.messages for select to authenticated using (user_id = auth.uid());
create policy messages_insert_own on public.messages for insert to authenticated with check (user_id = auth.uid());
create policy questions_read_public_or_own on public.questions for select to anon, authenticated using (is_approved = true or user_id = auth.uid());
create policy questions_insert_own on public.questions for insert to authenticated with check (user_id = auth.uid());
create policy reviews_read_public_or_own on public.reviews for select to anon, authenticated using (is_approved = true or user_id = auth.uid());
create policy favorites_read_own on public.favorites for select to authenticated using (user_id = auth.uid());
create policy favorites_insert_own on public.favorites for insert to authenticated with check (user_id = auth.uid());
create policy favorites_delete_own on public.favorites for delete to authenticated using (user_id = auth.uid());
create policy product_views_insert on public.product_views for insert to anon, authenticated with check (true);
