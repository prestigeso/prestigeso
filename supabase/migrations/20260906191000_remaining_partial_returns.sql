-- Sequential partial returns: one active request, conserved units and paid cents.
-- Existing proportional paid-total allocation (including discount/shipping) is retained.
-- Run after the existing return/evidence/privacy migrations. No provider calls are made here.
begin;

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
commit;
