-- Stage 2 sandbox behavior test (B-4 in docs/security/2026-10-02-audit-2b-reconcile.md,
-- contract in section 19; DR-013 to DR-018, DR-025).
-- Local or ephemeral databases only, never a Supabase project (invariant I19).
--
-- Build the database first: supabase/tests/local_roles.sql, then the migrations
-- in order. Then run, as the database owner:
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/stage2_sandbox_behavior.sql
-- The script refuses to run where Supabase's auth or supabase_migrations schema
-- exists. Everything runs in one transaction that is rolled back.
--
-- Each row is PASS or FAIL. A denial passes only with SQLSTATE 42501, a rule
-- passes only with SQLSTATE P0001 and the expected message, and a text or URL
-- rule passes only when the named constraint rejected the value.
--
-- now() is fixed for the whole transaction, so a second reset is always inside
-- the cooldown. The cooldown is lifted by moving sandbox_state.last_reset_at
-- back, as the owner, inside this rolled-back transaction.
--
-- The concurrency case (two sessions racing at one below a cap) needs two
-- sessions and lives in supabase/tests/stage2_concurrency.sh.
--
-- The file is ASCII-only on purpose: every control, invisible or non-ASCII
-- character in a test value is written as an E'' escape.

\set ON_ERROR_STOP on

do $$
begin
  if to_regnamespace('auth') is not null or to_regnamespace('supabase_migrations') is not null then
    raise exception 'stage2_sandbox_behavior.sql runs only on a local database built from this repository, never on a Supabase project';
  end if;
end $$;

begin;

create temp table b4 (
  check_no int primary key,
  name text not null,
  passed boolean not null,
  detail text not null
);

-- Runs one statement as the given role; returns 'succeeded' or 'SQLSTATE: message'.
create function pg_temp.attempt(p_role text, p_sql text) returns text
language plpgsql as $f$
begin
  execute format('set local role %I', p_role);
  execute p_sql;
  reset role;
  return 'succeeded';
exception when others then
  return sqlstate || ': ' || sqlerrm;
end $f$;

-- Like attempt, but reports the violated constraint for check_violation.
create function pg_temp.attempt_constraint(p_role text, p_sql text) returns text
language plpgsql as $f$
declare
  v_constraint text;
begin
  execute format('set local role %I', p_role);
  execute p_sql;
  reset role;
  return 'succeeded';
exception
  when check_violation then
    get stacked diagnostics v_constraint = constraint_name;
    return 'rejected by ' || v_constraint;
  when others then
    return sqlstate || ': ' || sqlerrm;
end $f$;

-- Fixture gates, by canonical title. 'c:' is the canonical gate, 's:' its sandbox copy.
create temp table fixture (key text primary key, id bigint);
insert into fixture
select k.key || ':' || side, case side when 'c' then c.id else s.id end
from (values
  ('role',     'Required stakeholder sign-offs recorded'),
  ('empty',    'Production monitoring and alerting defined'),
  ('seed_ev',  'Safe multi-instance deployment'),
  ('waive',    'Support agents trained on the Assist workflow'),
  ('cap_ev',   'Rollback procedure documented and rehearsed'),
  ('cap_dec',  'Variance measured across repeated runs')) k(key, title)
join public.gates c on c.title = k.title and c.source_gate_id is null
left join public.gates s on s.source_gate_id = c.id
cross join (values ('c'), ('s')) side(side);

create function pg_temp.gid(p_key text) returns bigint language sql as $f$
  select id from fixture where key = p_key
$f$;

-- Every canonical row in full (all columns, timestamps included): proves the
-- canonical launch is byte-identical before and after sandbox activity.
create function pg_temp.canonical_rows() returns text language sql as $f$
  with cl as (select id from public.launches where source_launch_id is null),
       cg as (select id from public.gates where launch_id in (select id from cl))
  select md5(concat_ws(E'\n',
    (select string_agg(x::text, E'\n' order by x.id) from public.launches x where x.id in (select id from cl)),
    (select string_agg(x::text, E'\n' order by x.id) from public.gates x where x.id in (select id from cg)),
    (select string_agg(x::text, E'\n' order by x.id) from public.evidence x where x.gate_id in (select id from cg)),
    (select string_agg(x::text, E'\n' order by x.id) from public.risks x where x.launch_id in (select id from cl)),
    (select string_agg(x::text, E'\n' order by x.id) from public.decisions x where x.launch_id in (select id from cl)),
    (select string_agg(x::text, E'\n' order by x.id) from public.rollout_stages x where x.launch_id in (select id from cl))))
