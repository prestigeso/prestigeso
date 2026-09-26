begin;
insert into products(name,price,category,stock,"SKU") values('Phase2 fixture',100,null,10,'PHASE2-COST');
do $$ declare v integer; product_id bigint; v_order_id bigint; old_lines jsonb; begin
 select id into product_id from products where "SKU"='PHASE2-COST';
 v:=phase2_save_record('10000000-0000-4000-8000-000000000001','product_cost','PHASE2-COST',0,'{"amountMinor":1000,"taxBasis":"inclusive","currency":"TRY","note":"Test cost"}');
 if v<>1 then raise exception 'bad version'; end if;
 if phase2_save_record('10000000-0000-4000-8000-000000000001','product_cost','PHASE2-COST',0,'{"amountMinor":1000,"taxBasis":"inclusive","currency":"TRY","note":"Test cost"}')<>1 then raise exception 'retry'; end if;
 begin
  perform phase2_save_record('10000000-0000-4000-8000-000000000002','product_cost','PHASE2-COST',0,'{"amountMinor":2000,"taxBasis":"inclusive","currency":"TRY","note":"Test cost"}');
  raise exception 'stale write accepted';
 exception when others then if sqlerrm<>'VERSION_CONFLICT' then raise; end if; end;
 insert into orders(order_no,merchant_oid,user_email,items,total_amount,shipping_address,status,paytr_total_amount)
 values('PHASE2-FIXTURE','PHASE2-FIXTURE','fixture@example.invalid',jsonb_build_array(jsonb_build_object('id',product_id,'quantity',2)),100,'{}','Ödeme Bekleniyor',10000) returning id into v_order_id;
 select lines into old_lines from phase2_order_cost_snapshots where order_id=v_order_id;
 if (old_lines->0->'unitCost'->>'amountMinor')::integer<>1000 then raise exception 'missing snapshot'; end if;
 perform phase2_save_record('10000000-0000-4000-8000-000000000003','product_cost','PHASE2-COST',1,'{"amountMinor":2000,"taxBasis":"inclusive","currency":"TRY","note":"New cost"}');
 if (select lines from phase2_order_cost_snapshots where order_id=v_order_id)<>old_lines then raise exception 'history mutated'; end if;
 if (select count(*) from phase2_record_history where resource_key='PHASE2-COST')<>2 then raise exception 'audit duplicate'; end if;
 if (select stock from products where id=product_id)<>10 then raise exception 'stock modified'; end if;
 if has_table_privilege('anon','phase2_records','select') or has_table_privilege('authenticated','phase2_record_history','select') or has_table_privilege('service_role','phase2_records','update') then raise exception 'private ledger grants'; end if;
 if has_function_privilege('anon','phase2_save_record(uuid,text,text,integer,jsonb)','execute') then raise exception 'public RPC'; end if;
end $$;
rollback;
