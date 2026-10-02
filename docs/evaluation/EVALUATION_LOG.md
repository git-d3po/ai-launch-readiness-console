# Evaluation log

Every check, test, probe and measurement run on this project, with the result as observed.

- Entries are grouped by phase and numbered roughly in run order; each entry's date is exact.
- Entries are never edited to improve a result. A later re-run gets a new entry that refers to the
  earlier one.

All times are UTC on 2026-10-02 unless stated. "Live" means the project's hosted Supabase database;
"local" means a Postgres 16 database in the build container, built from this repository's
migrations (`supabase/tests/local_roles.sql` first, for the `anon` and `authenticated` roles).

## How to read an entry

**Fields:**
- **Date:** when the check ran.
- **Commit:** the commit under test. "Pre-`abc1234`" means the working tree that was committed next as `abc1234`.
- **Target:** where it ran, classified as:
  - `local`: a local or disposable database, local files, or local servers
  - `live read-only`: catalog or data reads only
  - `live write`: the check changed live data or schema
  - `build`: a production build
  - `static`: source or history inspection
  - `docs`: external documentation
- **Run:** what was executed.
- **Result:** what was observed. Quotes are verbatim output.
- **Artifact:** where the script lives, if anywhere.
- **Reproducibility:** one of three labels:
  - **Reproducible from repo:** the script or command is committed, and running it repeats the check.
  - **Preserved script:** the exact script is committed under
    [`artifacts/2026-10-02-scratch-harness/`](artifacts/2026-10-02-scratch-harness/README.md), but it
    can't run from the repository as it is.
  - **Recorded only:** the result exists only in the session record; the commands were ad hoc.
- **Limitations:** what the check doesn't show.

## Index

| ID | Time | What | Target | Result | Reproducibility |
|---|---|---|---|---|---|
| EVAL-001 | 09:12 | Anonymous privilege probes on the first schema | local | As designed at the time | Recorded only |
| EVAL-002 | 09:13 | Integrity checks 1 to 5 | local | 5 of 5 PASS, twice | Reproducible from repo |
| EVAL-003 | 09:13 | Mutation test of the integrity checks | local | Checks 1 to 4 FAIL on the mutant | Preserved script |
| EVAL-004 | 09:13 | Mutation test of the readiness rule | local | Target test failed on the mutant | Recorded only |
| EVAL-005 | 09:19 | Check 6, and a check that vanished instead of failing | local | Defect found and fixed; 6 of 6 PASS | Recorded only (fix in repo) |
| EVAL-006 | 09:21 | Live integrity run: connector timeouts | live read-only | Inconclusive cause, working workaround | Recorded only |
| EVAL-007 | 09:31 | Integrity checks 1 to 6 on live | live write | 6 of 6 PASS, data back at seed | Script in repo; production re-runs not allowed |
| EVAL-008 | 09:31 | Live vs local spot parity after the fixes | live read-only | Functions, grants, seed match | Recorded only |
| EVAL-009 | 09:34 | `rls_auto_enable` revoke and automatic-RLS probe | live write | Revoked; automatic RLS still works | Recorded only |
| EVAL-010 | 09:45 | App shell in Chromium | local | All routes passed | Preserved script |
| EVAL-011 | 09:53 | Launches list end to end (local PostgREST 14.18) | local | All states passed | Preserved script |
| EVAL-012 | 09:54 | Live launches query as `anon` | live read-only | 16 required, 6 passed | Recorded only |
| EVAL-013 | 10:03 | Visual system measurement | local | Minimum contrast 5.58:1 | Preserved script |
| EVAL-014 | 10:10 | Launch overview end to end | local | All checks passed after one fix | Preserved script |
| EVAL-015 | 09:13 to 10:12 | Unit tests, typecheck, build per commit | local | 4, then 8, then 11 tests pass | Reproducible from repo |
| EVAL-016 | 10:26 | Audit 1: live catalog and advisors | live read-only | Write surface mapped | Recorded only |
| EVAL-017 | 10:28 | Audit 1: anonymous probes P1 to P6 | local | Forgery, erasure, unbounded writes confirmed | Recorded only |
| EVAL-018 | 10:28 | Lovable workspace inventory | live read-only | 0 projects | Recorded only |
| EVAL-019 | 10:28, 10:46 | Production bundle inspection | build | No secrets, no sourcemaps, no inline scripts | Recorded only |
| EVAL-020 | 10:28, 10:47 | Supply chain | static | 0 advisories | Reproducible from repo (`npm audit`) |
| EVAL-021 | 10:42 | Phase 2B baseline | static, live read-only | `cb27437`, clean | Recorded only |
| EVAL-022 | 10:43 | Migration parity, live vs repo | live read-only | Byte-identical | Recorded only (query below) |
| EVAL-023 | 10:44 | 12-part schema and seed fingerprint, live vs local | live read-only, local | 12 of 12 identical | Local half reproducible (EVAL-034) |
| EVAL-024 | 10:45 | Live forensics and Auth state | live read-only | No `anon` or `authenticated` writes recorded | Recorded only (point in time) |
| EVAL-025 | 10:45, 10:50 | Default privileges and ownership | live read-only | Facts behind SEC-006 | Recorded only |
| EVAL-026 | 10:45 | Supabase documentation lookups | docs | 500 MB read-only rule; 30/hour/IP | Recorded only |
| EVAL-027 | 10:46 | Client source review | static | No dangerous sinks; visitor text rendered | Recorded only |
| EVAL-028 | 10:47 | Git history secret scan | static | Clean | Recorded only |
| EVAL-029 | 10:47 | C1 re-check and interim boundary dry run | local | Forgery reproduced; M-1 closes it | Recorded only |
| EVAL-030 | 10:48 | Integrity under M-1; URL and text rule tables | local | 6 of 6 PASS; rule tables as specified | Recorded only |
| EVAL-031 | 10:48 | Default-privilege statement simulation | local | Works; MAINTAIN untested | Recorded only |
| EVAL-032 | 10:53 | Incompressible bulk insert as `anon` | local | 6,000 rows, 13 MB, 0.61 s | Recorded only |
| EVAL-033 | 11:34 | Unit tests, typecheck, build | local | 11 of 11 pass; clean; built | Reproducible from repo |
| EVAL-034 | 11:22 | Committed fingerprint on a fresh local build, read-only | local | 12 of 12 match EVAL-023 | Reproducible from repo |
| EVAL-035 | 11:35 | Secret and hygiene scan of this commit | static | No secrets, no env files | Recorded only |
| EVAL-036 | 11:48 | Stage 1: live read-only inspection before writing SQL | live read-only | Signatures, policies, default ACL rows, ICU locale | Recorded only |
| EVAL-037 | 11:49 | Stage 1: Supabase docs on the GitHub integration's deploys | docs | Deploys from `main` on all plans, no branching needed | Recorded only |
| EVAL-038 | 11:50 | Stage 1: local Postgres 17 and Supabase CLI setup; migration file created | local | PG 17.10 (ICU); CLI 2.119.0 | Recorded only |
| EVAL-039 | 11:53 | Stage 1: local PG17 mirror vs live | local | Default ACL matches; fingerprint 12 of 12 | Reproducible from repo |
| EVAL-040 | 11:54 | Stage 1: default-privilege probe before and after the migration (PG17) | local | Tables fixed; function default exposed (SEC-007) | Partly reproducible (check 21) |
| EVAL-041 | 11:56 | Stage 1: catalog test on the Stage 1 and pre-Stage-1 builds | local | 17 of 17; pre-Stage-1 13 of 17 | Reproducible from repo |
| EVAL-042 | 11:58 | Stage 1: mutation test of the catalog test | local | 16 checks flip; check 3 covered by EVAL-041 | Recorded only |
| EVAL-043 | 11:58 | Stage 1: behavior test on both builds | local | 24 of 24; pre-Stage-1 16 of 24 | Reproducible from repo |
| EVAL-044 | 11:58 | Stage 1: integrity suite on the local Stage 1 build | local | 6 of 6 PASS, seed intact | Reproducible from repo |
| EVAL-045 | 11:58 | Stage 1: 12-part fingerprint of the Stage 1 build | local | 4 parts changed as intended; seed_data unchanged | Reproducible from repo |
| EVAL-046 | 11:59 | Stage 1: local PostgREST 14.18 HTTP checks | local | Reads 200; writes 401/403 with 42501 | Recorded only |
| EVAL-047 | 11:59 | Stage 1: unit tests, typecheck, build | local | 11 of 11; clean; built | Reproducible from repo |
| EVAL-048 | 12:00 | Stage 1: catalog test against live, before any migration | live read-only | 13 of 17; fails 3, 9, 14, 15 | Reproducible from repo |
| EVAL-049 | 12:00 | Stage 1: Supabase advisors | live read-only | 0028/0029 still listed; performance INFO only | Recorded only |
| EVAL-050 | 12:09 | Stage 1: final replay of the committed files; secret and hygiene scan | local, static | 17/17, 24/24, 12/12, 6/6; no secrets | Replay reproducible; scan recorded only |

