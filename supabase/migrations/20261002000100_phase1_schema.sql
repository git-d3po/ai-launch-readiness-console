-- Phase 1 schema for the AI Launch Readiness Console.
--
-- Integrity rules live in the database, not only in the UI:
--   * A gate's status changes only through public.set_gate_status(). It refuses
--     Passed without evidence, Waived without a waiver rationale, and any change
--     without a rationale, and it writes exactly one decisions row per change.
--   * Demo data is restored only through public.reset_demo_data().
--   * The anon and authenticated roles can read every table and append evidence.
--     They cannot update or delete anything directly.
--   * Readiness and the current rollout stage are derived, never stored.

-- Enums -----------------------------------------------------------------------
-- Declaration order is display order.

create type public.gate_category as enum (
  'Evaluation',
  'Safety & Escalation',
  'Human-in-the-Loop',
  'Data & Privacy',
  'Reliability & Operations',
  'Monitoring',
  'Rollback',
  'Enablement & Training',
  'Stakeholder Sign-off'
);

create type public.gate_status as enum ('Not started', 'In progress', 'Passed', 'Failed', 'Waived');

create type public.evidence_type as enum ('Evaluation result', 'Test', 'Document', 'Sign-off', 'Observation');

create type public.level as enum ('Low', 'Medium', 'High');

create type public.risk_status as enum ('Open', 'Mitigating', 'Accepted', 'Closed');

create type public.stage_kind as enum ('Shadow', 'Assist', 'Partial automation');

create type public.stage_status as enum ('Not started', 'Active', 'Completed');

create type public.decision_kind as enum ('status_change', 'manual');

-- Tables ----------------------------------------------------------------------
-- Ids are identities so reset_demo_data() (TRUNCATE ... RESTART IDENTITY)
-- recreates the seed with the same ids every time.

