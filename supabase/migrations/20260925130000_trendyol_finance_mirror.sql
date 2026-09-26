begin;
-- Projected operational data only: no names, addresses, notes or raw provider payload.
create table if not exists public.trendyol_claim_mirror (
 seller_id text not null, environment text not null check(environment in ('stage','production')),
 claim_id uuid not null, order_number text not null, original_package_id text,
 claim_date bigint not null, modified_at bigint not null, statuses text[] not null,
 seen_at timestamptz not null default now(),
 primary key(seller_id,environment,claim_id),
 check(modified_at>=claim_date and cardinality(statuses)>0)
);
create index if not exists trendyol_claim_order on public.trendyol_claim_mirror(seller_id,environment,order_number);
create table if not exists public.trendyol_return_settlement_mirror (
 seller_id text not null, environment text not null check(environment in ('stage','production')),
 transaction_id text not null, order_number text not null, package_id text,
 transaction_at timestamptz not null, debt numeric(18,2) not null,
 credit numeric(18,2) not null, commission_amount numeric(18,4), seller_revenue numeric(18,4),
 seen_at timestamptz not null default now(),
 primary key(seller_id,environment,transaction_id)
);
create index if not exists trendyol_return_order on public.trendyol_return_settlement_mirror(seller_id,environment,order_number);
create table if not exists public.trendyol_finance_windows (
 seller_id text not null, environment text not null check(environment in ('stage','production')),
 starts_at bigint not null, ends_at bigint not null, synced_at timestamptz not null default now(),
 primary key(seller_id,environment,starts_at), check(ends_at-starts_at=1209600000)
);
alter table public.trendyol_claim_mirror enable row level security;
alter table public.trendyol_return_settlement_mirror enable row level security;
alter table public.trendyol_finance_windows enable row level security;
revoke all on public.trendyol_claim_mirror,public.trendyol_return_settlement_mirror,public.trendyol_finance_windows from public,anon,authenticated,service_role;
grant select on public.trendyol_claim_mirror,public.trendyol_return_settlement_mirror,public.trendyol_finance_windows to service_role;

-- All three projections and the coverage checkpoint commit together.
create or replace function public.trendyol_apply_finance_window(p_seller text,p_environment text,p_start bigint,p_end bigint,p_claims jsonb,p_returns jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare c jsonb; r jsonb; old_claim public.trendyol_claim_mirror; old_return public.trendyol_return_settlement_mirror;
begin
 if p_seller !~ '^[1-9][0-9]{0,15}$' or p_environment not in ('stage','production') or p_start<0 or p_end-p_start<>1209600000
 or p_end>extract(epoch from now())*1000+1209600000 or jsonb_typeof(p_claims) is distinct from 'array' or jsonb_typeof(p_returns) is distinct from 'array'
 or jsonb_array_length(p_claims)>250 or jsonb_array_length(p_returns)>2500 or octet_length(p_claims::text)+octet_length(p_returns::text)>2097152 then raise exception 'INVALID_FINANCE_WINDOW'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_seller||':'||p_environment,829));
 for c in select value from jsonb_array_elements(p_claims) loop
   if c->>'seller_id'<>p_seller or c->>'environment'<>p_environment or coalesce(c->>'order_number','') !~ '^[1-9][0-9]{0,29}$'
   or jsonb_typeof(c->'statuses') is distinct from 'array' or (c->>'modified_at')::bigint<p_start or (c->>'modified_at')::bigint>p_end then raise exception 'INVALID_CLAIM'; end if;
   select * into old_claim from public.trendyol_claim_mirror where seller_id=p_seller and environment=p_environment and claim_id=(c->>'claim_id')::uuid for update;
   if found and (old_claim.order_number<>c->>'order_number' or old_claim.claim_date<>(c->>'claim_date')::bigint) then raise exception 'CLAIM_CONFLICT'; end if;
   if found and old_claim.modified_at=(c->>'modified_at')::bigint and (old_claim.order_number<>c->>'order_number' or old_claim.original_package_id is distinct from c->>'original_package_id' or old_claim.claim_date<>(c->>'claim_date')::bigint or old_claim.statuses<>array(select jsonb_array_elements_text(c->'statuses'))) then raise exception 'CLAIM_CONFLICT'; end if;
   insert into public.trendyol_claim_mirror(seller_id,environment,claim_id,order_number,original_package_id,claim_date,modified_at,statuses)
   values(p_seller,p_environment,(c->>'claim_id')::uuid,c->>'order_number',c->>'original_package_id',(c->>'claim_date')::bigint,(c->>'modified_at')::bigint,array(select jsonb_array_elements_text(c->'statuses')))
   on conflict(seller_id,environment,claim_id) do update set original_package_id=excluded.original_package_id,modified_at=excluded.modified_at,statuses=excluded.statuses,seen_at=now()
   where public.trendyol_claim_mirror.modified_at<excluded.modified_at;
 end loop;
 for r in select value from jsonb_array_elements(p_returns) loop
   if r->>'seller_id'<>p_seller or r->>'environment'<>p_environment or coalesce(r->>'order_number','') !~ '^[1-9][0-9]{0,29}$'
   or (extract(epoch from (r->>'transaction_at')::timestamptz)*1000)::bigint<p_start or (extract(epoch from (r->>'transaction_at')::timestamptz)*1000)::bigint>p_end then raise exception 'INVALID_RETURN'; end if;
   select * into old_return from public.trendyol_return_settlement_mirror where seller_id=p_seller and environment=p_environment and transaction_id=r->>'transaction_id' for update;
   if found then
     if old_return.order_number<>r->>'order_number' or old_return.package_id is distinct from r->>'package_id'
     or old_return.transaction_at<>(r->>'transaction_at')::timestamptz or old_return.debt<>(r->>'debt')::numeric or old_return.credit<>(r->>'credit')::numeric
     or old_return.commission_amount is distinct from (r->>'commission_amount')::numeric
     or old_return.seller_revenue is distinct from (r->>'seller_revenue')::numeric then raise exception 'RETURN_CONFLICT'; end if;
   else
     insert into public.trendyol_return_settlement_mirror(seller_id,environment,transaction_id,order_number,package_id,transaction_at,debt,credit,commission_amount,seller_revenue)
     values(p_seller,p_environment,r->>'transaction_id',r->>'order_number',r->>'package_id',(r->>'transaction_at')::timestamptz,(r->>'debt')::numeric,(r->>'credit')::numeric,(r->>'commission_amount')::numeric,(r->>'seller_revenue')::numeric);
   end if;
 end loop;
 insert into public.trendyol_finance_windows(seller_id,environment,starts_at,ends_at)
 values(p_seller,p_environment,p_start,p_end)
 on conflict(seller_id,environment,starts_at) do update set synced_at=now();
end $$;
revoke all on function public.trendyol_apply_finance_window(text,text,bigint,bigint,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.trendyol_apply_finance_window(text,text,bigint,bigint,jsonb,jsonb) to service_role;
commit;
