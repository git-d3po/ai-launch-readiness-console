-- Phase 1 integrity checks. Run as the database owner, for example in the
-- Supabase SQL Editor. The final SELECT returns one PASS or FAIL row per check.
--
-- The script changes one gate (check 3) and then calls reset_demo_data()
-- (check 5), so it ends with the database back at the seed. Any edits made
-- through the app are discarded too.

drop table if exists pg_temp.check_results;
create temp table check_results (
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
  select id into v_gate from public.gates where title = 'Production monitoring and alerting defined';
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
  );
end $$;

-- 2. Waived without a waiver rationale is rejected (missing and blank).
do $$
declare
  v_gate bigint;
  v_decisions bigint;
  v_err_missing text;
  v_err_blank text;
begin
  select id into v_gate from public.gates where title = 'Rollback procedure documented and rehearsed';
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
  );
end $$;

-- 3. A status change updates the gate and inserts exactly one status_change decision.
do $$
declare
  v_gate bigint;
  v_decisions bigint;
  v_decision_id bigint;
  v_row public.decisions%rowtype;
begin
  select id into v_gate from public.gates where title = 'Production monitoring and alerting defined';
  select count(*) into v_decisions from public.decisions;

  v_decision_id := public.set_gate_status(v_gate, 'In progress', 'Monitoring design has started', 'AI Program Lead');
  select * into v_row from public.decisions where id = v_decision_id;

  insert into check_results values (
    3,
    'A status change inserts one Decision',
    (select status from public.gates where id = v_gate) = 'In progress'
      and (select count(*) from public.decisions) = v_decisions + 1
      and v_row.kind = 'status_change'
      and v_row.gate_id = v_gate
      and v_row.from_status = 'Not started'
      and v_row.to_status = 'In progress'
      and v_row.rationale = 'Monitoring design has started',
    format('decisions %s -> %s; new row: %s', v_decisions, (select count(*) from public.decisions), v_row.decision)
  );
end $$;

-- 4. The anon role cannot update gates.status directly.
do $$
declare
  v_gate bigint;
  v_err text;
begin
  select id into v_gate from public.gates where title = 'Required stakeholder sign-offs recorded';

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
  );
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
  from public.gates g;

  select count(*) into v_decisions from public.decisions;
  select status into v_monitoring from public.gates where title = 'Production monitoring and alerting defined';

  insert into check_results values (
    5,
    'reset_demo_data restores the seed',
    v_gates = 16 and v_required = 16 and v_passed = 6 and v_blocking = 10
      and v_decisions = 4 and v_monitoring = 'Not started',
    format('%s gates, %s of %s passed, %s blocking, %s decisions, monitoring gate %s',
      v_gates, v_passed, v_required, v_blocking, v_decisions, v_monitoring)
  );
end $$;

select check_no, name, case when passed then 'PASS' else 'FAIL' end as result, detail
from check_results
order by check_no;
