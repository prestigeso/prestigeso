begin;
-- Separate private accounting evidence; never a second order/stock ledger.
create table if not exists public.phase2_records (
 kind text not null check(kind in ('product_cost','order_cost','advertising','sku_mapping')),
 resource_key text not null check(length(resource_key) between 1 and 160),
 version integer not null check(version>0), payload jsonb not null,
 updated_at timestamptz not null default now(), primary key(kind,resource_key)
);
create table if not exists public.phase2_record_history (
 request_id uuid primary key, kind text not null, resource_key text not null,
 version integer not null, payload jsonb not null, recorded_at timestamptz not null default now(),
 unique(kind,resource_key,version)
);
create table if not exists public.phase2_order_cost_snapshots (
 order_id bigint primary key references public.orders(id), captured_at timestamptz not null default now(),
 lines jsonb not null check(jsonb_typeof(lines)='array')
);
alter table public.phase2_records enable row level security;
alter table public.phase2_record_history enable row level security;
alter table public.phase2_order_cost_snapshots enable row level security;
revoke all on public.phase2_records,public.phase2_record_history,public.phase2_order_cost_snapshots from public,anon,authenticated,service_role;
grant select on public.phase2_records,public.phase2_record_history,public.phase2_order_cost_snapshots to service_role;

create or replace function public.phase2_save_record(p_request uuid,p_kind text,p_key text,p_expected integer,p_payload jsonb)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare v integer; previous public.phase2_record_history; amount numeric;
begin
 if p_request is null or p_kind is null or p_key is null or p_expected is null or p_expected<0 or p_payload is null
 or p_kind not in ('product_cost','order_cost','advertising','sku_mapping') or length(p_key) not between 1 and 160
 or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>2048
 or coalesce(length(p_payload->>'note'),0) not between 3 and 500 then raise exception 'INVALID_RECORD'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,812));
 select * into previous from phase2_record_history where request_id=p_request;
 if found then
   if previous.kind<>p_kind or previous.resource_key<>p_key or previous.payload<>p_payload or previous.version<>p_expected+1 then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
   return previous.version;
 end if;
 if p_kind='sku_mapping' then
   if not exists(select 1 from products where "SKU"=p_payload->>'siteSku') then raise exception 'SKU_NOT_FOUND'; end if;
 else
   if coalesce(p_payload->>'taxBasis','') not in ('inclusive','exclusive') or coalesce(p_payload->>'currency','')<>'TRY' or not(p_payload ? 'amountMinor') then raise exception 'INVALID_RECORD'; end if;
   if p_payload->'amountMinor'<>'null'::jsonb then
     if jsonb_typeof(p_payload->'amountMinor')<>'number' then raise exception 'INVALID_AMOUNT'; end if;
     amount:=(p_payload->>'amountMinor')::numeric;
     if amount<0 or amount>100000000000 or amount<>trunc(amount) then raise exception 'INVALID_AMOUNT'; end if;
   end if;
   if p_kind='product_cost' and not exists(select 1 from products where "SKU"=p_key) then raise exception 'SKU_NOT_FOUND'; end if;
   if p_kind='order_cost' then
     if p_key !~ '^[1-9][0-9]{0,14}:(paymentFees|packaging|shipping|returnCosts|goods)$' then raise exception 'INVALID_KEY'; end if;
     if not exists(select 1 from orders where id=split_part(p_key,':',1)::bigint) then raise exception 'ORDER_NOT_FOUND'; end if;
   end if;
   if p_kind='advertising' and p_key !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}:[^:]{1,100}$' then raise exception 'INVALID_KEY'; end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_kind||':'||p_key,813));
 select version into v from phase2_records where kind=p_kind and resource_key=p_key;
 if coalesce(v,0)<>p_expected then raise exception 'VERSION_CONFLICT'; end if;
 v:=coalesce(v,0)+1;
 insert into phase2_records(kind,resource_key,version,payload) values(p_kind,p_key,v,p_payload)
 on conflict(kind,resource_key) do update set version=excluded.version,payload=excluded.payload,updated_at=now();
 insert into phase2_record_history(request_id,kind,resource_key,version,payload) values(p_request,p_kind,p_key,v,p_payload);
 return v;
end $$;
revoke all on function public.phase2_save_record(uuid,text,text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.phase2_save_record(uuid,text,text,integer,jsonb) to service_role;

create or replace function public.phase2_capture_order_costs()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare captured jsonb;
begin
 -- Capture at insertion, never backfill old orders from today's product costs.
 -- Variant-specific costs are unknown until an explicit order correction is recorded.
 select coalesce(jsonb_agg(jsonb_build_object('productId',i->>'id','variantId',i->>'variant_id',
   'quantity',i->'quantity','sku',p."SKU",'unitCost',case when i->>'variant_id' is null then r.payload-'note' else null end,
   'costVersion',case when i->>'variant_id' is null then r.version else null end)), '[]'::jsonb)
 into captured from jsonb_array_elements(new.items) i
 left join products p on p.id::text=i->>'id'
 left join phase2_records r on r.kind='product_cost' and r.resource_key=p."SKU";
 insert into phase2_order_cost_snapshots(order_id,lines) values(new.id,captured);
 return new;
end $$;
revoke all on function public.phase2_capture_order_costs() from public,anon,authenticated,service_role;
drop trigger if exists phase2_capture_order_costs on public.orders;
create trigger phase2_capture_order_costs after insert on public.orders for each row execute function public.phase2_capture_order_costs();
commit;
