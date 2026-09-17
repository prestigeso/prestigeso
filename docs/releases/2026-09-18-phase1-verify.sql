-- Read-only verification. Expected: present/rls_enabled/service_can_execute=true;
-- anon/customer access=false. Does not display visitor or order records.
with expected(name) as (values ('analytics_visitors'), ('analytics_sessions'), ('analytics_events'), ('analytics_order_links'))
select e.name, c.oid is not null as present, c.relrowsecurity as rls_enabled,
  has_table_privilege('anon', c.oid, 'SELECT') as anon_can_read,
  has_table_privilege('authenticated', c.oid, 'SELECT') as customer_can_read
from expected e left join pg_namespace n on n.nspname = 'public'
left join pg_class c on c.relnamespace = n.oid and c.relname = e.name;

with expected(signature) as (values
  ('public.analytics_open_session(uuid,text,text,text,text)'),
  ('public.analytics_ingest(uuid,jsonb)'),
  ('public.analytics_link_order(uuid,uuid,uuid,uuid,text)'),
  ('public.analytics_revoke(uuid)'), ('public.analytics_purge()'))
select signature, to_regprocedure(signature) is not null as present,
  has_function_privilege('anon', to_regprocedure(signature), 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', to_regprocedure(signature), 'EXECUTE') as customer_can_execute,
  has_function_privilege('service_role', to_regprocedure(signature), 'EXECUTE') as service_can_execute
from expected;

select table_name, column_name, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'analytics_sessions' and column_name = 'policy_version';
