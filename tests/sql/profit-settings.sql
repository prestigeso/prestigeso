begin;
do $$ declare v integer; settings jsonb := '{"vatBps":2000,"commissionBps":1500,"shippingMinor":13000,"packagingMinor":0,"logisticsMinor":0,"giftThresholdMinor":0,"giftCostMinor":0,"hiddenBps":1000,"advertisingBps":0}'::jsonb;
begin
 v := public.save_profit_profile('20000000-0000-4000-8000-000000000001','trendyol',0,now()-interval '10 days',settings);
 if v<>1 then raise exception 'PROFILE_NOT_SAVED'; end if;
 if public.save_profit_profile('20000000-0000-4000-8000-000000000001','trendyol',0,now()-interval '10 days',settings)<>1 then raise exception 'PROFILE_RETRY_FAILED'; end if;
 v := public.save_profit_profile('20000000-0000-4000-8000-000000000002','trendyol',1,now()-interval '5 days',settings);
 if v<>2 or (select count(*) from public.profit_profiles where platform='trendyol')<>2 then raise exception 'BACKDATED_PROFILE_NOT_SAVED'; end if;
 begin
  perform public.save_profit_profile('20000000-0000-4000-8000-000000000003','trendyol',1,now()-interval '1 day',settings);
  raise exception 'STALE_PROFILE_ACCEPTED';
 exception when others then if sqlerrm<>'VERSION_CONFLICT' then raise; end if; end;
end $$;
rollback;
