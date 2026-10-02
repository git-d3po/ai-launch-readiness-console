-- Schema and seed fingerprint: a read-only parity test.
--
-- Returns 12 rows (part, md5). Run it against two databases and compare the
-- rows: identical rows mean that part is identical. Used on 2026-10-02 to show
-- that the live project matched a fresh database built from this repo's
-- migrations (docs/evaluation/EVALUATION_LOG.md, EVAL-023 and EVAL-034).
--
-- Read-only: one SELECT over the system catalogs and the six public tables. It
-- writes nothing and needs no temporary objects, so it is safe on production.
-- To prove that on a given run, execute it in a read-only transaction, e.g.
--   PGOPTIONS='-c default_transaction_read_only=on' psql -v ON_ERROR_STOP=1 -f supabase/tests/fingerprint.sql
--
-- Run it as the database owner role (postgres) on both sides. The grant parts
-- read information_schema views, which only list grants that involve roles
-- enabled for the current user.
--
-- What each part covers (schema public only):
--   columns              every column of every table and view: type, NOT NULL, default, identity
--   constraints          every constraint with its full definition (CHECK, PK, FK, UNIQUE)
--   indexes              every index definition
--   policies             every RLS policy: table, name, permissive, command, roles, USING, WITH CHECK
--   rls+owners           tables, views, sequences: RLS enabled, RLS forced, owner role
--   table_grants         table-level privileges held by anon, authenticated, PUBLIC
--   column_write_grants  column-level non-SELECT privileges held by anon, authenticated, PUBLIC
--   functions            signature, md5 of the full definition, ACL, SECURITY DEFINER, config
--                        (search_path); excludes the platform-created rls_auto_enable(),
--                        which a database built from these migrations does not have
--   views                md5 of each view definition and its options (security_invoker)
--   enums                every enum type with its labels in order
--   user_triggers        non-internal triggers on public tables ('none' when there are none)
--   seed_data            row content of the six tables: ids, key columns, md5 of long text.
--                        Timestamps (created_at, updated_at, decided_at) are excluded because
--                        they record when the seed ran.
--
-- Not covered: other schemas, extensions, default privileges (pg_default_acl), role
-- memberships, database or role settings, sequence values, event triggers, Auth and
-- Data API configuration. md5 is a change detector here, not a security control.
-- The live comparison also needs the live database to be at the seed, since
-- seed_data hashes the table contents.

with
cols as (select string_agg(format('%s.%s %s notnull=%s default=%s identity=%s', c.relname, a.attname, format_type(a.atttypid, a.atttypmod), a.attnotnull, coalesce(pg_get_expr(d.adbin, d.adrelid), ''), a.attidentity), E'\n' order by c.relname, a.attnum) s
  from pg_class c join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
  where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v')),
cons as (select string_agg(format('%s %s %s', conrelid::regclass, conname, pg_get_constraintdef(oid)), E'\n' order by conrelid::regclass::text, conname) s from pg_constraint where connamespace = 'public'::regnamespace),
idx as (select string_agg(indexdef, E'\n' order by indexname) s from pg_indexes where schemaname = 'public'),
pol as (select string_agg(format('%s %s %s %s %s %s %s', tablename, policyname, permissive, cmd, roles, qual, with_check), E'\n' order by tablename, policyname) s from pg_policies where schemaname = 'public'),
rls as (select string_agg(format('%s rls=%s force=%s owner=%s', relname, relrowsecurity, relforcerowsecurity, pg_get_userbyid(relowner)), E'\n' order by relname) s from pg_class where relnamespace = 'public'::regnamespace and relkind in ('r', 'v', 'S')),
tgr as (select string_agg(format('%s %s %s', table_name, privilege_type, grantee), E'\n' order by table_name, grantee, privilege_type) s from information_schema.role_table_grants where table_schema = 'public' and grantee in ('anon', 'authenticated', 'PUBLIC')),
cgr as (select string_agg(format('%s.%s %s %s', table_name, column_name, privilege_type, grantee), E'\n' order by table_name, column_name, grantee, privilege_type) s from information_schema.column_privileges where table_schema = 'public' and grantee in ('anon', 'authenticated', 'PUBLIC') and privilege_type <> 'SELECT'),
fns as (select string_agg(format('%s def=%s acl=%s secdef=%s cfg=%s', p.oid::regprocedure, md5(pg_get_functiondef(p.oid)), coalesce(p.proacl::text, 'NULL'), p.prosecdef, p.proconfig), E'\n' order by p.oid::regprocedure::text) s from pg_proc p where pronamespace = 'public'::regnamespace and proname <> 'rls_auto_enable'),
vws as (select string_agg(format('%s def=%s opts=%s', c.relname, md5(pg_get_viewdef(c.oid)), c.reloptions), E'\n' order by relname) s from pg_class c where relnamespace = 'public'::regnamespace and relkind = 'v'),
enm as (select string_agg(format('%s %s', t.typname, (select string_agg(enumlabel, '|' order by enumsortorder) from pg_enum e where e.enumtypid = t.oid)), E'\n' order by t.typname) s from pg_type t where typnamespace = 'public'::regnamespace and typtype = 'e'),
trg as (select coalesce(string_agg(format('%s %s', tgrelid::regclass, tgname), E'\n' order by tgname), 'none') s from pg_trigger where not tgisinternal and tgrelid in (select oid from pg_class where relnamespace = 'public'::regnamespace)),
dat as (select concat_ws(E'\n',
   (select string_agg(format('%s|%s|%s|%s|%s', id, name, owner, target_date, md5(description)), ';' order by id) from public.launches),
   (select string_agg(format('%s|%s|%s|%s|%s|%s|%s|%s|%s', id, launch_id, category, title, owner, required, status, md5(pass_criteria), waiver_rationale), ';' order by id) from public.gates),
   (select string_agg(format('%s|%s|%s|%s|%s|%s|%s', id, gate_id, type, title, md5(summary), source, recorded_on), ';' order by id) from public.evidence),
   (select string_agg(format('%s|%s|%s|%s|%s|%s|%s|%s', id, launch_id, title, likelihood, impact, owner, status, gate_id), ';' order by id) from public.risks),
   (select string_agg(format('%s|%s|%s|%s|%s|%s|%s|%s|%s', id, launch_id, kind, decision, md5(rationale), decided_by, gate_id, risk_id, waiver_rationale), ';' order by id) from public.decisions),
   (select string_agg(format('%s|%s|%s|%s', id, launch_id, stage, status), ';' order by id) from public.rollout_stages)) s)
select 'columns' as part, md5(s) from cols union all
select 'constraints', md5(s) from cons union all
select 'indexes', md5(s) from idx union all
select 'policies', md5(s) from pol union all
select 'rls+owners', md5(s) from rls union all
select 'table_grants', md5(s) from tgr union all
select 'column_write_grants', md5(s) from cgr union all
select 'functions', md5(s) from fns union all
select 'views', md5(s) from vws union all
select 'enums', md5(s) from enm union all
select 'user_triggers', md5(s) from trg union all
select 'seed_data', md5(s) from dat
order by 1;