$f$;

-- fingerprint.sql's canonical_data part, copied verbatim (keep the two in step).
create function pg_temp.canonical_data() returns text language sql as $f$
  with
canon_launch as (select id from public.launches where source_launch_id is null),
canon_gate as (select id from public.gates where launch_id in (select id from canon_launch)),
dat as (select concat_ws(E'\n',
   (select string_agg(format('%s|%s|%s|%s|%s', id, name, owner, target_date, md5(description)), ';' order by id) from public.launches where id in (select id from canon_launch)),
   (select string_agg(format('%s|%s|%s|%s|%s|%s|%s|%s|%s', id, launch_id, category, title, owner, required, status, md5(pass_criteria), waiver_rationale), ';' order by id) from public.gates where launch_id in (select id from canon_launch)),
   (select string_agg(format('%s|%s|%s|%s|%s|%s|%s', id, gate_id, type, title, md5(summary), source, recorded_on), ';' order by id) from public.evidence where gate_id in (select id from canon_gate)),
   (select string_agg(format('%s|%s|%s|%s|%s|%s|%s|%s', id, launch_id, title, likelihood, impact, owner, status, gate_id), ';' order by id) from public.risks where launch_id in (select id from canon_launch)),
   (select string_agg(format('%s|%s|%s|%s|%s|%s|%s|%s|%s', id, launch_id, kind, decision, md5(rationale), decided_by, gate_id, risk_id, waiver_rationale), ';' order by id) from public.decisions where launch_id in (select id from canon_launch)),
   (select string_agg(format('%s|%s|%s|%s', id, launch_id, stage, status), ';' order by id) from public.rollout_stages where launch_id in (select id from canon_launch))) s)
  select md5(s) from dat
$f$;

-- Every sandbox row in full: proves a second reset changes nothing.
create function pg_temp.sandbox_rows() returns text language sql as $f$
  with sl as (select id from public.launches where source_launch_id is not null),
       sg as (select id from public.gates where launch_id in (select id from sl))
  select md5(concat_ws(E'\n',
    (select string_agg(x::text, E'\n' order by x.id) from public.launches x where x.id in (select id from sl)),
    (select string_agg(x::text, E'\n' order by x.id) from public.gates x where x.id in (select id from sg)),
    (select string_agg(x::text, E'\n' order by x.id) from public.evidence x where x.gate_id in (select id from sg)),
    (select string_agg(x::text, E'\n' order by x.id) from public.risks x where x.launch_id in (select id from sl)),
    (select string_agg(x::text, E'\n' order by x.id) from public.decisions x where x.launch_id in (select id from sl)),
    (select string_agg(x::text, E'\n' order by x.id) from public.rollout_stages x where x.launch_id in (select id from sl))))
$f$;

-- Visitor rows on sandbox launches, and on canonical launches.
create function pg_temp.visitor_rows(p_canonical boolean) returns bigint language sql as $f$
  select (select count(*) from public.evidence e join public.gates g on g.id = e.gate_id
            join public.launches l on l.id = g.launch_id
          where e.origin = 'visitor' and (l.source_launch_id is null) = p_canonical)
       + (select count(*) from public.decisions d join public.launches l on l.id = d.launch_id
          where d.origin = 'visitor' and (l.source_launch_id is null) = p_canonical)
$f$;

