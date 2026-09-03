-- Record contractual acceptance and optional marketing consent separately.
-- Existing forced/bundled marketing wording is not treated as valid consent.

alter table public.customers
  add column if not exists marketing_consent boolean not null default false,
  add column if not exists marketing_consent_at timestamptz,
  add column if not exists marketing_consent_revoked_at timestamptz,
  add column if not exists marketing_consent_version text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists privacy_notice_presented_at timestamptz,
  add column if not exists privacy_notice_version text;

update public.customers
set marketing_consent = false,
    marketing_consent_at = null,
    marketing_consent_revoked_at = null,
    marketing_consent_version = '2026-08-23',
    terms_accepted_at = coalesce(terms_accepted_at, created_at),
    terms_version = coalesce(terms_version, 'legacy-registration'),
    privacy_notice_presented_at = coalesce(privacy_notice_presented_at, created_at),
    privacy_notice_version = coalesce(privacy_notice_version, 'legacy-registration')
where marketing_consent_version is null
   or terms_accepted_at is null
   or privacy_notice_presented_at is null;

alter table public.customers
  drop constraint if exists customers_marketing_consent_dates_check;
alter table public.customers
  add constraint customers_marketing_consent_dates_check
  check (
    (marketing_consent = false)
    or (marketing_consent_at is not null and marketing_consent_revoked_at is null)
  ) not valid;
alter table public.customers
  validate constraint customers_marketing_consent_dates_check;

create index if not exists customers_marketing_consent_idx
  on public.customers(marketing_consent)
  where marketing_consent = true;
