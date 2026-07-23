-- Older production databases may already contain these tables without the
-- updated_at columns defined by the baseline schema. Add the columns before
-- installing the shared trigger so updates cannot fail at runtime.
alter table if exists public.products
  add column if not exists updated_at timestamptz not null default now();
alter table if exists public.customers
  add column if not exists updated_at timestamptz not null default now();
alter table if exists public.addresses
  add column if not exists updated_at timestamptz not null default now();
alter table if exists public.orders
  add column if not exists updated_at timestamptz not null default now();
alter table if exists public.site_settings
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  v_table_name text;
begin
  foreach v_table_name in array array[
    'products',
    'customers',
    'addresses',
    'orders',
    'site_settings'
  ]
  loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and information_schema.columns.table_name = v_table_name
        and column_name = 'updated_at'
    ) then
      execute format(
        'drop trigger if exists %I on public.%I',
        v_table_name || '_set_updated_at',
        v_table_name
      );
      execute format(
        'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
        v_table_name || '_set_updated_at',
        v_table_name
      );
    end if;
  end loop;
end
$$;