-- How the sandbox differs from a fresh copy of the canonical launch; null when it doesn't.
-- Seed-origin rows and gate status are compared through the gate mapping.
create function pg_temp.sandbox_mismatch() returns text language sql as $f$
  with m as (select s.id as sid, s.source_gate_id as cid from public.gates s where s.source_gate_id is not null)
  select nullif(concat_ws('; ',
    case when (select count(*) from public.launches where source_launch_id is not null)
              <> (select count(*) from public.launches where source_launch_id is null) then 'launch count' end,
    case when exists (
        (select l.id, l.name || ' (sandbox)', l.description, l.owner, l.target_date from public.launches l where l.source_launch_id is null)
        except all
        (select s.source_launch_id, s.name, s.description, s.owner, s.target_date from public.launches s where s.source_launch_id is not null))
      or exists (
        (select s.source_launch_id, s.name, s.description, s.owner, s.target_date from public.launches s where s.source_launch_id is not null)
        except all
        (select l.id, l.name || ' (sandbox)', l.description, l.owner, l.target_date from public.launches l where l.source_launch_id is null))
      then 'launches' end,
    case when exists (
        (select c.id, c.category, c.title, c.pass_criteria, c.owner, c.required, c.status, c.waiver_rationale, sl.id
           from public.gates c join public.launches sl on sl.source_launch_id = c.launch_id where c.source_gate_id is null)
        except all
        (select s.source_gate_id, s.category, s.title, s.pass_criteria, s.owner, s.required, s.status, s.waiver_rationale, s.launch_id
           from public.gates s where s.source_gate_id is not null))
      or exists (
        (select s.source_gate_id, s.category, s.title, s.pass_criteria, s.owner, s.required, s.status, s.waiver_rationale, s.launch_id
           from public.gates s where s.source_gate_id is not null)
        except all
        (select c.id, c.category, c.title, c.pass_criteria, c.owner, c.required, c.status, c.waiver_rationale, sl.id
           from public.gates c join public.launches sl on sl.source_launch_id = c.launch_id where c.source_gate_id is null))
      then 'gates' end,
    case when exists (
        (select e.gate_id, e.type, e.title, e.summary, e.source, e.recorded_on, e.origin
           from public.evidence e join public.gates g on g.id = e.gate_id where g.source_gate_id is null)
        except all
        (select m.cid, e.type, e.title, e.summary, e.source, e.recorded_on, e.origin
           from public.evidence e join m on m.sid = e.gate_id where e.origin = 'seed'))
      or exists (
        (select m.cid, e.type, e.title, e.summary, e.source, e.recorded_on, e.origin
           from public.evidence e join m on m.sid = e.gate_id where e.origin = 'seed')
        except all
        (select e.gate_id, e.type, e.title, e.summary, e.source, e.recorded_on, e.origin
           from public.evidence e join public.gates g on g.id = e.gate_id where g.source_gate_id is null))
      then 'evidence' end,
    case when exists (
        (select r.launch_id, r.title, r.description, r.likelihood, r.impact, r.owner, r.mitigation, r.status, r.gate_id
           from public.risks r join public.launches l on l.id = r.launch_id where l.source_launch_id is null)
        except all
        (select l.source_launch_id, r.title, r.description, r.likelihood, r.impact, r.owner, r.mitigation, r.status, m.cid
           from public.risks r join public.launches l on l.id = r.launch_id left join m on m.sid = r.gate_id
          where l.source_launch_id is not null))
      or exists (
        (select l.source_launch_id, r.title, r.description, r.likelihood, r.impact, r.owner, r.mitigation, r.status, m.cid
           from public.risks r join public.launches l on l.id = r.launch_id left join m on m.sid = r.gate_id
          where l.source_launch_id is not null)
        except all
        (select r.launch_id, r.title, r.description, r.likelihood, r.impact, r.owner, r.mitigation, r.status, r.gate_id
           from public.risks r join public.launches l on l.id = r.launch_id where l.source_launch_id is null))
      then 'risks' end,
    case when exists (
        (select d.launch_id, d.decided_at, d.kind, d.decision, d.rationale, d.decided_by, d.gate_id, d.risk_id,
                d.from_status, d.to_status, d.waiver_rationale, d.origin
           from public.decisions d join public.launches l on l.id = d.launch_id where l.source_launch_id is null)
        except all
        (select l.source_launch_id, d.decided_at, d.kind, d.decision, d.rationale, d.decided_by, m.cid, d.risk_id,
                d.from_status, d.to_status, d.waiver_rationale, d.origin
           from public.decisions d join public.launches l on l.id = d.launch_id left join m on m.sid = d.gate_id
          where l.source_launch_id is not null and d.origin = 'seed'))
      or exists (
        (select l.source_launch_id, d.decided_at, d.kind, d.decision, d.rationale, d.decided_by, m.cid, d.risk_id,
                d.from_status, d.to_status, d.waiver_rationale, d.origin
           from public.decisions d join public.launches l on l.id = d.launch_id left join m on m.sid = d.gate_id
          where l.source_launch_id is not null and d.origin = 'seed')
        except all
        (select d.launch_id, d.decided_at, d.kind, d.decision, d.rationale, d.decided_by, d.gate_id, d.risk_id,
                d.from_status, d.to_status, d.waiver_rationale, d.origin
           from public.decisions d join public.launches l on l.id = d.launch_id where l.source_launch_id is null))
      then 'decisions' end,
    case when exists (
        (select r.launch_id, r.stage, r.entry_criteria, r.exit_criteria, r.status
           from public.rollout_stages r join public.launches l on l.id = r.launch_id where l.source_launch_id is null)
        except all
        (select l.source_launch_id, r.stage, r.entry_criteria, r.exit_criteria, r.status
           from public.rollout_stages r join public.launches l on l.id = r.launch_id where l.source_launch_id is not null))
      or exists (
        (select l.source_launch_id, r.stage, r.entry_criteria, r.exit_criteria, r.status
           from public.rollout_stages r join public.launches l on l.id = r.launch_id where l.source_launch_id is not null)
        except all
        (select r.launch_id, r.stage, r.entry_criteria, r.exit_criteria, r.status
           from public.rollout_stages r join public.launches l on l.id = r.launch_id where l.source_launch_id is null))
      then 'rollout stages' end), '')
