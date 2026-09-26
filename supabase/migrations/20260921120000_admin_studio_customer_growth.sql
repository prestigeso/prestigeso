-- Aggregated report only. No customer identifiers are returned to the browser.
begin;
create or replace function public.admin_customer_growth(p_period text default '28d')
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_since timestamptz; v_bucket text; v_result jsonb;
begin
 if p_period not in ('48h','7d','28d','90d','365d') then raise exception 'INVALID_PERIOD'; end if;
 v_since := now() - case p_period when '48h' then interval '48 hours' when '7d' then interval '7 days' when '28d' then interval '28 days' when '90d' then interval '90 days' else interval '365 days' end;
 v_bucket := case when p_period='48h' then 'hour' when p_period='365d' then 'month' else 'day' end;
 with first_orders as (
  select min(paid_at) as first_paid_at
  from public.orders
  where paid_at is not null and payment_status in ('paid','partially_refunded','refunded')
   and (user_id is not null or nullif(trim(user_email),'') is not null)
  group by case when user_id is not null then 'u:'||user_id::text else 'e:'||lower(trim(user_email)) end
 ), buckets as (
  select date_trunc(v_bucket, first_paid_at at time zone 'Europe/Istanbul') as bucket, count(*) as n
  from first_orders where first_paid_at >= v_since group by 1
 ) select jsonb_build_object(
  'total',(select count(*) from first_orders),
  'newCustomers',(select count(*) from first_orders where first_paid_at>=v_since),
  'series',coalesce((select jsonb_agg(jsonb_build_object('label',to_char(bucket,case when p_period='48h' then 'DD.MM HH24:MI' when p_period='365d' then 'YYYY-MM' else 'DD.MM' end),'value',n) order by bucket) from buckets),'[]'::jsonb)
 ) into v_result;
 return v_result;
end $$;
revoke all on function public.admin_customer_growth(text) from public, anon, authenticated;
grant execute on function public.admin_customer_growth(text) to service_role;
commit;
