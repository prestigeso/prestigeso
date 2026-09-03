-- MANUAL PRODUCTION REPAIR BUNDLE - 2026-08-31
-- Paste this whole file into Supabase SQL Editor and run it once.
-- 20260823154000_legal_consent_records.sql is intentionally omitted because it already succeeded.

begin;

-- === 20260823143000_api_db_privacy_hardening.sql ===
-- Harden public questions, profile writes and return-evidence lifecycle.

-- Some production databases contain this legacy audit table even though it is
-- absent from the canonical migrations. It is server-managed and must never be
-- directly exposed through PostgREST. Keep clean installs compatible by
-- hardening it only when it exists.
do $$
begin
  if to_regclass('public.order_status_history') is not null then
    execute 'alter table public.order_status_history enable row level security';
    execute 'revoke all on table public.order_status_history from public, anon, authenticated';
  end if;
end
$$;

-- Questions are created only by the authenticated server API. Storefront and
-- owner reads are moved to narrow views below.
revoke insert on table public.questions from public, anon, authenticated;
drop policy if exists questions_insert_own on public.questions;

create index if not exists questions_product_approved_created_idx
  on public.questions(product_id, is_approved, created_at desc);

-- Browser profile edits may change only the fields exposed by SettingsTab.
-- Identity, timestamps and consent evidence remain server-managed.
revoke update on table public.customers from authenticated;
grant update (first_name, last_name, full_name, phone, gender, birth_date)
  on table public.customers to authenticated;

-- Replace email-derived public aliases with a privacy-friendly customer name.
with customer_display_names as (
  select
    id,
    case
      when btrim(coalesce(first_name, '')) <> '' then
        left(split_part(btrim(first_name), ' ', 1), 80) ||
        case when btrim(coalesce(last_name, '')) <> ''
          then ' ' || upper(left(btrim(last_name), 1)) || '.' else '' end
      when btrim(coalesce(full_name, '')) <> '' then
        left(split_part(btrim(full_name), ' ', 1), 80) ||
        case when btrim(full_name) like '% %'
          then ' ' || upper(left(regexp_replace(btrim(full_name), '^.*[[:space:]]+', ''), 1)) || '.'
          else '' end
      else 'Müşteri'
    end as display_name
  from public.customers
)
update public.reviews review_row
set user_name = names.display_name
from customer_display_names names
where review_row.user_id = names.id;

update public.reviews review_row
set user_name = 'Müşteri'
where not exists (
  select 1 from public.customers customer where customer.id = review_row.user_id
);

with customer_display_names as (
  select
    id,
    case
      when btrim(coalesce(first_name, '')) <> '' then
        left(split_part(btrim(first_name), ' ', 1), 80) ||
        case when btrim(coalesce(last_name, '')) <> ''
          then ' ' || upper(left(btrim(last_name), 1)) || '.' else '' end
      when btrim(coalesce(full_name, '')) <> '' then
        left(split_part(btrim(full_name), ' ', 1), 80) ||
        case when btrim(full_name) like '% %'
          then ' ' || upper(left(regexp_replace(btrim(full_name), '^.*[[:space:]]+', ''), 1)) || '.'
          else '' end
      else 'Müşteri'
    end as display_name
  from public.customers
)
update public.questions question_row
set user_name = names.display_name
from customer_display_names names
where question_row.user_id = names.id;

update public.questions question_row
set user_name = 'Müşteri'
where not exists (
  select 1 from public.customers customer where customer.id = question_row.user_id
);

-- Public storefront reads must never expose the owning auth UUID or the raw
-- storage object URL. Keep the base tables service-role only and publish a
-- deliberately narrow, moderation-gated projection instead.
revoke select on table public.reviews from public, anon, authenticated;
revoke select on table public.questions from public, anon, authenticated;
drop policy if exists reviews_read_public_or_own on public.reviews;
drop policy if exists questions_read_public_or_own on public.questions;