create table public.launches (
  id bigint generated always as identity primary key,
  name text not null check (btrim(name) <> '' and char_length(name) <= 120),
  description text not null check (btrim(description) <> '' and char_length(description) <= 2000),
  owner text not null check (btrim(owner) <> '' and char_length(owner) <= 120),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gates (
  id bigint generated always as identity primary key,
  launch_id bigint not null references public.launches (id),
  category public.gate_category not null,
  title text not null check (btrim(title) <> '' and char_length(title) <= 200),
  pass_criteria text not null check (btrim(pass_criteria) <> '' and char_length(pass_criteria) <= 2000),
  owner text not null check (btrim(owner) <> '' and char_length(owner) <= 120),
  required boolean not null default true,
  status public.gate_status not null default 'Not started',
  waiver_rationale text check (char_length(waiver_rationale) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gates_waived_requires_rationale
    check (status <> 'Waived' or btrim(coalesce(waiver_rationale, '')) <> '')
);

create index gates_launch_id_idx on public.gates (launch_id);

-- Append-only: no role but the owner can update or delete rows.
-- recorded_on is null when the source fact carries no date.
create table public.evidence (
  id bigint generated always as identity primary key,
  gate_id bigint not null references public.gates (id),
  type public.evidence_type not null,
  title text not null check (btrim(title) <> '' and char_length(title) <= 200),
  summary text not null check (btrim(summary) <> '' and char_length(summary) <= 2000),
  source text check (char_length(source) <= 500),
  recorded_on date default current_date,
  created_at timestamptz not null default now()
);

create index evidence_gate_id_idx on public.evidence (gate_id);

create table public.risks (
  id bigint generated always as identity primary key,
  launch_id bigint not null references public.launches (id),
  title text not null check (btrim(title) <> '' and char_length(title) <= 200),
  description text not null check (btrim(description) <> '' and char_length(description) <= 2000),
  likelihood public.level not null,
  impact public.level not null,
  owner text not null check (btrim(owner) <> '' and char_length(owner) <= 120),
  mitigation text not null check (btrim(mitigation) <> '' and char_length(mitigation) <= 2000),
  status public.risk_status not null default 'Open',
  gate_id bigint references public.gates (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index risks_launch_id_idx on public.risks (launch_id);

-- Append-only log. status_change rows are written only by set_gate_status().
create table public.decisions (
  id bigint generated always as identity primary key,
  launch_id bigint not null references public.launches (id),
  decided_at timestamptz not null default now(),
  kind public.decision_kind not null,
  decision text not null check (btrim(decision) <> '' and char_length(decision) <= 400),
  rationale text not null check (btrim(rationale) <> '' and char_length(rationale) <= 2000),
  decided_by text not null check (btrim(decided_by) <> '' and char_length(decided_by) <= 120),
  gate_id bigint references public.gates (id),
  risk_id bigint references public.risks (id),
  from_status public.gate_status,
  to_status public.gate_status,
  constraint decisions_at_most_one_subject check (num_nonnulls(gate_id, risk_id) <= 1),
  constraint decisions_status_change_shape check (
    (kind = 'status_change'
      and gate_id is not null
      and from_status is not null
      and to_status is not null
      and from_status <> to_status)
    or (kind = 'manual' and from_status is null and to_status is null)
  )
);

create index decisions_launch_id_idx on public.decisions (launch_id, decided_at desc);

-- Stage order is the stage_kind enum order.
create table public.rollout_stages (
  id bigint generated always as identity primary key,
  launch_id bigint not null references public.launches (id),
  stage public.stage_kind not null,
  entry_criteria text not null check (btrim(entry_criteria) <> '' and char_length(entry_criteria) <= 2000),
  exit_criteria text not null check (btrim(exit_criteria) <> '' and char_length(exit_criteria) <= 2000),
  status public.stage_status not null default 'Not started',
  unique (launch_id, stage)
);

-- Current rollout stage: the Active stage, else the next Not started stage.
-- No row means every stage is Completed.
create view public.launch_current_stage with (security_invoker = true) as
select distinct on (launch_id) launch_id, stage, status
from public.rollout_stages
where status in ('Active', 'Not started')
order by launch_id, status = 'Active' desc, stage;

-- Access ----------------------------------------------------------------------

alter table public.launches enable row level security;
alter table public.gates enable row level security;
alter table public.evidence enable row level security;
alter table public.risks enable row level security;
alter table public.decisions enable row level security;
alter table public.rollout_stages enable row level security;

revoke all on
  public.launches, public.gates, public.evidence, public.risks, public.decisions,
  public.rollout_stages, public.launch_current_stage
from anon, authenticated;

grant select on
  public.launches, public.gates, public.evidence, public.risks, public.decisions,
  public.rollout_stages, public.launch_current_stage
to anon, authenticated;

-- Evidence is the only table the public can write to, and only by insert.
grant insert (gate_id, type, title, summary, source, recorded_on) on public.evidence to anon, authenticated;

create policy "Public read" on public.launches for select to anon, authenticated using (true);
create policy "Public read" on public.gates for select to anon, authenticated using (true);
create policy "Public read" on public.evidence for select to anon, authenticated using (true);
create policy "Public read" on public.risks for select to anon, authenticated using (true);
create policy "Public read" on public.decisions for select to anon, authenticated using (true);
create policy "Public read" on public.rollout_stages for select to anon, authenticated using (true);
create policy "Public append" on public.evidence for insert to anon, authenticated with check (true);

-- set_gate_status -------------------------------------------------------------
-- The only path that changes a gate's status. One transaction: validate, update
-- the gate, write one status_change decision. Returns the decision id.

create function public.set_gate_status(
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

  if new_status = 'Passed'
     and not exists (select 1 from public.evidence e where e.gate_id = set_gate_status.gate_id) then
    raise exception 'A gate cannot be Passed without at least one evidence item';
  end if;

  if new_status = 'Waived' and btrim(coalesce(set_gate_status.waiver_rationale, '')) = '' then
    raise exception 'A waiver rationale is required to waive a gate';
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

revoke all on function public.set_gate_status(bigint, public.gate_status, text, text, text) from public;
grant execute on function public.set_gate_status(bigint, public.gate_status, text, text, text) to anon, authenticated;
