-- Stage 2, M-6: the three public sandbox functions (DR-013 to DR-018, DR-025;
-- contract in docs/security/2026-10-02-audit-2b-reconcile.md, section 19).
-- They are the whole public write surface (invariant I4). Each is SECURITY
-- DEFINER, owned by postgres, with an empty search_path, no dynamic SQL and
-- fully qualified relations. Each refuses anything outside a sandbox launch.
-- Every rule a function checks itself is a RAISE EXCEPTION with the default
-- SQLSTATE P0001 and a message fit to show a visitor. A value that breaks a
-- table constraint (the I14 text rules, the https rule, a length limit, NOT
-- NULL) fails with that constraint's own SQLSTATE, 23514 or 23502, and an
-- argument its type rejects, such as an unknown evidence type, with 22P02.
-- The API roles still hold no table privilege beyond SELECT (I3).
--
-- Isolation: each function's guarantee rests on reading committed state after
-- it holds its locks, which only READ COMMITTED gives: every statement takes a
-- fresh snapshot. At REPEATABLE READ or SERIALIZABLE the snapshot predates the
-- lock wait, and a row that was only locked, not updated, raises no
-- serialization error. So each function refuses those levels with P0001
-- before it takes a lock. An API caller can't choose the level; the server's
-- configuration sets it (Postgres defaults to READ COMMITTED). The refusal
-- keeps the guarantees from depending on that configuration.

