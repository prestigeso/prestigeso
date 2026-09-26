begin;
-- Preparation only: no dispatcher/cron or provider transmission is installed.
create table if not exists public.marketing_permissions (
 id uuid primary key, allowed boolean not null default true, version text not null,
 granted_at timestamptz not null default now(), revoked_at timestamptz
);
create table if not exists public.marketing_order_links (
 order_id bigint primary key references public.orders(id), subject_id uuid not null references public.marketing_permissions(id)
);
create table if not exists public.marketing_purchase_outbox (
 order_id bigint primary key references public.orders(id), event_id uuid not null unique default gen_random_uuid(),
 subject_id uuid references public.marketing_permissions(id), status text not null default 'held' check(status in ('held','cancelled')),
 payload jsonb, created_at timestamptz not null default now()
);
alter table public.marketing_permissions enable row level security;
alter table public.marketing_order_links enable row level security;
alter table public.marketing_purchase_outbox enable row level security;
revoke all on public.marketing_permissions,public.marketing_order_links,public.marketing_purchase_outbox from public,anon,authenticated,service_role;
grant select on public.marketing_permissions,public.marketing_order_links,public.marketing_purchase_outbox to service_role;
create or replace function public.marketing_set_permission(p_subject uuid,p_allowed boolean,p_version text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_subject is null or p_allowed is null or p_version is distinct from '2026-09-17' then raise exception 'INVALID_CONSENT'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_subject::text,820));
 if p_allowed then
  insert into marketing_permissions(id,version) values(p_subject,p_version) on conflict do nothing;
  if not exists(select 1 from marketing_permissions where id=p_subject and allowed) then raise exception 'CONSENT_REVOKED'; end if;
 else
  insert into marketing_permissions(id,version,allowed,revoked_at) values(p_subject,p_version,false,now()) on conflict(id) do update set allowed=false,revoked_at=now();
  update marketing_purchase_outbox set payload=null,subject_id=null,status='cancelled' where subject_id=p_subject;
  delete from marketing_order_links where subject_id=p_subject;
 end if;
end $$;
create or replace function public.marketing_prepare_purchase(p_order bigint)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare o orders; s uuid; consent marketing_permissions;
begin
 select subject_id into s from marketing_order_links where order_id=p_order;
 if s is null then return; end if;
 perform pg_advisory_xact_lock(hashtextextended(s::text,820));
 select * into consent from marketing_permissions where id=s;
 select * into o from orders where id=p_order;
 if not consent.allowed or consent.granted_at>o.created_at or consent.granted_at<now()-interval '30 days' or o.paid_at is null or o.payment_status not in ('paid','partially_refunded','refunded') then return; end if;
 insert into marketing_purchase_outbox(order_id,subject_id,payload) values(o.id,s,jsonb_build_object(
  'event_name','Purchase','event_time',floor(extract(epoch from o.paid_at)), 'action_source','website',
  'event_source_url','https://www.prestigeso.com.tr/odeme/basarili',
  'custom_data',jsonb_build_object('currency','TRY','value',o.total_amount,
  'content_type','product','content_ids',(select jsonb_agg(i->>'id') from jsonb_array_elements(o.items) i))))
 on conflict(order_id) do nothing;
end $$;
create or replace function public.marketing_link_order(p_subject uuid,p_merchant text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare oid bigint;
begin
 -- Payment update takes the order lock first too; avoid a missed late-binding event.
 select id into oid from orders where merchant_oid=p_merchant for update;
 if oid is null then return; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_subject::text,820));
 select o.id into oid from orders o join marketing_permissions p on p.id=p_subject
 where o.merchant_oid=p_merchant and p.allowed and p.granted_at<=o.created_at;
 if oid is null then return; end if;
 insert into marketing_order_links(order_id,subject_id) values(oid,p_subject) on conflict do nothing;
 perform marketing_prepare_purchase(oid);
end $$;
create or replace function public.marketing_payment_changed()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin perform marketing_prepare_purchase(new.id); return new; end $$;
drop trigger if exists marketing_payment_changed on public.orders;
create trigger marketing_payment_changed after update of payment_status,paid_at on public.orders
for each row execute function public.marketing_payment_changed();
revoke all on function public.marketing_set_permission(uuid,boolean,text),public.marketing_prepare_purchase(bigint),public.marketing_link_order(uuid,text),public.marketing_payment_changed() from public,anon,authenticated,service_role;
grant execute on function public.marketing_set_permission(uuid,boolean,text),public.marketing_link_order(uuid,text) to service_role;
commit;
