-- C-11 migration parity: a read-only check of production's migration history
-- against this repository (invariant I20; DR-024 step 7; EVAL-022, EVAL-088).
--
-- Returns one row per expected migration, in order, then one row per recorded
-- migration it doesn't expect, then a final overall row. Each expected row is
-- PASS (recorded once, at the expected version if one is fixed, with the
-- expected md5), PENDING (not recorded yet), or FAIL. The overall row is PASS
-- only when every recorded migration passes, in order, and nothing unexpected
-- is recorded; it names how many expected migrations are still pending, so
-- the reader checks that count against the stage being verified.
--
-- The expected md5 is the repository file's md5, with one recorded exception:
-- for 20261003183331 sandbox_provenance (M-4) it is the md5 of the statement
-- production stored, 4b09ad34a82823aacf22d4afa63bad53, because the tool
-- transport decoded 24 escape texts in it. That exact statement is preserved
-- and verified in docs/evaluation/artifacts/2026-10-03-m4-transport-incident/,
-- and the reviewed file keeps md5 23dd3270cdca77001fe2f9a86917d518. No other
-- version and no other md5 is accepted for it. A version not yet applied is
-- matched by name (null here), since Supabase assigns the version when it
-- applies it; after the DR-009 rename, fix it here in the same commit. All
-- eight are applied and fixed since 2026-10-03 (EVAL-091).
--
-- Read-only: one SELECT. It writes nothing, and is safe on production (I19).
-- Its text is printable ASCII with no backslash, like the migrations it
-- checks. Run it as the database owner role (postgres).
--
-- Keep the md5s in step with supabase/migrations/; the unit test
-- supabase/tests/migration_transport_lint.test.mjs checks that they are.

with
expected(ord, version, name, md5) as (values
  (1, '20261002092043', 'phase1_schema', '2d4cf41fe73b0d2801dd51d69ece8e1b'),
  (2, '20261002092141', 'demo_seed', 'd3dafe0c87fc0af20d00d518e96f0380'),
  (3, '20261002093521', 'revoke_rls_auto_enable_execute', '4842aef718ae632952d694863d244b8c'),
  (4, '20261002160901', 'stage1_security_hardening', 'f66a638dfb93554ad4f1a2bac0826304'),
  (5, '20261003183331', 'sandbox_provenance', '4b09ad34a82823aacf22d4afa63bad53'),
  (6, '20261003194751', 'sandbox_text_rules_reencode', 'ed1eca24d1efdd0e17578f20b7330973'),
  (7, '20261003195043', 'sandbox_seed', 'b6c04e38855362dc4d6d4cdd2be16a68'),
  (8, '20261003195305', 'sandbox_rpcs', '283c1e59342ece367e58c693f33c029a')
),
recorded as (
  select version, name, md5(array_to_string(statements, '')) as md5,
         length(array_to_string(statements, '')) as chars,
         row_number() over (order by version) as pos
  from supabase_migrations.schema_migrations
),
matched as (
  select e.ord, e.name, e.version as want_version, e.md5 as want_md5,
         count(r.version) as times,
         min(r.version) as version, min(r.md5) as md5, min(r.chars) as chars, min(r.pos) as pos
  from expected e left join recorded r on r.name = e.name
  group by e.ord, e.name, e.version, e.md5
),
checks as (
  select ord, version, name, md5, chars,
         case
           when times = 0 then 'PENDING'
           when times = 1 and md5 = want_md5 and (want_version is null or version = want_version)
                and pos = ord then 'PASS'
           else 'FAIL'
         end as result,
         case
           when times = 0 then 'not recorded'
           when times > 1 then format('recorded %s times', times)
           when want_version is not null and version <> want_version then format('version %s, expected %s', version, want_version)
           when md5 <> want_md5 then format('md5 %s, expected %s', md5, want_md5)
           when pos <> ord then format('position %s, expected %s', pos, ord)
           else 'matches'
         end as detail
  from matched
  union all
  select 100 + pos, version, name, md5, chars, 'FAIL', 'not expected by this repository'
  from recorded r where not exists (select 1 from expected e where e.name = r.name)
)
select ord, version, name, md5, chars, result, detail from checks
union all
select 1000, null, 'overall', null, null,
       case when bool_and(result <> 'FAIL') then 'PASS' else 'FAIL' end,
       format('%s recorded, %s pending', count(*) filter (where result <> 'PENDING'), count(*) filter (where result = 'PENDING'))
from checks
order by 1;