$f$;

create temp table snap as
select pg_temp.canonical_rows() as canonical_rows, pg_temp.canonical_data() as canonical_data;

-- 1. The sandbox exists and is a complete copy of the canonical launch.
insert into b4
select 1, 'The sandbox is one complete copy of the canonical launch, every reference remapped',
  coalesce(pg_temp.sandbox_mismatch() is null and pg_temp.visitor_rows(false) = 0
    and (select count(*) from public.gates where source_gate_id is not null) = 16, false),
  coalesce('differs: ' || pg_temp.sandbox_mismatch(),
    format('sandbox launches=%s gates=%s', (select count(*) from public.launches where source_launch_id is not null),
      (select count(*) from public.gates where source_gate_id is not null)));

-- 2-3. Each API role adds visitor evidence to a sandbox gate; the database sets origin and date.
do $$
declare
  v_role text;
  v_no int := 2;
  v_result text;
  v_row public.evidence%rowtype;
begin
  foreach v_role in array array['anon', 'authenticated'] loop
    v_result := pg_temp.attempt(v_role, format(
      $q$select public.sandbox_add_evidence(%s, 'Sign-off', '  Visitor sign-off by %s  ', 'Signed off in the sandbox.')$q$,
      pg_temp.gid('role:s'), v_role));
    select * into v_row from public.evidence where gate_id = pg_temp.gid('role:s') order by id desc limit 1;
    insert into b4 values (v_no, v_role || ' adds visitor evidence to a sandbox gate',
      coalesce(v_result = 'succeeded' and v_row.origin = 'visitor' and v_row.recorded_on = current_date
        and v_row.title = 'Visitor sign-off by ' || v_role and v_row.source is null, false),
      format('%s; origin=%s recorded_on=%s title=%s', v_result, v_row.origin, v_row.recorded_on, v_row.title));
    v_no := v_no + 1;
  end loop;
end $$;

-- 4-7. Neither write function accepts a canonical gate, for either role.
do $$
declare
  v_role text;
  v_no int := 4;
  v_ev text;
  v_st text;
begin
  foreach v_role in array array['anon', 'authenticated'] loop
    v_ev := pg_temp.attempt(v_role, format(
      $q$select public.sandbox_add_evidence(%s, 'Sign-off', 'Forged sign-off', 'Approved.')$q$, pg_temp.gid('role:c')));
    v_st := pg_temp.attempt(v_role, format(
      $q$select public.sandbox_set_gate_status(%s, 'Passed', 'Forged approval')$q$, pg_temp.gid('seed_ev:c')));
    insert into b4 values (v_no, v_role || ': sandbox_add_evidence rejects a canonical gate',
      v_ev like 'P0001: %', v_ev);
    insert into b4 values (v_no + 1, v_role || ': sandbox_set_gate_status rejects a canonical gate',
      v_st like 'P0001: %', v_st);
    v_no := v_no + 2;
  end loop;
