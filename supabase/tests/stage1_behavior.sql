-- Stage 1 behavior test (B-1, B-2, B-3 in docs/security/2026-10-02-audit-2b-reconcile.md).
-- Local or ephemeral databases only, never a Supabase project (invariant I19).
--
-- Build the database first: supabase/tests/local_roles.sql, then the migrations
-- in order. Then run, as the database owner:
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/stage1_behavior.sql
-- The script refuses to run where Supabase's auth or supabase_migrations schema
-- exists. Everything runs in one transaction that is rolled back, so the
-- database is left as it was.
--
-- Each row is PASS or FAIL. A denial passes only with SQLSTATE 42501
-- (insufficient_privilege), so a missing table or a broken query can't pass
-- as a permission check. A rejected source passes only when the
-- evidence_source_https constraint is the one that rejected it.

\set ON_ERROR_STOP on

do $$
begin
  if to_regnamespace('auth') is not null or to_regnamespace('supabase_migrations') is not null then
    raise exception 'stage1_behavior.sql runs only on a local database built from this repository, never on a Supabase project';
  end if;
end $$;

begin;

create temp table behavior_results (
  check_no int primary key,
  name text not null,
  passed boolean not null,
  detail text not null
);

-- Runs one statement as the given role and returns 'succeeded' or the SQLSTATE.
-- A failure rolls back the statement and the role switch together.
create function pg_temp.attempt(p_role text, p_sql text) returns text
language plpgsql as $$
begin
  execute format('set local role %I', p_role);
  execute p_sql;
  reset role;
  return 'succeeded';
exception when others then
  return sqlstate;
end $$;

-- Inserts one evidence row with the given source, as the owner.
create function pg_temp.try_source(p_source text) returns text
language plpgsql as $$
declare
  v_constraint text;
begin
  insert into public.evidence (gate_id, type, title, summary, source)
  values ((select min(id) from public.gates), 'Document', 'Source rule probe', 'Local test only', p_source);
  return 'accepted';
exception
  when check_violation then
    get stacked diagnostics v_constraint = constraint_name;
    return 'rejected by ' || v_constraint;
  when others then
    return 'error ' || sqlstate;
end $$;

create temp table seed_before as
select (select count(*) from public.launches) as launches,
       (select count(*) from public.gates) as gates,
       (select string_agg(id || ':' || status, ',' order by id) from public.gates) as gate_statuses,
       (select count(*) from public.evidence) as evidence,
       (select count(*) from public.risks) as risks,
       (select count(*) from public.decisions) as decisions,
       (select count(*) from public.rollout_stages) as stages;

-- B-1: both API roles read every table and the view, and see the seed.
do $$
declare
  v_role text;
  v_no int := 1;
  v_counts text;
  v_state text;
begin
  foreach v_role in array array['anon', 'authenticated'] loop
    v_counts := null;
    v_state := 'ok';
    begin
      execute format('set local role %I', v_role);
      select format('launches=%s gates=%s evidence=%s risks=%s decisions=%s stages=%s current_stage=%s',
        (select count(*) from public.launches), (select count(*) from public.gates),
        (select count(*) from public.evidence), (select count(*) from public.risks),
        (select count(*) from public.decisions), (select count(*) from public.rollout_stages),
        (select count(*) from public.launch_current_stage))
      into v_counts;
      reset role;
    exception when others then
      v_state := sqlstate;
    end;
    insert into behavior_results values (
      v_no, v_role || ' reads all 6 tables and the view',
      coalesce(v_counts = 'launches=1 gates=16 evidence=10 risks=6 decisions=4 stages=3 current_stage=1', false),
      coalesce(v_counts, 'read failed with ' || v_state));
    v_no := v_no + 1;
  end loop;
end $$;

-- B-1: every write path is denied with 42501, for both API roles.
do $$
declare
  v_role text;
  v_no int := 3;
  v_case record;
  v_sql text;
  v_state text;
  v_total int;
  v_bad text[];
