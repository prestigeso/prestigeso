begin;
do $$
declare v uuid:='00000000-0000-4000-8000-000000001001'; other uuid:='00000000-0000-4000-8000-000000001002'; sid uuid; e jsonb; n int; product bigint; ord bigint;
begin
 if has_table_privilege('anon','public.analytics_events','SELECT') or has_table_privilege('authenticated','public.analytics_order_links','SELECT') then raise exception 'PRIVATE_TABLE_EXPOSED'; end if;
 if has_function_privilege('anon','public.analytics_ingest(uuid,jsonb)','EXECUTE') then raise exception 'RPC_EXPOSED'; end if;
 sid:=public.analytics_open_session(v,'home','direct','android','normal');
 if sid<>public.analytics_open_session(v,'product','social','android','normal') then raise exception 'SESSION_NOT_REUSED'; end if;
 e:=jsonb_build_object('version',1,'eventId','00000000-0000-4000-8000-000000001003','visitorId',v,'sessionId',sid,'sequence',1,'type','product_view','page','product','productId',247);
 if public.analytics_ingest(v,jsonb_build_array(e))<>1 or public.analytics_ingest(v,jsonb_build_array(e))<>0 then raise exception 'DEDUPE_FAILED'; end if;
 begin
  perform public.analytics_ingest(v,jsonb_build_array(e||'{"productId":377}'::jsonb));
  raise exception 'CONFLICT_ACCEPTED';
 exception when others then if sqlerrm<>'EVENT_CONFLICT' then raise; end if; end;
 perform public.analytics_open_session(other,'home','direct','android','normal');
 begin
  perform public.analytics_ingest(other,jsonb_build_array(e||jsonb_build_object('visitorId',other)));
  raise exception 'CROSS_VISITOR_ACCEPTED';
 exception when others then if sqlerrm<>'SESSION_INVALID' then raise; end if; end;
 insert into public.products("SKU",name,price,stock) values('PHASE1-ANALYTICS-TEST','Synthetic analytics fixture',10,5) returning id into product;
 insert into public.orders(order_no,merchant_oid,user_email,items,total_amount,paytr_total_amount,shipping_address,status)
 values('PHASE1ANALYTICS','PHASE1ANALYTICS','fixture@example.invalid',jsonb_build_array(jsonb_build_object('id',product,'price',10,'quantity',1)),10,1000,'{}','Ödeme Bekleniyor') returning id into ord;
 perform public.reserve_order_stock(ord);
 perform public.analytics_link_order(other,sid,gen_random_uuid(),gen_random_uuid(),'PHASE1ANALYTICS');
 if exists(select 1 from analytics_order_links where order_id=ord) then raise exception 'FOREIGN_SESSION_LINKED'; end if;
 perform public.analytics_link_order(v,sid,gen_random_uuid(),gen_random_uuid(),'PHASE1ANALYTICS');
 perform public.analytics_link_order(v,sid,gen_random_uuid(),gen_random_uuid(),'PHASE1ANALYTICS');
 if (select count(*) from analytics_order_links where order_id=ord)<>1 then raise exception 'ORDER_LINK_NOT_IDEMPOTENT'; end if;
 perform public.record_verified_paytr_result('PHASE1ANALYTICS','success',1000);
 if not exists(select 1 from orders where id=ord and payment_status='paid' and paid_at is not null) then raise exception 'PAYMENT_NOT_VERIFIED'; end if;
 perform public.analytics_revoke(v);
 if exists(select 1 from analytics_order_links where order_id=ord) then raise exception 'LINK_NOT_REVOKED'; end if;
 if not exists(select 1 from orders where id=ord and payment_status='paid') then raise exception 'FINANCIAL_ORDER_DELETED'; end if;
 if exists(select 1 from analytics_events where visitor_id=v) then raise exception 'REVOKE_DID_NOT_DELETE'; end if;
 begin
  perform public.analytics_ingest(v,jsonb_build_array(e)); raise exception 'REVOKED_ACCEPTED';
 exception when others then if sqlerrm<>'CONSENT_REQUIRED' then raise; end if; end;
 begin
  perform public.analytics_open_session(v,'home','direct','android','normal'); raise exception 'TOMBSTONE_IGNORED';
 exception when others then if sqlerrm<>'CONSENT_REVOKED' then raise; end if; end;
 update analytics_sessions set last_seen=now()-interval '31 minutes' where visitor_id=other;
 select count(*) into n from analytics_sessions where visitor_id=other;
 perform public.analytics_open_session(other,'shop','direct','android','normal');
 if (select count(*) from analytics_sessions where visitor_id=other)<>n+1 then raise exception 'IDLE_SESSION_NOT_ROTATED'; end if;
 update analytics_visitors set last_seen=now()-interval '31 days' where id=other;
 perform public.analytics_purge();
 if exists(select 1 from analytics_visitors where id=other) then raise exception 'RETENTION_FAILED'; end if;
 raise notice 'PASS analytics RLS, duplicate, conflict, isolation, revoke, session and retention';
end $$;
rollback;
