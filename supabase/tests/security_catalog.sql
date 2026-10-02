-- Stage 1 security catalog test: a read-only regression test.
--
-- Returns one row per check (PASS or FAIL) and a final overall row. A run
-- passes only when every row says PASS. A check that cannot be evaluated
-- counts as FAIL: NULL is never treated as success.
--
-- Read-only: one SELECT over the system catalogs. It writes nothing and needs
-- no temporary objects, so it is safe on production (invariant I19). To prove
-- that on a given run, execute it in a read-only transaction, e.g.
--   PGOPTIONS='-c default_transaction_read_only=on' psql -v ON_ERROR_STOP=1 -f supabase/tests/security_catalog.sql
-- Run it as the database owner role (postgres), like fingerprint.sql.
--
-- It checks the Stage 1 invariants (I2 to I6, I9) recorded in
-- docs/security/2026-10-02-audit-2b-reconcile.md, for schema public, where
-- "API roles" means anon and authenticated:
--    1  RLS is enabled on every table, and the 6 application tables exist
--    2  the API roles hold SELECT on exactly the 6 tables and 1 view
--    3  no INSERT        4  no UPDATE        5  no DELETE        6  no TRUNCATE
--       (table-level or column-level, on any relation)
--    7  no REFERENCES, TRIGGER or (Postgres 17+) MAINTAIN
--    8  no USAGE, SELECT or UPDATE on any sequence
--    9  no EXECUTE on any function (Stage 1 allowlist: empty)
--   10  every view uses security_invoker
--   11  every SECURITY DEFINER function pins its search_path
--   12  no SECURITY DEFINER application function uses dynamic EXECUTE
--   13  anon and authenticated hold identical privileges
--   14  tables that postgres creates later grant nothing to the API roles or PUBLIC
--   15  the security-relevant fingerprint parts match the Stage 1 build
--   16  the API roles cannot create objects in schema public
--   17  every relation and function in public is owned by postgres, so the
--       default privileges of check 14 are the ones that apply
--
-- Checks 9 and 15 describe Stage 1. The Stage 2 sandbox functions will change
-- them on purpose; update their expected values in the same commit as that
-- migration. Check 15 copies seven parts of supabase/tests/fingerprint.sql;
-- keep the two in step.