-- Replace views in place so external/reporting dependants retain their OIDs.
-- In particular, product_engagement_stats depends on product_review_stats.
create or replace view public.public_product_reviews
with (security_barrier = true)
as
select
  review_row.id,
  review_row.product_id,
  review_row.rating,
  review_row.comment,
  review_row.user_name,
  coalesce(
    (
      select jsonb_agg(
        format(
          '/api/review-images/%s/%s',
          review_row.id,
          stored_image.ordinality - 1
        )
        order by stored_image.ordinality
      )
      from jsonb_array_elements_text(
        coalesce(to_jsonb(review_row.images), '[]'::jsonb)
      )
        with ordinality as stored_image(raw_url, ordinality)
      where stored_image.ordinality <= 3
        and btrim(stored_image.raw_url) <> ''
    ),
    '[]'::jsonb
  ) as images,
  true as is_approved,
  review_row.created_at
from public.reviews review_row
where review_row.is_approved = true;

create or replace view public.public_product_questions
with (security_barrier = true)
as
select
  question_row.id,
  question_row.product_id,
  question_row.question,
  question_row.user_name,
  question_row.answer,
  true as is_approved,
  question_row.answered_at,
  question_row.created_at
from public.questions question_row
where question_row.is_approved = true;

-- Account pages still need the signed-in customer's pending records. These
-- views are restricted to auth.uid(), omit user_id and are not granted to anon.
create or replace view public.my_product_reviews
with (security_barrier = true)
as
select
  review_row.id,
  review_row.product_id,
  review_row.rating,
  review_row.comment,
  review_row.user_name,
  coalesce(to_jsonb(review_row.images), '[]'::jsonb) as images,
  review_row.is_approved,
  review_row.created_at,
  to_jsonb(product_row) as products
from public.reviews review_row
join public.products product_row on product_row.id = review_row.product_id
where review_row.user_id = auth.uid();

create or replace view public.my_product_questions
with (security_barrier = true)
as
select
  question_row.id,
  question_row.product_id,
  question_row.question,
  question_row.user_name,
  question_row.answer,
  question_row.is_approved,
  question_row.answered_at,
  question_row.created_at,
  to_jsonb(product_row) as products
from public.questions question_row
join public.products product_row on product_row.id = question_row.product_id
where question_row.user_id = auth.uid();

revoke all on table public.public_product_reviews
  from public, anon, authenticated;
revoke all on table public.public_product_questions
  from public, anon, authenticated;
revoke all on table public.my_product_reviews
  from public, anon, authenticated;
revoke all on table public.my_product_questions
  from public, anon, authenticated;
grant select on table public.public_product_reviews to anon, authenticated, service_role;
grant select on table public.public_product_questions to anon, authenticated, service_role;
grant select on table public.my_product_reviews to authenticated;
grant select on table public.my_product_questions to authenticated;

-- Preserve the existing storefront rating API after base-table SELECT is
-- revoked. The outer invoker view reads only the approved public projection.
create or replace view public.product_review_stats
with (security_invoker = true, security_barrier = true)
as
select
  product_row.id as product_id,
  coalesce(round(avg(review_row.rating)::numeric, 2), 0) as rating_avg,
  count(review_row.id)::bigint as review_count
from public.products product_row
left join public.public_product_reviews review_row
  on review_row.product_id = product_row.id
group by product_row.id;
grant select on table public.product_review_stats to anon, authenticated, service_role;

create table if not exists public.return_evidence_uploads (
  object_path text primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  return_request_id bigint references public.return_requests(id) on delete restrict,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  deletion_started_at timestamptz,
  deletion_claim_id uuid,
  check (char_length(object_path) between 20 and 500),
  check ((return_request_id is null) = (submitted_at is null)),
  check (return_request_id is null or deletion_started_at is null)
);

alter table public.return_evidence_uploads
  add column if not exists deletion_started_at timestamptz,
  add column if not exists deletion_claim_id uuid;

-- A previous interrupted rollout may have set the old timestamp-only marker.
-- Re-open those rows before introducing worker-owned deletion claims.
update public.return_evidence_uploads
set deletion_started_at = null
where deletion_started_at is not null
  and deletion_claim_id is null
  and return_request_id is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'return_evidence_deletion_claim_consistency'
      and conrelid = 'public.return_evidence_uploads'::regclass
  ) then
    alter table public.return_evidence_uploads
      add constraint return_evidence_deletion_claim_consistency
      check ((deletion_started_at is null) = (deletion_claim_id is null)) not valid;
  end if;
