-- Stage 2, M-5: the sandbox seed (DR-013, DR-014, DR-025; contract in
-- docs/security/2026-10-02-audit-2b-reconcile.md, section 19).
-- Grants nothing to the API roles. set_gate_status, build_sandbox and
-- reset_demo_data are owner-only; every new or replaced function is revoked
-- from PUBLIC, anon and authenticated explicitly (DR-023).

-- set_gate_status gains a trailing origin, written to the decision. The sandbox
-- functions (M-6) pass 'visitor'; everything else keeps the default 'seed'.
-- The rules (I8) are unchanged. The old 5-argument signature is dropped so only
-- one owner-only status path exists.
drop function public.set_gate_status(bigint, public.gate_status, text, text, text);

create function public.set_gate_status(
  gate_id bigint,
  new_status public.gate_status,
  rationale text,
  decided_by text,
  waiver_rationale text default null,
  origin public.record_origin default 'seed'
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

  -- The gate holds the waiver text only while Waived; the decision row keeps it.
  update public.gates g
  set status = new_status,
      waiver_rationale = case when new_status = 'Waived' then btrim(set_gate_status.waiver_rationale) end,
      updated_at = now()
  where g.id = set_gate_status.gate_id;

  insert into public.decisions
    (launch_id, kind, decision, rationale, decided_by, gate_id, from_status, to_status, waiver_rationale, origin)
  values (
    v_gate.launch_id,
    'status_change',
    format('%s: %s → %s', v_gate.title, v_gate.status, new_status),
    btrim(set_gate_status.rationale),
    btrim(set_gate_status.decided_by),
    set_gate_status.gate_id,
    v_gate.status,
    new_status,
    case when new_status = 'Waived' then btrim(set_gate_status.waiver_rationale) end,
    set_gate_status.origin
  )
  returning id into v_decision_id;

  return v_decision_id;
end;
$$;

revoke all on function public.set_gate_status(bigint, public.gate_status, text, text, text, public.record_origin)
  from public, anon, authenticated;

-- build_sandbox() copies every canonical launch into exactly one sandbox launch:
-- all of its gates, evidence, risks, decisions and rollout stages, with every
-- gate reference remapped through gates.source_gate_id. Copied evidence and
-- decisions are origin 'seed'. Rows are copied in canonical id order, so the
-- result depends only on canonical content. It runs as its caller (the owner,
-- or reset_demo_data); no API role can call it. A second run fails on the
-- one-sandbox-per-launch constraint rather than duplicating anything.
create function public.build_sandbox()
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_source public.launches%rowtype;
  v_sandbox bigint;
begin
  -- The seed has no decision about a risk. Copying one would need a risk id
  -- mapping, so refuse rather than copy a reference to the canonical risk.
  if exists (select 1 from public.decisions d
             join public.launches l on l.id = d.launch_id
             where l.source_launch_id is null and d.risk_id is not null) then
    raise exception 'build_sandbox cannot copy a decision that refers to a risk';
  end if;

  for v_source in
    select * from public.launches where source_launch_id is null order by id
  loop
    insert into public.launches (name, description, owner, target_date, source_launch_id)
    values (v_source.name || ' (sandbox)', v_source.description, v_source.owner, v_source.target_date, v_source.id)
    returning id into v_sandbox;

    insert into public.gates
      (launch_id, category, title, pass_criteria, owner, required, status, waiver_rationale, source_gate_id)
    select v_sandbox, g.category, g.title, g.pass_criteria, g.owner, g.required, g.status, g.waiver_rationale, g.id
    from public.gates g
    where g.launch_id = v_source.id
    order by g.id;

    insert into public.evidence (gate_id, type, title, summary, source, recorded_on, origin)
    select s.id, e.type, e.title, e.summary, e.source, e.recorded_on, 'seed'
    from public.evidence e
    join public.gates s on s.source_gate_id = e.gate_id
    where s.launch_id = v_sandbox
    order by e.id;

    insert into public.risks
      (launch_id, title, description, likelihood, impact, owner, mitigation, status, gate_id)
    select v_sandbox, r.title, r.description, r.likelihood, r.impact, r.owner, r.mitigation, r.status, s.id
    from public.risks r
    left join public.gates s on s.source_gate_id = r.gate_id
    where r.launch_id = v_source.id
    order by r.id;

    insert into public.decisions
      (launch_id, decided_at, kind, decision, rationale, decided_by, gate_id, risk_id,
       from_status, to_status, waiver_rationale, origin)
    select v_sandbox, d.decided_at, d.kind, d.decision, d.rationale, d.decided_by, s.id, null,
           d.from_status, d.to_status, d.waiver_rationale, 'seed'
    from public.decisions d
    left join public.gates s on s.source_gate_id = d.gate_id
    where d.launch_id = v_source.id
    order by d.id;

    insert into public.rollout_stages (launch_id, stage, entry_criteria, exit_criteria, status)
    select v_sandbox, r.stage, r.entry_criteria, r.exit_criteria, r.status
    from public.rollout_stages r
    where r.launch_id = v_source.id
    order by r.id;
  end loop;
end;
$$;

revoke all on function public.build_sandbox() from public, anon, authenticated;

-- reset_demo_data() keeps its seed exactly as before, then rebuilds the sandbox.
-- It is one function call, so the reseed and the rebuild are one transaction:
-- either both complete or neither does. It doesn't touch sandbox_state.
create or replace function public.reset_demo_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_launch bigint;
  v_suite bigint;
  v_imperfect bigint;
  v_remeasure bigint;
  v_variance bigint;
  v_compromise bigint;
  v_citations bigint;
  v_refunds bigint;
  v_injection bigint;
  v_drafts bigint;
  v_demo bigint;
  v_multi_instance bigint;
  v_persistence bigint;
begin
  truncate public.decisions, public.risks, public.evidence, public.gates,
    public.rollout_stages, public.launches
  restart identity;

  insert into public.launches (name, description, owner, target_date)
  values (
    'Halcyon Support Copilot',
    'A fictional company''s AI support copilot. It drafts customer replies, routes tickets to '
      || 'specialist agents (Billing, Policy, Technical, Risk), and applies deterministic safety rules. '
      || 'Synthetic portfolio data.',
    'AI Program Lead',
    null
  )
  returning id into v_launch;

  -- Gates, in category display order ------------------------------------------

  insert into public.gates (launch_id, category, title, pass_criteria, owner, status)
  values (v_launch, 'Evaluation', 'Curated scenario suite passes at 0.85',
    'A recorded live evaluation shows every curated scenario passing at a 0.85 threshold.',
    'Evaluation Lead', 'Passed')
  returning id into v_suite;

  insert into public.gates (launch_id, category, title, pass_criteria, owner, status)
  values (v_launch, 'Evaluation', 'Imperfect passes triaged, expected behavior specified',
    'Every imperfect pass in the recorded evaluation is triaged and its expected behavior is specified.',
    'Evaluation Lead', 'In progress')
  returning id into v_imperfect;

  insert into public.gates (launch_id, category, title, pass_criteria, owner, status)
  values (v_launch, 'Evaluation', 'Release commit re-measured live (29fd3c0)',
    'The post-evaluation fix in commit 29fd3c0 is measured in a recorded live evaluation.',
    'Evaluation Lead', 'Not started')
  returning id into v_remeasure;

  insert into public.gates (launch_id, category, title, pass_criteria, owner, status)
  values (v_launch, 'Evaluation', 'Variance measured across repeated runs',
    'The curated suite is run live more than once and the run-to-run variance is recorded.',
    'Evaluation Lead', 'Not started')
  returning id into v_variance;

  insert into public.gates (launch_id, category, title, pass_criteria, owner, status)
  values (v_launch, 'Safety & Escalation', 'Account compromise always escalates to Trust & Safety',
    'A deterministic rule exists and is enforced: suspected account compromise always escalates to Trust & Safety.',
    'Trust & Safety Lead', 'Passed')
  returning id into v_compromise;

  insert into public.gates (launch_id, category, title, pass_criteria, owner, status)
  values (v_launch, 'Safety & Escalation', 'Policy citations match retrieved policies',
    'A deterministic rule exists and is enforced: every policy citation must match a retrieved policy.',
    'Trust & Safety Lead', 'Passed')
  returning id into v_citations;

  insert into public.gates (launch_id, category, title, pass_criteria, owner, status)
  values (v_launch, 'Safety & Escalation', 'Refunds may be promised only when the resolution authorizes one',
    'A deterministic rule exists and is enforced: a refund may be promised only when the resolution authorizes one.',
    'Trust & Safety Lead', 'Passed')
  returning id into v_refunds;

  insert into public.gates (launch_id, category, title, pass_criteria, owner, status)
  values (v_launch, 'Safety & Escalation', 'Live-mode prompt-injection handling documented and tested',
    'Prompt-injection handling for live mode is documented and tested, and customer ticket text is delimited before it enters prompts.',
    'Trust & Safety Lead', 'Failed')
  returning id into v_injection;

  insert into public.gates (launch_id, category, title, pass_criteria, owner, status)
  values (v_launch, 'Human-in-the-Loop', 'Customer replies are drafts and are never sent automatically',
    'A deterministic rule exists and is enforced: customer replies are drafts and are never sent automatically.',
    'AI Program Lead', 'Passed')
  returning id into v_drafts;

  insert into public.gates (launch_id, category, title, pass_criteria, owner, status)
  values (v_launch, 'Data & Privacy', 'Simulated demo runs are isolated from metrics and credentials',
    'Demo runs make no model call, use no API key, are labeled simulated, and are excluded from metrics.',
    'AI Program Lead', 'Passed')
  returning id into v_demo;

  insert into public.gates (launch_id, category, title, pass_criteria, owner, status)
  values (v_launch, 'Reliability & Operations', 'Safe multi-instance deployment',
    'The service can run as more than one instance without duplicate runs.',
    'AI Program Lead', 'Failed')
  returning id into v_multi_instance;

  insert into public.gates (launch_id, category, title, pass_criteria, owner, status)
  values (v_launch, 'Reliability & Operations', 'Durable persistence across restarts',
    'Stored data survives a service restart.',
    'AI Program Lead', 'Failed')
  returning id into v_persistence;

  insert into public.gates (launch_id, category, title, pass_criteria, owner, status)
  values
    (v_launch, 'Monitoring', 'Production monitoring and alerting defined',
      'Production monitoring signals and alert conditions are defined and documented.',
      'AI Program Lead', 'Not started'),
    (v_launch, 'Rollback', 'Rollback procedure documented and rehearsed',
      'A procedure to turn the copilot off and return to the prior support workflow is documented and rehearsed.',
      'AI Program Lead', 'Not started'),
    (v_launch, 'Enablement & Training', 'Support agents trained on the Assist workflow',
      'Support agents who will use Assist have been trained to review and approve suggestions.',
      'AI Program Lead', 'Not started'),
    (v_launch, 'Stakeholder Sign-off', 'Required stakeholder sign-offs recorded',
      'Each required stakeholder has recorded a sign-off as evidence.',
      'AI Program Lead', 'Not started');

  -- Evidence ------------------------------------------------------------------

  insert into public.evidence (gate_id, type, title, summary, recorded_on)
  values
    (v_suite, 'Evaluation result', 'Recorded live evaluation, commit 0a12bb9',
      'Live evaluation recorded 2026-09-24 against commit 0a12bb9: 11 of 11 curated scenarios passed at a '
        || '0.85 threshold. 39 agent steps, 1 failed validation after retry. Estimated model cost $0.21.',
      date '2026-09-24'),
    (v_compromise, 'Document', 'Deterministic rule: account compromise escalation',
      'Suspected account compromise always escalates to Trust & Safety. The rule is deterministic and '
        || 'enforced in code. This documents the rule; it is not an adversarial test.',
      null),
    (v_citations, 'Document', 'Deterministic rule: policy citations',
      'Policy citations must match retrieved policies. The rule is deterministic and enforced in code. '
        || 'This documents the rule; it is not an adversarial test.',
      null),
    (v_refunds, 'Document', 'Deterministic rule: refund promises',
      'Refunds may only be promised when the resolution authorizes one. The rule is deterministic and '
        || 'enforced in code. This documents the rule; it is not an adversarial test.',
      null),
    (v_drafts, 'Document', 'Deterministic rule: replies are drafts',
      'Customer replies are drafts and are never sent automatically. The rule is deterministic and '
        || 'enforced in code. This documents the rule; it is not an adversarial test.',
      null),
    (v_demo, 'Document', 'Public Demo Mode isolation',
      'Public Demo Mode replays scripted responses with no model call and no API key. Demo runs are '
        || 'labeled simulated and excluded from metrics.',
      null),
    (v_imperfect, 'Observation', 'Four imperfect passes in the 2026-09-24 evaluation',
      'prohibited-refund 0.94: Billing agent output degraded; the denial came from the Policy agent. '
        || 'multi-domain 0.88: intent mismatch, expected billing question, got duplicate charge. '
        || 'failed-payment 0.86: routing added an unexpected Technical agent. '
        || 'technical-escalation 0.86: Risk agent not routed.',
      null),
    (v_injection, 'Observation', 'Prompt-injection handling undocumented',
      'Prompt-injection handling for live mode is undocumented. Customer ticket text enters prompts '
        || 'without delimiters.',
      null),
    (v_multi_instance, 'Observation', 'Single-instance deployment only',
      'Deployment is single-instance only. Duplicate-run protection is per process, so it does not hold '
        || 'across instances.',
      null),
    (v_persistence, 'Observation', 'SQLite rebuilt on restart',
      'The SQLite database is rebuilt on restart.',
      null);

  -- Risks (all Open) ----------------------------------------------------------

  insert into public.risks (launch_id, title, description, likelihood, impact, owner, mitigation, status, gate_id)
  values
    (v_launch, 'Multi-domain expected intent unresolved',
      'The multi-domain scenario passed at 0.88 with an intent mismatch: expected billing question, got '
        || 'duplicate charge. The expected intent is not yet specified.',
      'Medium', 'Medium', 'Evaluation Lead',
      'Specify the expected intent for the multi-domain scenario.',
      'Open', v_imperfect),
    (v_launch, 'Whether Risk is required for technical-escalation',
      'The technical-escalation scenario passed at 0.86 without routing to the Risk agent. Whether Risk '
        || 'routing is required has not been decided.',
      'Medium', 'Medium', 'Evaluation Lead',
      'Decide whether the Risk agent is required for technical-escalation and record the expected agents.',
      'Open', v_imperfect),
    (v_launch, 'Failed-payment expected agents unresolved',
      'The failed-payment scenario passed at 0.86 with routing that added an unexpected Technical agent. '
        || 'The expected agents are not yet specified.',
      'Medium', 'Medium', 'Evaluation Lead',
      'Specify the expected agents for the failed-payment scenario.',
      'Open', v_imperfect),
    (v_launch, 'Live-mode prompt injection',
      'Customer ticket text enters prompts without delimiters, and prompt-injection handling for live '
        || 'mode is undocumented.',
      'Medium', 'High', 'Trust & Safety Lead',
      'Delimit ticket text in prompts, then document and test injection handling for live mode.',
      'Open', v_injection),
    (v_launch, 'Single-instance scaling limit',
      'Duplicate-run protection is per process, so the service cannot safely run as more than one instance.',
      'High', 'Medium', 'AI Program Lead',
      'Move duplicate-run protection out of the process before running more than one instance.',
      'Open', v_multi_instance),
    (v_launch, 'Model variance from a single evaluation run',
      'The evaluation is a single live run, so run-to-run variance is unknown.',
      'Medium', 'High', 'Evaluation Lead',
      'Run the curated suite live more than once and record the variance.',
      'Open', v_variance);

  -- Decisions (manual; listed oldest first) -----------------------------------

  insert into public.decisions (launch_id, kind, decision, rationale, decided_by, gate_id)
  values
    (v_launch, 'manual', 'Readiness baseline recorded',
      'Gate statuses were recorded from existing evidence. The scenario suite gate is Passed on the '
        || 'recorded live evaluation result. Gates with a document showing that a rule exists and is enforced '
        || 'are Passed. Imperfect evaluation passes are still being triaged, so that '
        || 'gate is In progress. Gates with an observed deficiency are Failed. Gates with no recorded work '
        || 'are Not started.',
      'AI Program Lead', null),
    (v_launch, 'manual', 'Prompt-injection gate marked Failed',
      'Prompt-injection handling for live mode is undocumented, and customer ticket text enters prompts '
        || 'without delimiters.',
      'Trust & Safety Lead', v_injection),
    (v_launch, 'manual', 'Reliability gates marked Failed',
      'Safe multi-instance deployment is Failed because duplicate-run protection is per process. Durable '
        || 'persistence across restarts is Failed because the SQLite database is rebuilt on restart.',
      'AI Program Lead', null),
    (v_launch, 'manual', 'Hold at Shadow (not started)',
      'The launch stays at Shadow, not started, until the post-evaluation fix in commit 29fd3c0 is '
        || 're-measured live and every blocking gate is Passed or Waived.',
      'AI Program Lead', v_remeasure);

  -- Rollout stages (all Not started; criteria are definitions, not results) ---

  insert into public.rollout_stages (launch_id, stage, entry_criteria, exit_criteria, status)
  values
    (v_launch, 'Shadow',
      'Every required gate is Passed or Waived. The AI runs on live tickets and its output is hidden.',
      'Shadow output has been compared with agent resolutions and the comparison is recorded as evidence.',
      'Not started'),
    (v_launch, 'Assist',
      'Shadow is Completed. Agents approve every suggestion before anything reaches a customer.',
      'Agent approval outcomes have been reviewed and the review is recorded as evidence.',
      'Not started'),
    (v_launch, 'Partial automation',
      'Assist is Completed, and the low-risk categories eligible for automation are defined and signed off.',
      'Expanding automation beyond the signed-off low-risk categories requires a new recorded decision.',
      'Not started');

  -- Stage 2: rebuild the sandbox from the canonical rows just seeded. This runs in
  -- the caller's transaction, so if it fails the reseed above rolls back too.
  perform public.build_sandbox();
end;
$$;

revoke all on function public.reset_demo_data() from public, anon, authenticated;

-- Build the sandbox from the canonical rows as they are now. No reseed: the
-- canonical launch keeps its ids and contents.
select public.build_sandbox();