---

## Phase 1: schema, seed and checks

### EVAL-001: Anonymous privilege probes on the first schema
- **Date:** about 09:12
- **Commit:** pre-`03a4666`
- **Target:** local
- **Run:** ad hoc SQL as `anon` against the first schema.
- **Result, as reported then:**
  - `anon` could read every table and the view, insert evidence, and call both functions. That was the intended Phase 1 design.
  - It was refused when it tried to:
    - update or delete evidence
    - delete gates
    - insert or update decisions
    - set `id` or `created_at`
    - truncate
  - An over-length title was rejected.
- **Artifact:** none.
- **Reproducibility:** recorded only. Behavior test B-1 specifies the denials.
- **Limitations:**
  - The detailed output wasn't kept; this summary comes from the phase report.
  - The surface marked "intended" here is the one later found exploitable (SEC-001, SEC-002).

### EVAL-002: Integrity checks 1 to 5
- **Date:** about 09:13, re-run about 09:14 on the same database
- **Commit:** pre-`03a4666`
- **Target:** local. Destructive by design: the script ends by calling `reset_demo_data()`.
- **Run:** `supabase/tests/integrity_checks.sql`, the 5-check version in `03a4666`.
- **Result:** 5 of 5 PASS on both runs.
  ```
  1 | Passed with zero evidence is rejected         | PASS | A gate cannot be Passed without at least one evidence item
  2 | Waived without a waiver rationale is rejected | PASS | missing: A waiver rationale is required to waive a gate | blank: A waiver rationale is required to waive a gate
  3 | A status change inserts one Decision          | PASS | decisions 4 -> 5; new row: Production monitoring and alerting defined: Not started → In progress
  4 | anon cannot update gates.status directly      | PASS | permission denied for table gates
  5 | reset_demo_data restores the seed             | PASS | 16 gates, 6 of 16 passed, 10 blocking, 4 decisions, monitoring gate Not started
  ```
- **Artifact:** [`supabase/tests/integrity_checks.sql`](../../supabase/tests/integrity_checks.sql). It now has 6 checks; the 5-check version is in history at `03a4666`.
- **Reproducibility:** reproducible from repo, against a local database only.
- **Limitations:** not re-run in this documentation commit, which excludes destructive tests.

### EVAL-003: Mutation test of the integrity checks
- **Date:** about 09:13
- **Commit:** pre-`03a4666`
- **Target:** local
- **Run:** applied `mutant.sql`, then ran the checks. The mutant:
  - replaces `set_gate_status` with a copy that skips the evidence and waiver checks
  - drops `gates_waived_requires_rationale`
  - grants `anon` UPDATE on gates, with an UPDATE policy
- **Result:**
  ```
  1 | Passed with zero evidence is rejected         | FAIL | No error raised
  2 | Waived without a waiver rationale is rejected | FAIL | missing: No error raised | blank: Gate is already Waived
  3 | A status change inserts one Decision          | FAIL | decisions 6 -> 7; new row: Production monitoring and alerting defined: Passed → In progress
  4 | anon cannot update gates.status directly      | FAIL | Update was allowed
  5 | reset_demo_data restores the seed             | PASS | 16 gates, 6 of 16 passed, 10 blocking, 4 decisions, monitoring gate Not started
  ```
  - Checks 1, 2 and 4 each detect the mutation they target.
  - Check 3 failed as a knock-on: under the mutant, check 1 had already passed the gate.
- **Artifact:** [`artifacts/2026-10-02-scratch-harness/mutant.sql`](artifacts/2026-10-02-scratch-harness/mutant.sql)
- **Reproducibility:** preserved script.
- **Limitations:** the mutant targets the `set_gate_status` body from `03a4666` and hasn't been re-validated against the current schema.

### EVAL-004: Mutation test of the readiness rule
- **Date:** about 09:13
- **Commit:** pre-`03a4666`
- **Target:** local (Vitest)
- **Run:** changed `isPassed` in `src/domain/readiness.ts` to `return gate.status === 'Passed';`, which drops the evidence requirement. Ran the tests, then restored the original.
- **Result:**
  - Mutant: `× never counts a Passed gate with no evidence as passed`, `Tests 1 failed | 3 passed (4)`.
  - Restored: `Tests 4 passed (4)`.
- **Artifact:** the test is in [`src/domain/readiness.test.ts`](../../src/domain/readiness.test.ts); the mutation was an ad hoc edit.
- **Reproducibility:** the test is reproducible from repo; the mutation run is recorded only.

### EVAL-005: Check 6, and a check that vanished instead of failing
- **Date:** about 09:19 to 09:20
- **Commit:** pre-`9c65e6c`
- **Target:** local
- **Run:** added check 6 ("Waiver text survives on the decision after the gate leaves Waived"). Ran it on the real schema, and on a mutant that skipped copying the waiver text to the decision row.
- **Result:**
  - **Real schema:** 6 of 6 PASS.
  - **Mutant, before the fix:**
    - The check's PASS/FAIL expression evaluated to NULL.
    - Inserting NULL into the NOT NULL `passed` column raised: `null value in column "passed" of relation "check_results" violates not-null constraint`.
    - psql continued past the error, and the final results table listed only checks 1 to 5. **The failing check was missing from the results instead of showing FAIL.**
  - **Fix:** the check expressions for checks 3 and 6 were wrapped in `coalesce(..., false)`, and the script header now states that a NULL comparison counts as FAIL.
  - **After the fix:** the mutant gives `6 | ... | FAIL`, and the real schema gives 6 of 6 PASS.
- **Artifact:** the fix is in [`supabase/tests/integrity_checks.sql`](../../supabase/tests/integrity_checks.sql) (the `coalesce(..., false)` around checks 3 and 6). The check 6 mutation was an inline edit and wasn't kept.
- **Reproducibility:** the fixed suite is reproducible from repo; the mutation run is recorded only.
- **Lesson:** a test harness must make "could not evaluate" impossible to miss. A check that disappears reads like a pass.

### EVAL-006: Live integrity run: connector timeouts (inconclusive)
- **Date:** 09:21 to 09:30
- **Commit:** pre-`9c65e6c`
- **Target:** live, through the Supabase connector's `execute_sql` as `postgres`.
- **Run:** the integrity script, then a bisection.
- **Result:**
  - The full script timed out after 60 s on two attempts, and check 1 alone did the same.
  - Immediately afterwards, `pg_stat_activity` showed no active or blocked queries. Data was unchanged at 16 gates and 4 decisions.
  - **Calls that returned at once:**
    - a trivial `DO` block
    - a temp table with an insert and a select
    - a `set_gate_status` call that had to be rejected (`P0001: A gate cannot be Passed without at least one evidence item`)
  - **Calls that timed out:**
    - `drop table if exists pg_temp.no_such_probe_table; select ...`
    - the same statement with `set client_min_messages = warning` first, which **disproved the first hypothesis** (that a NOTICE from `DROP ... IF EXISTS` caused the hang)
  - **Workaround:** the script was rewritten with no `DROP`, using `create temp table if not exists` plus upserts. It then ran (EVAL-007).
- **Reproducibility:** recorded only.
- **Limitations:** the root cause is **not confirmed**. Every observation fits the connector holding statements that contain `DROP` for a confirmation, but the tool never reported that. It stays an inference.

