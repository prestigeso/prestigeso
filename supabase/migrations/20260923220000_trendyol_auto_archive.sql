begin;
alter table public.trendyol_sync_jobs add column if not exists automatic boolean not null default false;
-- Existing mirror remains admin/service-only. No checkout, stock or payment triggers run.
create index if not exists trendyol_archive_date on public.trendyol_package_mirror
 (seller_id,environment,((payload->>'orderDate')::bigint) desc,package_id);

create or replace function public.trendyol_auto_job(p_seller text,p_environment text,p_now bigint)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare j trendyol_sync_jobs; start_at bigint; finish_at bigint;
begin
 if p_seller !~ '^[1-9][0-9]{0,15}$' or p_environment not in ('stage','production')
 or p_now is null or abs(p_now-extract(epoch from now())*1000)>120000 then raise exception 'INVALID_SYNC'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_seller||':'||p_environment,817));
 select * into j from trendyol_sync_jobs where seller_id=p_seller and environment=p_environment
 and automatic and status='ready' and ends_at>=p_now-89*86400000::bigint order by created_at limit 1;
 if found then
   -- Expired cursor: restart the same fixed interval; package upsert is idempotent.
   if j.updated_at<now()-interval '1 hour' then
     update trendyol_sync_jobs set cursor_value=null,cursor_history='[]',revision=revision+1,updated_at=now() where id=j.id;
   end if;
   return j.id;
 end if;
 select * into j from trendyol_sync_jobs where seller_id=p_seller and environment=p_environment
 and automatic and status='complete' order by ends_at desc limit 1;
 if found then
   if j.ends_at>p_now-120000 then return null; end if;
   start_at:=greatest(j.ends_at-300000,p_now-89*86400000::bigint);
 else start_at:=p_now-89*86400000::bigint;
 end if;
 finish_at:=least(start_at+14*86400000::bigint,p_now);
 insert into trendyol_sync_jobs(seller_id,environment,starts_at,ends_at,automatic)
 values(p_seller,p_environment,start_at,finish_at,true) returning id into j.id;
 return j.id;
end $$;
revoke all on function public.trendyol_auto_job(text,text,bigint) from public,anon,authenticated;
grant execute on function public.trendyol_auto_job(text,text,bigint) to service_role;

-- Allow old minimal archive rows to receive the new explicitly projected detail fields.
-- Subsequent same-version disagreements still fail rather than silently overwrite.
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
   select payload,modified_at into old_payload,old_modified from trendyol_package_mirror
   where seller_id=j.seller_id and environment=j.environment and package_id=p->>'packageId' for update;
   if old_modified=(p->>'modifiedAt')::bigint and old_payload<>p and old_payload->>'schemaVersion'='2' then raise exception 'PROVIDER_VERSION_CONFLICT'; end if;
   insert into trendyol_package_mirror(seller_id,environment,package_id,modified_at,payload,last_job)
   values(j.seller_id,j.environment,p->>'packageId',(p->>'modifiedAt')::bigint,p,j.id)
   on conflict(seller_id,environment,package_id) do update set modified_at=excluded.modified_at,payload=excluded.payload,last_job=excluded.last_job,seen_at=now()
   where trendyol_package_mirror.modified_at<excluded.modified_at or
    (trendyol_package_mirror.modified_at=excluded.modified_at and trendyol_package_mirror.payload->>'schemaVersion' is distinct from '2');
 end loop;
 n:=j.revision+1;
 update trendyol_sync_jobs set revision=n,cursor_value=case when p_more then p_cursor else null end,
 status=case when p_more then 'ready' else 'complete' end,updated_at=now(),
 cursor_history=case when p_more then cursor_history||jsonb_build_array(p_cursor) else cursor_history end where id=j.id;
 return n;
end $$;
commit;
