-- ISOLATED DATABASE FIXTURE ONLY. Emulates the user's historical column types.
-- Apply after reporting_views and before security_and_operations; never run in production.
do $$ declare c record;
begin
  for c in select conrelid::regclass as relation,conname from pg_constraint
    where contype='c' and (
      (conrelid='public.products'::regclass and pg_get_constraintdef(oid) ~ '(price|images)') or
      (conrelid='public.reviews'::regclass and pg_get_constraintdef(oid) ~ 'images') or
      (conrelid='public.coupons'::regclass and pg_get_constraintdef(oid) ~ 'discount_value'))
  loop execute format('alter table %s drop constraint %I',c.relation,c.conname); end loop;
end $$;
create function pg_temp.jsonb_to_text_array(value jsonb) returns text[] language sql immutable as $$
  select coalesce(array_agg(item),array[]::text[]) from jsonb_array_elements_text(value) item
$$;
alter table public.products
  alter column price type text using price::text,
  alter column discount_price drop default,
  alter column discount_price type text using discount_price::text,
  alter column images drop default,
  alter column images type text[] using pg_temp.jsonb_to_text_array(images),
  alter column images set default array[]::text[];
alter table public.reviews
  alter column images drop default,
  alter column images type text[] using pg_temp.jsonb_to_text_array(images),
  alter column images set default array[]::text[];
alter table public.coupons alter column discount_value type text using discount_value::text;
insert into auth.users(id,email) values('93000000-0000-4000-8000-000000000001','legacy-fixture@example.invalid');
insert into public.products(id,"SKU",name,price,discount_price,images,stock) overriding system value values
  (9300001,'LEGACY-COMMA-FIXTURE','Legacy comma price',' 1000,50 ',' 900,25 ',array['https://example.invalid/fixture-product.jpg'],4),
  (9300002,'LEGACY-BLANK-DISCOUNT','Legacy blank discount','1000.00','',array[]::text[],2);
insert into public.coupons(code,name,discount_type,discount_value) values('LEGACYFIXTURE','Legacy comma coupon','fixed','10,50');
insert into public.reviews(product_id,user_id,user_name,rating,comment,images,is_approved)
  values(9300001,'93000000-0000-4000-8000-000000000001','Private legacy buyer',5,'Legacy test comment',array['https://example.invalid/fixture-review.jpg'],true);