### EVAL-007: Integrity checks 1 to 6 on live
- **Date:** about 09:31
- **Commit:** pre-`9c65e6c`
- **Target:** live write. Checks 3 and 6 change a gate; check 5 truncates and re-seeds through `reset_demo_data()`.
- **Run:** the no-`DROP` integrity script through the connector.
- **Result:**
  ```
  1 | Passed with zero evidence is rejected                             | PASS | A gate cannot be Passed without at least one evidence item
  2 | Waived without a waiver rationale is rejected                     | PASS | missing: A waiver rationale is required to waive a gate | blank: A waiver rationale is required to waive a gate
  3 | A status change inserts one Decision                              | PASS | decisions 4 -> 5; new row: Production monitoring and alerting defined: Not started → In progress
  4 | anon cannot update gates.status directly                          | PASS | permission denied for table gates
  5 | reset_demo_data restores the seed                                 | PASS | 16 gates, 6 of 16 passed, 10 blocking, 4 decisions, monitoring gate Not started
  6 | Waiver text survives on the decision after the gate leaves Waived | PASS | blank rejected: A waiver rationale is required to waive a gate | waive decision waiver_rationale: Assist is not scheduled; agent training is deferred until it is. | gate now In progress, gates.waiver_rationale NULL
  ```
  The data ended at the seed.
- **Artifact:** [`supabase/tests/integrity_checks.sql`](../../supabase/tests/integrity_checks.sql)
- **Reproducibility:** the script is in the repo, but it **must not be re-run against production**. It's destructive (N3), and Phase 2B invariant I19 limits destructive tests to local or ephemeral databases.
- **Limitations:**
  - This destructive production run predates I19.
  - It ran as the connector's `postgres` role, not through the API roles. Only check 4 runs as `anon`, through `set local role`.

### EVAL-008: Live vs local spot parity after the fixes
- **Date:** about 09:31
- **Commit:** pre-`9c65e6c`
- **Target:** live read-only, and local
- **Result:**
  - **Function definitions:** `md5(pg_get_functiondef)` was equal on both sides: `set_gate_status` `9ef1ded488982f9783f027400fa8096f`, `reset_demo_data` `1321a2b2c70bcb076f2d67b1f5f6e81e`.
  - **`anon` privileges:**
    - SELECT on the 6 tables and the view
    - column INSERT on `evidence.gate_id, type, title, summary, source, recorded_on`
    - EXECUTE on `reset_demo_data` and `set_gate_status`
  - **Seed:** 16 gates, 6 passed, 4 decisions; the evaluation evidence has type `Evaluation result`; `decisions.waiver_rationale` exists.
  - **Live migrations:** `20261002092043`, `20261002092141`.
  - **Security advisor:** lint 0028 (`anon` can execute a SECURITY DEFINER function) with 3 findings: `reset_demo_data`, `rls_auto_enable`, `set_gate_status`.
- **Reproducibility:** recorded only. Superseded by EVAL-022 and EVAL-023.

### EVAL-009: `rls_auto_enable` revoke and automatic-RLS probe
- **Date:** 09:34 to 09:44
- **Commit:** pre-`ddadd36`
- **Target:** live write: one migration, one rolled-back DDL probe, and catalog reads.
- **Result:**
  - **Before:** `rls_auto_enable()` had `acl = null`, and `anon_can_execute` and `authenticated_can_execute` were both true. Access came through the default PUBLIC grant.
  - **Change:** migration `20261002093521_revoke_rls_auto_enable_execute` was applied.
  - **After:** `rls_auto_enable()` was false for both roles; `set_gate_status` and `reset_demo_data` stayed true for both.
  - **Probe:** `begin; create table public.rls_auto_enable_probe (x int); select relrowsecurity ...; rollback;` returned `rls_enabled_by_trigger = true`. Afterwards `to_regclass('public.rls_auto_enable_probe')` was null, with 16 gates and 6 passed.
- **Reproducibility:** recorded only. Future catalog test C-5 covers the grant part.
- **Limitations:**
  - The probe was a rolled-back write on production. It created no sequence, so it left no trace.
  - Phase 2B later adopted a stricter rule: no live writes at all.

### EVAL-010: App shell in Chromium
- **Date:** 09:45 to 09:46
- **Commit:** pre-`ddadd36`
- **Target:** local (`vite preview`; no data layer yet)
- **Run:** `check.mjs`: 8 routes × light and dark × 390 px and 1440 px.
- **Result:**
  - Every route had zero page-level horizontal overflow, an `h1`, the footer text, Reset disabled, and no console errors.
  - Tab order: Skip to content > product name > Launches > About. Enter on About navigated to it.
  - Screenshots were reviewed by eye.
- **Artifact:** [`check.mjs`](artifacts/2026-10-02-scratch-harness/check.mjs)
- **Reproducibility:** preserved script.

### EVAL-011: Launches list end to end (local PostgREST 14.18)
- **Date:** 09:53 to 09:55
- **Commit:** pre-`e8e71ef`
- **Target:** local
  - **Stack:**
    - a seeded copy built from the migrations
    - PostgREST 14.18, the same version the live types report
    - `proxy.mjs`
    - a test build that used a throwaway local key signed at run time
  - The script changes the local database.
- **Run:** `e2e.mjs`
- **Result:**
  - **Seeded row**, at 390 and 1440 px in light and dark: `Halcyon Support Copilot | AI Program Lead | Target unset | Shadow · Not started | 6 of 16 passed | 10 | Not ready`. No page overflow; at 390 px the table scrolls inside its container.
  - **Navigation:** the row link opens `/launches/1`.
  - **Numbers follow the data:**
    - After one more gate passed through `set_gate_status`: 7 of 16 passed, 9 blockers.
    - After another was waived: `7 of 16 passed · 1 waived`, 8.
    - After a reset: back to the seed.
  - **States:**
    - Loading shows "Loading launches…".
    - An API error shows "permission denied for view launch_current_stage" and no rows.
    - A network failure shows "Failed to fetch" and no rows.
    - Empty shows "No launches yet.".
    - Missing configuration shows an error naming both variables.
- **Artifact:** [`e2e.mjs`](artifacts/2026-10-02-scratch-harness/e2e.mjs) and [`proxy.mjs`](artifacts/2026-10-02-scratch-harness/proxy.mjs)
- **Reproducibility:** preserved script.
- **Limitations:**
  - It ran against the local copy, not live (DR-011).
  - The first run failed on a script error, a mixed CSS and text selector. It was fixed and re-run.

### EVAL-012: Live launches query as `anon`
- **Date:** about 09:54
- **Commit:** pre-`e8e71ef`
- **Target:** live read-only: `begin; set local role anon; <aggregate equivalent of the list query>; rollback;`
- **Result:** `Halcyon Support Copilot`, 16 required gates, 6 passed with evidence, 0 waived, current stage `Shadow · Not started`, `target_date` null.
- **Reproducibility:** recorded only.
- **Limitations:** this is the SQL equivalent of the client query, run as `anon` through `set local role`. It isn't the client and doesn't go through the Data API.

### EVAL-013: Visual system measurement
- **Date:** 10:03 to 10:05
- **Commit:** pre-`1572708`
- **Target:** local, with the same stack as EVAL-011
- **Run:** `visual.mjs`. Contrast was computed in the page by converting colors to sRGB on a canvas and applying the WCAG formula.
- **Result:**
  - **Color and type:**
    - Tokens resolve to the stone values.
    - Every measured text pair passes WCAG AA; the lowest is **5.58:1** (accent on accent-subtle).
    - Body text is 13 px with tabular numbers, in the system font.
  - **Layout:** the title and chip sit on one row, with no page overflow.
  - **Motion:** the chip fades in over 150 ms, and with reduced motion there's no animation.
  - **The label still follows the data:** 7 of 16 and 9 after a gate passed, then 6 of 16 and 10 after a reset.
  - **Investigation:** dark-mode chips looked dim in one screenshot, but measured chip contrast was 8.42:1. A re-shoot after the fade (`shot.mjs`, not kept) showed full strength, so it was screenshot timing, not a defect.
- **Artifact:** [`visual.mjs`](artifacts/2026-10-02-scratch-harness/visual.mjs)
- **Reproducibility:** preserved script.
- **Limitations:** the first run rendered no rows because local Postgres had stopped. Postgres was restarted and the script re-run.