with
cfg as (
  select current_setting('server_version_num')::int >= 170000 as has_maintain
),
api_roles as (
  select oid, rolname from pg_roles where rolname in ('anon', 'authenticated')
),
expected_tables(relname) as (
  values ('launches'), ('gates'), ('evidence'), ('risks'), ('decisions'), ('rollout_stages')
),
expected_readable(relname) as (
  select relname from expected_tables union all select 'launch_current_stage'
),
rels as (
  select oid, relname, relkind, relrowsecurity, reloptions, relowner
  from pg_class
  where relnamespace = 'public'::regnamespace and relkind in ('r', 'p', 'v', 'm', 'f')
),
table_privs(priv, per_column) as (
  values ('SELECT', true), ('INSERT', true), ('UPDATE', true), ('DELETE', false),
         ('TRUNCATE', false), ('REFERENCES', true), ('TRIGGER', false), ('MAINTAIN', false)
),
-- has_table_privilege ignores column-level grants, so privileges that can be
-- granted per column are tested with has_any_column_privilege.
granted as (
  select a.rolname, r.relname, p.priv
  from api_roles a cross join rels r cross join table_privs p cross join cfg
  where case
    when p.priv = 'MAINTAIN' and not cfg.has_maintain then false
    when p.per_column then has_any_column_privilege(a.oid, r.oid, p.priv)
    else has_table_privilege(a.oid, r.oid, p.priv)
  end
),
seq_granted as (
  select a.rolname, c.relname, p.priv
  from api_roles a
  cross join pg_class c
  cross join (values ('USAGE'), ('SELECT'), ('UPDATE')) p(priv)
  where c.relnamespace = 'public'::regnamespace and c.relkind = 'S'
    and has_sequence_privilege(a.oid, c.oid, p.priv)
),
fn_exec as (
  select a.rolname, p.oid::regprocedure::text as fn
  from api_roles a cross join pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and has_function_privilege(a.oid, p.oid, 'EXECUTE')
),
other_granted as (
  select a.rolname, x.item
  from api_roles a
  cross join lateral (values
    ('schema public USAGE', has_schema_privilege(a.oid, 'public', 'USAGE')),
    ('schema public CREATE', has_schema_privilege(a.oid, 'public', 'CREATE')),
    ('database CONNECT', has_database_privilege(a.oid, current_database(), 'CONNECT')),
    ('database CREATE', has_database_privilege(a.oid, current_database(), 'CREATE')),
    ('database TEMPORARY', has_database_privilege(a.oid, current_database(), 'TEMPORARY'))
  ) x(item, ok)
  where x.ok
),
posture as (
  select rolname, format('table %s %s', relname, priv) as item from granted
  union all select rolname, format('sequence %s %s', relname, priv) from seq_granted
  union all select rolname, format('function %s EXECUTE', fn) from fn_exec
  union all select rolname, item from other_granted
),
secdef as (
  select p.oid::regprocedure::text as fn, p.proname, p.prosrc, p.proconfig
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.prosecdef
),
-- The seven security-relevant parts of supabase/tests/fingerprint.sql, copied
-- unchanged except that an empty part hashes as '' instead of NULL.
fp_cons as (select string_agg(format('%s %s %s', conrelid::regclass, conname, pg_get_constraintdef(oid)), E'\n' order by conrelid::regclass::text, conname) s from pg_constraint where connamespace = 'public'::regnamespace),
fp_pol as (select string_agg(format('%s %s %s %s %s %s %s', tablename, policyname, permissive, cmd, roles, qual, with_check), E'\n' order by tablename, policyname) s from pg_policies where schemaname = 'public'),
fp_rls as (select string_agg(format('%s rls=%s force=%s owner=%s', relname, relrowsecurity, relforcerowsecurity, pg_get_userbyid(relowner)), E'\n' order by relname) s from pg_class where relnamespace = 'public'::regnamespace and relkind in ('r', 'v', 'S')),
fp_tgr as (select string_agg(format('%s %s %s', table_name, privilege_type, grantee), E'\n' order by table_name, grantee, privilege_type) s from information_schema.role_table_grants where table_schema = 'public' and grantee in ('anon', 'authenticated', 'PUBLIC')),
fp_cgr as (select string_agg(format('%s.%s %s %s', table_name, column_name, privilege_type, grantee), E'\n' order by table_name, column_name, grantee, privilege_type) s from information_schema.column_privileges where table_schema = 'public' and grantee in ('anon', 'authenticated', 'PUBLIC') and privilege_type <> 'SELECT'),
fp_fns as (select string_agg(format('%s def=%s acl=%s secdef=%s cfg=%s', p.oid::regprocedure, md5(pg_get_functiondef(p.oid)), coalesce(p.proacl::text, 'NULL'), p.prosecdef, p.proconfig), E'\n' order by p.oid::regprocedure::text) s from pg_proc p where pronamespace = 'public'::regnamespace and proname <> 'rls_auto_enable'),
fp_vws as (select string_agg(format('%s def=%s opts=%s', c.relname, md5(pg_get_viewdef(c.oid)), c.reloptions), E'\n' order by relname) s from pg_class c where relnamespace = 'public'::regnamespace and relkind = 'v'),
fp(part, actual, expected) as (
  select 'constraints', md5(coalesce((select s from fp_cons), '')), 'e21c19ff0d76992a123dac84cf6e9414'
  union all select 'policies', md5(coalesce((select s from fp_pol), '')), '5413a6d3b0520ccf75b53f4f7067bef1'
  union all select 'rls+owners', md5(coalesce((select s from fp_rls), '')), '416b404f44bc87e538217610f1a1afb1'
  union all select 'table_grants', md5(coalesce((select s from fp_tgr), '')), '81ed597a2d217bdefda59babdc03008a'
  union all select 'column_write_grants', md5(coalesce((select s from fp_cgr), '')), 'd41d8cd98f00b204e9800998ecf8427e'
  union all select 'functions', md5(coalesce((select s from fp_fns), '')), '8389103e34beaefa36fa084837e7320b'
  union all select 'views', md5(coalesce((select s from fp_vws), '')), '6c60d69e83dedcece4f5b8c698c2ba7e'
),
checks(check_no, name, ok, detail) as (
  select 1, 'RLS is enabled on every public table',
    not exists (select 1 from rels where relkind in ('r', 'p') and not relrowsecurity)
      and not exists (select 1 from expected_tables e where not exists (select 1 from rels r where r.relname = e.relname and r.relkind in ('r', 'p'))),
    concat_ws('; ',
      format('%s tables checked', (select count(*) from rels where relkind in ('r', 'p'))),
      'without RLS: ' || (select string_agg(relname, ', ' order by relname) from rels where relkind in ('r', 'p') and not relrowsecurity),
      'missing: ' || (select string_agg(e.relname, ', ' order by e.relname) from expected_tables e where not exists (select 1 from rels r where r.relname = e.relname and r.relkind in ('r', 'p'))))

  union all
  select 2, 'API roles hold SELECT on exactly the 6 tables and 1 view',
    (select count(*) from api_roles) = 2
      and not exists (select 1 from api_roles a cross join expected_readable e left join rels r on r.relname = e.relname
                      where r.oid is null or not has_table_privilege(a.oid, r.oid, 'SELECT'))
      and not exists (select 1 from granted g where g.priv = 'SELECT' and g.relname not in (select relname from expected_readable)),
    concat_ws('; ',
      format('%s role-relation pairs readable', (select count(*) from granted g where g.priv = 'SELECT' and g.relname in (select relname from expected_readable))),
      'missing: ' || (select string_agg(a.rolname || ' ' || e.relname, ', ') from api_roles a cross join expected_readable e left join rels r on r.relname = e.relname
                      where r.oid is null or not has_table_privilege(a.oid, r.oid, 'SELECT')),
      'unexpected: ' || (select string_agg(g.rolname || ' ' || g.relname, ', ') from granted g where g.priv = 'SELECT' and g.relname not in (select relname from expected_readable)))

  union all
  select 3 + i, format('API roles hold no %s privilege', priv),
    not exists (select 1 from granted g where g.priv = t.priv),
    coalesce('granted: ' || (select string_agg(g.rolname || ' ' || g.relname, ', ' order by g.rolname, g.relname) from granted g where g.priv = t.priv), 'none, table-level or column-level')
  from (values (0, 'INSERT'), (1, 'UPDATE'), (2, 'DELETE'), (3, 'TRUNCATE')) t(i, priv)

  union all
  select 7, 'API roles hold no REFERENCES, TRIGGER or MAINTAIN privilege',
    not exists (select 1 from granted g where g.priv in ('REFERENCES', 'TRIGGER', 'MAINTAIN')),
    concat_ws('; ',
      case when (select has_maintain from cfg) then 'MAINTAIN checked' else 'MAINTAIN not checked (server older than 17)' end,
      'granted: ' || (select string_agg(g.rolname || ' ' || g.relname || ' ' || g.priv, ', ') from granted g where g.priv in ('REFERENCES', 'TRIGGER', 'MAINTAIN')))

  union all
  select 8, 'API roles hold no sequence privileges',
    not exists (select 1 from seq_granted),
    concat_ws('; ',
      format('%s sequences checked', (select count(*) from pg_class where relnamespace = 'public'::regnamespace and relkind = 'S')),
      'granted: ' || (select string_agg(rolname || ' ' || relname || ' ' || priv, ', ') from seq_granted))

  union all
  select 9, 'API roles can execute no function (Stage 1 allowlist is empty)',
    not exists (select 1 from fn_exec),
    concat_ws('; ',
      format('%s functions checked', (select count(*) from pg_proc where pronamespace = 'public'::regnamespace)),
      'executable: ' || (select string_agg(rolname || ' ' || fn, ', ' order by rolname, fn) from fn_exec))

  union all
  select 10, 'Every public view uses security_invoker',
    not exists (select 1 from rels where relkind = 'v' and not exists (
      select 1 from unnest(coalesce(reloptions, '{}')) o where lower(o) in ('security_invoker=true', 'security_invoker=on', 'security_invoker=1', 'security_invoker=yes'))),
    concat_ws('; ',
      format('%s views checked', (select count(*) from rels where relkind = 'v')),
      'without security_invoker: ' || (select string_agg(relname, ', ') from rels where relkind = 'v' and not exists (
        select 1 from unnest(coalesce(reloptions, '{}')) o where lower(o) in ('security_invoker=true', 'security_invoker=on', 'security_invoker=1', 'security_invoker=yes'))))

  union all
  select 11, 'Every SECURITY DEFINER function pins its search_path',
    not exists (select 1 from secdef where not exists (
      select 1 from unnest(coalesce(proconfig, '{}')) c where c in ('search_path=""', 'search_path=pg_catalog'))),
    concat_ws('; ',
      (select string_agg(fn || ' ' || coalesce(array_to_string(proconfig, ' '), 'no config'), ', ' order by fn) from secdef),
      'unpinned: ' || (select string_agg(fn, ', ') from secdef where not exists (
        select 1 from unnest(coalesce(proconfig, '{}')) c where c in ('search_path=""', 'search_path=pg_catalog'))))

  union all
  select 12, 'No SECURITY DEFINER application function uses dynamic EXECUTE',
    not exists (select 1 from secdef where proname <> 'rls_auto_enable' and prosrc ~* '\mexecute\M'),
    concat_ws('; ',
      format('%s application functions checked; the platform event-trigger function rls_auto_enable is excluded here and covered by check 9',
        (select count(*) from secdef where proname <> 'rls_auto_enable')),
      'uses EXECUTE: ' || (select string_agg(fn, ', ') from secdef where proname <> 'rls_auto_enable' and prosrc ~* '\mexecute\M'))

  union all
  select 13, 'anon and authenticated hold identical privileges',
    not exists ((select item from posture where rolname = 'anon' except select item from posture where rolname = 'authenticated')
                union all
                (select item from posture where rolname = 'authenticated' except select item from posture where rolname = 'anon')),
    concat_ws('; ',
      format('%s privileges each', (select count(*) from posture where rolname = 'anon')),
      'anon only: ' || (select string_agg(item, ', ') from (select item from posture where rolname = 'anon' except select item from posture where rolname = 'authenticated') d),
      'authenticated only: ' || (select string_agg(item, ', ') from (select item from posture where rolname = 'authenticated' except select item from posture where rolname = 'anon') d))

  union all
  select 14, 'Tables postgres creates later grant nothing to API roles or PUBLIC',
    not exists (select 1 from pg_default_acl d cross join lateral aclexplode(d.defaclacl) a
                where d.defaclrole = 'postgres'::regrole and d.defaclobjtype = 'r'
                  and d.defaclnamespace in (0, 'public'::regnamespace)
                  and (a.grantee = 0 or a.grantee in (select oid from api_roles))),
    coalesce('default grants: ' || (select string_agg(format('%s %s %s', case when d.defaclnamespace = 0 then 'global' else 'public' end,
                                                            case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end, a.privilege_type), ', ')
                                    from pg_default_acl d cross join lateral aclexplode(d.defaclacl) a
                                    where d.defaclrole = 'postgres'::regrole and d.defaclobjtype = 'r'
                                      and d.defaclnamespace in (0, 'public'::regnamespace)
                                      and (a.grantee = 0 or a.grantee in (select oid from api_roles))),
             'none, global or in public')

  union all
  select 15, 'Security-relevant fingerprint parts match the Stage 1 build',
    not exists (select 1 from fp where actual is distinct from expected),
    coalesce('differs: ' || (select string_agg(part, ', ') from fp where actual is distinct from expected),
             format('%s of 7 parts match', (select count(*) from fp where actual = expected)))

  union all
  select 16, 'API roles cannot create objects in schema public',
    not exists (select 1 from api_roles a where has_schema_privilege(a.oid, 'public', 'CREATE'))
      and not exists (select 1 from pg_namespace n cross join lateral aclexplode(n.nspacl) x
                      where n.nspname = 'public' and x.grantee = 0 and x.privilege_type = 'CREATE'),
    coalesce('CREATE held by: ' || (select string_agg(rolname, ', ') from api_roles a where has_schema_privilege(a.oid, 'public', 'CREATE')),
             'no CREATE for anon, authenticated or PUBLIC')

  union all
  select 17, 'Every relation and function in public is owned by postgres',
    not exists (select 1 from pg_class where relnamespace = 'public'::regnamespace and relowner <> 'postgres'::regrole)
      and not exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proowner <> 'postgres'::regrole),
    concat_ws('; ',
      format('%s relations, %s functions checked',
        (select count(*) from pg_class where relnamespace = 'public'::regnamespace),
        (select count(*) from pg_proc where pronamespace = 'public'::regnamespace)),
      'other owners: ' || (select string_agg(x, ', ') from (
        select relname || ' (' || pg_get_userbyid(relowner) || ')' as x from pg_class where relnamespace = 'public'::regnamespace and relowner <> 'postgres'::regrole
        union all
        select proname || ' (' || pg_get_userbyid(proowner) || ')' from pg_proc where pronamespace = 'public'::regnamespace and proowner <> 'postgres'::regrole) o))
),
results as (
  select check_no, name, coalesce(ok, false) as ok, detail from checks
)
select check_no, name, case when ok then 'PASS' else 'FAIL' end as result, detail from results
union all
select 99, 'Overall',
  case when bool_and(ok) then 'PASS' else 'FAIL' end,
  format('%s of %s checks passed', count(*) filter (where ok), count(*))
from results
order by 1;
