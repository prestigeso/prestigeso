begin;
create table if not exists public.analytics_visitors (
 id uuid primary key, consent boolean not null default true,
 created_at timestamptz not null default now(), last_seen timestamptz not null default now()
);
create table if not exists public.analytics_sessions (
 id uuid primary key default gen_random_uuid(), visitor_id uuid not null references public.analytics_visitors(id) on delete cascade,
 started_at timestamptz not null default now(), last_seen timestamptz not null default now(),
 entry_page text not null check(entry_page in ('home','shop','product','checkout','other')),
 source text not null check(source in ('direct','search','social','internal','other')),
 device text not null check(device in ('ios','android','desktop_other')),
 traffic text not null check(traffic in ('normal','staff','suspected')), policy_version text not null default '2026-09-17'
);
create index if not exists analytics_sessions_visitor_time on public.analytics_sessions(visitor_id,last_seen desc);
create index if not exists analytics_sessions_time on public.analytics_sessions(started_at);
create table if not exists public.analytics_events (
 sequence bigint generated always as identity primary key,
 event_id uuid not null, visitor_id uuid not null references public.analytics_visitors(id) on delete cascade,
 session_id uuid not null references public.analytics_sessions(id) on delete cascade,
 received_at timestamptz not null default now(), payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=2048),
 unique(visitor_id,event_id)
);
create index if not exists analytics_events_session on public.analytics_events(session_id,sequence);
create index if not exists analytics_events_time on public.analytics_events(received_at);
create table if not exists public.analytics_order_links (
 order_id bigint primary key references public.orders(id) on delete cascade,
 visitor_id uuid not null references public.analytics_visitors(id) on delete cascade,
 session_id uuid not null references public.analytics_sessions(id) on delete cascade,
 cart_id uuid not null, attempt_id uuid not null, created_at timestamptz not null default now()
);
create index if not exists analytics_links_visitor on public.analytics_order_links(visitor_id);
alter table public.analytics_visitors enable row level security;
alter table public.analytics_sessions enable row level security;
alter table public.analytics_events enable row level security;
alter table public.analytics_order_links enable row level security;
revoke all on public.analytics_visitors,public.analytics_sessions,public.analytics_events,public.analytics_order_links from public,anon,authenticated;
grant all on public.analytics_visitors,public.analytics_sessions,public.analytics_events,public.analytics_order_links to service_role;
grant usage,select on sequence public.analytics_events_sequence_seq to service_role;

create or replace function public.analytics_open_session(p_visitor uuid,p_page text,p_source text,p_device text,p_traffic text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare sid uuid; allowed boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_visitor::text,719));
 insert into analytics_visitors(id) values(p_visitor) on conflict do nothing;
 select consent into allowed from analytics_visitors where id=p_visitor for update;
 if not allowed then raise exception 'CONSENT_REVOKED'; end if;
 select id into sid from analytics_sessions where visitor_id=p_visitor and last_seen>now()-interval '30 minutes' order by last_seen desc limit 1;
 if sid is null then
  insert into analytics_sessions(visitor_id,entry_page,source,device,traffic) values(p_visitor,p_page,p_source,p_device,p_traffic) returning id into sid;
 else update analytics_sessions set last_seen=now() where id=sid;
 end if;
 update analytics_visitors set last_seen=now() where id=p_visitor;
 return sid;
end $$;

create or replace function public.analytics_ingest(p_visitor uuid,p_events jsonb)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare e jsonb; sid uuid; n integer:=0; inserted integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_visitor::text,719));
 if not exists(select 1 from analytics_visitors where id=p_visitor and consent) then raise exception 'CONSENT_REQUIRED'; end if;
 if jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events) not between 1 and 20 then raise exception 'BATCH_LIMIT'; end if;
 for e in select value from jsonb_array_elements(p_events) loop
  sid:=(e->>'sessionId')::uuid;
  if (e->>'visitorId')::uuid<>p_visitor or not exists(select 1 from analytics_sessions where id=sid and visitor_id=p_visitor and last_seen>now()-interval '30 minutes') then raise exception 'SESSION_INVALID'; end if;
  if e->>'type' not in ('page_view','category_view','product_view','product_click','list_impression','add_cart','remove_cart','update_cart','begin_checkout','payment_attempt','checkout_step','checkout_error','search','filter','active_time','block_impression','block_click') then raise exception 'EVENT_INVALID'; end if;
  if exists(select 1 from analytics_events where visitor_id=p_visitor and event_id=(e->>'eventId')::uuid and payload<>e) then raise exception 'EVENT_CONFLICT'; end if;
  insert into analytics_events(event_id,visitor_id,session_id,payload) values((e->>'eventId')::uuid,p_visitor,sid,e) on conflict(visitor_id,event_id) do nothing;
  get diagnostics inserted = row_count; n:=n+inserted;
  update analytics_sessions set last_seen=now() where id=sid;
 end loop;
 update analytics_visitors set last_seen=now() where id=p_visitor;
 return n;
end $$;

create or replace function public.analytics_link_order(p_visitor uuid,p_session uuid,p_cart uuid,p_attempt uuid,p_merchant text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_visitor::text,719));
 if not exists(select 1 from analytics_visitors where id=p_visitor and consent) or not exists(select 1 from analytics_sessions where id=p_session and visitor_id=p_visitor and last_seen>now()-interval '30 minutes') then return; end if;
 insert into analytics_order_links(order_id,visitor_id,session_id,cart_id,attempt_id)
 select id,p_visitor,p_session,p_cart,p_attempt from orders where merchant_oid=p_merchant on conflict(order_id) do nothing;
end $$;

create or replace function public.analytics_revoke(p_visitor uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_visitor::text,719));
 update analytics_visitors set consent=false,last_seen=now() where id=p_visitor;
 delete from analytics_sessions where visitor_id=p_visitor;
 -- Tombstone denies in-flight events/session reopening until the signed cookie expires.
end $$;

create or replace function public.analytics_purge()
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare n integer;
begin
 delete from analytics_events where received_at<now()-interval '30 days';
 get diagnostics n = row_count;
 delete from analytics_order_links where created_at<now()-interval '30 days';
 delete from analytics_sessions where started_at<now()-interval '30 days';
 delete from analytics_visitors where last_seen<now()-interval '30 days';
 return n;
end $$;
revoke all on function public.analytics_open_session(uuid,text,text,text,text),public.analytics_ingest(uuid,jsonb),public.analytics_link_order(uuid,uuid,uuid,uuid,text),public.analytics_revoke(uuid),public.analytics_purge() from public,anon,authenticated;
grant execute on function public.analytics_open_session(uuid,text,text,text,text),public.analytics_ingest(uuid,jsonb),public.analytics_link_order(uuid,uuid,uuid,uuid,text),public.analytics_revoke(uuid),public.analytics_purge() to service_role;
commit;
