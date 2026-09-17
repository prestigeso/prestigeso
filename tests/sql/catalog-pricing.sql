-- Synthetic, isolated PostgreSQL only. Every test row is rolled back.
begin;
do $$ begin
  if (current_database() <> 'prestigeso_phase0' and current_database() !~ '^prestigeso_phase0_(fresh|legacy|restored)_[0-9]{17}$')
    or inet_server_addr() <> '127.0.0.1'::inet or inet_server_port() <> 55432 then
    raise exception 'LOCAL_PHASE0_DATABASE_REQUIRED';
  end if;
end $$;

insert into public.products(id, "SKU", name, price, discount_price, stock, campaign_start_date, campaign_end_date)
overriding system value values
  (990901, 'PHASE0-PRICE-1', 'Plain', 1000, 0, 10, null, null),
  (990902, 'PHASE0-PRICE-2', 'Active fixed plus campaign', 1000, 800, 10, now()-interval '1 day', now()+interval '1 day'),
  (990903, 'PHASE0-PRICE-3', 'Future fixed', 1000, 800, 10, now()+interval '1 day', now()+interval '2 days'),
  (990904, 'PHASE0-PRICE-4', 'Expired fixed', 1000, 800, 10, now()-interval '2 days', now()-interval '1 day'),
  (990905, 'PHASE0-PRICE-5', 'Variants', 1000, 800, 100, null, null),
  (990906, 'PHASE0-PRICE-6', 'Inherited variant', 1000, 800, 10, null, null),
  (990907, 'PHASE0-PRICE-7', 'Expired campaign', 1000, 0, 10, null, null),
  (990908, 'PHASE0-PRICE-8', 'Future campaign', 1000, 0, 10, null, null);

insert into public.product_variants(product_id, sku, price, stock, is_active) values
  (990905, 'PHASE0-PRICE-V1', 500, 0, true),
  (990905, 'PHASE0-PRICE-V2', 900, 3, true),
  (990905, 'PHASE0-PRICE-V3', 1200, 2, true),
  (990905, 'PHASE0-PRICE-V4', 1, 100, false),
  (990906, 'PHASE0-PRICE-V5', null, 2, true);

insert into public.campaigns(name, discount_percent, product_ids, start_date, end_date) values
  ('PHASE0 current 10', 10, '[990902,990905]', now()-interval '1 day', now()+interval '1 day'),
  ('PHASE0 current 30', 30, '[990902,990905]', now()-interval '1 day', now()+interval '1 day'),
  ('PHASE0 expired', 30, '[990907]', now()-interval '2 days', now()-interval '1 day'),
  ('PHASE0 future', 30, '[990908]', now()+interval '1 day', now()+interval '2 days');

do $$ begin
  if (select effective_price from public.products_public_catalog where id=990901) <> 1000 then raise exception 'PLAIN_PRICE'; end if;
  if (select effective_price from public.products_public_catalog where id=990902) <> 700 then raise exception 'NONSTACKING_BEST_CAMPAIGN'; end if;
  if exists (select 1 from public.products_public_catalog where id in (990903,990904,990907,990908) and effective_price <> 1000) then raise exception 'TIME_WINDOWS'; end if;
  if (select effective_price from public.products_public_catalog where id=990905) <> 630 then raise exception 'VARIANT_PRICE'; end if;
  if (select display_base_price from public.products_public_catalog where id=990905) <> 900 then raise exception 'VARIANT_BASE'; end if;
  if (select available_stock from public.products_public_catalog where id=990905) <> 5 then raise exception 'INACTIVE_STOCK'; end if;
  if (select effective_price from public.products_public_catalog where id=990906) <> 800 then raise exception 'VARIANT_INHERITS_FIXED'; end if;
  if (select array_agg(id order by effective_price, id) from public.products_public_catalog where id between 990901 and 990908 and effective_price <= 850) <> array[990905,990902,990906]::bigint[] then raise exception 'FILTER_AND_SORT'; end if;
  if (select count(*) from public.products_public_catalog where id between 990901 and 990908 and is_discounted) <> 3 then raise exception 'DISCOUNT_FILTER'; end if;
end $$;

set local role anon;
do $$ begin
  if (select count(*) from public.products_public_catalog where id between 990901 and 990908) <> 8 then raise exception 'ANON_READ'; end if;
  if has_table_privilege('anon', 'public.products_public_catalog', 'UPDATE') then raise exception 'ANON_MUST_NOT_UPDATE'; end if;
end $$;
reset role;

update public.product_variants set stock=0 where product_id=990905 and is_active=true;
update public.products set stock=100 where id=990905;
do $$ begin
  if (select available_stock from public.products_public_catalog where id=990905) <> 0 then raise exception 'STALE_PARENT_STOCK'; end if;
end $$;
rollback;
