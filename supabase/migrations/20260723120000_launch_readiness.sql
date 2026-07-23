-- A product with active variants must never be ordered as a variant-less line.
-- This database guard complements the PayTR route validation and protects
-- future server-side order creation paths.
create or replace function public.validate_order_variant_selection()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  item jsonb;
  product_id_value bigint;
begin
  if jsonb_typeof(new.items::jsonb) <> 'array' then
    raise exception 'INVALID_ORDER_ITEMS';
  end if;

  for item in select value from jsonb_array_elements(new.items::jsonb)
  loop
    if (item->>'id') !~ '^[1-9][0-9]*$' then
      raise exception 'INVALID_ORDER_PRODUCT';
    end if;

    product_id_value := (item->>'id')::bigint;
    if not (item ? 'variant_id') and exists (
      select 1
      from public.product_variants
      where product_id = product_id_value
        and is_active = true
    ) then
      raise exception 'VARIANT_REQUIRED:%', product_id_value;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists orders_validate_variant_selection on public.orders;
create trigger orders_validate_variant_selection
before insert or update of items on public.orders
for each row execute function public.validate_order_variant_selection();