end $$;

-- 8-9. A status change on a sandbox gate records a visitor decision decided by 'Sandbox visitor'.
do $$
declare
  v_result text;
  v_row public.decisions%rowtype;
begin
  v_result := pg_temp.attempt('anon', format(
    $q$select public.sandbox_set_gate_status(%s, 'In progress', 'Exploring the gate')$q$, pg_temp.gid('waive:s')));
  select * into v_row from public.decisions where gate_id = pg_temp.gid('waive:s') order by id desc limit 1;
  insert into b4 values (8, 'anon changes a sandbox gate status; the database sets decided_by and origin',
    coalesce(v_result = 'succeeded' and v_row.decided_by = 'Sandbox visitor' and v_row.origin = 'visitor'
      and v_row.kind = 'status_change' and v_row.to_status = 'In progress'
      and (select status from public.gates where id = pg_temp.gid('waive:s')) = 'In progress', false),
    format('%s; decided_by=%s origin=%s to=%s', v_result, v_row.decided_by, v_row.origin, v_row.to_status));
  insert into b4 values (9, 'The canonical copy of that gate is unchanged',
    (select status from public.gates where id = pg_temp.gid('waive:c')) = 'Not started',
    (select status::text from public.gates where id = pg_temp.gid('waive:c')));
end $$;

-- 10-15. The I8 rules hold through the sandbox: Passed needs evidence, Waived needs text,
-- the waiver survives on the decision, and the same status and a blank rationale are rejected.
do $$
declare
  v_a text; v_b text; v_c text; v_d text; v_e text; v_f text; v_g text; v_h text;
begin
  v_a := pg_temp.attempt('anon', format($q$select public.sandbox_set_gate_status(%s, 'Passed', 'No evidence yet')$q$, pg_temp.gid('empty:s')));
  insert into b4 values (10, 'Passed without evidence is rejected on a sandbox gate',
    v_a = 'P0001: A gate cannot be Passed without at least one evidence item', v_a);

  v_b := pg_temp.attempt('anon', format($q$select public.sandbox_add_evidence(%s, 'Test', 'Monitoring probe', 'Alerts fired in a drill.')$q$, pg_temp.gid('empty:s')));
  v_c := pg_temp.attempt('anon', format($q$select public.sandbox_set_gate_status(%s, 'Passed', 'Drill evidence recorded')$q$, pg_temp.gid('empty:s')));
  insert into b4 values (11, 'Passed succeeds once the sandbox gate has visitor evidence',
    v_b = 'succeeded' and v_c = 'succeeded' and (select status from public.gates where id = pg_temp.gid('empty:s')) = 'Passed',
    v_b || ' / ' || v_c);

  v_d := pg_temp.attempt('anon', format($q$select public.sandbox_set_gate_status(%s, 'Passed', 'Seed evidence is enough')$q$, pg_temp.gid('seed_ev:s')));
  insert into b4 values (12, 'Passed succeeds on a sandbox gate whose only evidence is the seed copy',
    v_d = 'succeeded', v_d);

  v_e := pg_temp.attempt('authenticated', format($q$select public.sandbox_set_gate_status(%s, 'Waived', 'Waive it', '   ')$q$, pg_temp.gid('waive:s')));
  insert into b4 values (13, 'Waived with blank waiver text is rejected',
    v_e = 'P0001: A waiver rationale is required to waive a gate', v_e);

  v_f := pg_temp.attempt('authenticated', format($q$select public.sandbox_set_gate_status(%s, 'Waived', 'Training waived', 'Training moves to the Assist rollout.')$q$, pg_temp.gid('waive:s')));
  v_g := pg_temp.attempt('authenticated', format($q$select public.sandbox_set_gate_status(%s, 'In progress', 'Training resumed')$q$, pg_temp.gid('waive:s')));
  insert into b4 values (14, 'A sandbox waiver is kept on its decision after the gate leaves Waived',
    coalesce(v_f = 'succeeded' and v_g = 'succeeded'
      and (select waiver_rationale from public.gates where id = pg_temp.gid('waive:s')) is null
      and (select waiver_rationale from public.decisions where gate_id = pg_temp.gid('waive:s') and to_status = 'Waived')
          = 'Training moves to the Assist rollout.', false),
    v_f || ' / ' || v_g);

  v_h := pg_temp.attempt('anon', format($q$select public.sandbox_set_gate_status(%s, 'In progress', 'Again')$q$, pg_temp.gid('waive:s')))
      || ' / ' || pg_temp.attempt('anon', format($q$select public.sandbox_set_gate_status(%s, 'Failed', '  ')$q$, pg_temp.gid('waive:s')));
  insert into b4 values (15, 'The same status and a blank rationale are rejected',
    v_h = 'P0001: Gate is already In progress / P0001: A rationale is required to change a gate status', v_h);
