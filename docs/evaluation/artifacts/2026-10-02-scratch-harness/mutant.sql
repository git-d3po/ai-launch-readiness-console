-- PRESERVED EVIDENCE. DO NOT RUN. See README.md in this directory.
--
-- This is the deliberately weakened schema used on 2026-10-02 (EVAL-003) to show
-- that integrity checks 1 to 4 detect broken rules. It replaces set_gate_status
-- with a copy that skips the evidence and waiver checks, drops the
-- gates_waived_requires_rationale constraint, and grants anon UPDATE on gates.
-- It targets the function body from commit 03a4666, which predates the waiver
-- column added to decisions in 9c65e6c, so it no longer matches the schema.
-- Never run it against a shared, hosted, or production database.
--
-- Everything below the next line is byte-identical to the original scratch file.
-- ---------------------------------------------------------------------------
create or replace function public.set_gate_status(
  gate_id bigint,
  new_status public.gate_status,
  rationale text,
  decided_by text,
  waiver_rationale text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gate public.gates%rowtype;
  v_decision_id bigint;
begin
  select * into v_gate from public.gates g where g.id = set_gate_status.gate_id for update;
  if not found then
    raise exception 'Gate % does not exist', set_gate_status.gate_id;
  end if;

  if btrim(coalesce(set_gate_status.rationale, '')) = '' then
    raise exception 'A rationale is required to change a gate status';
  end if;

  if btrim(coalesce(set_gate_status.decided_by, '')) = '' then
    raise exception 'Decided by is required to change a gate status';
  end if;

  if new_status = v_gate.status then
    raise exception 'Gate is already %', v_gate.status;
  end if;



  update public.gates g
  set status = new_status,
      waiver_rationale = case when new_status = 'Waived' then btrim(set_gate_status.waiver_rationale) end,
      updated_at = now()
  where g.id = set_gate_status.gate_id;

  insert into public.decisions
    (launch_id, kind, decision, rationale, decided_by, gate_id, from_status, to_status)
  values (
    v_gate.launch_id,
    'status_change',
    format('%s: %s → %s', v_gate.title, v_gate.status, new_status),
    btrim(set_gate_status.rationale),
    btrim(set_gate_status.decided_by),
    set_gate_status.gate_id,
    v_gate.status,
    new_status
  )
  returning id into v_decision_id;

  return v_decision_id;
end;
$$;
alter table public.gates drop constraint gates_waived_requires_rationale; grant update on public.gates to anon; create policy anon_upd on public.gates for update to anon using (true);