-- Adds one visitor evidence item to a sandbox gate. The database sets origin
-- and the date (I11, I15). The gate's row lock makes the cap race-free (I12)
-- at READ COMMITTED: a call that waited on the lock counts the rows the other
-- call committed. At a higher level it would count from its older snapshot
-- and could add an 11th item, so it refuses to run there.
create function public.sandbox_add_evidence(
  gate_id bigint,
  type public.evidence_type,
  title text,
  summary text,
  source text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gate public.gates%rowtype;
  v_evidence_id bigint;
begin
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Sandbox evidence must be added at READ COMMITTED isolation';
  end if;

  select * into v_gate from public.gates g where g.id = sandbox_add_evidence.gate_id for update;
  if not found then
    raise exception 'Gate % does not exist', sandbox_add_evidence.gate_id;
  end if;

  if not exists (select 1 from public.launches l
                 where l.id = v_gate.launch_id and l.source_launch_id is not null) then
    raise exception 'Only sandbox gates accept visitor evidence';
  end if;

  if (select count(*) from public.evidence e
      where e.gate_id = v_gate.id and e.origin = 'visitor') >= 10 then
    raise exception 'This gate already has 10 visitor evidence items. Reset the sandbox to add more.';
  end if;

  -- A blank source must arrive as null: an empty string fails the https rule.
  insert into public.evidence (gate_id, type, title, summary, source, recorded_on, origin)
  values (
    v_gate.id,
    sandbox_add_evidence.type,
    btrim(sandbox_add_evidence.title),
    btrim(sandbox_add_evidence.summary),
    btrim(sandbox_add_evidence.source),
    current_date,
    'visitor'
  )
  returning id into v_evidence_id;

  return v_evidence_id;
end;
$$;

-- Changes a sandbox gate's status through set_gate_status, as 'Sandbox visitor'
-- with origin 'visitor' (I15), so every I8 rule applies unchanged. The rules
-- hold against a concurrent reset only at READ COMMITTED: a call that waited
-- on the reset's gate lock must see the evidence the reset deleted as gone, or
-- it could pass a gate that has no evidence. So it refuses higher levels.
create function public.sandbox_set_gate_status(
  gate_id bigint,
  new_status public.gate_status,
  rationale text,
  waiver_rationale text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gate public.gates%rowtype;
begin
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Sandbox status changes must run at READ COMMITTED isolation';
  end if;

  select * into v_gate from public.gates g where g.id = sandbox_set_gate_status.gate_id for update;
  if not found then
    raise exception 'Gate % does not exist', sandbox_set_gate_status.gate_id;
  end if;

  if not exists (select 1 from public.launches l
                 where l.id = v_gate.launch_id and l.source_launch_id is not null) then
    raise exception 'Only sandbox gates accept visitor status changes';
  end if;

  if (select count(*) from public.decisions d
      where d.gate_id = v_gate.id and d.origin = 'visitor') >= 20 then
    raise exception 'This gate already has 20 visitor decisions. Reset the sandbox to make more.';
  end if;

  return public.set_gate_status(
    v_gate.id,
    sandbox_set_gate_status.new_status,
    sandbox_set_gate_status.rationale,
    'Sandbox visitor',
    sandbox_set_gate_status.waiver_rationale,
    'visitor'
  );
end;
$$;

-- Resets the sandbox: deletes visitor evidence and decisions on sandbox
-- launches and restores each sandbox gate's status and waiver text from its
-- source gate. Canonical rows are never touched (I13). At most once every
-- 5 minutes, for everyone: the sandbox_state row lock serializes concurrent
-- calls, and a call inside the cooldown is told how long to wait. No TRUNCATE.
--
-- Lock order: sandbox_state, then every sandbox gate in id order, then the
-- deletes. Every visitor write holds its gate's lock until it commits, so once
-- the reset holds all the gate locks, each earlier visitor write has ended
-- and each later one waits for the reset. Under READ COMMITTED every statement
-- below takes its snapshot after the locks are held, so the deletes see every
-- committed visitor row. That needs READ COMMITTED (see the isolation note at
-- the top), so the reset refuses other levels. The visitor functions lock one
-- gate and never sandbox_state, so no lock is taken in the reverse order.
create function public.sandbox_reset()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last timestamptz;
  v_wait int;
  v_minutes int;
  v_seconds int;
begin
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'The sandbox reset must run at READ COMMITTED isolation';
  end if;

  select s.last_reset_at into v_last from public.sandbox_state s where s.id for update;
  if not found then
    raise exception 'The sandbox is not set up';
  end if;

  if v_last > now() - interval '5 minutes' then
    v_wait := ceil(extract(epoch from (v_last + interval '5 minutes' - now())))::int;
    v_minutes := v_wait / 60;
    v_seconds := v_wait % 60;
    raise exception 'The sandbox was reset recently. Try again in %.',
      concat_ws(' ',
        case when v_minutes = 1 then '1 minute' when v_minutes > 1 then v_minutes || ' minutes' end,
        case when v_seconds = 1 then '1 second' when v_seconds > 1 then v_seconds || ' seconds' end);
  end if;

  -- Only the gate rows are locked: locking launches would conflict with the
  -- key-share lock a visitor's insert takes on its launch.
  perform 1 from public.gates g
  where g.launch_id in (select l.id from public.launches l where l.source_launch_id is not null)
  order by g.id
  for update of g;

  delete from public.evidence e
  using public.gates g, public.launches l
  where e.gate_id = g.id and g.launch_id = l.id
    and l.source_launch_id is not null and e.origin = 'visitor';

  delete from public.decisions d
  using public.launches l
  where d.launch_id = l.id
    and l.source_launch_id is not null and d.origin = 'visitor';

  update public.gates s
  set status = c.status,
      waiver_rationale = c.waiver_rationale,
      updated_at = now()
  from public.gates c
  where s.source_gate_id = c.id
    and (s.status, s.waiver_rationale) is distinct from (c.status, c.waiver_rationale);

  update public.sandbox_state s set last_reset_at = now() where s.id;
end;
$$;

revoke all on function public.sandbox_add_evidence(bigint, public.evidence_type, text, text, text) from public;
revoke all on function public.sandbox_set_gate_status(bigint, public.gate_status, text, text) from public;
revoke all on function public.sandbox_reset() from public;

grant execute on function public.sandbox_add_evidence(bigint, public.evidence_type, text, text, text) to anon, authenticated;
grant execute on function public.sandbox_set_gate_status(bigint, public.gate_status, text, text) to anon, authenticated;
grant execute on function public.sandbox_reset() to anon, authenticated;