end $$;

-- 16-17. The caps: 10 visitor evidence items and 20 visitor decisions per sandbox gate.
do $$
declare
  v_i int;
  v_last text;
  v_ok int := 0;
begin
  for v_i in 1..10 loop
    if pg_temp.attempt('anon', format($q$select public.sandbox_add_evidence(%s, 'Observation', 'Item %s', 'Cap probe.')$q$,
         pg_temp.gid('cap_ev:s'), v_i)) = 'succeeded' then v_ok := v_ok + 1; end if;
  end loop;
  v_last := pg_temp.attempt('authenticated', format($q$select public.sandbox_add_evidence(%s, 'Observation', 'Item 11', 'Cap probe.')$q$, pg_temp.gid('cap_ev:s')));
  insert into b4 values (16, '10 visitor evidence items succeed on one sandbox gate and the 11th is rejected',
    v_ok = 10 and v_last like 'P0001: %'
      and (select count(*) from public.evidence where gate_id = pg_temp.gid('cap_ev:s') and origin = 'visitor') = 10,
    format('%s accepted; 11th: %s', v_ok, v_last));

  v_ok := 0;
  for v_i in 1..20 loop
    if pg_temp.attempt('anon', format($q$select public.sandbox_set_gate_status(%s, '%s', 'Cap probe %s')$q$,
         pg_temp.gid('cap_dec:s'), case when v_i % 2 = 1 then 'In progress' else 'Not started' end, v_i)) = 'succeeded' then
      v_ok := v_ok + 1;
    end if;
  end loop;
  v_last := pg_temp.attempt('authenticated', format($q$select public.sandbox_set_gate_status(%s, 'Failed', 'Cap probe 21')$q$, pg_temp.gid('cap_dec:s')));
  insert into b4 values (17, '20 visitor decisions succeed on one sandbox gate and the 21st is rejected',
    v_ok = 20 and v_last like 'P0001: %'
      and (select count(*) from public.decisions where gate_id = pg_temp.gid('cap_dec:s') and origin = 'visitor') = 20,
    format('%s accepted; 21st: %s', v_ok, v_last));
end $$;

-- 18. Visitor text rules (I14) and the https rule, through sandbox_add_evidence.
create temp table text_cases (expect text not null, label text not null, sql text not null);
insert into text_cases
select c.expect, c.label, format($q$select public.sandbox_add_evidence(%s, 'Document', %L, %L, %L)$q$,
  (select id from fixture where key = 'seed_ev:s'), c.title, c.summary, c.source)
from (values
  ('succeeded', 'multilingual title and summary', E'\u00C9valuation \u65E5\u672C\u8A9E', E'R\u00E9sum\u00E9 in \u0627\u0644\u0639\u0631\u0628\u064A\u0629', null),
  ('succeeded', 'tab, LF and CR in the summary', 'Multi-line summary', E'Line one\n\tLine two\r\nLine three', null),
  ('succeeded', 'https source, trimmed', 'Linked document', 'Has a source.', '  https://example.com/report  '),
  ('rejected by evidence_title_single_line', 'LF in the title', E'Title\nsecond line', 'Summary.', null),
  ('rejected by evidence_title_single_line', 'BEL control in the title', E'Title\u0007', 'Summary.', null),
  ('rejected by evidence_title_single_line', 'C1 control (NEL) in the title', E'Title\u0085', 'Summary.', null),
  ('rejected by evidence_title_single_line', 'right-to-left override in the title', E'Title \u202Egnp.exe', 'Summary.', null),
  ('rejected by evidence_summary_text', 'left-to-right isolate in the summary', 'Title', E'Summary \u2066x', null),
  ('rejected by evidence_summary_text', 'escape control in the summary', 'Title', E'Summary \u001B[31m', null),
  ('rejected by evidence_source_https', 'javascript: source', 'Title', 'Summary.', 'javascript:alert(1)'),
  ('rejected by evidence_source_https', 'http: source', 'Title', 'Summary.', 'http://example.com'),
  ('rejected by evidence_source_https', 'empty-string source', 'Title', 'Summary.', '')
) c(expect, label, title, summary, source);

