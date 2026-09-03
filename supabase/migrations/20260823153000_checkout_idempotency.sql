-- Checkout idempotency is deliberately kept behind service_role. A random
-- client key is scoped to a server-derived identity and a request fingerprint.
-- The final order, OTP consumption, coupon reservation, stock reservation and
-- replayable response are committed in one transaction.

alter table public.orders
  add column if not exists contract_version text,
  add column if not exists contract_accepted_at timestamptz,
  add column if not exists contract_snapshot_hash text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_contract_acceptance_complete'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_contract_acceptance_complete check (
        (contract_version is null and contract_accepted_at is null and contract_snapshot_hash is null)
        or (
          contract_version is not null
          and char_length(contract_version) between 1 and 50
          and contract_accepted_at is not null
          and contract_snapshot_hash ~ '^[0-9a-f]{64}$'
        )
      ) not valid;
  end if;
end $$;

alter table public.orders validate constraint orders_contract_acceptance_complete;

create table if not exists public.checkout_idempotency_keys (
  identity_hash text not null check (identity_hash ~ '^[0-9a-f]{64}$'),
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  attempt_hash text not null check (attempt_hash ~ '^[0-9a-f]{64}$'),
  request_fingerprint text not null check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  merchant_oid text not null unique,
  state text not null default 'processing'
    check (state in ('processing', 'completed', 'failed', 'expired')),
  lease_expires_at timestamptz,
  order_id bigint references public.orders(id) on delete set null,
  otp_consumed_at timestamptz,
  response_status integer check (response_status between 100 and 599),
  response_payload jsonb,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (identity_hash, key_hash),
  check (
    (state = 'completed' and response_status is not null and response_payload is not null)
    or state <> 'completed'
  )
);

create index if not exists checkout_idempotency_expiry_idx
  on public.checkout_idempotency_keys(expires_at);

alter table public.checkout_idempotency_keys enable row level security;
revoke all on public.checkout_idempotency_keys from public, anon, authenticated;
grant select, insert, update, delete on public.checkout_idempotency_keys to service_role;

