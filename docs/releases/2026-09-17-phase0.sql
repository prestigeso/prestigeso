-- PrestigeSO Faz 0: existing installations through 20260823154000.
-- Back up production before manual execution. No product seeds or credential changes.
-- Atomic bundle: all four migrations succeed or the entire transaction rolls back.
begin;
set local lock_timeout = '10s';

-- SOURCE: 20260906190000_payment_recovery_outbox.sql

-- Apply before the Phase 0 recovery/outbox application deployment.

alter table public.orders add column if not exists payment_recovery_status text not null default 'none'
  check (payment_recovery_status in ('none', 'recovered', 'manual_review'));

create table if not exists public.payment_recovery_exceptions (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete restrict,
  kind text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  reason_code text not null,
  confirmed_amount bigint not null check (confirmed_amount > 0),
  source text not null check (source in ('callback', 'status_query')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (order_id, kind)
);
create index if not exists payment_recovery_open_idx
  on public.payment_recovery_exceptions(created_at) where status = 'open';

create or replace function public.guard_unresolved_payment_fulfillment()
returns trigger language plpgsql security definer set search_path = public as $$
declare fulfillment_change boolean;
begin
  if new.payment_recovery_status='manual_review' and new.status in
     ('Bekliyor','İşleniyor','Hazırlanıyor','Kargolandı','Teslim Edildi','Tamamlandı') then
    raise exception 'PAYMENT_RECOVERY_REVIEW_REQUIRED';
  end if;
  fulfillment_change := (new.status is distinct from old.status and new.status in
    ('Bekliyor','İşleniyor','Hazırlanıyor','Kargolandı','Teslim Edildi','Tamamlandı'))
    or new.shipping_carrier is distinct from old.shipping_carrier
    or new.tracking_number is distinct from old.tracking_number;
  if fulfillment_change and (old.refund_started_at is not null or new.refund_started_at is not null
      or exists(select 1 from public.return_requests where order_id=new.id and status in ('pending','approved'))) then
    raise exception 'FINANCIAL_OPERATION_IN_PROGRESS';
  end if;
  return new;
end;
$$;
drop trigger if exists orders_guard_payment_recovery on public.orders;
create trigger orders_guard_payment_recovery before update of status,shipping_carrier,tracking_number
  on public.orders for each row execute function public.guard_unresolved_payment_fulfillment();

create table if not exists public.transactional_email_outbox (
  id uuid primary key default gen_random_uuid(),
  order_id bigint not null references public.orders(id) on delete restrict,
  event_key text not null check (length(event_key) between 1 and 160),
  recipient text not null check (recipient = lower(trim(recipient)) and recipient ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'),
  payload jsonb,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'unknown')),
  attempts integer not null default 0 check (attempts between 0 and 5),
  first_attempt_at timestamptz,
  next_attempt_at timestamptz default now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  provider_id text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (order_id, event_key, recipient),
  check (payload is null or jsonb_typeof(payload) = 'object')
);
create index if not exists transactional_email_due_idx
  on public.transactional_email_outbox(next_attempt_at) where status <> 'sent';
alter table public.payment_recovery_exceptions enable row level security;
alter table public.transactional_email_outbox enable row level security;
revoke all on public.payment_recovery_exceptions, public.transactional_email_outbox from public, anon, authenticated;
grant select, insert, update on public.payment_recovery_exceptions, public.transactional_email_outbox to service_role;
revoke all on sequence public.payment_recovery_exceptions_id_seq from public,anon,authenticated;
grant usage, select on sequence public.payment_recovery_exceptions_id_seq to service_role;

create or replace function public.release_expired_stock_reservations()
returns integer language plpgsql security definer set search_path = public as $$
declare v_order record; v_count integer:=0;
begin
  for v_order in select id from public.orders
    where payment_status='pending' and stock_reserved_at is not null and stock_released_at is null
      and reservation_expires_at < now() order by id for update skip locked
  loop
    perform public.release_order_stock(v_order.id);
    perform public.release_order_coupon_reservation(v_order.id);
    update public.orders set payment_status='failed',status='Ödeme Süresi Doldu',
      failed_reason='Ödeme oturumu zaman aşımına uğradı.' where id=v_order.id and payment_status='pending';
    v_count:=v_count+1;
  end loop;
  return v_count;
end;
$$;

