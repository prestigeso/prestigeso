begin;
do $$ declare j uuid; j2 uuid; p jsonb; oid bigint; eid uuid; begin
 p:='[{"packageId":"1","modifiedAt":20,"orderNumber":"10","lines":[],"source":"trendyol"}]';
 j:=trendyol_begin_sync('123','stage',1,100);
 perform trendyol_apply_sync_page(j,0,p,'cursor1',true);
 begin perform trendyol_apply_sync_page(j,0,p,'cursor1',true);raise exception 'replay accepted';exception when others then if sqlerrm<>'SYNC_CONFLICT' then raise; end if;end;
 begin perform trendyol_apply_sync_page(j,1,p,'cursor1',true);raise exception 'cycle accepted';exception when others then if sqlerrm<>'CURSOR_CYCLE' then raise; end if;end;
 perform trendyol_apply_sync_page(j,1,p,null,false);
 j2:=trendyol_begin_sync('123','stage',1,100);perform trendyol_apply_sync_page(j2,0,'[{"packageId":"1","modifiedAt":10,"orderNumber":"10","lines":[]}]',null,false);
 if(select count(*) from trendyol_package_mirror where seller_id='123')<>1 or (select modified_at from trendyol_package_mirror where seller_id='123')<>20 then raise exception 'mirror duplicate/regressed';end if;
 if has_table_privilege('anon','trendyol_package_mirror','select') or has_table_privilege('service_role','trendyol_package_mirror','update') then raise exception 'mirror permission';end if;
 perform marketing_set_permission('10000000-0000-4000-8000-000000000020',true,'2026-09-17');
 insert into orders(order_no,merchant_oid,user_email,items,total_amount,shipping_address,status,paytr_total_amount)
 values('PHASE2-MARKETING','PHASE2-MARKETING','fixture@example.invalid','[{"id":1,"quantity":1}]',100,'{}','Ödeme Bekleniyor',10000) returning id into oid;
 perform marketing_link_order('10000000-0000-4000-8000-000000000020','PHASE2-MARKETING');
 if exists(select 1 from marketing_purchase_outbox where order_id=oid) then raise exception 'unpaid queued';end if;
 update orders set payment_status='paid',paid_at=now() where id=oid;
 select event_id into eid from marketing_purchase_outbox where order_id=oid;
 if eid is null then raise exception 'paid missing';end if;
 perform marketing_link_order('10000000-0000-4000-8000-000000000020','PHASE2-MARKETING');
 if (select event_id from marketing_purchase_outbox where order_id=oid)<>eid then raise exception 'event changed';end if;
 perform marketing_set_permission('10000000-0000-4000-8000-000000000020',false,'2026-09-17');
 if exists(select 1 from marketing_purchase_outbox where order_id=oid and (payload is not null or subject_id is not null or status<>'cancelled')) then raise exception 'revocation leaked';end if;
 if has_function_privilege('anon','marketing_link_order(uuid,text)','execute') or has_table_privilege('authenticated','marketing_purchase_outbox','select') then raise exception 'marketing public';end if;
end $$;
rollback;
