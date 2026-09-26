begin;
-- A correction may start five days ago even if a previous version started later.
-- The highest version effective by the sale timestamp wins; all versions stay immutable.
alter table public.profit_profiles drop constraint if exists profit_profiles_platform_effective_from_key;
create index if not exists profit_profiles_period_lookup on public.profit_profiles(platform,effective_from,version desc);

create or replace function public.save_profit_profile(p_request uuid,p_platform text,p_expected integer,p_effective timestamptz,p_settings jsonb)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare old public.profit_profiles; latest public.profit_profiles; k text; n numeric;
begin
  if p_request is null or p_platform not in ('store','trendyol') or p_platform is null or p_expected is null or p_expected < 0 or p_effective is null or p_effective > now() or jsonb_typeof(p_settings) is distinct from 'object' then raise exception 'INVALID_PROFILE'; end if;
  if (select count(*) from jsonb_object_keys(p_settings)) <> 9 then raise exception 'INVALID_SETTINGS'; end if;
  foreach k in array array['vatBps','commissionBps','shippingMinor','packagingMinor','logisticsMinor','giftThresholdMinor','giftCostMinor','hiddenBps','advertisingBps'] loop
    if jsonb_typeof(p_settings->k) is distinct from 'number' then raise exception 'INVALID_SETTINGS'; end if;
    n := (p_settings->>k)::numeric;
    if n <> trunc(n) or n < 0 or n > (case when right(k,3)='Bps' then 10000 else 100000000 end) then raise exception 'INVALID_SETTINGS'; end if;
  end loop;
  if (p_settings->>'giftCostMinor')::numeric > 0 and (p_settings->>'giftThresholdMinor')::numeric <= 0 then raise exception 'INVALID_GIFT_RULE'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request::text,824));
  select * into old from public.profit_profiles where request_id=p_request;
  if found then
    if old.platform<>p_platform or old.version<>p_expected+1 or old.settings<>p_settings or old.effective_from<>p_effective then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    return old.version;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_platform,825));
  select * into latest from public.profit_profiles where platform=p_platform order by version desc limit 1;
  if coalesce(latest.version,0)<>p_expected then raise exception 'VERSION_CONFLICT'; end if;
  insert into public.profit_profiles(platform,version,request_id,effective_from,settings)
  values(p_platform,p_expected+1,p_request,p_effective,p_settings);
  return p_expected+1;
end $$;
revoke all on function public.save_profit_profile(uuid,text,integer,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.save_profit_profile(uuid,text,integer,timestamptz,jsonb) to service_role;
commit;
