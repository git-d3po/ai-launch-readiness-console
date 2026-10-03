-- Stage 2 corrective: restore the reviewed text of the six I14 constraints
-- (EVAL-088; reconciliation record, sections 19 and 20; DR-024).
--
-- When M-4 (20261003183331_sandbox_provenance.sql) was applied to production,
-- the tool transport decoded four of its escape texts (backslash-u 202A, 202E,
-- 2066 and 2069) into the literal bidi characters they name. The constraints
-- behave as reviewed, but their catalog text holds invisible characters. This
-- migration rebuilds the six constraints with exactly the reviewed M-4 text.
-- On a database built from the reviewed M-4 it changes nothing.
--
-- Transport-safe on purpose: printable ASCII, no backslash and no escape text.
-- The regex text is built at run time, with chr(92) for the backslash, and
-- passed through format(%L). This dynamic SQL runs once, in this DO block, as
-- the migration owner; the block leaves no function behind, and I5's ban on
-- dynamic SQL in SECURITY DEFINER functions is unchanged.
--
-- Fails loudly, and the whole migration rolls back, unless:
--   before: each constraint holds either the reviewed text or the exact text
--           M-4 produced on production (no other drift is overwritten);
--   after:  each constraint's definition has the reviewed md5 and contains
--           no character outside printable ASCII.
do $$
declare
  bs constant text := chr(92);
  single_line constant text := '[' || bs || 'u0001-' || bs || 'u001F' || bs || 'u007F-' || bs || 'u009F'
    || bs || 'u202A-' || bs || 'u202E' || bs || 'u2066-' || bs || 'u2069]';
  multi_line constant text := '[' || bs || 'u0001-' || bs || 'u0008' || bs || 'u000B' || bs || 'u000C' || bs || 'u000E-'
    || bs || 'u001F' || bs || 'u007F-' || bs || 'u009F' || bs || 'u202A-' || bs || 'u202E' || bs || 'u2066-' || bs || 'u2069]';
  -- C0 and C1 controls, DEL, and the bidi override and isolate characters.
  forbidden constant text := '[' || chr(1) || '-' || chr(31) || chr(127) || '-' || chr(159)
    || chr(8234) || '-' || chr(8238) || chr(8294) || '-' || chr(8297) || ']';
  bad int;
begin
  -- Before: reviewed md5 (a fresh replay) or the md5 production holds after M-4.
  select count(*) into bad from (values
    ('public.evidence'::regclass, 'evidence_title_single_line', 'fd7ab640f15373e4914dd240e790d5f0', 'dee9990b68e6ba9b6c242c17d3eee8b4'),
    ('public.evidence'::regclass, 'evidence_summary_text', '5b5807225542933c1c67d6cc0ab151fc', 'c9589e78071cb8348115a68bee363a7c'),
    ('public.decisions'::regclass, 'decisions_decision_single_line', '36872f3318c6e758cf2d684d5abd67e8', '36939f7c6b962d87f43ba3c5df8e92a6'),
    ('public.decisions'::regclass, 'decisions_rationale_text', '1ccdf7c815fc3f3ebcbed26ab8a977c6', 'd1fc54e70998b70b7bbb4e68514a4ce1'),
    ('public.decisions'::regclass, 'decisions_waiver_rationale_text', 'ded9db6592d3ffba218ddd1c5c4b8080', 'a47f26af6931645ac1ada5ac1eb9fcaa'),
    ('public.gates'::regclass, 'gates_waiver_rationale_text', 'ded9db6592d3ffba218ddd1c5c4b8080', 'a47f26af6931645ac1ada5ac1eb9fcaa')
  ) e(rel, conname, reviewed, transported)
  left join pg_constraint c on c.conrelid = e.rel and c.conname = e.conname and c.contype = 'c'
  where c.oid is null or md5(pg_get_constraintdef(c.oid)) not in (e.reviewed, e.transported);
  if bad <> 0 then
    raise exception 'I14 constraint text is neither the reviewed nor the known transported text in % constraint(s)', bad;
  end if;

  execute format('alter table public.evidence'
    ' drop constraint evidence_title_single_line, add constraint evidence_title_single_line check (title !~ %L),'
    ' drop constraint evidence_summary_text, add constraint evidence_summary_text check (summary !~ %L)',
    single_line, multi_line);
  execute format('alter table public.decisions'
    ' drop constraint decisions_decision_single_line, add constraint decisions_decision_single_line check (decision !~ %L),'
    ' drop constraint decisions_rationale_text, add constraint decisions_rationale_text check (rationale !~ %L),'
    ' drop constraint decisions_waiver_rationale_text, add constraint decisions_waiver_rationale_text check (waiver_rationale !~ %L)',
    single_line, multi_line, multi_line);
  execute format('alter table public.gates'
    ' drop constraint gates_waiver_rationale_text, add constraint gates_waiver_rationale_text check (waiver_rationale !~ %L)',
    multi_line);

  -- After: exactly the reviewed text, and nothing outside printable ASCII.
  select count(*) into bad from (values
    ('public.evidence'::regclass, 'evidence_title_single_line', 'fd7ab640f15373e4914dd240e790d5f0'),
    ('public.evidence'::regclass, 'evidence_summary_text', '5b5807225542933c1c67d6cc0ab151fc'),
    ('public.decisions'::regclass, 'decisions_decision_single_line', '36872f3318c6e758cf2d684d5abd67e8'),
    ('public.decisions'::regclass, 'decisions_rationale_text', '1ccdf7c815fc3f3ebcbed26ab8a977c6'),
    ('public.decisions'::regclass, 'decisions_waiver_rationale_text', 'ded9db6592d3ffba218ddd1c5c4b8080'),
    ('public.gates'::regclass, 'gates_waiver_rationale_text', 'ded9db6592d3ffba218ddd1c5c4b8080')
  ) e(rel, conname, reviewed)
  left join pg_constraint c on c.conrelid = e.rel and c.conname = e.conname and c.contype = 'c'
  where c.oid is null
     or md5(pg_get_constraintdef(c.oid)) <> e.reviewed
     or pg_get_constraintdef(c.oid) ~ forbidden
     or pg_get_constraintdef(c.oid) ~ '[^ -~]';
  if bad <> 0 then
    raise exception 'I14 constraint text differs from the reviewed M-4 text in % constraint(s)', bad;
  end if;
end
$$;