insert into b4
select 18, 'Visitor text and URL rules hold through sandbox_add_evidence (I10, I14)',
  bool_and(outcome = expect),
  coalesce('unexpected: ' || string_agg(format('%s -> %s', label, outcome), '; ') filter (where outcome <> expect),
           format('%s of %s cases as expected', count(*), count(*)))
from (select label, expect, pg_temp.attempt_constraint('anon', sql) as outcome from text_cases) t;

insert into b4
select 19, 'The rationale rules (I14) hold through sandbox_set_gate_status',
  outcome = 'rejected by decisions_rationale_text', outcome
from (select pg_temp.attempt_constraint('anon', format(
  $q$select public.sandbox_set_gate_status(%s, 'Failed', %L)$q$, pg_temp.gid('seed_ev:s'), E'Bidi \u202E text')) as outcome) t;

-- 20-21. Direct table writes stay denied (I3), so the functions are the only write path.
do $$
declare
  v_role text;
  v_no int := 20;
  v_sql text;
  v_state text;
  v_bad text[];
begin
  foreach v_role in array array['anon', 'authenticated'] loop
    v_bad := '{}';
    foreach v_sql in array array[
      format($q$insert into public.evidence (gate_id, type, title, summary, origin) values (%s, 'Sign-off', 'Direct', 'Direct.', 'visitor')$q$, pg_temp.gid('role:s')),
      format($q$insert into public.decisions (launch_id, kind, decision, rationale, decided_by, origin) values (1, 'manual', 'Direct', 'Direct', 'Anyone', 'visitor')$q$),
      format($q$update public.gates set status = 'Passed' where id = %s$q$, pg_temp.gid('role:s')),
      'delete from public.evidence where origin = ''visitor''',
      'select * from public.sandbox_state',
      'update public.sandbox_state set last_reset_at = now() - interval ''1 day''',
      'select public.reset_demo_data()',
      format($q$select public.set_gate_status(%s, 'Passed', 'Owner path', 'Anyone', null, 'seed')$q$, pg_temp.gid('role:s')),
      'select public.build_sandbox()'
    ] loop
      v_state := pg_temp.attempt(v_role, v_sql);
      if v_state not like '42501: %' then
        v_bad := v_bad || format('%s -> %s', left(v_sql, 50), v_state);
      end if;
    end loop;
    insert into b4 values (v_no, v_role || ' is denied direct writes, sandbox_state and the owner-only functions',
      cardinality(v_bad) = 0,
      case when cardinality(v_bad) = 0 then '9 of 9 denied with 42501' else 'unexpected: ' || array_to_string(v_bad, '; ') end);
    v_no := v_no + 1;
  end loop;
end $$;

-- 22. No caller can set origin, identity or date: the public functions take no such argument (I11, I15).
insert into b4
select 22, 'The three sandbox functions take no origin, decided_by or recorded_on argument',
  count(*) = 3 and bool_and(not (coalesce(proargnames, '{}') && array['origin', 'decided_by', 'recorded_on'])),
  string_agg(proname || '(' || coalesce(array_to_string(proargnames, ', '), '') || ')', '; ' order by proname)
from pg_proc
where pronamespace = 'public'::regnamespace and proname in ('sandbox_add_evidence', 'sandbox_set_gate_status', 'sandbox_reset');

-- 23. All of that left the canonical launch byte-identical, and no visitor row reached it (I7, I11, I12).
insert into b4
select 23, 'Canonical rows are byte-identical after visitor writes, and hold no visitor rows',
  pg_temp.canonical_rows() = snap.canonical_rows and pg_temp.canonical_data() = snap.canonical_data
    and pg_temp.visitor_rows(true) = 0,
  format('visitor rows: %s on sandbox, %s on canonical', pg_temp.visitor_rows(false), pg_temp.visitor_rows(true))