-- This transaction is the only callback success/failure state transition. The
-- order row lock serializes callback, expiry, stock return, and concurrent replay.
create or replace function public.record_verified_paytr_result(
  p_merchant_oid text, p_status text, p_total_amount bigint,
  p_source text default 'callback', p_failure_reason text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_shipping jsonb;
  v_coupon jsonb;
  v_email text;
  v_exception text;
  v_outbox uuid;
  v_recovery boolean;
  v_discount numeric;
begin
  if p_status not in ('success','failed') or p_source not in ('callback','status_query')
     or p_total_amount is null or p_total_amount <= 0 or p_merchant_oid !~ '^[A-Za-z0-9]{1,64}$' then
    raise exception 'INVALID_VERIFIED_PAYMENT';
  end if;
  select * into v_order from public.orders where merchant_oid = p_merchant_oid for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.paytr_total_amount is null or v_order.paytr_total_amount::numeric <> p_total_amount then
    raise exception 'PAYMENT_AMOUNT_MISMATCH';
  end if;

  if p_status = 'failed' then
    if v_order.payment_status in ('paid','partially_refunded','refunded') then
      return jsonb_build_object('action','ignored','order_id',v_order.id);
    end if;
    update public.orders set payment_status = 'failed', status = 'Ödeme Başarısız',
      failed_reason = left(coalesce(p_failure_reason,'Ödeme başarısız.'),500)
    where id = v_order.id;
    perform public.release_order_stock(v_order.id);
    perform public.release_order_coupon_reservation(v_order.id);
    return jsonb_build_object('action','failed','order_id',v_order.id);
  end if;

  if v_order.payment_status in ('partially_refunded','refunded') then
    return jsonb_build_object('action','ignored','order_id',v_order.id);
  end if;
  if v_order.payment_recovery_status = 'manual_review' then
    update public.payment_recovery_exceptions set last_seen_at = now()
    where order_id = v_order.id and status = 'open';
    return jsonb_build_object('action','manual_review','order_id',v_order.id);
  end if;

  v_recovery := v_order.stock_released_at is not null;
  -- A stock/coupon failure rolls back only this subtransaction. The verified
  -- money receipt and exception are committed below, never discarded with it.
  begin
    if v_recovery then
      update public.orders set stock_reserved_at = null, stock_released_at = null,
        payment_status = 'pending' where id = v_order.id;
    end if;
    perform public.reserve_order_stock(v_order.id);
    v_shipping := v_order.shipping_address::jsonb;
    v_coupon := v_shipping->'coupon';
    v_discount := coalesce(v_order.coupon_discount_amount,(v_coupon->>'discount_amount')::numeric,0);
    if v_order.user_id is not null and coalesce(v_coupon->>'id','') <> ''
       and v_discount > 0 then
      if v_recovery then
        perform public.reserve_order_coupon(v_coupon->>'id',v_order.user_id,v_order.id,
          coalesce(v_order.coupon_code,v_coupon->>'code'),v_discount);
      end if;
      perform public.register_order_coupon_usage(v_coupon->>'id',v_order.user_id,v_order.id,
        coalesce(v_order.coupon_code,v_coupon->>'code'),v_discount);
    end if;
  exception when others then
    -- Persist only a fixed reason code; no raw SQL/PII reaches operator logs.
    v_exception := case when sqlerrm like 'INSUFFICIENT%STOCK:%' then 'insufficient_stock'
      when sqlerrm like 'COUPON_%' then 'coupon_reconciliation'
      when sqlerrm like '%NOT_FOUND%' then 'catalog_unavailable'
      else 'inventory_reconciliation' end;
  end;

  if v_exception is not null then
    update public.orders set payment_status = 'paid', paid_at = coalesce(paid_at,now()),
      status = 'Stok Yetersiz', reservation_expires_at = null,
      payment_recovery_status = 'manual_review', reconciliation_status = 'mismatch',
      reconciliation_detail = jsonb_build_object('reason',v_exception,'confirmedAmount',p_total_amount)
    where id = v_order.id;
    insert into public.payment_recovery_exceptions(order_id,kind,reason_code,confirmed_amount,source)
    values(v_order.id,'confirmed_payment_fulfillment',v_exception,p_total_amount,p_source)
    on conflict(order_id,kind) do update set last_seen_at = now();
    return jsonb_build_object('action','manual_review','order_id',v_order.id);
  end if;

  update public.orders set payment_status = 'paid', paid_at = coalesce(paid_at,now()),
    status = case when payment_status <> 'paid' then 'Bekliyor' else status end,
    failed_reason = null, reservation_expires_at = null,
    payment_recovery_status = case when v_recovery then 'recovered' else payment_recovery_status end
  where id = v_order.id;
  -- Existing processed orders were already mailed by the legacy callback.
  if v_order.post_payment_processed_at is null then
    -- user_email is frozen from authenticated identity/verified guest OTP by
    -- checkout. Do not let arbitrary legacy shipping JSON choose a recipient.
    v_email := lower(trim(coalesce(v_order.user_email,'')));
    if v_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'
       and not (v_email like 'guest-%@prestigeso.com.tr') then
      insert into public.transactional_email_outbox(order_id,event_key,recipient)
      values(v_order.id,'order_confirmation',v_email)
      on conflict(order_id,event_key,recipient) do nothing returning id into v_outbox;
      if v_outbox is null then
        select id into v_outbox from public.transactional_email_outbox
        where order_id = v_order.id and event_key = 'order_confirmation' and recipient = v_email;
      end if;
    else
      insert into public.payment_recovery_exceptions(order_id,kind,reason_code,confirmed_amount,source)
      values(v_order.id,'confirmation_recipient','invalid_recipient',p_total_amount,p_source)
      on conflict(order_id,kind) do update set last_seen_at = now();
    end if;
    update public.orders set post_payment_processed_at = now(), post_payment_processing_at = null
    where id = v_order.id;
  end if;
  return jsonb_build_object('action',case when v_recovery then 'recovered' else 'paid' end,
    'order_id',v_order.id,'outbox_id',v_outbox);
end;
$$;

create or replace function public.enqueue_transactional_email(
  p_order_id bigint, p_event_key text, p_recipient text, p_payload jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row public.transactional_email_outbox%rowtype;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object'
     or octet_length(p_payload::text) > 15000000 then raise exception 'INVALID_EMAIL_PAYLOAD'; end if;
  insert into public.transactional_email_outbox(order_id,event_key,recipient,payload)
  values(p_order_id,p_event_key,lower(trim(p_recipient)),p_payload)
  on conflict(order_id,event_key,recipient) do nothing;
  select * into v_row from public.transactional_email_outbox
  where order_id=p_order_id and event_key=p_event_key and recipient=lower(trim(p_recipient)) for update;
  if v_row.payload is distinct from p_payload then raise exception 'EMAIL_EVENT_PAYLOAD_CONFLICT'; end if;
  return jsonb_build_object('id',v_row.id,'status',v_row.status);
end;
$$;

create or replace function public.claim_transactional_email(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row public.transactional_email_outbox%rowtype;
begin
  select * into v_row from public.transactional_email_outbox where id=p_id for update;
  if not found or v_row.payload is null or v_row.status='sent'
     or v_row.next_attempt_at is null or v_row.next_attempt_at > now()
     or v_row.lease_expires_at > now() then return null; end if;
  -- Resend's dedupe key expires after 24h. Never resend an ambiguous attempt
  -- outside a conservative 23h window, even after restart or a long cron gap.
  if v_row.attempts >= 5 or (v_row.first_attempt_at is not null
      and v_row.first_attempt_at <= now()-interval '23 hours') then
    update public.transactional_email_outbox set next_attempt_at=null,
      error_code='manual_delivery_reconciliation',updated_at=now() where id=p_id;
    return null;
  end if;
  update public.transactional_email_outbox set status='unknown', attempts=attempts+1,
    first_attempt_at=coalesce(first_attempt_at,now()), lease_token=gen_random_uuid(),
    lease_expires_at=now()+interval '2 minutes', updated_at=now()
  where id=p_id returning * into v_row;
  return to_jsonb(v_row);
end;
$$;

create or replace function public.finish_transactional_email(
  p_id uuid,p_lease_token uuid,p_status text,p_provider_id text default null,
  p_error_code text default null,p_retry boolean default false
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  if p_status not in ('sent','failed','unknown') then raise exception 'INVALID_EMAIL_RESULT'; end if;
  update public.transactional_email_outbox set status=p_status,
    provider_id=left(p_provider_id,128),error_code=left(p_error_code,100),
    sent_at=case when p_status='sent' then now() else sent_at end,
    next_attempt_at=case when p_retry and attempts<5
      and first_attempt_at>now()-interval '23 hours' then now()+interval '5 minutes' else null end,
    lease_token=null,lease_expires_at=null,updated_at=now()
  where id=p_id and lease_token=p_lease_token and status='unknown';
  get diagnostics v_count=row_count;
  return v_count=1;
end;
$$;

revoke all on function public.record_verified_paytr_result(text,text,bigint,text,text) from public,anon,authenticated;
revoke all on function public.guard_unresolved_payment_fulfillment() from public,anon,authenticated;
revoke all on function public.enqueue_transactional_email(bigint,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.claim_transactional_email(uuid) from public,anon,authenticated;
revoke all on function public.finish_transactional_email(uuid,uuid,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.record_verified_paytr_result(text,text,bigint,text,text) to service_role;
grant execute on function public.enqueue_transactional_email(bigint,text,text,jsonb) to service_role;
grant execute on function public.claim_transactional_email(uuid) to service_role;
grant execute on function public.finish_transactional_email(uuid,uuid,text,text,text,boolean) to service_role;


-- SOURCE: 20260906191000_remaining_partial_returns.sql

-- Sequential partial returns: one active request, conserved units and paid cents.
-- Existing proportional paid-total allocation (including discount/shipping) is retained.
-- Run after the existing return/evidence/privacy migrations. No provider calls are made here.

alter table public.return_requests
  add column if not exists requested_refund_amount numeric(12,2)
    check (requested_refund_amount is null or requested_refund_amount > 0);

-- Only remove the obsolete uniqueness contract; retain every historical request.
do $$ declare obsolete record;
begin
  for obsolete in select c.conname from pg_constraint c
    where c.conrelid='public.return_requests'::regclass and c.contype='u'
      and (select array_agg(a.attname::text order by a.attname) from pg_attribute a
        where a.attrelid=c.conrelid and a.attnum=any(c.conkey))=array['order_id','user_id']::text[]
  loop execute format('alter table public.return_requests drop constraint %I',obsolete.conname); end loop;
end $$;
create unique index if not exists return_requests_one_active_order
  on public.return_requests(order_id) where status in ('pending', 'approved');

create or replace function public.return_item_array(p_items jsonb)
returns jsonb language plpgsql immutable set search_path = public as $$
declare a jsonb := p_items; item jsonb;
begin
  if jsonb_typeof(a) = 'string' then a := (a #>> '{}')::jsonb; end if;
  if a is null or jsonb_typeof(a) <> 'array' then raise exception 'RETURN_ITEMS_INVALID'; end if;
  if jsonb_array_length(a) not between 1 and 100 then raise exception 'RETURN_ITEMS_INVALID'; end if;
  for item in select value from jsonb_array_elements(a) loop
    if jsonb_typeof(item) <> 'object'
      or coalesce(item->>'id', '') !~ '^[1-9][0-9]{0,14}$'
      or coalesce(item->>'quantity', '') !~ '^[1-9][0-9]{0,8}$'
      or coalesce(item->>'variant_id', '0') !~ '^(0|[1-9][0-9]{0,14})$'
    then raise exception 'RETURN_ITEMS_INVALID'; end if;
  end loop;
  if exists (select 1 from jsonb_array_elements(a) e
      group by (e->>'id')::bigint, coalesce((e->>'variant_id')::bigint, 0)
      having count(*) > 1) then raise exception 'RETURN_ITEMS_DUPLICATED'; end if;
  return a;
end $$;

create or replace function public.get_order_return_lines(p_order_id bigint, p_exclude_request_id bigint default null)
returns table(product_id bigint, variant_id bigint, name text, purchased bigint,
  reserved bigint, returned bigint, remaining bigint, unit_price numeric)
language plpgsql security definer set search_path = public as $$
declare source jsonb; item jsonb; request_row record; prior_item jsonb;
begin
  select public.return_item_array(o.items) into source from public.orders o where o.id = p_order_id;
  if source is null then raise exception 'ORDER_NOT_FOUND'; end if;
  -- A corrupt legacy claim is a reconciliation case, never spare stock to sell/return twice.
  for request_row in select r.items from public.return_requests r
    where r.order_id = p_order_id and r.status in ('pending', 'approved', 'completed')
      and (p_exclude_request_id is null or r.id <> p_exclude_request_id)
  loop
    for prior_item in select value from jsonb_array_elements(public.return_item_array(request_row.items)) loop
      if not exists (select 1 from jsonb_array_elements(source) s
        where s->>'id' = prior_item->>'id'
          and coalesce((s->>'variant_id')::bigint,0) = coalesce((prior_item->>'variant_id')::bigint,0))
      then raise exception 'RETURN_LEDGER_INVALID'; end if;
    end loop;
  end loop;
  for item in select value from jsonb_array_elements(source) loop
    product_id := (item->>'id')::bigint;
    variant_id := coalesce((item->>'variant_id')::bigint,0);
    name := coalesce(item->>'name','Ürün');
    purchased := (item->>'quantity')::bigint;
    unit_price := coalesce(nullif((item->>'price')::numeric,0), (item->>'discount_price')::numeric);
    if unit_price is null or unit_price::text !~ '^[0-9]+(\.[0-9]+)?$' or unit_price <= 0 or unit_price <> round(unit_price,2)
      then raise exception 'RETURN_PRICE_INVALID'; end if;
    select coalesce(sum((e->>'quantity')::bigint) filter (where r.status in ('pending','approved')),0),
      coalesce(sum((e->>'quantity')::bigint) filter (where r.status = 'completed'),0)
      into reserved, returned
      from public.return_requests r cross join lateral jsonb_array_elements(public.return_item_array(r.items)) e
      where r.order_id = p_order_id and r.status in ('pending','approved','completed')
        and (p_exclude_request_id is null or r.id <> p_exclude_request_id)
        and (e->>'id')::bigint = product_id
        and coalesce((e->>'variant_id')::bigint,0) = variant_id;
    remaining := purchased - reserved - returned;
    if remaining < 0 then raise exception 'RETURN_LEDGER_INVALID'; end if;
    return next;
  end loop;
end $$;

create or replace function public.quote_order_return(p_order_id bigint, p_items jsonb, p_exclude_request_id bigint default null)
returns numeric language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype; lines jsonb; requested jsonb := public.return_item_array(p_items);
  item jsonb; line jsonb; subtotal numeric := 0; prior_subtotal numeric := 0;
  selected_subtotal numeric := 0; completed_money numeric; amount numeric;
begin
  select * into o from public.orders where id = p_order_id;
  select jsonb_agg(to_jsonb(l)) into lines from public.get_order_return_lines(p_order_id,p_exclude_request_id) l;
  for line in select value from jsonb_array_elements(lines) loop
    subtotal := subtotal + (line->>'unit_price')::numeric * (line->>'purchased')::bigint;
    prior_subtotal := prior_subtotal + (line->>'unit_price')::numeric * (line->>'returned')::bigint;
  end loop;
  for item in select value from jsonb_array_elements(requested) loop
    select value into line from jsonb_array_elements(lines) l
      where (l->>'product_id')::bigint = (item->>'id')::bigint
        and (l->>'variant_id')::bigint = coalesce((item->>'variant_id')::bigint,0);
    if line is null or (item->>'quantity')::bigint > (line->>'remaining')::bigint
      then raise exception 'RETURN_QUANTITY_EXCEEDED'; end if;
    selected_subtotal := selected_subtotal + (line->>'unit_price')::numeric * (item->>'quantity')::bigint;
  end loop;
  select coalesce(sum(refund_amount),0) into completed_money from public.return_requests
    where order_id = p_order_id and status = 'completed';
  if exists (select 1 from public.return_requests where order_id=p_order_id and status='completed' and refund_amount is null)
    or completed_money <> coalesce(o.refunded_amount,0)
    then raise exception 'RETURN_FINANCIAL_RECONCILIATION_REQUIRED'; end if;
  -- Cumulative rounding distributes cents without drift; the final selection gets the exact balance.
  amount := round(o.total_amount * ((prior_subtotal + selected_subtotal) / subtotal),2) - completed_money;
  if subtotal <= 0 or o.total_amount <= 0 or amount <= 0 or amount > o.total_amount-completed_money
    then raise exception 'RETURN_AMOUNT_INVALID'; end if;
  -- Do not close the entire monetary balance while unreturned units remain due to cent rounding.
  -- Such sub-cent selections must be combined with the remaining items, not sent as a zero refund later.
  if prior_subtotal+selected_subtotal < subtotal and amount=o.total_amount-completed_money
    then raise exception 'RETURN_AMOUNT_INVALID'; end if;
  return amount;
end $$;

create or replace function public.get_return_availability(p_order_id bigint, p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype; lines jsonb; eligible boolean;
begin
  select * into o from public.orders where id=p_order_id and user_id=p_user_id;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  select jsonb_agg(to_jsonb(l)) into lines from public.get_order_return_lines(p_order_id) l;
  eligible := o.payment_status in ('paid','partially_refunded')
    and o.status in ('Teslim Edildi','Tamamlandı','Kısmi İade')
    and (o.status <> 'Kısmi İade' or exists (select 1 from public.return_requests
      where order_id=o.id and status='completed' and original_order_status in ('Teslim Edildi','Tamamlandı')))
    and o.refund_started_at is null and o.stock_released_at is null
    and coalesce(o.delivered_at,o.created_at) between now()-interval '14 days' and now()
    and not exists (select 1 from public.return_requests where order_id=o.id and status in ('pending','approved'))
    and exists (select 1 from jsonb_array_elements(lines) l where (l->>'remaining')::bigint>0);
  return jsonb_build_object('eligible',coalesce(eligible,false),'items',coalesce(lines,'[]'::jsonb),
    'return_window_ends_at',coalesce(o.delivered_at,o.created_at)+interval '14 days');
end $$;

create or replace function public.create_return_request_with_evidence(
  p_order_id bigint, p_user_id uuid, p_reason text, p_items jsonb, p_evidence_paths text[])
returns bigint language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype; request_id bigint; amount numeric;
  requested_count integer := cardinality(coalesce(p_evidence_paths,array[]::text[])); matched_count integer;
begin
  select * into o from public.orders where id=p_order_id and user_id=p_user_id for update;
  if not found then raise exception 'ORDER_NOT_RETURNABLE'; end if;
  if not (public.get_return_availability(p_order_id,p_user_id)->>'eligible')::boolean
    then raise exception 'ORDER_NOT_RETURNABLE'; end if;
  if char_length(btrim(coalesce(p_reason,''))) not between 5 and 1000 then raise exception 'RETURN_REQUEST_INVALID'; end if;
  if requested_count > 3 or (select count(distinct path) from unnest(coalesce(p_evidence_paths,array[]::text[])) paths(path)) <> requested_count
    or exists (select 1 from unnest(coalesce(p_evidence_paths,array[]::text[])) paths(path)
      where path is null or length(path)>500 or path like '%..%'
        or path not like ('returns/'||p_user_id::text||'/'||p_order_id::text||'/%'))
    then raise exception 'RETURN_EVIDENCE_INVALID'; end if;
  amount := public.quote_order_return(p_order_id,p_items);
  select count(*) into matched_count from public.return_evidence_uploads upload
    where upload.order_id=p_order_id and upload.user_id=p_user_id and upload.object_path=any(coalesce(p_evidence_paths,array[]::text[]))
      and upload.return_request_id is null and upload.deletion_started_at is null and upload.created_at>now()-interval '24 hours';
  if matched_count <> requested_count then raise exception 'RETURN_EVIDENCE_INVALID'; end if;
  insert into public.return_requests(order_id,user_id,reason,items,evidence_urls,original_order_status,requested_refund_amount)
    values(p_order_id,p_user_id,btrim(p_reason),public.return_item_array(p_items),to_jsonb(coalesce(p_evidence_paths,array[]::text[])),o.status,amount)
    returning id into request_id;
  if requested_count>0 then
    update public.return_evidence_uploads set return_request_id=request_id,submitted_at=now()
      where order_id=p_order_id and user_id=p_user_id and object_path=any(p_evidence_paths)
        and return_request_id is null and deletion_started_at is null;
    get diagnostics matched_count = row_count;
    if matched_count <> requested_count then raise exception 'RETURN_EVIDENCE_INVALID'; end if;
  end if;
  update public.orders set status='İade Talebi' where id=p_order_id;
  return request_id;
end $$;

create or replace function public.decide_return_request(p_request_id bigint,p_decision text,p_decided_at timestamptz,
  p_note text default null,p_shipping_code text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.return_requests%rowtype; o public.orders%rowtype; order_id_value bigint; amount numeric;
begin
  select order_id into order_id_value from public.return_requests where id=p_request_id;
  select * into o from public.orders where id=order_id_value for update;
  select * into r from public.return_requests where id=p_request_id for update;
  if not found or r.status<>'pending' then return null; end if;
  if p_decision not in ('approve','reject') or p_decided_at is null then raise exception 'RETURN_DECISION_INVALID'; end if;
  if o.refund_started_at is not null or o.payment_status not in ('paid','partially_refunded')
    or o.stock_released_at is not null or o.status <> 'İade Talebi'
    then raise exception 'RETURN_FINANCIAL_RECONCILIATION_REQUIRED'; end if;
  if p_decision='reject' then
    update public.return_requests set status='rejected',admin_note=left(p_note,1000),decided_at=p_decided_at where id=r.id;
    update public.orders set status=r.original_order_status where id=o.id;
    return jsonb_build_object('id',r.id,'status',r.original_order_status);
  end if;
  amount := public.quote_order_return(o.id,r.items,r.id);
  update public.return_requests set status='approved',admin_note=left(p_note,1000),
    return_shipping_code=left(p_shipping_code,100),decided_at=p_decided_at,requested_refund_amount=amount where id=r.id;
  return jsonb_build_object('id',r.id,'refund_amount',amount);
end $$;

create or replace function public.claim_order_refund(p_order_id bigint,p_started_at timestamptz,
  p_payment_status text,p_status text,p_total_amount numeric,p_refunded_amount numeric,
  p_request_id bigint default null,p_refund_amount numeric default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype; r public.return_requests%rowtype; amount numeric;
begin
  select * into o from public.orders where id=p_order_id for update;
  if not found or p_started_at is null or o.refund_started_at is not null
    or o.payment_status is distinct from p_payment_status or o.status is distinct from p_status
    or o.total_amount is distinct from p_total_amount or o.refunded_amount is distinct from p_refunded_amount
    or o.payment_status not in ('paid','partially_refunded') then return false; end if;
  if p_request_id is null then
    if exists(select 1 from public.return_requests where order_id=o.id and status in ('pending','approved','completed'))
      or o.payment_status='partially_refunded' then return false; end if;
  else
    select * into r from public.return_requests where id=p_request_id and order_id=o.id for update;
    if not found or r.status<>'approved' or r.requested_refund_amount is null then return false; end if;
    amount := public.quote_order_return(o.id,r.items,r.id);
    if amount is distinct from p_refund_amount or amount is distinct from r.requested_refund_amount then return false; end if;
  end if;
  if p_refund_amount is null or p_refund_amount<=0 or p_refund_amount<>round(p_refund_amount,2)
    or p_refund_amount>o.total_amount-coalesce(o.refunded_amount,0) then return false; end if;
  update public.orders set refund_started_at=p_started_at where id=o.id;
  return true;
end $$;

create or replace function public.release_return_request_stock(p_return_request_id bigint)
returns boolean language plpgsql security definer set search_path = public as $$
declare r public.return_requests%rowtype; o public.orders%rowtype; item jsonb;
  order_id_value bigint; completed_money numeric;
begin
  select order_id into order_id_value from public.return_requests where id=p_return_request_id;
  select * into o from public.orders where id=order_id_value for update;
  select * into r from public.return_requests where id=p_return_request_id for update;
  if not found then raise exception 'RETURN_REQUEST_NOT_FOUND'; end if;
  if exists(select 1 from public.return_inventory_releases where return_request_id=r.id) then return false; end if;
  if r.status<>'approved' or o.refund_started_at is null or o.stock_released_at is not null
    or r.requested_refund_amount is null then raise exception 'RETURN_STOCK_NOT_AUTHORIZED'; end if;
  perform 1 from public.get_order_return_lines(o.id);
  select coalesce(sum(refund_amount),0) into completed_money from public.return_requests where order_id=o.id and status='completed';
  if coalesce(o.refunded_amount,0) <> completed_money+r.requested_refund_amount
    then raise exception 'RETURN_FINANCIAL_RECONCILIATION_REQUIRED'; end if;
  insert into public.return_inventory_releases(return_request_id) values(r.id);
  for item in select value from jsonb_array_elements(public.return_item_array(r.items)) loop
    if coalesce((item->>'variant_id')::bigint,0)>0 then
      update public.product_variants set stock=stock+(item->>'quantity')::integer
        where id=(item->>'variant_id')::bigint and product_id=(item->>'id')::bigint;
    else
      update public.products set stock=stock+(item->>'quantity')::integer where id=(item->>'id')::bigint;
    end if;
    if not found then raise exception 'RETURN_PRODUCT_NOT_FOUND'; end if;
  end loop;
  return true;
end $$;

create or replace function public.reserve_return_evidence_uploads(p_order_id bigint,p_user_id uuid,p_object_paths text[])
returns boolean language plpgsql security definer set search_path = public as $$
declare n integer := cardinality(coalesce(p_object_paths,array[]::text[])); existing_count integer; changed integer;
begin
  if n not between 1 and 3 or (select count(distinct path) from unnest(p_object_paths) paths(path))<>n
    or exists(select 1 from unnest(p_object_paths) paths(path) where path is null or length(path)>500 or path like '%..%'
      or path not like ('returns/'||p_user_id::text||'/'||p_order_id::text||'/%'))
    then raise exception 'RETURN_EVIDENCE_INVALID'; end if;
  perform 1 from public.orders where id=p_order_id and user_id=p_user_id for update;
  if not found or not (public.get_return_availability(p_order_id,p_user_id)->>'eligible')::boolean
    then raise exception 'ORDER_NOT_RETURNABLE'; end if;
  select count(*) into existing_count from public.return_evidence_uploads where order_id=p_order_id and user_id=p_user_id
    and return_request_id is null and created_at>now()-interval '24 hours';
  if existing_count+n>3 then return false; end if;
  insert into public.return_evidence_uploads(object_path,order_id,user_id)
    select path,p_order_id,p_user_id from unnest(p_object_paths) paths(path) on conflict do nothing;
  get diagnostics changed=row_count;
  if changed<>n then raise exception 'RETURN_EVIDENCE_INVALID'; end if;
  return true;
end $$;

-- Never mix whole-order stock restoration with line-specific return restoration.
-- The preceding late-payment migration supplies payment_recovery_status.
create or replace function public.release_order_stock(p_order_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype; item jsonb;
begin
  select * into o from public.orders where id=p_order_id for update;
  if not found then return; end if;
  if o.payment_status='refunded' and o.refunded_amount=o.total_amount and o.payment_recovery_status='manual_review' then
    update public.payment_recovery_exceptions set status='resolved',resolved_at=now()
      where order_id=o.id and kind='confirmed_payment_fulfillment' and status='open';
  end if;
  if o.stock_released_at is not null then return; end if;
  if exists(select 1 from public.return_requests r where r.order_id=o.id and r.status in ('pending','approved','completed'))
    or exists(select 1 from public.return_inventory_releases ir join public.return_requests r on r.id=ir.return_request_id where r.order_id=o.id)
    then raise exception 'ORDER_HAS_LINE_RETURN_REQUIRES_RECONCILIATION'; end if;
  if o.stock_reserved_at is null and o.payment_recovery_status='manual_review' then
    update public.orders set stock_released_at=now(),reservation_expires_at=null where id=o.id;
    return;
  end if;
  -- Legacy paid orders predate explicit reservations. Preserve their former deduction contract.
  if o.stock_reserved_at is null and o.payment_status not in ('paid','refunded') then return; end if;
  for item in select value from jsonb_array_elements(public.return_item_array(o.items)) loop
    if coalesce((item->>'variant_id')::bigint,0)>0 then
      update public.product_variants set stock=stock+(item->>'quantity')::integer
        where id=(item->>'variant_id')::bigint and product_id=(item->>'id')::bigint;
    else
      update public.products set stock=stock+(item->>'quantity')::integer where id=(item->>'id')::bigint;
    end if;
    if not found then raise exception 'RETURN_PRODUCT_NOT_FOUND'; end if;
  end loop;
  update public.orders set stock_released_at=now(),reservation_expires_at=null where id=o.id;
end $$;

alter table public.return_requests enable row level security;
revoke all on function public.return_item_array(jsonb),public.get_order_return_lines(bigint,bigint),
  public.quote_order_return(bigint,jsonb,bigint),public.get_return_availability(bigint,uuid),
  public.create_return_request_with_evidence(bigint,uuid,text,jsonb,text[]),
  public.decide_return_request(bigint,text,timestamptz,text,text),
  public.claim_order_refund(bigint,timestamptz,text,text,numeric,numeric,bigint,numeric),
  public.release_return_request_stock(bigint),public.reserve_return_evidence_uploads(bigint,uuid,text[]),public.release_order_stock(bigint)
  from public,anon,authenticated;
grant execute on function public.get_return_availability(bigint,uuid),
  public.create_return_request_with_evidence(bigint,uuid,text,jsonb,text[]),
  public.decide_return_request(bigint,text,timestamptz,text,text),
  public.claim_order_refund(bigint,timestamptz,text,text,numeric,numeric,bigint,numeric),
  public.release_return_request_stock(bigint),public.reserve_return_evidence_uploads(bigint,uuid,text[]),public.release_order_stock(bigint) to service_role;


-- SOURCE: 20260906192000_catalog_price_projection.sql


-- Read-only projection: no owner/RLS bypass and no customer/private fields.
-- Pricing rules mirror lib/commerce/catalogPricing.ts. No discounts stack.
create or replace view public.products_public_catalog
with (security_invoker = true)
as
select p.id, p.name, p.price, p.image, p.images, p.category, p.stock,
  p."SKU", p.barcode, p.description, p.is_bestseller, p.discount_price,
  p.campaign_start_date, p.campaign_end_date, p.created_at,
  offer.effective_price, offer.display_base_price,
  (offer.effective_price < offer.display_base_price) as is_discounted,
  (coalesce(variants.variant_count, 0) > 0) as has_variants,
  case when coalesce(variants.variant_count, 0) > 0
    then variants.available_stock else greatest(coalesce(p.stock, 0), 0) end as available_stock
from public.products p
left join lateral (
  select count(*) as variant_count,
    coalesce(sum(greatest(coalesce(v.stock, 0), 0)), 0) as available_stock,
    count(*) filter (where v.stock > 0) as stocked_count
  from public.product_variants v
  where v.product_id = p.id and v.is_active = true
) variants on true
left join lateral (
  select max(c.discount_percent::numeric) as percent
  from public.campaigns c
  join public.campaign_products cp on cp.campaign_id = c.id
  where cp.product_id = p.id and now() >= c.start_date and now() <= c.end_date
    and c.discount_percent::numeric > 0 and c.discount_percent::numeric < 100
) campaign on true
cross join lateral (
  select priced.effective_price, priced.display_base_price
  from (
    select round(least(
      choice.base_price,
      case when choice.inherits_price
        and p.discount_price > 0 and p.discount_price < choice.base_price
        and (p.campaign_start_date is null or now() >= p.campaign_start_date)
        and (p.campaign_end_date is null or now() <= p.campaign_end_date)
        then p.discount_price else choice.base_price end,
      case when campaign.percent is not null
        then choice.base_price * (1 - campaign.percent / 100) else choice.base_price end
    ), 2) as effective_price, choice.base_price as display_base_price, choice.variant_id
    from (
      select coalesce(v.price, p.price)::numeric as base_price,
        (v.price is null) as inherits_price, v.id as variant_id
      from public.product_variants v
      where v.product_id = p.id and v.is_active = true
        and (variants.stocked_count = 0 or v.stock > 0)
      union all
      select p.price::numeric, true, null::bigint
      where variants.variant_count = 0
    ) choice
  ) priced
  order by priced.effective_price, priced.variant_id nulls first
  limit 1
) offer;

revoke all on public.products_public_catalog from public, anon, authenticated;
grant select on public.products_public_catalog to anon, authenticated, service_role;
comment on view public.products_public_catalog is 'Public, RLS-preserving effective price and purchasable stock projection. Deploy before the Phase 0 storefront code.';



-- SOURCE: 20260906193000_admin_operation_audit.sql

create table if not exists public.admin_operation_audit (
  id bigint generated always as identity primary key,
  entity_table text not null check (entity_table in ('orders','return_requests','products','product_variants')),
  entity_id text not null,
  operation text not null check (operation in ('INSERT','UPDATE','DELETE')),
  actor_role text not null,
  occurred_at timestamptz not null default now(),
  before_state jsonb,
  after_state jsonb
);
create index if not exists admin_operation_audit_entity_idx on public.admin_operation_audit(entity_table,entity_id,occurred_at desc);
alter table public.admin_operation_audit enable row level security;
revoke all on public.admin_operation_audit from public,anon,authenticated,service_role;
revoke all on sequence public.admin_operation_audit_id_seq from public,anon,authenticated,service_role;
grant select on public.admin_operation_audit to service_role;

create or replace function public.audit_commerce_operation()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  old_row jsonb; new_row jsonb; old_safe jsonb; new_safe jsonb; actor text; jwt_claims jsonb; fields text[];
begin
  if tg_op <> 'INSERT' then old_row:=to_jsonb(old); end if;
  if tg_op <> 'DELETE' then new_row:=to_jsonb(new); end if;
  fields := case tg_table_name
    when 'orders' then array['id','status','payment_status','payment_recovery_status','total_amount','refunded_amount','refund_started_at','stock_reserved_at','stock_released_at']
    when 'return_requests' then array['id','order_id','status','refund_amount','stock_released_at','decided_at']
    else array['id','product_id','stock','is_active'] end;
  if old_row is not null then select jsonb_object_agg(key,value) into old_safe from jsonb_each(old_row) where key=any(fields); end if;
  if new_row is not null then select jsonb_object_agg(key,value) into new_safe from jsonb_each(new_row) where key=any(fields); end if;
  if tg_op='UPDATE' and old_safe is not distinct from new_safe then return new; end if;
  begin jwt_claims := nullif(current_setting('request.jwt.claims',true),'')::jsonb;
  exception when others then jwt_claims := '{}'::jsonb; end;
  actor := coalesce(nullif(current_setting('request.jwt.claim.role',true),''),jwt_claims->>'role',session_user);
  -- Database credentials identify the service, not the person using shared
  -- admin login. Never fabricate a human administrator id from service_role.
  if actor not in ('anon','authenticated','service_role','postgres','supabase_admin','authenticator') then actor:='database_session'; end if;
  insert into public.admin_operation_audit(entity_table,entity_id,operation,actor_role,before_state,after_state)
  values(tg_table_name,coalesce(new_row->>'id',old_row->>'id'),tg_op,actor,old_safe,new_safe);
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.audit_commerce_operation() from public,anon,authenticated;
do $$ declare target text; begin
  foreach target in array array['orders','return_requests','products','product_variants'] loop
    execute format('drop trigger if exists audit_commerce_operation on public.%I',target);
    execute format('create trigger audit_commerce_operation after insert or update or delete on public.%I for each row execute function public.audit_commerce_operation()',target);
  end loop;
end $$;


commit;
