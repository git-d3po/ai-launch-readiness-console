-- Phase 1 integrity checks. Run as the database owner, for example in the
-- Supabase SQL Editor. The final SELECT returns one PASS or FAIL row per check;
-- a NULL comparison (missing row or value) counts as FAIL.
--
-- The script changes gates (checks 3 and 6) and then calls reset_demo_data()
-- (check 5, run last), so it ends with the database back at the seed. Any edits
-- made through the app are discarded too.

-- No DROP or DELETE: each check upserts its row, so a re-run in the same
-- session overwrites the previous results.
--
-- Stage 2 (DR-025): gate lookups and check 5's absolute counts are scoped to
-- the canonical launch (source_gate_id / source_launch_id is null), because the
-- sandbox copy repeats every gate title. The expected values are unchanged.
-- Checks 1 to 4 and 6 compare decision counts before and after, which the
-- sandbox doesn't affect.
create temp table if not exists check_results (
  check_no int primary key,
  name text not null,
  passed boolean not null,
  detail text not null
);

-- 1. Passed with zero evidence is rejected, and nothing is written.
do $$
declare
  v_gate bigint;
  v_decisions bigint;
  v_err text;
begin
  select id into v_gate from public.gates where title = 'Production monitoring and alerting defined' and source_gate_id is null;
  select count(*) into v_decisions from public.decisions;

  begin
    perform public.set_gate_status(v_gate, 'Passed', 'Trying to pass without evidence', 'Integrity check');
  exception when others then
    v_err := sqlerrm;
  end;

  insert into check_results values (
    1,
    'Passed with zero evidence is rejected',
    coalesce(v_err, '') like '%without at least one evidence item%'
      and not exists (select 1 from public.evidence where gate_id = v_gate)
      and (select status from public.gates where id = v_gate) = 'Not started'
      and (select count(*) from public.decisions) = v_decisions,
    coalesce(v_err, 'No error raised')
  )
  on conflict (check_no) do update
    set name = excluded.name, passed = excluded.passed, detail = excluded.detail;
end $$;

-- 2. Waived without a waiver rationale is rejected (missing and blank).
do $$
declare
  v_gate bigint;
  v_decisions bigint;
  v_err_missing text;
  v_err_blank text;
begin
  select id into v_gate from public.gates where title = 'Rollback procedure documented and rehearsed' and source_gate_id is null;
  select count(*) into v_decisions from public.decisions;

  begin
    perform public.set_gate_status(v_gate, 'Waived', 'Trying to waive without a waiver rationale', 'Integrity check');
  exception when others then
    v_err_missing := sqlerrm;
  end;

  begin
    perform public.set_gate_status(v_gate, 'Waived', 'Trying to waive with a blank waiver rationale', 'Integrity check', '   ');
  exception when others then
    v_err_blank := sqlerrm;
  end;

  insert into check_results values (
    2,
    'Waived without a waiver rationale is rejected',
    coalesce(v_err_missing, '') like '%waiver rationale is required%'
      and coalesce(v_err_blank, '') like '%waiver rationale is required%'
      and (select status from public.gates where id = v_gate) = 'Not started'
      and (select count(*) from public.decisions) = v_decisions,
    format('missing: %s | blank: %s', coalesce(v_err_missing, 'No error raised'), coalesce(v_err_blank, 'No error raised'))
  )
  on conflict (check_no) do update
    set name = excluded.name, passed = excluded.passed, detail = excluded.detail;
end $$;

-- 3. A status change updates the gate and inserts exactly one status_change decision.
do $$
declare
  v_gate bigint;
  v_decisions bigint;
  v_decision_id bigint;
  v_row public.decisions%rowtype;
begin
  select id into v_gate from public.gates where title = 'Production monitoring and alerting defined' and source_gate_id is null;
  select count(*) into v_decisions from public.decisions;

  v_decision_id := public.set_gate_status(v_gate, 'In progress', 'Monitoring design has started', 'AI Program Lead');
  select * into v_row from public.decisions where id = v_decision_id;

  insert into check_results values (
    3,
    'A status change inserts one Decision',
    coalesce((select status from public.gates where id = v_gate) = 'In progress'
      and (select count(*) from public.decisions) = v_decisions + 1
      and v_row.kind = 'status_change'
      and v_row.gate_id = v_gate
      and v_row.from_status = 'Not started'
      and v_row.to_status = 'In progress'
      and v_row.rationale = 'Monitoring design has started', false),
    format('decisions %s -> %s; new row: %s', v_decisions, (select count(*) from public.decisions), v_row.decision)
  )
  on conflict (check_no) do update
    set name = excluded.name, passed = excluded.passed, detail = excluded.detail;
end $$;

-- 4. The anon role cannot update gates.status directly.
do $$
declare
  v_gate bigint;
  v_err text;