from snap;

-- 24. A reset by an API role restores the sandbox to a fresh copy (I13).
do $$
declare
  v_result text;
begin
  v_result := pg_temp.attempt('anon', 'select public.sandbox_reset()');
  insert into b4 values (24, 'anon resets the sandbox: visitor rows deleted, gates restored from their source',
    coalesce(v_result = 'succeeded' and pg_temp.visitor_rows(false) = 0 and pg_temp.sandbox_mismatch() is null, false),
    coalesce(v_result || '; differs: ' || pg_temp.sandbox_mismatch(), v_result || '; sandbox equals a fresh copy'));
end $$;

create temp table after_reset as select pg_temp.sandbox_rows() as sandbox_rows;

-- 25. Inside the cooldown, a reset is rejected with the remaining time.
do $$
declare
  v_result text;
begin
  v_result := pg_temp.attempt('authenticated', 'select public.sandbox_reset()');
  insert into b4 values (25, 'A reset inside the 5-minute cooldown is rejected with the remaining time',
    v_result = 'P0001: The sandbox was reset recently. Try again in 5 minutes.', v_result);
end $$;

-- 26. After the cooldown, a second reset changes nothing (idempotent).
update public.sandbox_state set last_reset_at = now() - interval '6 minutes';
do $$
declare
  v_result text;
begin
  v_result := pg_temp.attempt('authenticated', 'select public.sandbox_reset()');
  insert into b4 values (26, 'After the cooldown a second reset succeeds and changes nothing',
    coalesce(v_result = 'succeeded' and pg_temp.sandbox_rows() = (select sandbox_rows from after_reset), false),
    v_result);
end $$;

-- 27. Resets never touch canonical rows.
insert into b4
select 27, 'Canonical rows are byte-identical after both resets',
  pg_temp.canonical_rows() = snap.canonical_rows and pg_temp.canonical_data() = snap.canonical_data,
  'canonical_data ' || pg_temp.canonical_data()
from snap;

-- 28. reset_demo_data() is atomic: if rebuilding the sandbox fails, the canonical reseed rolls back too.
do $$
declare
  v_err text;
  v_canonical text := pg_temp.canonical_rows();
  v_sandbox text;
begin
  perform pg_temp.attempt('anon', format($q$select public.sandbox_add_evidence(%s, 'Test', 'Before the failed reseed', 'Kept.')$q$, pg_temp.gid('role:s')));
  v_sandbox := pg_temp.sandbox_rows();
  begin
    -- A temporary constraint that every sandbox launch violates makes the rebuild fail.
    alter table public.launches add constraint zz_reject_sandbox check (source_launch_id is null) not valid;
    perform public.reset_demo_data();
    v_err := 'no error';
  exception when others then
    v_err := sqlstate;
  end;
  insert into b4 values (28, 'A failed sandbox rebuild rolls back the whole reset_demo_data() call',
    coalesce(v_err = '23514' and pg_temp.canonical_rows() = v_canonical and pg_temp.sandbox_rows() = v_sandbox
      and to_regclass('public.launches') is not null
      and not exists (select 1 from pg_constraint where conname = 'zz_reject_sandbox'), false),
    'reset_demo_data error: ' || v_err);
end $$;

-- 29. reset_demo_data() as the owner reseeds the canonical launch and rebuilds the sandbox.
do $$
begin
  perform public.reset_demo_data();
  insert into b4 values (29, 'reset_demo_data() reseeds the canonical launch and rebuilds one fresh sandbox',
    coalesce(pg_temp.canonical_data() = (select canonical_data from snap) and pg_temp.sandbox_mismatch() is null
      and pg_temp.visitor_rows(false) = 0 and pg_temp.visitor_rows(true) = 0
      and (select count(*) from public.launches) = 2, false),
    coalesce('differs: ' || pg_temp.sandbox_mismatch(), 'canonical_data ' || pg_temp.canonical_data()));
end $$;

select check_no, name, case when passed then 'PASS' else 'FAIL' end as result, detail
from b4
union all
select 99, 'Overall', case when bool_and(passed) then 'PASS' else 'FAIL' end,
  format('%s of %s checks passed', count(*) filter (where passed), count(*))
from b4
order by 1;

rollback;