end
$$;
alter table public.return_evidence_uploads
  validate constraint return_evidence_deletion_claim_consistency;

create index if not exists return_evidence_uploads_order_idx
  on public.return_evidence_uploads(order_id, user_id);
create index if not exists return_evidence_uploads_stale_idx
  on public.return_evidence_uploads(created_at)
  where return_request_id is null;

alter table public.return_evidence_uploads enable row level security;
revoke all on table public.return_evidence_uploads from public, anon, authenticated;

-- Backfill already-submitted private evidence so it is also protected by the
-- new lifecycle table. Invalid legacy paths are deliberately ignored.
insert into public.return_evidence_uploads(
  object_path,
  order_id,
  user_id,
  return_request_id,
  created_at,
  submitted_at
)
select
  evidence.object_path,
  request.order_id,
  request.user_id,
  request.id,
  request.created_at,
  request.created_at
from public.return_requests request
cross join lateral jsonb_array_elements_text(
  coalesce(to_jsonb(request.evidence_urls), '[]'::jsonb)
) evidence(object_path)
where evidence.object_path like
  ('returns/' || request.user_id::text || '/' || request.order_id::text || '/%')
  and evidence.object_path not like '%..%'
  and char_length(evidence.object_path) between 20 and 500
on conflict (object_path) do nothing;

