-- Synthetic demo data for the AI Launch Readiness Console. No real customers or systems.
--
-- reset_demo_data() is the only copy of the seed. It truncates every table and
-- re-inserts one launch, "Halcyon Support Copilot", with 16 required gates:
-- 6 Passed, 1 In progress, 3 Failed, 6 Not started. Readiness is "6 of 16 passed",
-- 10 blockers, Not ready.
--
-- Facts come only from the project brief. Undated facts have a null recorded_on.
-- Owners and decided_by are role titles, not people. The suite gate's evidence is
-- the recorded evaluation result. The other Passed gates rest on documents that a
-- rule exists and is enforced, not on adversarial tests.

create function public.reset_demo_data()
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
end;
$$;

revoke all on function public.reset_demo_data() from public;
grant execute on function public.reset_demo_data() to anon, authenticated;

select public.reset_demo_data();
