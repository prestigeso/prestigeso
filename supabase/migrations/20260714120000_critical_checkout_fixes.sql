-- Critical checkout, coupon and return integrity fixes.

-- Partial refunds are a first-class payment state.
do $$
declare constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%payment_status%'
  loop
    execute format(
      'alter table public.orders drop constraint %I',
      constraint_row.conname
    );
  end loop;
end $$;

alter table public.orders
  add constraint orders_payment_status_allowed
  check (payment_status in (
    'pending', 'paid', 'failed', 'partially_refunded', 'refunded'
  )) not valid;

alter table public.orders validate constraint orders_payment_status_allowed;

-- Coupon rows begin as atomic checkout reservations. They are consumed after
-- a successful callback or released when payment fails/expires.
alter table public.coupon_usages
  add column if not exists reserved_at timestamptz,
  add column if not exists consumed_at timestamptz,
  add column if not exists released_at timestamptz;

update public.coupon_usages
set consumed_at = coalesce(consumed_at, created_at),
    reserved_at = coalesce(reserved_at, created_at)
where consumed_at is null and released_at is null;

create index if not exists coupon_usages_active_user_idx
  on public.coupon_usages(coupon_id, user_id)
  where released_at is null;

create or replace function public.reserve_order_coupon(
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
  coupon_row public.coupons%rowtype;
  existing_usage public.coupon_usages%rowtype;
  per_user_count bigint;
begin
  if p_user_id is null or p_discount_amount is null or p_discount_amount <= 0 then
    raise exception 'INVALID_COUPON_RESERVATION';
  end if;

  select * into coupon_row
  from public.coupons
  where id::text = p_coupon_id
  for update;
  if not found then raise exception 'COUPON_NOT_FOUND'; end if;

  if not exists (
    select 1 from public.orders
    where id = p_order_id
      and user_id = p_user_id
      and payment_status = 'pending'
  ) then
    raise exception 'INVALID_COUPON_ORDER';
  end if;

  select * into existing_usage
  from public.coupon_usages
  where order_id = p_order_id and coupon_id = coupon_row.id
  for update;
  if found and existing_usage.released_at is null then return true; end if;

  if not coupon_row.is_active
     or (coupon_row.starts_at is not null and coupon_row.starts_at > now())
     or (coupon_row.ends_at is not null and coupon_row.ends_at < now()) then
    raise exception 'COUPON_INACTIVE';
  end if;
  if coupon_row.usage_limit_total is not null
     and coalesce(coupon_row.used_count, 0) >= coupon_row.usage_limit_total then
    raise exception 'COUPON_TOTAL_LIMIT_REACHED';
  end if;

  select count(*) into per_user_count
  from public.coupon_usages
  where coupon_id = coupon_row.id
    and user_id = p_user_id
    and released_at is null;
  if per_user_count >= coalesce(coupon_row.usage_limit_per_user, 1) then
    raise exception 'COUPON_USER_LIMIT_REACHED';
  end if;

  insert into public.coupon_usages(
    coupon_id, user_id, order_id, coupon_code, discount_amount,
    reserved_at, consumed_at, released_at
  ) values (
    coupon_row.id, p_user_id, p_order_id, upper(p_coupon_code),
    p_discount_amount, now(), null, null
  )
  on conflict (order_id, coupon_id) do update
  set user_id = excluded.user_id,
      coupon_code = excluded.coupon_code,
      discount_amount = excluded.discount_amount,
      reserved_at = now(),
      consumed_at = null,
      released_at = null;

  update public.coupons
  set used_count = coalesce(used_count, 0) + 1
  where id = coupon_row.id;
  return true;
end;
$$;

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
  coupon_row public.coupons%rowtype;
  usage_row public.coupon_usages%rowtype;
  per_user_count bigint;
begin
  select * into coupon_row
  from public.coupons
  where id::text = p_coupon_id
  for update;
  if not found then raise exception 'COUPON_NOT_FOUND'; end if;

  select * into usage_row
  from public.coupon_usages
  where order_id = p_order_id and coupon_id = coupon_row.id
  for update;
  if found then
    if usage_row.released_at is not null then
      raise exception 'COUPON_RESERVATION_RELEASED';
    end if;
    if usage_row.consumed_at is null then
      update public.coupon_usages
      set consumed_at = now()
      where id = usage_row.id;
    end if;
    return true;
  end if;

  -- Compatibility for orders created immediately before this migration.
  if coupon_row.usage_limit_total is not null
     and coalesce(coupon_row.used_count, 0) >= coupon_row.usage_limit_total then
    raise exception 'COUPON_TOTAL_LIMIT_REACHED';
  end if;
  select count(*) into per_user_count
  from public.coupon_usages
  where coupon_id = coupon_row.id
    and user_id = p_user_id
    and released_at is null;
  if per_user_count >= coalesce(coupon_row.usage_limit_per_user, 1) then
    raise exception 'COUPON_USER_LIMIT_REACHED';
  end if;

  insert into public.coupon_usages(
    coupon_id, user_id, order_id, coupon_code, discount_amount,
    reserved_at, consumed_at
  ) values (
    coupon_row.id, p_user_id, p_order_id, upper(p_coupon_code),
    p_discount_amount, now(), now()
  );
  update public.coupons
  set used_count = coalesce(used_count, 0) + 1
  where id = coupon_row.id;
  return true;
end;
$$;

create or replace function public.release_order_coupon_reservation(
  p_order_id bigint
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare released_coupon_id bigint;
begin
  update public.coupon_usages
  set released_at = now()
  where order_id = p_order_id
    and consumed_at is null
    and released_at is null
  returning coupon_id into released_coupon_id;
  if not found then return false; end if;

  update public.coupons
  set used_count = greatest(0, coalesce(used_count, 0) - 1)
  where id = released_coupon_id;
  return true;
end;
$$;

revoke all on function public.reserve_order_coupon(text, uuid, bigint, text, numeric)
  from public, anon, authenticated;
revoke all on function public.release_order_coupon_reservation(bigint)
  from public, anon, authenticated;
revoke all on function public.register_order_coupon_usage(text, uuid, bigint, text, numeric)
  from public, anon, authenticated;
grant execute on function public.reserve_order_coupon(text, uuid, bigint, text, numeric)
  to service_role;
grant execute on function public.release_order_coupon_reservation(bigint)
  to service_role;
grant execute on function public.register_order_coupon_usage(text, uuid, bigint, text, numeric)
  to service_role;

create or replace function public.release_coupon_when_payment_fails()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.payment_status = 'failed'
     and old.payment_status is distinct from new.payment_status then
    perform public.release_order_coupon_reservation(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists orders_release_coupon_on_failure on public.orders;
create trigger orders_release_coupon_on_failure
after update of payment_status on public.orders
for each row execute function public.release_coupon_when_payment_fails();

-- OTP proofs contain a random nonce. Only one checkout can consume a nonce.
create table if not exists public.otp_proof_consumptions (
  token_hash text primary key,
  expires_at timestamptz not null,
  consumed_at timestamptz not null default now()
);
alter table public.otp_proof_consumptions enable row level security;
revoke all on public.otp_proof_consumptions from public, anon, authenticated;

create or replace function public.consume_otp_proof(
  p_token_hash text,
  p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_token_hash is null
     or char_length(p_token_hash) <> 64
     or p_expires_at <= now()
     or p_expires_at > now() + interval '15 minutes' then
    return false;
  end if;
  insert into public.otp_proof_consumptions(token_hash, expires_at)
  values (p_token_hash, p_expires_at)
  on conflict do nothing;
  return found;
end;
$$;
revoke all on function public.consume_otp_proof(text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.consume_otp_proof(text, timestamptz)
  to service_role;

-- Aggregate duplicate return lines and compare the aggregate with the original
-- order before restoring any inventory.
create or replace function public.release_return_request_stock(
  p_return_request_id bigint
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.return_requests%rowtype;
  order_items jsonb;
  item_row record;
  ordered_quantity integer;
begin
  select * into request_row
  from public.return_requests
  where id = p_return_request_id
  for update;
  if not found then raise exception 'RETURN_REQUEST_NOT_FOUND'; end if;

  select items::jsonb into order_items
  from public.orders
  where id = request_row.order_id
  for update;
  if not found or jsonb_typeof(order_items) <> 'array' then
    raise exception 'RETURN_ORDER_NOT_FOUND';
  end if;
  if jsonb_typeof(request_row.items) <> 'array'
     or jsonb_array_length(request_row.items) = 0
     or exists (
       select 1 from jsonb_array_elements(request_row.items) entry
       where (entry->>'id') !~ '^[1-9][0-9]*$'
          or (entry->>'quantity') !~ '^[1-9][0-9]*$'
          or (entry ? 'variant_id' and (entry->>'variant_id') !~ '^[1-9][0-9]*$')
     ) then
    raise exception 'INVALID_RETURN_ITEM';
  end if;

  for item_row in
    select
      (entry->>'id')::bigint as product_id,
      case when entry ? 'variant_id' then (entry->>'variant_id')::bigint end as variant_id,
      sum((entry->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(request_row.items) entry
    group by 1, 2
  loop
    select coalesce(sum(
      case
        when (entry->>'quantity') ~ '^[1-9][0-9]*$'
          then (entry->>'quantity')::integer
        else 0
      end
    ), 0)::integer
    into ordered_quantity
    from jsonb_array_elements(order_items) entry
    where (entry->>'id') ~ '^[1-9][0-9]*$'
      and (entry->>'id')::bigint = item_row.product_id
      and (
        (item_row.variant_id is null and not (entry ? 'variant_id'))
        or
        (item_row.variant_id is not null
          and (entry->>'variant_id') ~ '^[1-9][0-9]*$'
          and (entry->>'variant_id')::bigint = item_row.variant_id)
      );
    if ordered_quantity <= 0 or item_row.quantity > ordered_quantity then
      raise exception 'RETURN_QUANTITY_EXCEEDS_ORDER';
    end if;
  end loop;

  insert into public.return_inventory_releases(return_request_id)
  values (p_return_request_id)
  on conflict do nothing;
  if not found then return false; end if;

  for item_row in
    select
      (entry->>'id')::bigint as product_id,
      case when entry ? 'variant_id' then (entry->>'variant_id')::bigint end as variant_id,
      sum((entry->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(request_row.items) entry
    group by 1, 2
  loop
    if item_row.variant_id is not null then
      update public.product_variants
      set stock = stock + item_row.quantity
      where id = item_row.variant_id and product_id = item_row.product_id;
    else
      update public.products
      set stock = stock + item_row.quantity
      where id = item_row.product_id;
    end if;
    if not found then raise exception 'RETURN_PRODUCT_NOT_FOUND'; end if;
  end loop;
  return true;
end;
$$;

revoke all on function public.release_return_request_stock(bigint)
  from public, anon, authenticated;
grant execute on function public.release_return_request_stock(bigint)
  to service_role;

create index if not exists otp_proof_consumptions_expiry_idx
  on public.otp_proof_consumptions(expires_at);

create or replace function public.prune_operational_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.otp_verifications where created_at < now() - interval '2 days';
  delete from public.otp_proof_consumptions where expires_at < now() - interval '2 days';
  delete from public.api_rate_limits where window_started_at < now() - interval '2 days';
  delete from public.page_views where created_at < now() - interval '400 days';
  delete from public.product_views where created_at < now() - interval '400 days';
end;
$$;
revoke all on function public.prune_operational_data()
  from public, anon, authenticated;
grant execute on function public.prune_operational_data()
  to service_role;