create or replace function public.reserve_return_evidence_uploads(
  p_order_id bigint,
  p_user_id uuid,
  p_object_paths text[]
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_count integer := cardinality(coalesce(p_object_paths, array[]::text[]));
  existing_count integer;
  inserted_count integer;
begin
  if requested_count < 1 or requested_count > 3 then
    raise exception 'RETURN_EVIDENCE_INVALID';
  end if;
  if (select count(distinct path) from unnest(p_object_paths) paths(path)) <> requested_count then
    raise exception 'RETURN_EVIDENCE_INVALID';
  end if;
  if exists (
    select 1 from unnest(p_object_paths) paths(path)
    where path is null
      or path like '%..%'
      or path not like ('returns/' || p_user_id::text || '/' || p_order_id::text || '/%')
  ) then
    raise exception 'RETURN_EVIDENCE_INVALID';
  end if;

  perform 1
  from public.orders
  where id = p_order_id
    and user_id = p_user_id
    and payment_status = 'paid'
    and status in ('Teslim Edildi', 'Tamamlandı')
    and now() - coalesce(delivered_at, created_at) <= interval '14 days'
  for update;
  if not found then raise exception 'ORDER_NOT_RETURNABLE'; end if;

  select count(*) into existing_count
  from public.return_evidence_uploads
  where order_id = p_order_id
    and user_id = p_user_id
    and return_request_id is null
    and created_at > now() - interval '24 hours';
  if existing_count + requested_count > 3 then return false; end if;

  insert into public.return_evidence_uploads(object_path, order_id, user_id)
  select path, p_order_id, p_user_id from unnest(p_object_paths) paths(path)
  on conflict do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count <> requested_count then
    raise exception 'RETURN_EVIDENCE_INVALID';
  end if;
  return true;
end;
$$;

-- Remove draft signatures safely when this hardening script is re-applied in a
-- staging database. PostgreSQL cannot CREATE OR REPLACE a changed return type.
drop function if exists public.release_return_evidence_uploads(bigint, uuid, text[]);
drop function if exists public.complete_return_evidence_release(bigint, uuid, text[]);
drop function if exists public.cancel_return_evidence_release(bigint, uuid, text[]);

create or replace function public.release_return_evidence_uploads(
  p_order_id bigint,
  p_user_id uuid,
  p_object_paths text[]
)
returns table(object_path text, deletion_claim_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_count integer := cardinality(coalesce(p_object_paths, array[]::text[]));
  removable_count integer;
  release_claim_id uuid := gen_random_uuid();
begin
  if requested_count < 1 or requested_count > 3 or
     (select count(distinct path) from unnest(p_object_paths) paths(path)) <> requested_count then
    raise exception 'RETURN_EVIDENCE_NOT_REMOVABLE';
  end if;

  perform 1 from public.orders
  where id = p_order_id and user_id = p_user_id
  for update;
  if not found then raise exception 'RETURN_EVIDENCE_NOT_REMOVABLE'; end if;

  if exists (
    select 1 from public.return_evidence_uploads upload
    where upload.object_path = any(p_object_paths)
      and upload.order_id = p_order_id
      and upload.user_id = p_user_id
      and upload.return_request_id is not null
  ) then
    raise exception 'RETURN_EVIDENCE_SUBMITTED';
  end if;

  select count(*) into removable_count
  from public.return_evidence_uploads upload
  where upload.object_path = any(p_object_paths)
    and upload.order_id = p_order_id
    and upload.user_id = p_user_id
    and upload.return_request_id is null
    and upload.deletion_started_at is null;
  if removable_count <> requested_count then
    raise exception 'RETURN_EVIDENCE_NOT_REMOVABLE';
  end if;

  return query
  update public.return_evidence_uploads upload
  set deletion_started_at = now(), deletion_claim_id = release_claim_id
  where upload.object_path = any(p_object_paths)
    and upload.order_id = p_order_id
    and upload.user_id = p_user_id
    and upload.return_request_id is null
    and upload.deletion_started_at is null
  returning upload.object_path, upload.deletion_claim_id;
end;
$$;

create or replace function public.complete_return_evidence_release(
  p_deletion_claim_id uuid,
  p_object_paths text[]
)
returns table(object_path text)
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_count integer := cardinality(coalesce(p_object_paths, array[]::text[]));
begin
  if p_deletion_claim_id is null or requested_count < 1 or requested_count > 200 or
     (select count(distinct path) from unnest(p_object_paths) paths(path)) <> requested_count then
    raise exception 'RETURN_EVIDENCE_NOT_REMOVABLE';
  end if;

  return query
  delete from public.return_evidence_uploads upload
  where upload.object_path = any(p_object_paths)
    and upload.return_request_id is null
    and upload.deletion_claim_id = p_deletion_claim_id
  returning upload.object_path;
end;
$$;

create or replace function public.cancel_return_evidence_release(
  p_deletion_claim_id uuid,
  p_object_paths text[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_count integer := cardinality(coalesce(p_object_paths, array[]::text[]));
  restored_count integer;
begin
  if p_deletion_claim_id is null or requested_count < 1 or requested_count > 200 or
     (select count(distinct path) from unnest(p_object_paths) paths(path)) <> requested_count then
    raise exception 'RETURN_EVIDENCE_NOT_REMOVABLE';
  end if;

  update public.return_evidence_uploads upload
  set deletion_started_at = null, deletion_claim_id = null
  where upload.object_path = any(coalesce(p_object_paths, array[]::text[]))
    and upload.return_request_id is null
    and upload.deletion_claim_id = p_deletion_claim_id;
  get diagnostics restored_count = row_count;
  return restored_count;
end;
$$;

-- Claim abandoned, unsubmitted uploads in bounded batches. A worker claim can
-- be taken over only after 30 minutes, so a crashed cleanup cannot strand rows
-- forever and concurrent workers cannot complete/cancel each other's claims.
create or replace function public.claim_stale_return_evidence_uploads(
  p_deletion_claim_id uuid,
  p_limit integer default 100
)
returns table(object_path text, order_id bigint, user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_deletion_claim_id is null or p_limit < 1 or p_limit > 200 then
    raise exception 'RETURN_EVIDENCE_CLEANUP_INVALID';
  end if;

  return query
  with candidates as (
    select upload.object_path
    from public.return_evidence_uploads upload
    where upload.return_request_id is null
      and (
        (
          upload.deletion_started_at is null
          and upload.created_at <= now() - interval '24 hours'
        )
        or upload.deletion_started_at <= now() - interval '30 minutes'
      )
    order by upload.created_at
    for update skip locked
    limit p_limit
  )
  update public.return_evidence_uploads upload
  set deletion_started_at = now(), deletion_claim_id = p_deletion_claim_id
  from candidates
  where upload.object_path = candidates.object_path
  returning upload.object_path, upload.order_id, upload.user_id;
end;
$$;

create or replace function public.create_return_request_with_evidence(
  p_order_id bigint,
  p_user_id uuid,
  p_reason text,
  p_items jsonb,
  p_evidence_paths text[]
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.orders%rowtype;
  request_id bigint;
  requested_count integer := cardinality(coalesce(p_evidence_paths, array[]::text[]));
  matched_count integer;
begin
  select * into order_row
  from public.orders
  where id = p_order_id and user_id = p_user_id
  for update;
  if not found or order_row.payment_status <> 'paid' or
     order_row.status not in ('Teslim Edildi', 'Tamamlandı') then
    raise exception 'ORDER_NOT_RETURNABLE';
  end if;
  if now() - coalesce(order_row.delivered_at, order_row.created_at) > interval '14 days' then
    raise exception 'ORDER_NOT_RETURNABLE';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 5 and 1000 then
    raise exception 'RETURN_REQUEST_INVALID';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'RETURN_REQUEST_INVALID';
  end if;
  if jsonb_array_length(p_items) < 1 then
    raise exception 'RETURN_REQUEST_INVALID';
  end if;
  if requested_count > 3 or
     (select count(distinct path) from unnest(coalesce(p_evidence_paths, array[]::text[])) paths(path)) <> requested_count then
    raise exception 'RETURN_EVIDENCE_INVALID';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_evidence_paths, array[]::text[])) paths(path)
    where path is null
      or path like '%..%'
      or path not like ('returns/' || p_user_id::text || '/' || p_order_id::text || '/%')
  ) then
    raise exception 'RETURN_EVIDENCE_INVALID';
  end if;
  if exists (
    select 1 from public.return_requests
    where order_id = p_order_id and user_id = p_user_id
  ) then
    raise exception 'RETURN_REQUEST_EXISTS';
  end if;

  select count(*) into matched_count
  from public.return_evidence_uploads upload
  where upload.order_id = p_order_id
    and upload.user_id = p_user_id
    and upload.object_path = any(coalesce(p_evidence_paths, array[]::text[]))
    and upload.return_request_id is null
    and upload.deletion_started_at is null
    and upload.created_at > now() - interval '24 hours';
  if matched_count <> requested_count then
    raise exception 'RETURN_EVIDENCE_INVALID';
  end if;

  insert into public.return_requests(
    order_id, user_id, reason, items, evidence_urls, original_order_status
  ) values (
    p_order_id,
    p_user_id,
    btrim(p_reason),
    p_items,
    to_jsonb(coalesce(p_evidence_paths, array[]::text[])),
    order_row.status
  ) returning id into request_id;

  if requested_count > 0 then
    update public.return_evidence_uploads upload
    set return_request_id = request_id, submitted_at = now()
    where upload.order_id = p_order_id
      and upload.user_id = p_user_id
      and upload.object_path = any(p_evidence_paths)
      and upload.return_request_id is null
      and upload.deletion_started_at is null;
    get diagnostics matched_count = row_count;
    if matched_count <> requested_count then
      raise exception 'RETURN_EVIDENCE_INVALID';
    end if;
  end if;

  update public.orders set status = 'İade Talebi' where id = p_order_id;
  return request_id;
end;
$$;

revoke all on function public.reserve_return_evidence_uploads(bigint, uuid, text[])
  from public, anon, authenticated;
revoke all on function public.release_return_evidence_uploads(bigint, uuid, text[])
  from public, anon, authenticated;
revoke all on function public.complete_return_evidence_release(uuid, text[])
  from public, anon, authenticated;
revoke all on function public.cancel_return_evidence_release(uuid, text[])
  from public, anon, authenticated;
revoke all on function public.claim_stale_return_evidence_uploads(uuid, integer)
  from public, anon, authenticated;
revoke all on function public.create_return_request_with_evidence(bigint, uuid, text, jsonb, text[])
  from public, anon, authenticated;
grant execute on function public.reserve_return_evidence_uploads(bigint, uuid, text[]) to service_role;
grant execute on function public.release_return_evidence_uploads(bigint, uuid, text[]) to service_role;
grant execute on function public.complete_return_evidence_release(uuid, text[]) to service_role;
grant execute on function public.cancel_return_evidence_release(uuid, text[]) to service_role;
grant execute on function public.claim_stale_return_evidence_uploads(uuid, integer) to service_role;
grant execute on function public.create_return_request_with_evidence(bigint, uuid, text, jsonb, text[]) to service_role;

-- === 20260823153000_checkout_idempotency.sql ===
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

commit;