### EVAL-014: Launch overview end to end
- **Date:** 10:10 to 10:12
- **Commit:** pre-`cb27437`
- **Target:** local, with the same stack as EVAL-011
- **Run:** `overview.mjs`
- **Result:**
  - **Seeded launch:**
    - Readiness: Not ready, "6 of 16 passed", with 10 blocking gates listed in category order.
    - Gates: 9 categories, 16 gate rows.
    - Risks: 2 open High-impact risks.
    - Stages: Shadow (marked Current), Assist and Partial automation, all Not started.
    - Decisions: 4.
  - **Numbers follow the data:**
    - Waiving one blocker gave 9 and "6 of 16 passed · 1 waived".
    - Waiving all remaining blockers gave Ready and "Nothing blocks this launch.".
    - A reset brought it back to 10.
  - **Not found:** `/launches/999` and `/launches/abc` show "Page not found".
  - **States:**
    - Loading shows "Loading launch…".
    - An API error ("permission denied for table decisions") shows the message and no sections.
    - An empty launch shows empty states in every section and no Ready chip.
  - **Layout:** no page overflow and no console errors at 390 and 1440 px, in light and dark.
  - **Defect found:** an empty launch showed "All stages completed". The overview now shows "No rollout stages"; the launches list still has the ambiguity (deferred).
- **Artifact:** [`overview.mjs`](artifacts/2026-10-02-scratch-harness/overview.mjs)
- **Reproducibility:** preserved script.

### EVAL-015: Unit tests, typecheck and build per commit
- **Result:**

  | Commit | Unit tests | Typecheck | Build |
  |---|---|---|---|
  | `03a4666` | 4 pass | Clean | No build yet |
  | `ddadd36` | 4 pass | Clean | Built |
  | `e8e71ef` | 8 pass (4 new) | Clean | Built |
  | `1572708` | Pass | Clean | Built |
  | `cb27437` | 11 pass (3 new) | Clean | Built |

- **Reproducibility:** reproducible from repo with `npm test`, `npm run typecheck` and `npm run build`. Re-run in EVAL-033.

## Audit 1: security, authorization and data boundary (read-only)

### EVAL-016: Live catalog and advisors
- **Date:** 10:26 to 10:27
- **Commit:** `cb27437`
- **Target:** live read-only
- **Result:**
  - **RLS and policies:**
    - RLS is enabled on all 6 tables.
    - Policies: `"Public read"` (SELECT, `anon` and `authenticated`, `using (true)`) on each table, and `"Public append"` (INSERT on evidence, `with check (true)`). There are no UPDATE or DELETE policies.
  - **Grants:** `anon` and `authenticated` hold SELECT plus column INSERT on 6 evidence columns, and no sequence privileges.
  - **View:** `launch_current_stage` has `security_invoker=true`.
  - **Functions:** both are owned by `postgres` (not a superuser), are SECURITY DEFINER, and use `search_path=""`.
  - **Constraints:** `evidence.source` has only a length check.
  - **Platform:**
    - No `pg_graphql`, no Realtime publication, and no storage buckets.
    - The `anon` statement timeout is 3 s.
  - **Security advisor:** lints 0028 (`anon`) and 0029 (`authenticated`), each with 2 findings: `reset_demo_data` and `set_gate_status`.
- **Reproducibility:** recorded only. Future catalog tests C-1 to C-8 cover it.

### EVAL-017: Anonymous probes P1 to P6
- **Date:** 10:28
- **Commit:** `cb27437`
- **Target:** local: the earlier local test copy, as `anon`, inside rolled-back transactions.
- **Result:**
  - **P1 (forgery):** after fabricated "Sign-off" evidence, `anon` passed 10 gates through `set_gate_status`, and readiness became `16 of 16 passed`.
  - **P2 (reset):** an `anon` call to `reset_demo_data()` took decisions from 5 to 4 and evidence from 11 to 10, erasing the visitor rows.
  - **P3 (bulk insert):** one `anon` INSERT statement left 20,010 evidence rows and a 2,792 kB table. The text was repetitive, so it compressed.
  - **P4 (status toggles):** 500 toggles left 504 decisions.
  - **P5 (dangerous input):** one `anon` insert stored a single evidence row containing:
    - the title `Result <img src=x onerror=alert(1)>`
    - a summary with a right-to-left override character (U+202E)
    - the source `javascript:alert(document.domain)`
    - `recorded_on` 9999-12-31

    An `anon` waive whose rationale was `'); drop table public.gates; --` succeeded and was stored as inert text; 16 gates were still present. Audit 1 noted that waiving every blocker needs no evidence, so it would reach Ready the same way. That loop wasn't run as `anon`.
  - **P6 (denied paths):**
    - Denied with permission errors:
      - direct `gates.status` update
      - evidence update or delete
      - inserts into decisions, launches and risks
      - TRUNCATE
      - CREATE in `public`
    - Rejected by `set_gate_status`:
      - a missing waiver
      - Passed without evidence
      - an over-length rationale (CHECK)
      - a nonexistent gate
- **Reproducibility:** recorded only. Future tests B-1, B-3 and B-4 cover it.
- **Limitations:**
  - The local copy hadn't yet been proven identical to live; that proof came in EVAL-022 and EVAL-023, and EVAL-029 repeated P1 on a proven copy.
  - P3's rows compressed; EVAL-032 re-measured with incompressible rows.

### EVAL-018: Lovable workspace inventory
- **Date:** 10:28
- **Target:** live read-only (Lovable connector, listing projects)
- **Result:** the workspace has 0 projects.
- **Reproducibility:** recorded only.

### EVAL-019: Production bundle inspection
- **Date:** 10:28 (Audit 1) and 10:46 (Phase 2B)
- **Commit:** `cb27437`
- **Target:** build, made in the scratch directory with placeholder values
- **Result:**
  - **Audit 1:**
    - Sourcemaps: 0.
    - The only env-like strings are the two `VITE_` names, the placeholder values, and one `sb_secret` substring. That substring is supabase-js code that recognizes key formats, not a key.
    - No CSP or security headers in `index.html`.
  - **Phase 2B:**
    - The built `index.html` has no inline `<script>` or `<style>`.
    - No `eval`, `new Function` or string timers.
    - The embedded hosts are only `localhost`, `w3.org`, `github.com`, `react.dev`, `reactrouter.com` and the placeholder `*.supabase.co`.
    - `ws://` and `wss://` strings come from the Realtime client, which never connects.
- **Reproducibility:** recorded only. The commands were ad hoc; future client test "Secrets" covers it.
- **Limitations:** placeholder values, not the real ones; nothing is deployed.

### EVAL-020: Supply chain
- **Date:** 10:28 (Audit 1) and 10:47 (Phase 2B)
- **Commit:** `cb27437`
- **Target:** static
- **Result:**
  - **`npm audit`:** 0 advisories, in both the full and the production trees.
  - **Lockfile:** version 3, and the only lockfile is `package-lock.json`.
  - **Dependencies:** 4 runtime dependencies (15 packages in the production tree), 135 packages in total. All resolve from `registry.npmjs.org` with integrity hashes.
  - **Install-time scripts:**
    - Audit 1's query found none.
    - Phase 2B's broader check:
      - The lockfile flags only `fsevents` (optional, macOS only) with an install script.
      - Four dev packages declare `prepare` scripts, which npm doesn't run for registry installs: `lightningcss@1.32.0`, `lightningcss@1.33.0`, `enhanced-resolve@5.26.0` and `tinyexec@1.3.1`.
- **Reproducibility:** `npm audit` is reproducible from repo. Its result changes as advisories are published.

## Phase 2B: reconciliation (read-only)