begin
  foreach v_role in array array['anon', 'authenticated'] loop
    for v_case in
      select * from (values
        ('INSERT on all 6 tables', array[
          'insert into public.launches default values', 'insert into public.gates default values',
          'insert into public.evidence default values', 'insert into public.risks default values',
          'insert into public.decisions default values', 'insert into public.rollout_stages default values',
          $q$insert into public.evidence (gate_id, type, title, summary, source) values (1, 'Sign-off', 'Forged sign-off', 'Approved', 'https://example.com')$q$]),
        ('UPDATE on all 6 tables', array[
          'update public.launches set name = name where false', 'update public.gates set status = status where false',
          'update public.evidence set title = title where false', 'update public.risks set title = title where false',
          'update public.decisions set rationale = rationale where false', 'update public.rollout_stages set status = status where false']),
        ('DELETE on all 6 tables', array[
          'delete from public.launches where false', 'delete from public.gates where false',
          'delete from public.evidence where false', 'delete from public.risks where false',
          'delete from public.decisions where false', 'delete from public.rollout_stages where false']),
        ('TRUNCATE on all 6 tables', array[
          'truncate public.launches', 'truncate public.gates', 'truncate public.evidence',
          'truncate public.risks', 'truncate public.decisions', 'truncate public.rollout_stages']),
        ('row locks (SELECT ... FOR UPDATE)', array['select 1 from public.gates for update']),
        ('set_gate_status', array[
          $q$select public.set_gate_status((select id from public.gates where title = 'Required stakeholder sign-offs recorded'), 'Passed', 'Forged approval', 'Trust & Safety Lead')$q$,
          $q$select public.set_gate_status((select id from public.gates where title = 'Required stakeholder sign-offs recorded'), 'Waived', 'Forged waiver', 'Trust & Safety Lead', 'Not needed')$q$]),
        ('reset_demo_data', array['select public.reset_demo_data()']),
        ('CREATE TABLE in public', array['create table public.zz_api_role_probe (x int)'])
      ) c(label, statements)
    loop
      v_total := 0;
      v_bad := '{}';
      foreach v_sql in array v_case.statements loop
        v_total := v_total + 1;
        v_state := pg_temp.attempt(v_role, v_sql);
        if v_state <> '42501' then
          v_bad := v_bad || format('%s -> %s', left(v_sql, 60), v_state);
        end if;
      end loop;
      insert into behavior_results values (
        v_no, format('%s denied %s', v_role, v_case.label),
        cardinality(v_bad) = 0,
        case when cardinality(v_bad) = 0 then format('%s of %s denied with 42501', v_total, v_total)
             else 'unexpected: ' || array_to_string(v_bad, '; ') end);
      v_no := v_no + 1;
    end loop;
  end loop;
end $$;

-- Nothing the API roles attempted changed the seed.
insert into behavior_results
select 19, 'Seed data unchanged after every denied attempt',
  coalesce(b.launches = a.launches and b.gates = a.gates and b.gate_statuses = a.gate_statuses
    and b.evidence = a.evidence and b.risks = a.risks and b.decisions = a.decisions and b.stages = a.stages, false),
  format('launches=%s gates=%s evidence=%s risks=%s decisions=%s stages=%s', a.launches, a.gates, a.evidence, a.risks, a.decisions, a.stages)
from seed_before b
cross join lateral (
  select (select count(*) from public.launches) as launches, (select count(*) from public.gates) as gates,
         (select string_agg(id || ':' || status, ',' order by id) from public.gates) as gate_statuses,
         (select count(*) from public.evidence) as evidence, (select count(*) from public.risks) as risks,
         (select count(*) from public.decisions) as decisions, (select count(*) from public.rollout_stages) as stages
) a;

-- The owner keeps the status path: one valid change writes one decision.
do $$
declare
  v_before bigint;
  v_id bigint;
  v_err text;
begin
  select count(*) into v_before from public.decisions;
  begin
    v_id := public.set_gate_status(
      (select id from public.gates where title = 'Production monitoring and alerting defined'),
      'In progress', 'Owner path still works', 'AI Program Lead');
  exception when others then
    v_err := sqlstate || ' ' || sqlerrm;
  end;
  insert into behavior_results values (
    20, 'The owner can still change a gate status through set_gate_status',
    coalesce(v_id is not null and (select count(*) from public.decisions) = v_before + 1, false),
    coalesce(v_err, format('decision %s written', v_id)));
end $$;

-- B-2: a table that postgres creates now grants the API roles nothing.
do $$
declare
  v_privs text[] := array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
  v_granted text;
begin
  if current_setting('server_version_num')::int >= 170000 then
    v_privs := v_privs || 'MAINTAIN'::text;
  end if;
  create table public.zz_default_privilege_probe (x int);
  select string_agg(r.rolname || ' ' || p, ', ')
  into v_granted
  from pg_roles r cross join unnest(v_privs) p
  where r.rolname in ('anon', 'authenticated')
    and has_table_privilege(r.oid, 'public.zz_default_privilege_probe'::regclass, p);
  insert into behavior_results values (
    21, 'A new table created by postgres grants the API roles nothing',
    v_granted is null,
    coalesce('granted: ' || v_granted, format('none of %s checked', array_to_string(v_privs, ', '))));
end $$;

