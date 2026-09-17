begin;

-- Read-only projection: no owner/RLS bypass and no customer/private fields.
-- Pricing rules mirror lib/commerce/catalogPricing.ts. No discounts stack.
create or replace view public.products_public_catalog
with (security_invoker = true)
as
select p.id, p.name, p.price, p.image, p.images, p.category, p.stock,
  p."SKU", p.barcode, p.description, p.is_bestseller, p.discount_price,
  p.campaign_start_date, p.campaign_end_date, p.created_at,
  offer.effective_price, offer.display_base_price,
  (offer.effective_price < offer.display_base_price) as is_discounted,
  (coalesce(variants.variant_count, 0) > 0) as has_variants,
  case when coalesce(variants.variant_count, 0) > 0
    then variants.available_stock else greatest(coalesce(p.stock, 0), 0) end as available_stock
from public.products p
left join lateral (
  select count(*) as variant_count,
    coalesce(sum(greatest(coalesce(v.stock, 0), 0)), 0) as available_stock,
    count(*) filter (where v.stock > 0) as stocked_count
  from public.product_variants v
  where v.product_id = p.id and v.is_active = true
) variants on true
left join lateral (
  select max(c.discount_percent::numeric) as percent
  from public.campaigns c
  join public.campaign_products cp on cp.campaign_id = c.id
  where cp.product_id = p.id and now() >= c.start_date and now() <= c.end_date
    and c.discount_percent::numeric > 0 and c.discount_percent::numeric < 100
) campaign on true
cross join lateral (
  select priced.effective_price, priced.display_base_price
  from (
    select round(least(
      choice.base_price,
      case when choice.inherits_price
        and p.discount_price > 0 and p.discount_price < choice.base_price
        and (p.campaign_start_date is null or now() >= p.campaign_start_date)
        and (p.campaign_end_date is null or now() <= p.campaign_end_date)
        then p.discount_price else choice.base_price end,
      case when campaign.percent is not null
        then choice.base_price * (1 - campaign.percent / 100) else choice.base_price end
    ), 2) as effective_price, choice.base_price as display_base_price, choice.variant_id
    from (
      select coalesce(v.price, p.price)::numeric as base_price,
        (v.price is null) as inherits_price, v.id as variant_id
      from public.product_variants v
      where v.product_id = p.id and v.is_active = true
        and (variants.stocked_count = 0 or v.stock > 0)
      union all
      select p.price::numeric, true, null::bigint
      where variants.variant_count = 0
    ) choice
  ) priced
  order by priced.effective_price, priced.variant_id nulls first
  limit 1
) offer;

revoke all on public.products_public_catalog from public, anon, authenticated;
grant select on public.products_public_catalog to anon, authenticated, service_role;
comment on view public.products_public_catalog is 'Public, RLS-preserving effective price and purchasable stock projection. Deploy before the Phase 0 storefront code.';

commit;