begin
  select id into v_gate from public.gates where title = 'Required stakeholder sign-offs recorded' and source_gate_id is null;

  set local role anon;
  begin
    update public.gates set status = 'Passed' where id = v_gate;
  exception when insufficient_privilege then
    v_err := sqlerrm;
  end;
  reset role;

  insert into check_results values (
    4,
    'anon cannot update gates.status directly',
    v_err is not null and (select status from public.gates where id = v_gate) = 'Not started',
    coalesce(v_err, 'Update was allowed')
  )
  on conflict (check_no) do update
    set name = excluded.name, passed = excluded.passed, detail = excluded.detail;
end $$;

-- 6. The waiver text survives on the decision after the gate leaves Waived.
--    Runs before check 5 because check 5 resets the data.
do $$
declare
  v_gate bigint;
  v_decisions bigint;
  v_err_blank text;
  v_blank_unchanged boolean;
  v_waive_id bigint;
  v_exit_id bigint;
  v_waiver constant text := 'Assist is not scheduled; agent training is deferred until it is.';
begin
  select id into v_gate from public.gates where title = 'Support agents trained on the Assist workflow' and source_gate_id is null;
  select count(*) into v_decisions from public.decisions;

  -- A blank waiver rationale still changes nothing.
  begin
    perform public.set_gate_status(v_gate, 'Waived', 'Waiving training for now', 'AI Program Lead', '   ');
  exception when others then
    v_err_blank := sqlerrm;
  end;
  v_blank_unchanged :=
    coalesce(v_err_blank, '') like '%waiver rationale is required%'
    and (select status from public.gates where id = v_gate) = 'Not started'
    and (select waiver_rationale from public.gates where id = v_gate) is null
    and (select count(*) from public.decisions) = v_decisions;

  -- Waiving needs no evidence; the decision records the waiver text.
  v_waive_id := public.set_gate_status(v_gate, 'Waived', 'Waiving training for now', 'AI Program Lead', v_waiver);

  -- Leaving Waived clears the gate's copy but not the decision's.
  v_exit_id := public.set_gate_status(v_gate, 'In progress', 'Assist is now scheduled', 'AI Program Lead');

  insert into check_results values (
    6,
    'Waiver text survives on the decision after the gate leaves Waived',
    coalesce(v_blank_unchanged
      and not exists (select 1 from public.evidence where gate_id = v_gate)
      and (select waiver_rationale from public.decisions where id = v_waive_id) = v_waiver
      and (select to_status from public.decisions where id = v_waive_id) = 'Waived'
      and (select waiver_rationale from public.decisions where id = v_exit_id) is null
      and (select status from public.gates where id = v_gate) = 'In progress'
      and (select waiver_rationale from public.gates where id = v_gate) is null
      and (select count(*) from public.decisions) = v_decisions + 2, false),
    format('blank rejected: %s | waive decision waiver_rationale: %s | gate now %s, gates.waiver_rationale %s',
      coalesce(v_err_blank, 'No error raised'),
      (select coalesce(waiver_rationale, 'NULL') from public.decisions where id = v_waive_id),
      (select status from public.gates where id = v_gate),
      (select coalesce(waiver_rationale, 'NULL') from public.gates where id = v_gate))
  )
  on conflict (check_no) do update
    set name = excluded.name, passed = excluded.passed, detail = excluded.detail;
end $$;

-- 5. reset_demo_data() restores the seed: 16 required gates, 6 passed, 10 blocking.
do $$
declare
  v_gates bigint;
  v_required bigint;
  v_passed bigint;
  v_blocking bigint;
  v_decisions bigint;
  v_monitoring public.gate_status;
begin
  perform public.reset_demo_data();

  select count(*),
         count(*) filter (where required),
         count(*) filter (where required and status = 'Passed'
                          and exists (select 1 from public.evidence e where e.gate_id = g.id)),
         count(*) filter (where required and status not in ('Passed', 'Waived'))
    into v_gates, v_required, v_passed, v_blocking
  from public.gates g
  where g.source_gate_id is null;

  select count(*) into v_decisions
  from public.decisions d
  where d.launch_id in (select id from public.launches where source_launch_id is null);
  select status into v_monitoring from public.gates where title = 'Production monitoring and alerting defined' and source_gate_id is null;

  insert into check_results values (
    5,
    'reset_demo_data restores the seed',
    v_gates = 16 and v_required = 16 and v_passed = 6 and v_blocking = 10
      and v_decisions = 4 and v_monitoring = 'Not started',
    format('%s gates, %s of %s passed, %s blocking, %s decisions, monitoring gate %s',
      v_gates, v_passed, v_required, v_blocking, v_decisions, v_monitoring)
  )
  on conflict (check_no) do update
    set name = excluded.name, passed = excluded.passed, detail = excluded.detail;
end $$;

select check_no, name, case when passed then 'PASS' else 'FAIL' end as result, detail
from check_results
order by check_no;
