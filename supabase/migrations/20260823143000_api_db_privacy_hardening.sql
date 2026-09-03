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
