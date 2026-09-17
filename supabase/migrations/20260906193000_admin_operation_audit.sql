begin;
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