create or replace function public.claim_checkout_idempotency(
  p_identity_hash text,
  p_key_hash text,
  p_attempt_hash text,
  p_request_fingerprint text,
  p_merchant_oid text,
  p_lease_seconds integer default 300
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.checkout_idempotency_keys%rowtype;
  v_lease_seconds integer := greatest(30, least(coalesce(p_lease_seconds, 300), 600));
  v_payment_status text;
begin
  if p_identity_hash !~ '^[0-9a-f]{64}$'
     or p_key_hash !~ '^[0-9a-f]{64}$'
     or p_attempt_hash !~ '^[0-9a-f]{64}$'
     or p_request_fingerprint !~ '^[0-9a-f]{64}$'
     or p_merchant_oid !~ '^[A-Za-z0-9]+$'
     or char_length(p_merchant_oid) > 64 then
    raise exception 'INVALID_CHECKOUT_IDEMPOTENCY_INPUT';
  end if;

  -- Serialize both first creation and later claims for the same identity/key.
  perform pg_advisory_xact_lock(
    hashtextextended(p_identity_hash || ':' || p_key_hash, 0)
  );

  select * into v_row
  from public.checkout_idempotency_keys
  where identity_hash = p_identity_hash and key_hash = p_key_hash
  for update;

  if not found then
    insert into public.checkout_idempotency_keys(
      identity_hash,
      key_hash,
      attempt_hash,
      request_fingerprint,
      merchant_oid,
      state,
      lease_expires_at,
      expires_at
    ) values (
      p_identity_hash,
      p_key_hash,
      p_attempt_hash,
      p_request_fingerprint,
      p_merchant_oid,
      'processing',
      now() + make_interval(secs => v_lease_seconds),
      now() + interval '30 minutes'
    )
    returning * into v_row;

    return jsonb_build_object(
      'action', 'acquired',
      'merchant_oid', v_row.merchant_oid
    );
  end if;

  if v_row.request_fingerprint <> p_request_fingerprint
     or v_row.merchant_oid <> p_merchant_oid then
    return jsonb_build_object('action', 'conflict');
  end if;

  if v_row.expires_at <= now() or v_row.state = 'expired' then
    update public.checkout_idempotency_keys
    set state = 'expired',
        lease_expires_at = null,
        response_payload = null,
        updated_at = now()
    where identity_hash = p_identity_hash and key_hash = p_key_hash;
    return jsonb_build_object('action', 'expired');
  end if;

  if v_row.state = 'completed' then
    if v_row.order_id is not null then
      select payment_status into v_payment_status
      from public.orders
      where id = v_row.order_id;

      if v_payment_status is distinct from 'pending' then
        return jsonb_build_object('action', 'terminal');
      end if;
    end if;
    return jsonb_build_object(
      'action', 'completed',
      'status', v_row.response_status,
      'response', v_row.response_payload
    );
  end if;

  if v_row.state = 'processing' and v_row.lease_expires_at > now() then
    return jsonb_build_object(
      'action', 'in_progress',
      'retry_after', greatest(
        1,
        ceil(extract(epoch from (v_row.lease_expires_at - now())))::integer
      )
    );
  end if;

  update public.checkout_idempotency_keys
  set state = 'processing',
      attempt_hash = p_attempt_hash,
      lease_expires_at = now() + make_interval(secs => v_lease_seconds),
      updated_at = now()
  where identity_hash = p_identity_hash and key_hash = p_key_hash;

  return jsonb_build_object(
    'action', 'acquired',
    'merchant_oid', v_row.merchant_oid
  );
end;
$$;

create or replace function public.fail_checkout_idempotency(
  p_identity_hash text,
  p_key_hash text,
  p_attempt_hash text,
  p_request_fingerprint text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.checkout_idempotency_keys
  set state = 'failed',
      lease_expires_at = null,
      updated_at = now()
  where identity_hash = p_identity_hash
    and key_hash = p_key_hash
    and attempt_hash = p_attempt_hash
    and request_fingerprint = p_request_fingerprint
    and state = 'processing';
  return found;
end;
$$;

create or replace function public.complete_checkout_idempotency(
  p_identity_hash text,
  p_key_hash text,
  p_attempt_hash text,
  p_request_fingerprint text,
  p_response_status integer,
  p_response_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.checkout_idempotency_keys%rowtype;
begin
  if p_response_status < 100 or p_response_status > 599
     or p_response_payload is null then
    raise exception 'INVALID_IDEMPOTENCY_RESPONSE';
  end if;

  select * into v_row
  from public.checkout_idempotency_keys
  where identity_hash = p_identity_hash and key_hash = p_key_hash
  for update;

  if not found
     or v_row.attempt_hash <> p_attempt_hash
     or v_row.request_fingerprint <> p_request_fingerprint then
    raise exception 'CHECKOUT_IDEMPOTENCY_MISMATCH';
  end if;
  if v_row.state = 'completed' then
    return v_row.response_payload;
  end if;
  if v_row.state <> 'processing' then
    raise exception 'CHECKOUT_IDEMPOTENCY_NOT_PROCESSING';
  end if;

  update public.checkout_idempotency_keys
  set state = 'completed',
      response_status = p_response_status,
      response_payload = p_response_payload,
      lease_expires_at = null,
      updated_at = now()
  where identity_hash = p_identity_hash and key_hash = p_key_hash;

  return p_response_payload;
end;
$$;

create or replace function public.finalize_idempotent_checkout_order(
  p_identity_hash text,
  p_key_hash text,
  p_attempt_hash text,
  p_request_fingerprint text,
  p_order jsonb,
  p_response_payload jsonb,
  p_otp_token_hash text default null,
  p_otp_expires_at timestamptz default null,
  p_coupon_id text default null,
  p_coupon_user_id uuid default null,
  p_coupon_code text default null,
  p_coupon_discount_amount numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.checkout_idempotency_keys%rowtype;
  v_order_id bigint;
  v_consumed_hash text;
begin
  if nullif(p_order->>'contract_version', '') is null
     or nullif(p_order->>'contract_accepted_at', '') is null
     or coalesce(p_order->>'contract_snapshot_hash', '') !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_CONTRACT_ACCEPTANCE';
  end if;

  select * into v_row
  from public.checkout_idempotency_keys
  where identity_hash = p_identity_hash and key_hash = p_key_hash
  for update;

  if not found
     or v_row.attempt_hash <> p_attempt_hash
     or v_row.request_fingerprint <> p_request_fingerprint
     or v_row.merchant_oid <> p_order->>'merchant_oid' then
    raise exception 'CHECKOUT_IDEMPOTENCY_MISMATCH';
  end if;
  if v_row.state = 'completed' then
    return v_row.response_payload;
  end if;
  if v_row.state <> 'processing' or v_row.expires_at <= now() then
    raise exception 'CHECKOUT_IDEMPOTENCY_NOT_PROCESSING';
  end if;

  if p_otp_token_hash is not null then
    if p_otp_token_hash !~ '^[0-9a-f]{64}$'
       or p_otp_expires_at is null
       or p_otp_expires_at <= now() then
      raise exception 'INVALID_OTP_PROOF';
    end if;

    if v_row.otp_consumed_at is null then
      insert into public.otp_proof_consumptions(token_hash, expires_at)
      values (p_otp_token_hash, p_otp_expires_at)
      on conflict (token_hash) do nothing
      returning token_hash into v_consumed_hash;

      if v_consumed_hash is null then
        raise exception 'OTP_PROOF_ALREADY_CONSUMED';
      end if;
    end if;
  end if;

  insert into public.orders (
    order_no,
    merchant_oid,
    user_id,
    user_email,
    items,
    total_amount,
    shipping_address,
    status,
    payment_provider,
    payment_status,
    paytr_total_amount,
    tracking_token_hash,
    coupon_code,
    coupon_discount_amount,
    contract_version,
    contract_accepted_at,
    contract_snapshot_hash
  ) values (
    p_order->>'order_no',
    p_order->>'merchant_oid',
    nullif(p_order->>'user_id', '')::uuid,
    p_order->>'user_email',
    p_order->'items',
    (p_order->>'total_amount')::numeric,
    p_order->'shipping_address',
    'Ödeme Bekleniyor',
    'paytr',
    'pending',
    (p_order->>'paytr_total_amount')::bigint,
    p_order->>'tracking_token_hash',
    nullif(p_order->>'coupon_code', ''),
    nullif(p_order->>'coupon_discount_amount', '')::numeric,
    p_order->>'contract_version',
    (p_order->>'contract_accepted_at')::timestamptz,
    p_order->>'contract_snapshot_hash'
  )
  returning id into v_order_id;

  if p_coupon_id is not null then
    if p_coupon_user_id is null
       or p_coupon_code is null
       or p_coupon_discount_amount is null
       or p_coupon_discount_amount <= 0 then
      raise exception 'INVALID_COUPON_RESERVATION';
    end if;
    perform public.reserve_order_coupon(
      p_coupon_id,
      p_coupon_user_id,
      v_order_id,
      p_coupon_code,
      p_coupon_discount_amount
    );
  end if;

  perform public.reserve_order_stock(v_order_id);

  update public.checkout_idempotency_keys
  set state = 'completed',
      order_id = v_order_id,
      otp_consumed_at = case
        when p_otp_token_hash is null then otp_consumed_at
        else coalesce(otp_consumed_at, now())
      end,
      response_status = 200,
      response_payload = p_response_payload,
      lease_expires_at = null,
      updated_at = now()
  where identity_hash = p_identity_hash and key_hash = p_key_hash;

  return p_response_payload;
exception
  when unique_violation then
    raise exception 'CHECKOUT_ORDER_ALREADY_EXISTS';
end;
$$;

revoke all on function public.claim_checkout_idempotency(text, text, text, text, text, integer)
  from public, anon, authenticated;
revoke all on function public.fail_checkout_idempotency(text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.complete_checkout_idempotency(text, text, text, text, integer, jsonb)
  from public, anon, authenticated;
revoke all on function public.finalize_idempotent_checkout_order(text, text, text, text, jsonb, jsonb, text, timestamptz, text, uuid, text, numeric)
  from public, anon, authenticated;

grant execute on function public.claim_checkout_idempotency(text, text, text, text, text, integer)
  to service_role;
grant execute on function public.fail_checkout_idempotency(text, text, text, text)
  to service_role;
grant execute on function public.complete_checkout_idempotency(text, text, text, text, integer, jsonb)
  to service_role;
grant execute on function public.finalize_idempotent_checkout_order(text, text, text, text, jsonb, jsonb, text, timestamptz, text, uuid, text, numeric)
  to service_role;

-- Extend the existing maintenance job. Response bodies contain short-lived
-- PayTR checkout tokens, so they are erased after the 30-minute replay window.
-- Hash tombstones remain for 400 days to prevent accidental key reuse.
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

  update public.checkout_idempotency_keys
  set state = 'expired',
      response_payload = null,
      lease_expires_at = null,
      updated_at = now()
  where expires_at < now() and state <> 'expired';

  delete from public.checkout_idempotency_keys
  where created_at < now() - interval '400 days';
end;
$$;

revoke all on function public.prune_operational_data()
  from public, anon, authenticated;
grant execute on function public.prune_operational_data()
  to service_role;
