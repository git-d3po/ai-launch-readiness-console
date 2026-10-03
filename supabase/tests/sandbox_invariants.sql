-- Stage 2 sandbox invariants (C-14 in docs/security/2026-10-02-audit-2b-reconcile.md;
-- DR-013, DR-018, DR-025): a read-only data test.
--
-- Returns one row per check (PASS or FAIL) and a final overall row. A check that
-- cannot be evaluated counts as FAIL: NULL is never treated as success.
--
-- Read-only: one SELECT over the six public tables and sandbox_state. It writes
-- nothing and needs no temporary objects, so it is safe on production
-- (invariant I19). To prove that on a given run, execute it in a read-only
-- transaction, e.g.
--   PGOPTIONS='-c default_transaction_read_only=on' psql -v ON_ERROR_STOP=1 -f supabase/tests/sandbox_invariants.sql
-- Run it as the database owner role (postgres): sandbox_state isn't readable by
-- the API roles.
--
-- Checks:
--    1  no visitor-origin evidence or decision is on a canonical launch (I11, I12)
--    2  no sandbox gate holds more than 10 visitor evidence rows or 20 visitor
--       decisions (I12)
--    3  every sandbox launch's source is a canonical launch
--    4  every canonical launch has exactly one sandbox launch
--    5  every canonical gate has exactly one copy, on its launch's sandbox, and
--       every sandbox gate's source is a gate of its launch's source
--    6  each sandbox holds as many seed-origin evidence and decision rows, risks
--       and rollout stages as its canonical launch
--    7  sandbox_state holds exactly one row

