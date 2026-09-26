begin;
create table if not exists public.trendyol_sync_jobs (
 id uuid primary key default gen_random_uuid(), seller_id text not null, environment text not null check(environment in ('stage','production')),
 starts_at bigint not null, ends_at bigint not null, cursor_value text, revision integer not null default 0,
 status text not null default 'ready' check(status in ('ready','complete')), cursor_history jsonb not null default '[]',
 updated_at timestamptz not null default now(), created_at timestamptz not null default now(),
 check(ends_at>starts_at and ends_at-starts_at<=1209600000)
);
create table if not exists public.trendyol_package_mirror (
 seller_id text not null, environment text not null, package_id text not null, modified_at bigint not null,
 payload jsonb not null, last_job uuid references public.trendyol_sync_jobs(id), seen_at timestamptz not null default now(),
 primary key(seller_id,environment,package_id)
);
alter table public.trendyol_sync_jobs enable row level security;
alter table public.trendyol_package_mirror enable row level security;
revoke all on public.trendyol_sync_jobs,public.trendyol_package_mirror from public,anon,authenticated,service_role;
grant select on public.trendyol_sync_jobs,public.trendyol_package_mirror to service_role;
create or replace function public.trendyol_begin_sync(p_seller text,p_environment text,p_start bigint,p_end bigint)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare j uuid;
begin
 if p_seller is null or p_seller !~ '^[1-9][0-9]{0,15}$' or p_environment is null or p_environment not in ('stage','production')
 or p_start is null or p_end is null or p_start<0 or p_end<=p_start or p_end-p_start>1209600000 then raise exception 'INVALID_SYNC'; end if;
 insert into trendyol_sync_jobs(seller_id,environment,starts_at,ends_at) values(p_seller,p_environment,p_start,p_end) returning id into j;
 return j;
end $$;
create or replace function public.trendyol_apply_sync_page(p_job uuid,p_revision integer,p_packages jsonb,p_cursor text,p_more boolean)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare j trendyol_sync_jobs; p jsonb; n integer; old_payload jsonb; old_modified bigint;
begin
 select * into j from trendyol_sync_jobs where id=p_job for update;
 if not found or p_revision is null or j.revision<>p_revision or j.status<>'ready' then raise exception 'SYNC_CONFLICT'; end if;
 perform pg_advisory_xact_lock(hashtextextended(j.seller_id||':'||j.environment,816));
 if j.revision>=2000 then raise exception 'SYNC_CAPACITY'; end if;
 if p_packages is null or jsonb_typeof(p_packages)<>'array' or jsonb_array_length(p_packages)>50 or octet_length(p_packages::text)>2097152 or p_more is null then raise exception 'INVALID_PAGE'; end if;
 if p_more and (p_cursor is null or length(p_cursor) not between 1 and 4096 or jsonb_array_length(p_packages)=0 or j.cursor_history ? p_cursor) then raise exception 'CURSOR_CYCLE'; end if;
 if (select count(distinct x->>'packageId') from jsonb_array_elements(p_packages) x)<>jsonb_array_length(p_packages) then raise exception 'DUPLICATE_PACKAGE'; end if;
 for p in select value from jsonb_array_elements(p_packages) loop
   if coalesce(p->>'packageId','') !~ '^[0-9]{1,20}$' or coalesce(p->>'modifiedAt','') !~ '^[0-9]{1,16}$' or jsonb_typeof(p->'lines') is distinct from 'array' then raise exception 'INVALID_PACKAGE'; end if;
   -- One package row per seller/environment; never write public.orders or stock.
   select payload,modified_at into old_payload,old_modified from trendyol_package_mirror
   where seller_id=j.seller_id and environment=j.environment and package_id=p->>'packageId' for update;
   if old_modified=(p->>'modifiedAt')::bigint and old_payload<>p then raise exception 'PROVIDER_VERSION_CONFLICT'; end if;
   insert into trendyol_package_mirror(seller_id,environment,package_id,modified_at,payload,last_job)
   values(j.seller_id,j.environment,p->>'packageId',(p->>'modifiedAt')::bigint,p,j.id)
   on conflict(seller_id,environment,package_id) do update set modified_at=excluded.modified_at,payload=excluded.payload,last_job=excluded.last_job,seen_at=now()
   where trendyol_package_mirror.modified_at<excluded.modified_at;
 end loop;
 n:=j.revision+1;
 update trendyol_sync_jobs set revision=n,cursor_value=case when p_more then p_cursor else null end,
 status=case when p_more then 'ready' else 'complete' end, updated_at=now(),
 cursor_history=case when p_more then cursor_history||jsonb_build_array(p_cursor) else cursor_history end where id=j.id;
 return n;
end $$;
revoke all on function public.trendyol_begin_sync(text,text,bigint,bigint),public.trendyol_apply_sync_page(uuid,integer,jsonb,text,boolean) from public,anon,authenticated;
grant execute on function public.trendyol_begin_sync(text,text,bigint,bigint),public.trendyol_apply_sync_page(uuid,integer,jsonb,text,boolean) to service_role;
commit;
