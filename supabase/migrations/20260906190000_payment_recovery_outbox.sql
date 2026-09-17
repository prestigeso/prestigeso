-- Apply before the Phase 0 recovery/outbox application deployment.
begin;

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
commit;