-- B-3: the https rule on evidence.source.
create temp table source_cases (expect text not null, label text not null, source text);
insert into source_cases values
  ('accept', 'NULL', null),
  ('accept', 'plain host', 'https://example.com'),
  ('accept', 'subdomain and path', 'https://docs.example.com/eval/run-0924'),
  ('accept', 'punycode host, query, fragment', 'https://xn--bcher-kva.example/p?q=1#a'),
  ('accept', 'port and path', 'https://example.com:8443/reports/latest'),
  ('accept', 'query string', 'https://example.com/search?q=launch&page=2'),
  ('accept', 'query without path', 'https://example.com?only=query'),
  ('accept', 'fragment only', 'https://example.com/#section-2'),
  ('accept', 'uppercase host and path', 'https://EXAMPLE.com/Path'),
  ('accept', 'percent-encoded characters', 'https://example.com/a%20b/%C3%BC'),
  ('accept', 'brackets in the query', 'https://example.com/list?ids[]=1&ids[]=2'),
  ('accept', 'IPv4 literal (dotted numeric labels)', 'https://192.0.2.10/status'),
  ('reject', 'empty string', ''),
  ('reject', 'javascript: scheme', 'javascript:alert(document.domain)'),
  ('reject', 'uppercase javascript: scheme', 'JAVASCRIPT:alert(1)'),
  ('reject', 'data: scheme', 'data:text/html,<script>alert(1)</script>'),
  ('reject', 'http: scheme', 'http://example.com'),
  ('reject', 'uppercase scheme', 'HTTPS://example.com'),
  ('reject', 'protocol-relative', '//evil.example/x'),
  ('reject', 'relative path', '/relative/path'),
  ('reject', 'no scheme', 'example.com/path'),
  ('reject', 'one slash after scheme', 'https:/example.com'),
  ('reject', 'single-label host', 'https://example'),
  ('reject', 'localhost', 'https://localhost'),
  ('reject', 'user-info before the host', 'https://good.example@evil.example/'),
  ('reject', 'user and password', 'https://user:pass@example.com/'),
  ('reject', 'port then user-info', 'https://good.example:443@evil.example/'),
  ('reject', 'empty port', 'https://example.com:/x'),
  ('reject', 'host label starting with a hyphen', 'https://-bad.example.com'),
  ('reject', 'trailing dot on host', 'https://example.com./x'),
  ('reject', 'space in path', 'https://example.com/a b'),
  ('reject', 'leading space', ' https://example.com'),
  ('reject', 'trailing space', 'https://example.com '),
  ('reject', 'tab', E'https://example.com/\tx'),
  ('reject', 'embedded newline', E'https://example.com/\nx'),
  ('reject', 'backslash', 'https://example.com\@evil.example'),
  ('reject', 'angle brackets', 'https://example.com/<script>'),
  ('reject', 'double quote', 'https://example.com/"onmouseover'),
  ('reject', 'malformed percent escape', 'https://example.com/%zz'),
  ('reject', 'C1 control (NEL)', E'https://example.com/\u0085x'),
  ('reject', 'no-break space', E'https://example.com/ x'),
  ('reject', 'zero-width space', E'https://example.com/​x'),
  ('reject', 'right-to-left override', E'https://example.com/‮gnp.exe'),
  ('reject', 'left-to-right isolate', E'https://example.com/⁦x'),
  ('reject', 'raw non-ASCII letter (must be percent-encoded)', E'https://example.com/bücher');

insert into behavior_results
select 22, 'Every https source in the accept table is accepted',
  bool_and(outcome = 'accepted'),
  coalesce('unexpected: ' || string_agg(format('%s -> %s', label, outcome), '; ') filter (where outcome <> 'accepted'),
           format('%s of %s accepted', count(*), count(*)))
from (select label, pg_temp.try_source(source) as outcome from source_cases where expect = 'accept') t;

insert into behavior_results
select 23, 'Every unsafe source in the reject table is rejected by evidence_source_https',
  bool_and(outcome = 'rejected by evidence_source_https'),
  coalesce('unexpected: ' || string_agg(format('%s -> %s', label, outcome), '; ') filter (where outcome <> 'rejected by evidence_source_https'),
           format('%s of %s rejected by evidence_source_https', count(*), count(*)))
from (select label, pg_temp.try_source(source) as outcome from source_cases where expect = 'reject') t;

insert into behavior_results
select 24, 'An https source over 500 characters is still rejected by the length rule',
  outcome = 'rejected by evidence_source_check',
  outcome
from (select pg_temp.try_source('https://example.com/' || repeat('a', 481)) as outcome) t;

select check_no, name, case when passed then 'PASS' else 'FAIL' end as result, detail
from behavior_results
union all
select 99, 'Overall', case when bool_and(passed) then 'PASS' else 'FAIL' end,
  format('%s of %s checks passed', count(*) filter (where passed), count(*))
from behavior_results
order by 1;

rollback;
