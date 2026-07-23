-- Read models used by storefront and admin dashboards. Aggregating in PostgreSQL
-- avoids transferring every review/favorite/view row to the browser.

create or replace view public.product_review_stats
with (security_invoker = true)
as
select
  p.id as product_id,
  coalesce(round(avg(r.rating)::numeric, 2), 0) as rating_avg,
  count(r.id)::bigint as review_count
from public.products p
left join public.reviews r
  on r.product_id = p.id
 and r.is_approved = true
group by p.id;

create or replace view public.product_engagement_stats
with (security_invoker = true)
as
select
  p.id as product_id,
  coalesce(f.favorite_count, 0)::bigint as favorite_count,
  coalesce(v.view_count, 0)::bigint as view_count,
  coalesce(r.rating_avg, 0)::numeric as rating_avg,
  coalesce(r.review_count, 0)::bigint as review_count
from public.products p
left join (
  select product_id, count(*)::bigint as favorite_count
  from public.favorites
  group by product_id
) f on f.product_id = p.id
left join (
  select product_id, count(*)::bigint as view_count
  from public.product_views
  group by product_id
) v on v.product_id = p.id
left join public.product_review_stats r on r.product_id = p.id;

grant select on public.product_review_stats to anon, authenticated, service_role;
grant select on public.product_engagement_stats to service_role;

create or replace function public.get_admin_dashboard_totals()
returns table (
  monthly_order_count bigint,
  monthly_revenue numeric,
  all_time_order_count bigint,
  all_time_revenue numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*) filter (where created_at >= date_trunc('month', now()))::bigint,
    coalesce(sum(total_amount) filter (where created_at >= date_trunc('month', now())), 0)::numeric,
    count(*)::bigint,
    coalesce(sum(total_amount), 0)::numeric
  from public.orders
  where payment_status = 'paid'
    and status not in ('İptal Edildi', 'İade Edildi', 'İptal edildi');
$$;

revoke all on function public.get_admin_dashboard_totals() from public, anon, authenticated;
grant execute on function public.get_admin_dashboard_totals() to service_role;

create or replace view public.admin_daily_order_stats
with (security_invoker = true)
as
select
  created_at::date as day,
  count(*)::bigint as order_count,
  coalesce(sum(total_amount), 0)::numeric as revenue
from public.orders
where payment_status = 'paid'
  and status not in ('İptal Edildi', 'İade Edildi', 'İptal edildi')
group by created_at::date;

create or replace view public.admin_daily_visit_stats
with (security_invoker = true)
as
select created_at::date as day, count(*)::bigint as visit_count
from public.page_views
group by created_at::date;

grant select on public.admin_daily_order_stats to service_role;
grant select on public.admin_daily_visit_stats to service_role;