with
canonical_launch as (select id from public.launches where source_launch_id is null),
sandbox_launch as (select id, source_launch_id from public.launches where source_launch_id is not null),
visitor_on_canonical as (
  select 'evidence ' || e.id as item
  from public.evidence e join public.gates g on g.id = e.gate_id
  where e.origin = 'visitor' and g.launch_id in (select id from canonical_launch)
  union all
  select 'decision ' || d.id
  from public.decisions d
  where d.origin = 'visitor' and d.launch_id in (select id from canonical_launch)
),
sandbox_gate_counts as (
  select g.id,
    (select count(*) from public.evidence e where e.gate_id = g.id and e.origin = 'visitor') as visitor_evidence,
    (select count(*) from public.decisions d where d.gate_id = g.id and d.origin = 'visitor') as visitor_decisions
  from public.gates g
  where g.launch_id in (select id from sandbox_launch)
),
gate_mapping_errors as (
  -- a canonical gate without exactly one copy on its launch's sandbox
  select 'canonical gate ' || c.id as item
  from public.gates c
  where c.launch_id in (select id from canonical_launch)
    and (select count(*) from public.gates s
         join sandbox_launch sl on sl.id = s.launch_id
         where s.source_gate_id = c.id and sl.source_launch_id = c.launch_id) <> 1
  union all
  -- a sandbox gate whose source isn't a gate of its launch's source
  select 'sandbox gate ' || s.id
  from public.gates s
  join sandbox_launch sl on sl.id = s.launch_id
  where not exists (select 1 from public.gates c where c.id = s.source_gate_id and c.launch_id = sl.source_launch_id)
  union all
  -- a canonical gate that claims a source
  select 'canonical gate with a source ' || c.id
  from public.gates c
  where c.launch_id in (select id from canonical_launch) and c.source_gate_id is not null
),
structure as (
  select sl.id, sl.source_launch_id,
    format('evidence %s/%s, decisions %s/%s, risks %s/%s, stages %s/%s',
      (select count(*) from public.evidence e join public.gates g on g.id = e.gate_id where g.launch_id = sl.id and e.origin = 'seed'),
      (select count(*) from public.evidence e join public.gates g on g.id = e.gate_id where g.launch_id = sl.source_launch_id),
      (select count(*) from public.decisions d where d.launch_id = sl.id and d.origin = 'seed'),
      (select count(*) from public.decisions d where d.launch_id = sl.source_launch_id),
      (select count(*) from public.risks r where r.launch_id = sl.id),
      (select count(*) from public.risks r where r.launch_id = sl.source_launch_id),
      (select count(*) from public.rollout_stages r where r.launch_id = sl.id),
      (select count(*) from public.rollout_stages r where r.launch_id = sl.source_launch_id)) as detail,
    (select count(*) from public.evidence e join public.gates g on g.id = e.gate_id where g.launch_id = sl.id and e.origin = 'seed')
      = (select count(*) from public.evidence e join public.gates g on g.id = e.gate_id where g.launch_id = sl.source_launch_id)
    and (select count(*) from public.decisions d where d.launch_id = sl.id and d.origin = 'seed')
      = (select count(*) from public.decisions d where d.launch_id = sl.source_launch_id)
    and (select count(*) from public.risks r where r.launch_id = sl.id)
      = (select count(*) from public.risks r where r.launch_id = sl.source_launch_id)
    and (select count(*) from public.rollout_stages r where r.launch_id = sl.id)
      = (select count(*) from public.rollout_stages r where r.launch_id = sl.source_launch_id) as ok
  from sandbox_launch sl
),
checks(check_no, name, ok, detail) as (
  select 1, 'No visitor-origin row is on a canonical launch',
    not exists (select 1 from visitor_on_canonical),
    coalesce('found: ' || (select string_agg(item, ', ') from visitor_on_canonical), 'none')

  union all
  select 2, 'No sandbox gate is over its caps (10 visitor evidence, 20 visitor decisions)',
    not exists (select 1 from sandbox_gate_counts where visitor_evidence > 10 or visitor_decisions > 20),
    coalesce('over: ' || (select string_agg(format('gate %s: %s evidence, %s decisions', id, visitor_evidence, visitor_decisions), ', ')
                          from sandbox_gate_counts where visitor_evidence > 10 or visitor_decisions > 20),
             format('%s sandbox gates; most visitor evidence %s, most visitor decisions %s',
               (select count(*) from sandbox_gate_counts),
               coalesce((select max(visitor_evidence) from sandbox_gate_counts), 0),
               coalesce((select max(visitor_decisions) from sandbox_gate_counts), 0)))

  union all
  select 3, 'Every sandbox launch is a copy of a canonical launch',
    not exists (select 1 from sandbox_launch sl where sl.source_launch_id not in (select id from canonical_launch)),
    format('%s sandbox launches', (select count(*) from sandbox_launch))

  union all
  select 4, 'Every canonical launch has exactly one sandbox',
    not exists (select 1 from canonical_launch c where (select count(*) from sandbox_launch sl where sl.source_launch_id = c.id) <> 1)
      and exists (select 1 from canonical_launch),
    format('%s canonical launches, %s sandbox launches', (select count(*) from canonical_launch), (select count(*) from sandbox_launch))

  union all
  select 5, 'Every canonical gate has exactly one sandbox copy, and every copy maps back within its launch',
    not exists (select 1 from gate_mapping_errors),
    coalesce('errors: ' || (select string_agg(item, ', ') from gate_mapping_errors),
             format('%s canonical gates, %s sandbox gates',
               (select count(*) from public.gates where launch_id in (select id from canonical_launch)),
               (select count(*) from public.gates where launch_id in (select id from sandbox_launch))))

  union all
  select 6, 'Each sandbox holds as many seed rows, risks and stages as its canonical launch',
    exists (select 1 from structure) and not exists (select 1 from structure where not ok),
    coalesce((select string_agg(format('sandbox %s: %s', id, detail), '; ') from structure), 'no sandbox')

  union all
  select 7, 'sandbox_state holds exactly one row',
    (select count(*) from public.sandbox_state) = 1,
    format('%s rows', (select count(*) from public.sandbox_state))
),
results as (
  select check_no, name, coalesce(ok, false) as ok, detail from checks
)
select check_no, name, case when ok then 'PASS' else 'FAIL' end as result, detail from results
union all
select 99, 'Overall',
  case when bool_and(ok) then 'PASS' else 'FAIL' end,
  format('%s of %s checks passed', count(*) filter (where ok), count(*))
from results
order by 1;
