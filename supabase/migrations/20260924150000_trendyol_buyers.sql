begin;
create table if not exists public.trendyol_buyers (
 seller_id text not null, environment text not null check(environment in ('stage','production')),
 buyer_key text not null check(buyer_key ~ '^[a-f0-9]{64}$'), first_order_at timestamptz not null,
 primary key(seller_id,environment,buyer_key)
);
alter table public.trendyol_buyers enable row level security;
revoke all on public.trendyol_buyers from public,anon,authenticated,service_role;
grant select on public.trendyol_buyers to service_role;
create or replace function public.trendyol_record_buyers(p_seller text,p_environment text,p_buyers jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_seller is null or p_seller !~ '^[1-9][0-9]{0,15}$' or p_environment is null or p_environment not in ('stage','production')
 or p_buyers is null or jsonb_typeof(p_buyers)<>'array' or jsonb_array_length(p_buyers)>50 then raise exception 'INVALID_BUYERS'; end if;
 insert into trendyol_buyers(seller_id,environment,buyer_key,first_order_at)
 select p_seller,p_environment,x.buyer_key,min(x.first_order_at) from jsonb_to_recordset(p_buyers) as x(buyer_key text,first_order_at timestamptz) group by x.buyer_key
 on conflict(seller_id,environment,buyer_key) do update set first_order_at=least(trendyol_buyers.first_order_at,excluded.first_order_at);
end $$;
revoke all on function public.trendyol_record_buyers(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.trendyol_record_buyers(text,text,jsonb) to service_role;
commit;