### EVAL-021: Baseline
- **Date:** 10:42 to 10:43
- **Target:** static, and live read-only
- **Result:**
  - **Repository:**
    - Branch `claude/phase1-schema` at `cb27437b03bf83557adf1f9d4775d36b5ebdeabf`, with a clean tree, 0 ahead and 0 behind upstream.
    - Remote `main` is at `0e737dc`, a README title change made in the GitHub web UI at 09:02.
    - No pull requests; the repository is private.
  - **Supabase project:**
    - Postgres 17.11, `ACTIVE_HEALTHY`, no preview branches.
    - Three migrations applied.
    - Identity details are in [the reconciliation record](../security/2026-10-02-audit-2b-reconcile.md#3-baseline).
- **Reproducibility:** recorded only.

### EVAL-022: Migration parity, live vs repo
- **Date:** 10:43
- **Target:** live read-only, and static
- **Run:**
  - **Live:** `select version, name, md5(array_to_string(statements, '')), length(array_to_string(statements, '')) from supabase_migrations.schema_migrations`
  - **Repo:** `md5sum supabase/migrations/*.sql`
- **Result:** byte-identical.

  | Version | Live md5 | Repo file md5 | Characters |
  |---|---|---|---|
  | `20261002092043` (`phase1_schema`) | `2d4cf41fe73b0d2801dd51d69ece8e1b` | Same | 11486 |
  | `20261002092141` (`demo_seed`) | `d3dafe0c87fc0af20d00d518e96f0380` | Same | 14673 |
  | `20261002093521` (`revoke_rls_auto_enable_execute`) | `4842aef718ae632952d694863d244b8c` | Same | 569 |

- **Reproducibility:** recorded only. The query above repeats it by hand; catalog test C-11 specifies it as a script.

### EVAL-023: 12-part schema and seed fingerprint, live vs local
- **Date:** 10:44
- **Target:** live read-only (connector), and local (a fresh database built from the repo migrations on Postgres 16.14)
- **Run:** the fingerprint query, now committed as [`supabase/tests/fingerprint.sql`](../../supabase/tests/fingerprint.sql) with the query unchanged. The file header documents what each part covers.
- **Result:** **12 of 12 identical:**

  | Part | md5 (live = local) |
  |---|---|
  | column_write_grants | `f892dbd0dd4af010434c7fb766a339ef` |
  | columns | `36e6440fda38405090245657268e2d55` |
  | constraints | `d98461ad6141ad7b22d0941900652025` |
  | enums | `be89a9eeab6877272c2b0dbe9820cc78` |
  | functions | `824d7bd130a816b7a0052ffb5c1eed29` |
  | indexes | `1a0df3c7267af392eb3652304a48695a` |
  | policies | `ae0019a1545b246dafbc7afdea2570a0` |
  | rls+owners | `416b404f44bc87e538217610f1a1afb1` |
  | seed_data | `dc85e31b82116a9fa79adaac8399aa90` |
  | table_grants | `81ed597a2d217bdefda59babdc03008a` |
  | user_triggers | `334c4a4c42fdb79d7ebc3e73b517e6f8` |
  | views | `6c60d69e83dedcece4f5b8c698c2ba7e` |

- **Reproducibility:**
  - The local half was reproduced from the committed file in this commit (EVAL-034).
  - The live half is recorded only. It was not re-run here, because this commit doesn't touch production.
- **Limitations:**
  - The fingerprint doesn't cover default privileges, other schemas, role memberships or settings; see the file header.
  - On live, `rls_auto_enable()` is excluded because it's platform-created.

### EVAL-024: Live forensics and Auth state
- **Date:** 10:45
- **Target:** live read-only
- **Result:**
  - **`pg_stat_statements`:** every recorded statement that involved `set_gate_status`, `reset_demo_data` or evidence inserts ran as `postgres` (migrations and the integrity runs). None ran as `anon` or `authenticated`.
  - **Auth:**
    - `auth.users`: 0, of which anonymous: 0.
    - No identity providers in use.
  - **Roles:**
    - `authenticator` is a member of `anon`, `authenticated` and `service_role`.
    - `anon` and `authenticated` are members of nothing.
    - `anon` has TEMP on the database but not CREATE.
    - PUBLIC has no CREATE on schema `public`.
  - **Sequences:** `decisions 4, evidence 10, gates 16, launches 1, risks 6, rollout_stages 3`. These match the seed.
- **Reproducibility:** recorded only; it's a point-in-time reading.
- **Limitations:** statement statistics cover only their retention window. This shows no **recorded** exploitation; it doesn't prove there was none.

### EVAL-025: Default privileges and ownership
- **Date:** 10:45 and 10:50
- **Target:** live read-only
- **Result:**
  - **`pg_default_acl` for objects that `postgres` creates:**
    - Tables and views: `anon` and `authenticated` get `MAINTAIN, REFERENCES, TRIGGER, TRUNCATE`. `service_role` gets the same, and `postgres` gets everything.
    - Functions: EXECUTE for `postgres` only.
    - Sequences: `postgres` only.
  - **Objects that `supabase_admin` creates:** `anon` and `authenticated` get every privilege on tables and views, `SELECT, UPDATE, USAGE` on sequences, and EXECUTE on functions.
  - **Membership and ownership:**
    - `postgres` isn't a member of `supabase_admin` and can't use it.
    - 0 relations and 0 functions in `public` are owned by anyone other than `postgres`.
  - **Server version:** 17.11.
- **Reproducibility:** recorded only. Future catalog test C-9 covers it.

### EVAL-026: Supabase documentation lookups
- **Date:** 10:45 to 10:46
- **Target:** docs (Supabase documentation search)
- **Result:**
  - **Free plan:** the project enters read-only mode when database size exceeds 500 MB. In that mode clients get errors such as `cannot execute INSERT in a read-only transaction`. Deleting data requires the owner to override read-only mode manually in a session.
  - **Auth rate limits:** anonymous sign-ins are limited to 30 requests per hour per IP address.
- **Reproducibility:** recorded only.
- **Limitations:** this is documentation as of this date; it wasn't tested against this project.

### EVAL-027: Client source review
- **Date:** 10:46
- **Commit:** `cb27437`
- **Target:** static
- **Result:**
  - **No dangerous sinks:**
    - No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` or `window.open`, and no browser storage or cookies.
    - The only `href`s are `#main` and internal routes built from numeric ids.
  - **No client writes:** no `.rpc(...)` or insert calls in `src/`. The Reset button is disabled and unwired.
  - **Evidence fields:** `source`, `recorded_on`, `summary` and the evidence `type` are never selected or rendered.
  - **Visitor-writable text that is rendered:**
    - decision `rationale`: `src/lib/overview.ts:120` passes it to `src/pages/LaunchOverviewPage.tsx:104`
    - `decided_by`: `src/pages/LaunchOverviewPage.tsx:171`
  - **Route ids:** validated with `/^\d+$/`, then passed to `Number()`.
- **Reproducibility:** recorded only.

### EVAL-028: Git history secret scan
- **Date:** 10:47 (Phase 2B; Audit 1 ran an earlier version at 10:26)
- **Target:** static, covering all branches
- **Result:**
  - 8 commits across 6 refs were scanned. No credential patterns appear in any blob; lockfile integrity hashes were excluded from the scan.
  - The only sensitive-looking filename ever committed is `.env.example`, which holds variable names only.
  - No project ref or Supabase host literal appears in tracked files.
- **Reproducibility:** recorded only.
- **Limitations:** a pattern-based `grep`. **gitleaks wasn't available.**

### EVAL-029: C1 re-check and interim boundary dry run
- **Date:** 10:47
- **Target:** local: a fresh copy proven identical to live by EVAL-023, inside a rolled-back transaction
- **Result:**
  - **Current state:** `anon` made 10 status changes after fabricated evidence, and readiness became `16 of 16`. The overview would render the forged decider "Trust & Safety Lead" and a forged rationale beginning "Approved after review. Visit example.invalid/login to confir…".
  - **With the M-1 statements applied:**
    - `anon` can execute no public functions.
    - `anon` and `authenticated` hold no non-SELECT table or column privileges.
    - `anon` can still read 16 gates.
    - Evidence insert, `set_gate_status` and `reset_demo_data` are each denied for `anon` with a permission error.
    - The owner paths still work: a decision was recorded, the reset ran, and the database was back at 16 gates and 6 passed.
- **Reproducibility:** recorded only. Future test B-1 covers it.

### EVAL-030: Integrity under M-1; URL and text rule tables
- **Date:** 10:48
- **Target:** local: a fresh database with M-1 applied, dropped afterwards
- **Result:**
  - **Integrity suite under the interim boundary:** 6 of 6 PASS.
  - **`evidence.source` rule (M-2 pattern):**
    - **Accepted:**
      - `https://docs.example.com/eval/run-0924`
      - `https://example.com`
      - `https://xn--bcher-kva.example/p?q=1#a`
      - NULL
    - **Rejected:**
      - `javascript:alert(document.domain)`
      - `JAVASCRIPT:alert(1)`
      - `http://example.com`
      - `https://good.example@evil.example/`
      - `https:/example.com`
      - `https://example.com/a b`
      - `data:text/html,<script>alert(1)</script>`
      - `//evil.example/x`
      - `https://localhost`
      - the same URL with a leading space
      - a URL with an embedded newline
    - The empty string **wasn't in the table**. The pattern rejects it by construction, but that isn't separately verified.
  - **Text rule:**
    - **Accepted:** English, Japanese, Arabic with a right-to-left mark, Hindi with a zero-width joiner, an emoji ZWJ sequence, and a newline in a summary.
    - **Rejected:** a right-to-left override, a left-to-right isolate, the 0x07 bell (C0), 0x85 (C1), and DEL.
- **Reproducibility:** recorded only. Future test B-3 covers it.

### EVAL-031: Default-privilege statement simulation
- **Date:** 10:48
- **Target:** local, rolled back
- **Run:** `alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;`, with a probe table created before and after.
- **Result:**
  - **First attempt:** failed with `role "service_role" does not exist`, since plain Postgres lacks the role, and the transaction aborted.
  - **Re-run** with a temporary `service_role`:
    - Before: `anon` on a new table had `TRUNCATE,REFERENCES,TRIGGER`.
    - After: `anon` had none, `authenticated` had none, and `service_role` kept TRUNCATE.
    - Existing tables were unaffected (`anon` SELECT on gates was still true).
    - The rollback left no probe tables and no `service_role`.
- **Reproducibility:** recorded only. Future tests B-2 and C-9 cover it.
- **Limitations:** Postgres 16 has no MAINTAIN privilege, so **MAINTAIN on Postgres 17 is unverified** until M-3 is applied and C-9 checks it.

### EVAL-032: Incompressible bulk insert as `anon`
- **Date:** 10:53
- **Target:** local: the earlier local test copy, rolled back, with `set local role anon; set local statement_timeout = '3s'`
- **Result:** one INSERT statement added **6,000 rows in 609.747 ms**. The evidence table reached **13 MB**, about **2,310 bytes per row**.
- **Derived, not measured:** about 220,000 such rows would reach 500 MB.
- **Reproducibility:** recorded only.

## This commit: documentation and evidence preservation

### EVAL-033: Unit tests, typecheck and build
- **Date:** 11:34, for this commit
- **Commit:** `cb27437` plus this commit's documentation files. No application source changed.
- **Target:** local
- **Run:** `npm test`, `npm run typecheck` and `npm run build`, with no `.env` file present.
- **Result:**
  - Tests: `Test Files 3 passed (3)`, `Tests 11 passed (11)`.
  - `tsc --noEmit`: clean, exit 0.
  - `vite build`: `✓ built in 611ms`, exit 0. The output went to `dist/`, which git ignores.
- **Reproducibility:** reproducible from repo.

### EVAL-034: Committed fingerprint on a fresh local build
- **Date:** 11:22, for this commit
- **Commit:** `cb27437` plus this commit's documentation files; no schema files changed.
- **Target:** local: a disposable database `lrc_fp_verify` built from `supabase/tests/local_roles.sql` and the three migrations on Postgres 16.14, dropped afterwards.
- **Run:**
  `PGOPTIONS='-c default_transaction_read_only=on' psql -At -v ON_ERROR_STOP=1 -d lrc_fp_verify < supabase/tests/fingerprint.sql`,
  then `diff` against the 12 hashes in EVAL-023.
- **Result:**
  - psql exited 0, and the output was **identical, 12 of 12**, to the hashes recorded for both live and local in EVAL-023.
  - **Control:** the same session mode rejected a write (`cannot execute CREATE TABLE in a read-only transaction`), confirming that the run was enforced read-only.
  - **Static check:** no non-comment line of the file contains a write or DDL keyword.
- **Artifact:** [`supabase/tests/fingerprint.sql`](../../supabase/tests/fingerprint.sql). Its query is byte-identical to the scratch version: md5 `669e294fc349bb82e3e6794c26311cb8` for the lines after the header.
- **Reproducibility:** reproducible from repo.
- **Limitations:** this shows the repository still builds the schema and seed that live had at 10:44. It says nothing about live's current state, which wasn't read.

### EVAL-035: Secret and hygiene scan of this commit
- **Date:** 11:35, for this commit
- **Target:** static: the 14 files this commit adds or modifies.
- **Run:** `grep` for:
  - JWT-shaped tokens
  - Supabase key formats (`sb_publishable_` or `sb_secret_` followed by key characters)
  - the live project reference, or any concrete `*.supabase.co` host
  - connection strings, password assignments, `jwt-secret`, the local harness password, private-key headers
  - long high-entropy strings

  Also checked for tracked or staged `.env*` files.
- **Result:**
  - No matches for keys, tokens, the project reference, hosts, connection strings or passwords.
  - The long-string hits were all file paths and identifiers.
  - The only tracked env file is the existing `.env.example`, which holds names only.
  - **Deliberately not committed:** `local-anon.jwt` and `pgrst.conf`, which held local signing material and a connection string. See the [artifacts README](artifacts/2026-10-02-scratch-harness/README.md).
- **Reproducibility:** recorded only.
- **Limitations:** pattern-based, not gitleaks.

## Stage 1: security hardening (2026-10-02, 11:47 to 12:05)

Baseline commit: `ef611766c8d308a344d78d12e49e5f9079425602`.

"Local" in this section means a Postgres **17.10** cluster with the ICU provider (en-US), run in the
build container. Live uses 17.11 with ICU. **Nothing in this section wrote to the live project.**

### EVAL-036: Live read-only inspection before writing SQL
- **Date:** 11:48
- **Target:** live read-only: `list_migrations`, `list_branches`, `get_project`, and one catalog SELECT.
- **Result:**
  - **Migrations:** `20261002092043`, `20261002092141`, `20261002093521`, unchanged.
  - **Branches:** none.
  - **Project:** Postgres `17.11.0.002`, `ACTIVE_HEALTHY`.
  - **Functions:**
    - `reset_demo_data()` and `set_gate_status(bigint,gate_status,text,text,text)` have ACL `{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres}`. Both are SECURITY DEFINER with `search_path=""` and owned by `postgres`.
    - `rls_auto_enable()` has `{postgres=X/postgres}` and `search_path=pg_catalog`.
  - **Policies:**
    - `"Public read"` on all 6 tables.
    - `"Public append"` on `evidence` (INSERT, `anon` and `authenticated`, `with check (true)`).
  - **Evidence grants and constraints:**
    - Column INSERT for `anon` and `authenticated` on `gate_id, recorded_on, source, summary, title, type`.
    - The only `source` constraint is `evidence_source_check`: `CHECK ((char_length(source) <= 500))`.
  - **Default ACL rows for `postgres`:**
    - Tables, **per-schema `public`** entry: `{postgres=arwdDxtm/postgres,anon=Dxtm/postgres,authenticated=Dxtm/postgres,service_role=Dxtm/postgres}`.
    - Functions, per-schema `public` entry: `{postgres=X/postgres}`.
    - Sequences, per-schema `public` entry: `{postgres=rwU/postgres}`.
    - **There is no global entry for `postgres`.**
  - **Database:** collation provider **ICU** (`datlocprovider = i`), `en_US.UTF-8`, UTF8.
  - **Seed:** launches 1, gates 16 (6 Passed), evidence 10, risks 6, decisions 4, stages 3. 0 evidence rows have a `source`.
- **Correction to EVAL-025:**
  - EVAL-025 read the functions row as "EXECUTE for `postgres` only". That row is a per-schema entry, and Postgres adds per-schema entries to its built-in global default; it doesn't replace it.
  - The built-in default gives EXECUTE to PUBLIC, so new `postgres`-created functions in `public` are executable by the API roles. EVAL-040 confirms this, and it is recorded as SEC-007.
  - EVAL-025 itself is unchanged.
- **Reproducibility:** recorded only.

### EVAL-037: Supabase documentation on the GitHub integration's deploys
- **Date:** 11:49
- **Target:** docs. The pages read were "GitHub integration" (deployment/branching) and "Deployment & Branching".
- **Result:**
  - "Deploy to production" in the GitHub integration settings applies **new migrations** when changes are pushed or merged to the production branch.
  - Deploying from `main` "works on all plans and does not require branching".
  - The integration settings are configured in the dashboard.
- **Consequence:**
  - An empty branch list (EVAL-036) doesn't show whether "Deploy to production" is on.
  - The single deploy path required by DR-019 can't be established without the owner reading that setting, so **the Stage 1 migration was not applied to production**.
- **Reproducibility:** recorded only.

### EVAL-038: Local Postgres 17 and Supabase CLI setup; migration file created
- **Date:** 11:50 to 11:53
- **Target:** local
- **Run:**
  - **Docker:** the client is installed, but the daemon wasn't running, so the CLI's container stack (`supabase start`, `supabase db reset`) wasn't available.
  - **Postgres 17:** binaries were taken from the npm package `@embedded-postgres/linux-x64@17.10.0-beta.17` into the scratch directory (not a project dependency). The cluster was initialized with `--locale-provider=icu --icu-locale=en-US` on port 5433.
  - **Supabase CLI:** version 2.119.0 was installed into the scratch directory (not a project dependency).
    - A dry run in a scratch copy showed that `supabase migration new` writes only the migration file and a version-check cache, `supabase/.temp/cli-latest`.
    - Run in the repository, it created `supabase/migrations/20261002115318_stage1_security_hardening.sql`, and the cache directory was removed.
- **Result:**
  - `PostgreSQL 17.10`, with locale provider `i` (ICU) and ICU locale `en-US`.
  - The migration version `20261002115318` sorts after the last applied version, `20261002093521`.
- **Reproducibility:** recorded only; the tool setup is machine-specific.

### EVAL-039: Local PG17 mirror vs live
- **Date:** 11:53
- **Target:** local database `lrc_pre`: the updated `supabase/tests/local_roles.sql` plus the three applied migrations.
- **Result:**
  - The default ACL for `postgres` tables in `public` is `{anon=Dxtm/postgres,authenticated=Dxtm/postgres,service_role=Dxtm/postgres}`. That's identical to live (EVAL-036) for those three roles; live also lists the owner's own row.
  - `supabase/tests/fingerprint.sql`, run read-only, was **identical, 12 of 12, to EVAL-023**.
  - So the pre-Stage-1 local PG17 build matches live.
- **Reproducibility:** reproducible from repo.

### EVAL-040: Default-privilege probe before and after the migration (PG17)
- **Date:** 11:54
- **Target:** local, inside rolled-back transactions.
- **Run:** as `postgres`, create a probe table, a function and a sequence, then read what `anon`, `authenticated` and `service_role` receive:
  ```sql
  begin;
  create table public.zz_probe_table (x int);
  create function public.zz_probe_fn() returns int language sql as 'select 1';
  create sequence public.zz_probe_seq;
  -- has_table_privilege (8 privileges, MAINTAIN included), has_function_privilege(EXECUTE),
  -- has_sequence_privilege (USAGE, SELECT, UPDATE) for each role
  rollback;
  ```
- **Result:**

  | Build | New table (`anon`, `authenticated`) | New table (`service_role`) | New function EXECUTE | New sequence |
  |---|---|---|---|---|
  | Before (`lrc_pre`) | MAINTAIN, REFERENCES, TRIGGER, TRUNCATE | Same | Yes for all three; `proacl` NULL = the built-in default, EXECUTE to PUBLIC | Nothing |
  | After (`lrc_post`, migration applied cleanly) | **Nothing** | MAINTAIN, REFERENCES, TRIGGER, TRUNCATE (unchanged) | **Still yes** for all three | Nothing |

  - After the migration, the default ACL row is `{service_role=Dxtm/postgres}`.
  - No probe objects remained after the rollback.
  - **M-3 is verified on Postgres 17, MAINTAIN included.**
  - The function default is out of M-3's scope and is recorded as **SEC-007**.
- **Reproducibility:**
  - The table half is reproducible from repo (`stage1_behavior.sql` check 21).
  - The function half is recorded only.

### EVAL-041: Catalog test on the Stage 1 and pre-Stage-1 builds
- **Date:** 11:56
- **Target:** local, under `default_transaction_read_only=on`.
- **Run:** `supabase/tests/security_catalog.sql`.
  - Check 15's expected hashes were computed beforehand on `lrc_post`, from the test's own fingerprint expressions:
    - constraints `e21c19ff0d76992a123dac84cf6e9414`
    - policies `5413a6d3b0520ccf75b53f4f7067bef1`
    - rls+owners `416b404f44bc87e538217610f1a1afb1`
    - table_grants `81ed597a2d217bdefda59babdc03008a`
    - column_write_grants `d41d8cd98f00b204e9800998ecf8427e` (empty)
    - functions `8389103e34beaefa36fa084837e7320b`
    - views `6c60d69e83dedcece4f5b8c698c2ba7e`
  - Only constraints, policies, column_write_grants and functions differ from the pre-Stage-1 build.
- **Result:**
  - **Stage 1 build (`lrc_post`): 17 of 17 PASS.**
    - "14 role-relation pairs readable"
    - "MAINTAIN checked"
    - "2 functions checked", none executable
    - "10 privileges each"
  - **Pre-Stage-1 build (`lrc_pre`): 13 of 17.**
    - 3 FAIL: "granted: anon evidence, authenticated evidence"
    - 9 FAIL: both roles can execute `reset_demo_data()` and `set_gate_status(...)`
    - 14 FAIL: default grants TRUNCATE, REFERENCES, TRIGGER and MAINTAIN for both roles
    - 15 FAIL: "differs: constraints, policies, column_write_grants, functions"
  - psql exited 0 both times.
- **Reproducibility:** reproducible from repo.

### EVAL-042: Mutation test of the catalog test
- **Date:** 11:58
- **Target:** local `lrc_post`, with every mutation inside one transaction that was rolled back.
- **Run:**
  - **Mutations injected:**
    - RLS disabled on `risks`
    - `anon`'s SELECT on `decisions` revoked
    - column UPDATE on `gates.status` granted to both roles
    - DELETE on `evidence` granted to `authenticated`
    - TRUNCATE on `launches` granted to both roles
    - MAINTAIN on `rollout_stages` granted to both roles
    - USAGE on `gates_id_seq` granted to `authenticated`
    - a view created without `security_invoker`
    - a SECURITY DEFINER function created with no `search_path`, using dynamic `EXECUTE`
    - a default SELECT on tables granted to `authenticated`
    - CREATE on schema `public` granted to `anon`
    - a table owned by another role
  - Then `security_catalog.sql` was run inside the same transaction.
- **Result:**
  - **16 of 17 checks FAIL**, each naming the injected change.
  - Check 9 also flagged the new function as executable by `anon` through the PUBLIC default (SEC-007).
  - Check 3 wasn't mutated here; it fails on the pre-Stage-1 build (EVAL-041).
  - After the rollback, the test passes 17 of 17 again.
- **Reproducibility:** recorded only; the mutation script was in the scratch directory.

### EVAL-043: Behavior test on both builds
- **Date:** 11:58
- **Target:** local
- **Run:** `supabase/tests/stage1_behavior.sql`
- **Result:**
  - **First run:** it stopped at check 21 with `malformed array literal: "MAINTAIN"`, a bug in the test: an untyped literal appended to a `text[]`. `ON_ERROR_STOP` aborted the run and the transaction rolled back. Fixed with a `::text` cast.
  - **Stage 1 build: 24 of 24 PASS.**
    - Both roles read the seed: `launches=1 gates=16 evidence=10 risks=6 decisions=4 stages=3 current_stage=1`.
    - Both roles are denied with **42501**:
      - INSERT (7 of 7)
      - UPDATE, DELETE and TRUNCATE on all 6 tables
      - `SELECT ... FOR UPDATE`
      - `set_gate_status` (2 of 2)
      - `reset_demo_data`
      - CREATE TABLE
    - The seed is unchanged, and the owner can still change a status.
    - A new table grants the API roles none of 8 privileges.
    - **12 of 12** valid https sources are accepted.
    - **33 of 33** unsafe sources are rejected by `evidence_source_https`, including every Phase 2B reject case (EVAL-030).
    - A 501-character https source is rejected by the existing length rule.
  - **Pre-Stage-1 build: 16 of 24.**
    - **INSERT (3, 11):** the default-values insert reached `23502` (NOT NULL), not a permission error, and the forged Sign-off insert succeeded.
    - **`set_gate_status` (8, 16):** the Passed attempt raised the application rule `P0001`, and the forged waive succeeded.
    - **`reset_demo_data` (9, 17):** succeeded.
    - **New table (21):** granted TRUNCATE, REFERENCES, TRIGGER and MAINTAIN.
    - **Sources (23):** all 33 unsafe sources were accepted.

    The test told the expected permission error (42501) apart from application errors and successes.
- **Reproducibility:** reproducible from repo. It refuses to run against a Supabase project.

### EVAL-044: Integrity suite on the local Stage 1 build
- **Date:** 11:58
- **Target:** local `lrc_post`. Destructive by design, local only.
- **Result:**
  - 6 of 6 PASS, with the same detail text as EVAL-007; check 4 reports "permission denied for table gates".
  - The seed afterwards: `launches=1 gates=16 passed=6 evidence=10 risks=6 decisions=4 stages=3`.
- **Reproducibility:** reproducible from repo, locally only.

### EVAL-045: 12-part fingerprint of the Stage 1 build
- **Date:** 11:58
- **Target:** local `lrc_post`, read-only.
- **Result:**

  | Part | Stage 1 md5 | vs EVAL-023 |
  |---|---|---|
  | column_write_grants | empty (no column write grants remain) | Changed |
  | columns | `36e6440fda38405090245657268e2d55` | Same |
  | constraints | `e21c19ff0d76992a123dac84cf6e9414` | Changed (new CHECK) |
  | enums | `be89a9eeab6877272c2b0dbe9820cc78` | Same |
  | functions | `8389103e34beaefa36fa084837e7320b` | Changed (ACLs) |
  | indexes | `1a0df3c7267af392eb3652304a48695a` | Same |
  | policies | `5413a6d3b0520ccf75b53f4f7067bef1` | Changed (`"Public append"` dropped) |
  | rls+owners | `416b404f44bc87e538217610f1a1afb1` | Same |
  | seed_data | `dc85e31b82116a9fa79adaac8399aa90` | **Same: canonical seed data intact** |
  | table_grants | `81ed597a2d217bdefda59babdc03008a` | Same |
  | user_triggers | `334c4a4c42fdb79d7ebc3e73b517e6f8` | Same |
  | views | `6c60d69e83dedcece4f5b8c698c2ba7e` | Same |

- **Reproducibility:** reproducible from repo.
- **Limitations:** these are the hashes live should show **after** the migration is applied. That hasn't happened yet.

### EVAL-046: Local PostgREST 14.18 HTTP checks
- **Date:** 11:59
- **Target:** local: PostgREST 14.18 (the version live reports) over `lrc_post`.
  - A signing secret and two tokens (`anon`, `authenticated`) were generated at run time, never printed, and deleted afterwards.
- **Result:**
  - **Reads:** the app's 8 read queries (the launches list and the overview, with the same query strings `supabase-js` builds) returned **200** with the seed. The list query returned 1 launch, 16 gates and 10 evidence ids.
  - **Writes:** each of these returned PostgreSQL **42501**, as **HTTP 401** for `anon` and **HTTP 403** for `authenticated`:
    - `POST /evidence`
    - `PATCH /gates`
    - `DELETE /evidence`
    - `POST /rpc/set_gate_status`
    - `POST /rpc/reset_demo_data`
  - The data was unchanged afterwards.
- **Reproducibility:** recorded only; the harness was ad hoc (see the [artifacts README](artifacts/2026-10-02-scratch-harness/README.md)).

### EVAL-047: Unit tests, typecheck, build
- **Date:** 11:59, after the comment-only change in `src/components/AppShell.tsx`.
- **Target:** local
- **Result:**
  - Tests: `Test Files 3 passed (3)`, `Tests 11 passed (11)`.
  - Typecheck: exit 0.
  - Build: `✓ built in 576ms`.
  - Lint: no lint script is configured.
- **Reproducibility:** reproducible from repo.

### EVAL-048: Catalog test against live, before any migration
- **Date:** 12:00
- **Target:** live read-only. The query body of `supabase/tests/security_catalog.sql` (lines 38 to 260, without the header comments) was sent as one SELECT through the connector.
- **Result:** **13 of 17.**
  - **Failing:** exactly the four checks the migration fixes:
    - 3: "granted: anon evidence, authenticated evidence"
    - 9: both roles can execute `reset_demo_data()` and `set_gate_status(...)`
    - 14: the per-schema default grants for both roles, MAINTAIN included
    - 15: "differs: constraints, policies, column_write_grants, functions"
  - **Passing:** the other 13, including:
    - check 7, with "MAINTAIN checked" on 17.11
    - check 11, which lists `rls_auto_enable() search_path=pg_catalog`
    - check 13, with "13 privileges each"
  - So live still matches the pre-Stage-1 repository. Its security-relevant fingerprint differs from the Stage 1 build only in the parts the migration changes.
- **Reproducibility:** reproducible from repo, read-only.
- **Limitations:**
  - The connector session wasn't confirmed to be a read-only transaction; the query is a single SELECT.
  - This isn't post-migration verification.

### EVAL-049: Supabase advisors
- **Date:** 12:00
- **Target:** live read-only
- **Result:**
  - **Security:**
    - Lint 0028 (`anon`) and lint 0029 (`authenticated`), each with 2 findings: `reset_demo_data()` and `set_gate_status(...)`.
    - These are the SEC-001 and SEC-002 surface, which stays until the migration is applied.
  - **Performance (INFO only):**
    - Unindexed foreign keys: `decisions_gate_id_fkey`, `decisions_risk_id_fkey`, `risks_gate_id_fkey`.
    - Unused indexes: `decisions_launch_id_idx`, `risks_launch_id_idx`.
    - Not security issues, and out of Stage 1 scope.
- **Reproducibility:** recorded only.

### EVAL-050: Final replay of the committed files; secret and hygiene scan
- **Date:** 12:09 to 12:12
- **Target:** local: a fresh database `lrc_final` on Postgres 17.10, plus a static scan of the 13 changed files.
- **Run:**
  - **Built:** `local_roles.sql` plus all four migrations.
  - **Tests run:**
    - `security_catalog.sql` (read-only)
    - `stage1_behavior.sql`
    - `fingerprint.sql` (read-only), compared with EVAL-045
    - `integrity_checks.sql`
  - **File md5 at replay:**
    - migration `f66a638dfb93554ad4f1a2bac0826304`
    - `security_catalog.sql` `444656761f14b65700d0285f7f1e8752`
    - `stage1_behavior.sql` `b1758caef05e4a559817113d63a2dd39`
    - `local_roles.sql` `26fcbd71becf85f6f4b1b38b1dc4152f`
    - `fingerprint.sql` `006e243bd4bb725d17d2dd12ecef88f2` (header comment changed; query unchanged)
  - **Scan:** `grep` for:
    - JWT-shaped tokens and Supabase key formats
    - the project reference and concrete `*.supabase.co` hosts
    - connection strings, password assignments, `jwt-secret`, private-key headers
    - model identifiers
    - Supabase CLI artifacts (`config.toml`, `.temp`, `.branches`)
- **Result:**
  - **Replay:** catalog test 17 of 17, behavior test 24 of 24, fingerprint identical to EVAL-045 (12 of 12), integrity suite 6 of 6.
  - **Scan:** no matches. The only env file is the existing `.env.example`. No CLI artifacts are present.
- **Reproducibility:** the replay is reproducible from repo; the scan is recorded only.
- **Limitations:** pattern-based, not gitleaks.

## Not run (don't claim these)

This list reflects the state after Stage 1 (about 12:05).

- **Production deployment of Stage 1:** the migration was **not** applied to live, so live hasn't been verified after it. The catalog test passing 17 of 17 on live, and the 0028/0029 advisor lints clearing, are expected but **unverified**.
- **Browser:** the app loaded in a browser against the **live** project. The live publishable key was never retrieved (DR-011).
- **CI:** none exists in this repository.
- **Test suites:**
  - A committed Playwright or end-to-end suite. The scripts under `artifacts/` are preserved evidence, not a suite. The Stage 1 HTTP check (EVAL-046) was ad hoc.
  - **Now committed:** catalog tests C-1 to C-10 and C-12 (as `security_catalog.sql` checks 1 to 17), and behavior tests B-1 to B-3 (`stage1_behavior.sql`).
  - **Still not scripts:** C-11 (migration parity; EVAL-022 has the query), C-13 (advisor), C-14 and B-4 (Stage 2).
- **Secret scanning:** gitleaks, or any dedicated secret scanner.
- **Platform probing:**
  - load, rate-limit or request-size tests against the live API
  - reading the Auth settings
  - whether the OpenAPI root is served to the publishable key
  - reading the GitHub integration settings
- **Deployment:** hosting, TLS or security-header tests. Nothing is deployed.
- **Postgres 17 on live:**
  - MAINTAIN and default-privilege behavior was verified on a local 17.10 build (EVAL-040), and live's default ACL was read (EVAL-036).
  - A behavioral probe on live wasn't run, because it would need DDL on production.
- **Supabase's own Postgres image:** not used locally, because the Docker daemon was unavailable.
