-- Stage 2, M-4: sandbox provenance (DR-013, DR-015, DR-016, DR-025; contract in
-- docs/security/2026-10-02-audit-2b-reconcile.md, section 19).
-- Adds columns, constraints and one private table. Grants nothing to the API
-- roles: table-level SELECT already covers the new columns, and sandbox_state
-- stays unreadable. Every statement fails loudly if the catalog differs from
-- what it expects.

-- Provenance: who created an evidence or decision row. The database sets it;
-- no caller can (I11, I15).
create type public.record_origin as enum ('seed', 'visitor');

alter table public.evidence add column origin public.record_origin not null default 'seed';
alter table public.decisions add column origin public.record_origin not null default 'seed';

-- Sandbox links. Null means canonical. A sandbox launch points at its canonical
-- launch and a sandbox gate at its canonical gate; at most one copy of each.
alter table public.launches
  add column source_launch_id bigint references public.launches (id),
  add constraint launches_one_sandbox_per_source unique (source_launch_id),
  add constraint launches_source_is_another_launch check (source_launch_id <> id);

alter table public.gates
  add column source_gate_id bigint references public.gates (id),
  add constraint gates_one_copy_per_source unique (source_gate_id),
  add constraint gates_source_is_another_gate check (source_gate_id <> id);

-- Same-launch integrity: a decision or risk that names a gate must name a gate
-- of its own launch (Audit 1 M4). Composite keys use MATCH SIMPLE, so a row
-- without a gate is unaffected.
alter table public.gates add constraint gates_id_launch_id_key unique (id, launch_id);
alter table public.decisions
  add constraint decisions_gate_same_launch foreign key (gate_id, launch_id) references public.gates (id, launch_id);
alter table public.risks
  add constraint risks_gate_same_launch foreign key (gate_id, launch_id) references public.gates (id, launch_id);

-- Text rules (I14). Single-line fields reject C0 and C1 controls, DEL, and the
-- bidirectional override and isolate characters. Multi-line fields also allow
-- tab, LF and CR. Multilingual text is accepted. They bind every row, the seed
-- included. Explicit code point ranges don't depend on the collation provider.
alter table public.evidence
  add constraint evidence_title_single_line
    check (title !~ '[\u0001-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]'),
  add constraint evidence_summary_text
    check (summary !~ '[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]');

alter table public.decisions
  add constraint decisions_decision_single_line
    check (decision !~ '[\u0001-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]'),
  add constraint decisions_rationale_text
    check (rationale !~ '[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]'),
  add constraint decisions_waiver_rationale_text
    check (waiver_rationale !~ '[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]');

alter table public.gates
  add constraint gates_waiver_rationale_text
    check (waiver_rationale !~ '[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]');

-- Cooldown state for sandbox_reset(): one row, RLS on, no grants. It starts in
-- the past so the first reset is allowed. Only SECURITY DEFINER code reads it.
create table public.sandbox_state (
  id boolean primary key default true check (id),
  last_reset_at timestamptz not null default '-infinity'
);
alter table public.sandbox_state enable row level security;
revoke all on table public.sandbox_state from public, anon, authenticated;
insert into public.sandbox_state default values;
