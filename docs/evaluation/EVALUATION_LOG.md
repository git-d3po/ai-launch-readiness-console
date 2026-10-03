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
| EVAL-051 | 12:36 | Closeout: live read-only state re-check | live read-only | Unchanged since EVAL-048: catalog 13 of 17, fingerprint = EVAL-023 | Catalog part reproducible from repo |
| EVAL-052 | 12:36 | Closeout: deployment-path evidence | live read-only, docs | Deploy setting not inspectable: Case C | Recorded only |
| EVAL-053 | 12:40 | Closeout: push of `ef61176` and `e74aaaf`; post-push live check | static, live read-only | Fast-forward; no deploy triggered | Recorded only |
| EVAL-054 | 12:41 | Closeout: https rule bypass probe | local | Every bypass rejected; 3 inert leniencies | Recorded only (8 cases now in the test) |
| EVAL-055 | 12:41 | Closeout: raw invisible and bidi characters in two committed files | static | Found and fixed (`8a1ad9d`) | Recorded only (command quoted) |
| EVAL-056 | 12:42 | Closeout: local replay after the test change; SEC-007 audit | local | 17/17, 24/24 (41/41), 12/12, 6/6 | Reproducible from repo |
| EVAL-057 | 12:43 | Closeout: dedicated secret scanner over the full history | static | No real secrets; gitleaks blocked; GitHub scanning unavailable | Recorded only |
| EVAL-058 | 13:00 | Closeout: tests, typecheck, build, fresh replay, scans, hygiene and Markdown checks | local, build, static, live read-only | 11/11; 17/17, 24/24, 12/12, 6/6; scans clean; live still 3 migrations | Tests and replay reproducible from repo; scans recorded only |
| EVAL-059 | 13:38 | Deployment preflight: live read-only re-check; connector capability | live read-only, docs | Unchanged: 3 migrations, catalog 13 of 17, fingerprint = EVAL-023. `apply_migration` takes no version; nothing deployed | Catalog and fingerprint parts reproducible from repo |
| EVAL-060 | 13:58 | Deployment-path audit; correction of the GitHub-link reading | static, live read-only, docs | No GitHub integration ever connected (owner-verified); the connector is the only mechanism; led to DR-024 | Recorded only |
| EVAL-061 | 14:23 | DR-024 commit: fresh replay, tests, hygiene, Markdown and secret checks | local, build, static | 17/17, 24/24, 12/12, 6/6; 11/11; checks clean | Tests and replay reproducible from repo; scans recorded only |
| EVAL-062 | 14:37 | First Stage 1 deployment attempt: gates, preflight, one `apply_migration` call | local, build, static, live read-only, live write attempt | All gates green; the apply timed out at 60 s; nothing applied (hard stop) | Gates reproducible from repo; the attempt recorded only |
| EVAL-063 | 14:53 | Connector confirmation diagnostic | static, docs, live read-only | No confirmation shown in this client; 60 s tool timeout; `skip_elicitations` lives on the connection, unreadable here | Recorded only |
| EVAL-064 | 15:13 to 16:04 | Connector diagnostics; Supabase Deployment connector preflight | static, live read-only | The 60 s hold was server-side, not Claude's approval; a second connector set up; production still 3 migrations | Recorded only |
| EVAL-065 | 16:08 | Stage 1 production deployment: one `apply_migration` call | live read-only, live write | Succeeded once; recorded as `20261002160901`; 4 migrations; `ACTIVE_HEALTHY` | Recorded only |
| EVAL-066 | 16:11 to 16:14 | Stage 1 post-deployment validation on live | live read-only | Catalog 17 of 17; fingerprint 12 of 12 equal to EVAL-045; no security advisor lints | Catalog and fingerprint reproducible from repo; advisors recorded only |
| EVAL-067 | 16:17 to 16:21 | DR-009 rename; amendment A1 cleanup | static | Pure rename (`R100`), contents unchanged; Deployment connector removed by the owner | Recorded only |
| EVAL-068 | 16:28 | Stage 1: C-11 migration parity on live | live read-only, static | PASS: all 4 stored statements equal their files; `20261002160901` md5 `f66a638dfb93554ad4f1a2bac0826304`, 2205 characters | Recorded only (EVAL-022's query) |
| EVAL-069 | 16:59 to 17:01 | Stage 2: fresh PG17 cluster; Stage 1 baseline before changes | local | Catalog 17/17, behavior 24/24, integrity 6/6, seed_data = EVAL-045 | Reproducible from repo |
| EVAL-070 | 17:05 | Stage 2: tests first, run on the Stage 1 build | local | Every new and scoped test fails on missing Stage 2 objects; catalog 16/17 (check 9) | Reproducible from repo (at `da583ab` plus the test changes) |
| EVAL-071 | 17:08 to 17:10 | Stage 2: fresh replay of all 7 migrations; catalog, C-14, Stage 1 behavior, B-4 | local | 17/17, 7/7, 24/24, 29/29 | Reproducible from repo |
| EVAL-072 | 17:09 | Stage 2: fingerprint baseline | local | Two fresh builds identical; canonical_data = EVAL-045 seed_data; 6 schema parts changed by design | Reproducible from repo |
| EVAL-073 | 17:10 to 17:11 | Stage 2: integrity, concurrency, function ACLs, app checks | local, build | 6/6; 2/2 races; only the 3 sandbox functions are public; 11/11, typecheck, build | Reproducible from repo |
| EVAL-074 | 17:13 to 17:16 | Stage 2: raw bidi characters in M-4 found and fixed; full re-run | static, local | Found in 6 lines, replaced with escapes; all suites pass again | Reproducible from repo |
| EVAL-075 | 2026-10-02, after EVAL-074 | Stage 2: reset-vs-write race and P0001 wording, found in review and fixed | local | Pre-fix reset left 2 visitor rows; fixed reset removes them; REPEATABLE READ gap found and closed | Reproducible from repo (races); scratch stress and isolation probes recorded only |
| EVAL-076 | 2026-10-02, after EVAL-075 | Stage 2: full re-run after the EVAL-075 fixes | local, build | 17/17, 7/7, 24/24, 29/29, 6/6, 4 races + check 5; canonical_data unchanged; 11/11, typecheck, build | Reproducible from repo |
| EVAL-077 | 2026-10-02, after EVAL-076 | Stage 2: visitor functions refuse isolation levels above READ COMMITTED | local | Pre-guard: 11th item and Passed without evidence at both levels; guarded: refused, 9/9 | Reproducible from repo (checks 6 to 9); scratch probes recorded only |
| EVAL-078 | 2026-10-02, after EVAL-077 | Stage 2: full re-run after EVAL-077 | local, build | 17/17, 7/7, 24/24, 29/29, 6/6, concurrency 9/9 (x2, plus 3 earlier runs); stress 0 deadlocks; canonical_data unchanged; 11/11, typecheck, build | Reproducible from repo; stress recorded only |
| EVAL-079 | 2026-10-02, after EVAL-078 | A1: P0001 shown verbatim, other errors generic | local | 13 new tests pass, and 6 fail with the boundary removed; end to end on a local PostgREST: P0001 verbatim, 23514/23502/22P02/42501 generic | Reproducible from repo (unit tests); end-to-end run recorded only |
| EVAL-080 | 2026-10-02, after EVAL-079 | A9 types generated locally; A8 provenance fields | local | Types match the local catalog (65 columns, 8 relations, 6 functions); 29/29 tests; A8 end to end on a local PostgREST | Reproducible from repo (generation command, unit tests); end-to-end run recorded only |
| EVAL-081 | 2026-10-02, after EVAL-080 | A3 and the refresh infrastructure | local, build | 34/34 tests; local browser check: badge, canonical-only chip, banner; no overflow at 390 px | Reproducible from repo (unit tests); browser check recorded only |
| EVAL-082 | 2026-10-02, after EVAL-081 | A6: source rendering rule | local, build | 6 new tests, 40/40 in total; both security mutants caught | Reproducible from repo |
| EVAL-083 | 2026-10-02, after EVAL-082 | A4: gate sheet, sandbox link, evidence and status forms | local, build | 60/60 tests; 29/29 local browser checks | Reproducible from repo (unit tests); browser walkthrough recorded only |
| EVAL-084 | 2026-10-02, after EVAL-083 | A5: "Visitor" label on listed evidence and decisions | local, build | 5 new tests, 65/65 in total; 24/24 local browser checks | Reproducible from repo (unit tests); browser walkthrough recorded only |
| EVAL-085 | 2026-10-02, after EVAL-084 | A7: header sandbox reset; launch list keeps content on a failed refresh | local, build | 14 new tests, 79/79 in total; 41/41 local browser checks | Reproducible from repo (unit tests); browser walkthrough recorded only |
| EVAL-086 | 2026-10-02, after EVAL-085 | A7 follow-up: reset usable with a gate sheet open; a P0001 rejection refreshes; focus kept below the sticky header | local, build | 80/80 tests; 56/56 local browser checks; 14/14 keyboard-focus checks | Reproducible from repo (unit tests); browser walkthrough recorded only |
| EVAL-087 | 2026-10-02, after EVAL-086 | Lovable presentation pass imported (DR-004 A2) | local, build | 80/80 tests; 131/131 presentation checks on real local data; A7 56/56 and focus 14/14 re-run | Reproducible from repo (unit tests); browser walkthrough recorded only |
| EVAL-088 | 2026-10-03, 18:14 to 18:43 | Stage 2 production window: preflight twice, M-4 applied once, stopped on a C-11 mismatch | live read-only, live write | P1 to P7 pass; M-4 recorded as `20261003183331`; stored md5 `4b09ad34a82823aacf22d4afa63bad53` not the file's `23dd3270cdca77001fe2f9a86917d518`; M-5 and M-6 not applied; write surface closed, canonical data unchanged | Recorded only |

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

## Stage 1 closeout: release checkpoint (2026-10-02, 12:36 to 13:10)

Starting commit: `e74aaafdb20e23258852cedfc5458a7ed98e79cb`, clean, 2 commits ahead of `origin`.
**Nothing in this section wrote to the live project.**

### EVAL-051: Live read-only state re-check
- **Date:** 12:36 to 12:39
- **Target:** live read-only: `get_project`, `list_migrations`, `list_branches`, `get_organization`, three catalog SELECTs, and the advisors.
- **Result:**
  - **Project:** `ACTIVE_HEALTHY`, Postgres `17.11.0.002`.
  - **Migrations:** the same three versions. Each stored statement's md5 still equals the repository file: `2d4cf41f…`, `d3dafe0c…`, `4842aef7…`.
  - **Branches:** none.
  - **Organization plan:** free.
  - **Catalog test** (`security_catalog.sql` query body): **13 of 17**, failing exactly checks 3, 9, 14 and 15 with the same detail as EVAL-048.
  - **Fingerprint** (`fingerprint.sql` query body): **identical to EVAL-023, 12 of 12**, `seed_data` `dc85e31b…` included. Live still differs from the Stage 1 build (EVAL-045) in exactly constraints, policies, column_write_grants and functions.
  - **Function ACLs:**
    - `reset_demo_data()` and `set_gate_status(...)`: `{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres}`.
    - `rls_auto_enable()`: `{postgres=X/postgres}`.
    - **PUBLIC holds EXECUTE on no function in `public`.**
  - **Auth:** 0 users, 0 identities, 0 anonymous users. No policy or function in `public` references `auth.*`.
  - **Seed:** `launches=1 gates=16 passed=6 evidence=10 evidence_with_source=0 risks=6 decisions=4 stages=3`. Every identity sequence is still at its seed value, so nothing has been written since the seed.
  - **Advisors:**
    - Security: lints 0028 and 0029, 2 findings each (`reset_demo_data`, `set_gate_status`).
    - Performance: INFO only (3 unindexed foreign keys, 2 unused indexes).
- **Reproducibility:** the catalog and fingerprint parts are reproducible from repo, read-only; the rest is recorded only.

### EVAL-052: Deployment-path evidence
- **Date:** 12:36 to 12:37
- **Target:** live read-only (logs, organization) and GitHub (through the connected tools).
- **Result:**
  - **No tool reads the GitHub integration settings.** The Supabase tools available expose projects, branches, migrations, logs and advisors.
  - **Branches:** none. The organization is on the free plan, so branching isn't available, but "Deploy to production" works on every plan (EVAL-037).
  - **Logs:**
    - The 24-hour window covers the project's whole life; it was created at 02:34.
    - Sources present: `auth_logs`, `edge_logs`, `pgbouncer_logs`, `postgres_logs`, `postgrest_logs`, `realtime_logs`, `storage_logs`. None is a deploy or branch-action source.
    - The 34 gateway (`edge_logs`) entries come only from Supabase's management API: readiness and health checks, network-ban lookups, and one `GET /rest/v1/` at 09:50:57, which matches the type generation in EVAL-011.
    - **No external request reached any data or RPC endpoint.**
  - **GitHub:**
    - 0 Actions workflows.
    - No branch protection on `main`.
    - Commit data carries no check or integration metadata through the available tools.
    - `main` (`0e737dc`, 09:02) hasn't changed since before the integration was linked (about 09:18). So the absence of deploy activity can't distinguish "Deploy to production" on from off.
- **Conclusion:** the single deploy path required by DR-019 **can't be established** with the available tooling: decision-tree Case C. Production was not mutated.
- **Reproducibility:** recorded only.
- **Correction (added with DR-024; see EVAL-060):** no GitHub integration was ever linked. "Since before the integration was linked (about 09:18)" misread the owner's 09:18 instruction, which referred to the Supabase connector. The observations above stand. The conclusion's premise, that an integration might deploy migrations, didn't hold.

### EVAL-053: Push and post-push live check
- **Date:** 12:40:04 (push), checks at 12:40:12, 12:43:03 and 12:46:40.
- **Target:** static (git), and live read-only.
- **Run:** `git push -u origin claude/phase1-schema`, with no force.
- **Result:**
  - `cb27437..e74aaaf claude/phase1-schema -> claude/phase1-schema`.
  - Then `0 0` ahead/behind. `git ls-remote` shows `e74aaaf` on `claude/phase1-schema` and `0e737dc` on `main`, unchanged.
  - Live migration history was unchanged at every check.
  - `edge_logs`, `postgres_logs`, `postgrest_logs` and `auth_logs` have **no entries since 12:40** (checked at 12:43 and 12:46).
  - So a push to this branch doesn't deploy. That says nothing about `main`.
- **Reproducibility:** recorded only.

### EVAL-054: https rule bypass probe
- **Date:** 12:41
- **Target:** local: a fresh Postgres 17.10 build with the Stage 1 migration, inside a rolled-back transaction.
- **Result:**

  | Attempt | Outcome |
  |---|---|
  | Trailing LF, CR or CRLF after a valid URL | Rejected by `evidence_source_https` |
  | LF right after the host; leading LF | Rejected |
  | Tab inside `://` | Rejected |
  | Full-width scheme letters (U+FF48 and so on) | Rejected |
  | Cyrillic lookalike letter (U+0430) in the host | Rejected |
  | IPv6 literal host (`https://[2001:db8::1]/`) | Rejected (IPv6 literals aren't supported) |
  | A 64-character host label; a backtick in the path | Rejected |
  | `https://example.com/%0a` (a percent-encoded newline) | **Accepted** (inert escaped text) |
  | `https://example.com:99999/` (port above 65535) | **Accepted** (lenient port syntax) |
  | `https://example.com/javascript:alert(1)` | **Accepted** (the scheme is https; the path text is inert) |

  - Postgres's `$` doesn't match before a trailing newline, so the classic anchoring bypass doesn't apply.
  - The three accepted values are documented leniencies, not bypasses. The rule guarantees an https scheme and a clean character set; it doesn't promise that a URL is reachable or meaningful. Visitor URLs are never rendered as links (DR-017).
  - The constraint as stored (`pg_get_constraintdef`) matches the migration.
- **Reproducibility:** recorded only. The first eight attempts are now reject cases in `stage1_behavior.sql` (EVAL-056).

### EVAL-055: Raw invisible and bidi characters in two committed files
- **Date:** 12:41 to 12:42
- **Target:** static: every tracked text file except `package-lock.json`.
- **Run:** a Python check that flags C0 and C1 controls (other than tab and newline), DEL, Unicode format characters (category Cf), line and paragraph separators, and every space other than U+0020.
- **Result:**
  - `supabase/tests/stage1_behavior.sql` held raw U+00A0, U+200B, U+202E and U+2066 (and a raw U+00FC) where `E''` escape text was intended.
  - The reconciliation record's M-4 sketch held raw U+202A, U+202E, U+2066 and U+2069.
  - The test behaved correctly, because a raw character and its escape produce the same string. But hidden bidirectional text in committed source is a Trojan-Source-style review hazard.
  - **Cause:** the escape sequences were decoded into raw characters when the files were written in the earlier sessions.
  - **Earlier check missed it:** the earlier Markdown checks looked for em dashes and whitespace only.
  - **Fix (`8a1ad9d`):** both files now hold escape text, and `stage1_behavior.sql` is pure ASCII. The same check over all tracked files now finds none (EVAL-058).
- **Reproducibility:** recorded only; the check is described above.

### EVAL-056: Local replay after the test change; SEC-007 audit
- **Date:** 12:42 to 12:43
- **Target:** local: a fresh PG17 database built from `local_roles.sql` plus all four migrations.
- **Result:**
  - **Catalog test:** 17 of 17 (read-only).
  - **Behavior test:** 24 of 24. Check 22: 12 of 12 accepted. **Check 23: 41 of 41 rejected by `evidence_source_https`**, the eight new cases included.
  - **Fingerprint:** identical to EVAL-045 (12 of 12).
  - **Integrity suite:** 6 of 6.
  - **On a pre-Stage-1 build:** the eight new cases are accepted, and the run is 16 of 24, so they exercise the constraint itself.
  - **SEC-007 audit** on the Stage 1 build:
    - `reset_demo_data()` and `set_gate_status(...)` both have ACL `{postgres=X/postgres}`. PUBLIC, `anon` and `authenticated` can't execute them.
    - The Stage 1 migration creates **0** functions and contains **0** GRANT statements.
  - `stage1_behavior.sql` md5 at replay: `c17adfd14ae692a9650223fa5ee612ec`.
- **Reproducibility:** reproducible from repo.

### EVAL-057: Dedicated secret scanner over the full history
- **Date:** 12:43 to 12:45
- **Target:** static: every commit on every ref (11 commits, 6 refs) as per-commit patches, plus the working-tree diff. `package-lock.json` was excluded; its integrity hashes are public package checksums.
- **Run:**
  - **gitleaks:** the download was **blocked** by the session's network policy (third-party GitHub repositories aren't reachable).
  - **detect-secrets 1.5.0** (Yelp, from PyPI into the scratch directory; 27 plugins): `detect_secrets scan --all-files`.
  - **GitHub secret scanning:** called on the client, the env template and the new test lines. **Unavailable:** "Repository does not have GitHub Advanced Security enabled."
- **Result:** no real secrets. detect-secrets reported 8 findings:
  - **7 Hex High Entropy:** all documented md5 fingerprints or git SHAs.
  - **1 Basic Auth:** the deliberately fake `https://user:****@example.com/` reject case in `stage1_behavior.sql`. The 4-character placeholder password is masked here.
  - Findings were classified by script, without printing values.
- **Reproducibility:** recorded only.
- **Limitations:** the bundle wasn't rescanned. No application code changed since EVAL-019 apart from one comment.

### EVAL-058: Tests, typecheck, build, fresh replay, scans, hygiene and Markdown checks
- **Date:** 13:00 to 13:04
- **Commit:** the working tree committed next as the checkpoint commit, on top of `8a1ad9d`.
- **Target:** local (a fresh Postgres 17.10 database, `lrc_checkpoint`), build, static, and one live read-only call.
- **Result:**
  - **Unit tests:** `Test Files 3 passed (3)`, `Tests 11 passed (11)`.
  - **Typecheck:** exit 0.
  - **Build:** `npm run build` exit 0, `✓ built in 520ms`. Lint: no lint script is configured.
  - **Fresh local replay:** `local_roles.sql` plus all four migrations. Every SQL file is byte-identical to EVAL-056 (same md5s).
    - Catalog test: 17 of 17, read-only.
    - Behavior test: 24 of 24. 12 of 12 accepted; 41 of 41 rejected by `evidence_source_https`.
    - Fingerprint: identical to EVAL-045 (12 of 12).
    - Integrity suite: 6 of 6, and `seed_data` is unchanged after its reset.
  - **Bundle secret scan:** a build with placeholder values, made in the scratch directory.
    - 0 sourcemaps.
    - No Supabase key formats, JWT-shaped tokens, connection strings or project reference.
    - detect-secrets 1.5.0 reported 3 "Secret Keyword" findings, all false positives. Each flagged "value" is a span of minified code between template-literal backticks, 1,181 to 118,964 characters long, after a word such as `password`. They were classified by script, without printing values.
  - **Outgoing diff** (`origin/claude/phase1-schema` to the working tree): detect-secrets found 0; `git diff --check` is clean.
  - **Hygiene check** (EVAL-055's check) over all 47 tracked files except `package-lock.json`: 0 flagged characters.
  - **Markdown structure** over the 8 tracked Markdown files: 0 problems.
    - Checked: balanced fences, the header's column count on every table row, every relative link and anchor, trailing whitespace, and em dashes.
    - The checker was mutation-tested first. An extra table cell, a broken link, a missing anchor and a zero-width space were each flagged, then reverted.
  - **Pattern scan of tracked files:** no project reference, `*.supabase.co` host, Supabase key format, JWT, connection string, private key or model identifier. The only CLI-artifact matches are two mentions in this log.
  - **Live, read-only (13:03):** `list_migrations` still returns the same three versions. Nothing was deployed.
- **Reproducibility:** tests, typecheck, build and the replay are reproducible from repo; the scans are recorded only.
- **Limitations:** this entry was written after the run. The static checks (hygiene, Markdown, diff scan, `git diff --check`) were re-run on the final files just before the commit, with the same results.

## Stage 1 deployment-path decision (2026-10-02, 13:33 to 14:25)

Starting commit: `548701bd5993eb3efc9a90a92498c62cede2e78e`, clean, in sync with `origin`.
**Nothing in this section wrote to the live project.**

### EVAL-059: Deployment preflight: live read-only re-check and connector capability
- **Date:** 13:38 to 13:42. It was the start of an authorized attempt to deploy Stage 1; the run stopped before any production change.
- **Target:** live read-only, and docs.
- **Run:**
  - `get_project`, `list_migrations`, `list_branches` and `get_organization`.
  - The query bodies of `security_catalog.sql` and `fingerprint.sql`.
  - One read of function ACLs, policies, constraints, row counts, sequences, Auth counts, default ACLs and the migration history.
  - The advisors, and the logs since 13:05.
  - The `apply_migration` tool schema, and the Management API documentation for migrations.
- **Result:**
  - **Project:** `ACTIVE_HEALTHY`, Postgres `17.11.0.002`, no branches, free plan.
  - **Migrations:** the same three, each stored as one statement whose md5 equals its repository file. `20261002115318` isn't recorded.
  - **Catalog test:** 13 of 17, failing exactly checks 3, 9, 14 and 15, with the same detail as EVAL-048 and EVAL-051.
  - **Fingerprint:** all 12 parts equal EVAL-023, compared as full hashes.
  - **Function ACLs:** both application functions are `{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres}`; `rls_auto_enable()` is owner-only. PUBLIC holds EXECUTE on no function.
  - **Policies and constraints:** six "Public read" policies plus "Public append". `evidence_source_https` doesn't exist yet.
  - **Seed:** `launches=1 gates=16 passed=6 evidence=10 evidence_with_source=0 risks=6 decisions=4 stages=3`. Every sequence is at its seed value.
  - **Auth:** 0 users, 0 identities, 0 anonymous users. Nothing in `public` refers to `auth.*`.
  - **Advisors:** 0028 and 0029 list `reset_demo_data` and `set_gate_status`; performance is INFO only.
  - **Logs since 13:05:** only Supabase management-API health and readiness checks and one OpenAPI root fetch (13:30). One read query of this run failed at planning at 13:40 (a `"char"` concatenation error) and changed nothing.
  - **Connector capability:** `apply_migration` accepts `project_id`, `name` and `query` only. The Management API's apply endpoint documents an optional `Idempotency-Key`, which the tool doesn't expose.
- **Conclusion at the time:** the run stopped without deploying. The GitHub integration's state was still believed unknown (corrected in EVAL-060). The connector also can't record the authored version `20261002115318`, which that run's instructions required. Production wasn't changed.
- **Reproducibility:** the catalog and fingerprint parts are reproducible from repo, read-only; the rest is recorded only.

### EVAL-060: Deployment-path audit; correction of the GitHub-link reading
- **Date:** 13:58 to 14:04 (instruction at 13:54).
- **Target:** static (repository and session record), live read-only, docs, and GitHub read-only.
- **Owner statement (13:54):** Supabase has never been connected to GitHub. The project's GitHub integration page offers "Authorize GitHub": an offer to create an integration, not evidence of one.
- **Result:**
  - **The 09:18 instruction, in full:** "Supabase is now linked to this repo. Use that link." It goes on: "Apply the migrations to the linked Supabase project". It refers to the Supabase connector made available to the session, and doesn't mention GitHub. Migrations 1 and 2 were applied through the connector at 09:20:43 and 09:21:41.
  - **The misreading:**
    - DR-019 recorded it as "The owner reported linking GitHub to the Supabase project". EVAL-052 and section 16 of the reconciliation record built on it ("since before the integration was linked").
    - The misreading was this documentation's, not the owner's. It made release gate R-9 depend on a GitHub setting that doesn't exist.
  - **Consistent evidence:**
    - GitHub wasn't connected at creation (DR-005), and the project has no Supabase branches.
    - `main` (`0e737dc`) holds only `README.md` and has never contained `supabase/`.
    - No log shows deploy activity (EVAL-052, EVAL-059).
  - **Connector precedent:** all three production migrations went through the connector. Migrations 1 and 2 were committed as `...000100` and `...000200` (`03a4666`) and renamed to their recorded versions in `9c65e6c`. Migration 3 was committed under its recorded version in `ddadd36`.
  - **How the connector records a migration** (`supabase_migrations.schema_migrations`, read-only at 14:01):
    - `version` is the primary key; the other columns are `name`, `statements`, `rollback`, `created_by` and `idempotency_key` (UNIQUE).
    - All three rows have `created_by` set and no idempotency key.
    - The version is assigned when the migration is applied, consistent with DR-009.
  - **Supabase CLI:** a scratch install (2.119.0) used once, for `migration new`.
    - Not linked: no `supabase/config.toml` or `.temp/project-ref`.
    - No access token, and no database URL or password.
    - `db push` needs `--linked`, `--db-url`, or `--project-ref` with `--password`. `migration repair` changes only the history table.
  - **CI and GitHub:** no `.github/` on any branch, and `package.json` has no deploy script. None of the three GitHub branches is protected.
  - **Documentation:** the GitHub integration's "Deploy to production" applies new migrations on a push or merge to the production branch, on every plan. `db push` "runs only the ones not yet applied", matched by version. `migration repair` "updates the tracking table only".
  - **Side effect:** the CLI's help commands, run from the repository root, wrote an empty version-check cache, `supabase/.temp/cli-latest`. It was deleted at 14:04 and never committed.
- **Conclusion:**
  - The connector is the only deployment mechanism that exists, and the one the records already accommodate (DR-019's first option, DR-009, and R-2's rename).
  - Designating it was proposed, and the owner approved it at 14:15 (DR-024).
  - Production wasn't changed, and Stage 1 remains pending deployment.
- **Reproducibility:** recorded only.

### EVAL-061: DR-024 commit: fresh replay, tests, hygiene, Markdown and secret checks
- **Date:** 14:23 to 14:25
- **Commit:** the working tree committed next as the DR-024 commit, on top of `548701b`. Documentation only.
- **Target:** local (a fresh Postgres 17.10 database, `lrc_dr024`, dropped afterwards), build, and static. This run made no call to the live project.
- **Result:**
  - **Migration integrity:**
    - `supabase/migrations/` is unchanged since `e74aaaf`, in names and contents, and nothing under `supabase/` changed in this commit.
    - The Stage 1 file is still `20261002115318_stage1_security_hardening.sql`: md5 `f66a638dfb93554ad4f1a2bac0826304`, 2205 bytes.
    - The three applied files keep the md5s production stores (`2d4cf41f...`, `d3dafe0c...`, `4842aef7...`; EVAL-059).
  - **Fresh local replay** (`local_roles.sql` plus all four migrations; the test files are byte-identical to EVAL-058):
    - Catalog test: 17 of 17, read-only.
    - Behavior test: 24 of 24. 12 of 12 accepted; 41 of 41 rejected by `evidence_source_https`.
    - Fingerprint: all 12 parts equal EVAL-045.
    - Integrity suite: 6 of 6, and `seed_data` is unchanged after its reset.
  - **Unit tests:** `Test Files 3 passed (3)`, `Tests 11 passed (11)`.
  - **Typecheck:** exit 0.
  - **Build:** `npm run build` exit 0, `✓ built in 629ms`.
  - **Hygiene check** (EVAL-055's check) over every tracked file except `package-lock.json`: 0 flagged characters in 47 files.
  - **Markdown structure** (fences, table column counts, relative links and anchors, trailing whitespace, em dashes): 0 problems in 8 files, and no em dashes.
  - **Outgoing diff** (`origin/claude/phase1-schema` to the working tree): detect-secrets found 0; `git diff --check` is clean.
  - **Pattern scan of tracked files:** no project reference, `*.supabase.co` host, Supabase key format, JWT, connection string, private key, service-role reference or model identifier, and no Supabase CLI artifact.
  - **Untracked or generated files:** none, apart from the ignored `dist/` and `node_modules/`.
- **Reproducibility:** the replay, tests, typecheck and build are reproducible from repo; the scans are recorded only.

## First Stage 1 deployment attempt and connector diagnostic (2026-10-02, 14:37 to 14:55)

Starting commit: `36718bbaa4b31febe888eb68558ba848803dd612`, clean, in sync. **No production change resulted.**

### EVAL-062: First Stage 1 deployment attempt
- **Date:** 14:37 to 14:50.
- **Target:** local, build, static, live read-only, and one live write attempt.
- **Run and result:**
  - **Repository checkpoint:** HEAD `36718bb`, clean, in sync; `main` at `0e737dc`.
    - The Stage 1 file is 2205 bytes, md5 `f66a638dfb93554ad4f1a2bac0826304`, sha256 `a6efa904...`, unchanged since `e74aaaf`.
    - All four migration files end in one LF.
  - **Supabase guidance:**
    - The changelog couldn't be read: the session's network policy blocks `supabase.com`.
    - The docs, read through the connector, show the same migration endpoints as before.
    - `apply_migration` still takes only `project_id`, `name` and `query`.
  - **Local replay** (fresh Postgres 17.10): catalog 17 of 17; behavior 24 of 24 (41 of 41 rejected); fingerprint 12 of 12 equal to EVAL-045; integrity 6 of 6.
  - **App and static checks:**
    - Unit tests 11 of 11; typecheck exit 0; build `built in 623ms`.
    - Hygiene and Markdown checks clean.
    - detect-secrets reported 8 findings over the tracked files, all known false positives: 7 documented hashes and 1 synthetic reject URL. The pattern scan found 0.
  - **Production preflight (read-only, 14:39 to 14:41):**
    - `ACTIVE_HEALTHY`, Postgres `17.11.0.002`, free plan, no branches, exactly 3 migrations.
    - Catalog 13 of 17, failing checks 3, 9, 14 and 15. Fingerprint equal to EVAL-023.
    - ACLs, policies, grants, seed counts, IDs and sequences at the baseline; advisors only 0028 and 0029; no unexpected log activity.
  - **Byte-identity checks through the connector:**
    - A read-only `select md5(...)` of the full migration text, sent at 14:41:29, timed out at 14:42:33. The text contains `drop policy`, so this is the same pattern as EVAL-006.
    - The same check on the only backslash-bearing line, with no destructive keyword, returned at once with md5 `dc5ba0821dede4d9179b96ae5d1c3ea1`. That equals the local file.
  - **The apply:**
    - The owner confirmed they were ready to approve the confirmation.
    - `list_migrations` at 14:48:13 still showed 3 versions.
    - One `apply_migration` call (`name` `stage1_security_hardening`, the file's exact bytes) was sent at 14:48:23. It **timed out at 14:49:27**.
    - The owner saw no confirmation form. The call wasn't retried.
  - **Read-back (14:49 to 14:50):**
    - Still 3 migrations; `"Public append"` present; no `evidence_source_https`.
    - Function ACLs, evidence INSERT grants and the table default ACL unchanged; no active query on `evidence`.
    - The logs show only management-API health checks. **Nothing was applied, in whole or in part.**
- **Reproducibility:** the gates are reproducible from repo; the attempt is recorded only.

### EVAL-063: Connector confirmation diagnostic
- **Date:** 14:53:26 to 14:53:47.
- **Target:** static, docs, and live read-only.
- **Result:**
  - **Documentation:** the Supabase troubleshooting guide "SQL confirmations do not appear in your MCP client" says the server can ask for confirmation before running detected destructive SQL through `execute_sql` or `apply_migration`. The dialog needs the client to support form elicitations.
    - `skip_elicitations`, set on the MCP server URL, lists tools that run without the form.
    - Permissions and read-only restrictions still apply.
  - **This environment:**
    - The Supabase connector isn't configured in the container (no MCP entry in `~/.claude.json`, and no `.mcp.json` or settings file); it's attached through the owner's Claude account.
    - The current `skip_elicitations` value can't be read from here.
    - `MCP_TOOL_TIMEOUT=60000` matches the 60-second timeouts.
    - The owner saw no confirmation form in this cloud client.
  - **Production:** `list_migrations` at 14:53 still showed exactly 3 versions.
  - **Inference:** this client doesn't surface the connector's confirmation form, so a held call waits until the tool timeout. The tool never reported the hold itself.
- **Consequence:** DR-024 amendment A1.
- **Reproducibility:** recorded only.


## Stage 1 production deployment and validation (2026-10-02, 15:13 to 16:29)

Starting commit: `f1e52790f80b960109a7f9b465b90e2228026cef`, clean, in sync with `origin`.
**One production change resulted: the Stage 1 migration, applied once (EVAL-065).** Every other live call in this section was read-only.

### EVAL-064: Connector diagnostics and Supabase Deployment connector preflight
- **Date:** 15:13 to 16:04.
- **Target:** static, and live read-only. No Supabase tool was called before 16:04.
- **Run and result:**
  - **Connector configuration (15:13 to 15:30):**
    - The session's Supabase tools come from the owner's claude.ai "Supabase" directory connector. Nothing in the container configures it: no `.mcp.json`, no `.claude/` directory, no MCP entry in the user or managed settings, and the session process has no MCP config flag.
    - The local Claude Code CLI (2.1.287) can only add separate MCP servers; it can't edit a claude.ai connector. The session's network policy denies `mcp.supabase.com` (CONNECT 403).
    - The connector's URL, and so its `skip_elicitations` value, isn't readable from the session.
  - **Cause of the 60 s hold (15:37 to 15:46):** the owner had switched Claude's permission for `apply_migration` from "Needs approval" to "Always allow". The session record was analysed read-only:
    - `apply_migration`: the 3 earlier migrations (no DROP) succeeded in 11 to 16 s; the Stage 1 call with `drop policy` (EVAL-062) timed out at 60 s.
    - `execute_sql`: all 6 calls containing a DROP statement timed out at 60 s; none of the 42 without one did (39 succeeded, 3 returned ordinary SQL errors).
    - The error `MCP server "Supabase" tool "apply_migration" timed out after 60s` is raised by Claude Code's timer around the request to the MCP server, which starts only after Claude's own approval. At 14:48 that approval cleared within about 5 s.
    - **Conclusion:** the hold was the Supabase server's destructive-SQL confirmation, not Claude's tool approval, so the permission change alone didn't remove it.
  - **A second connector (15:49 to 15:53):** the directory connector's URL is copy-only in the owner's settings, so the owner set up a separate connector, "Supabase Deployment", for amendment A1. At 15:53 it was listed as `connect_incomplete`, with no tools in the session.
  - **Deployment connector preflight (16:04, read-only, through that connector only):**
    - Connected and enabled, with its own server ID. Its 27 tools are the same as the directory connector's, and `apply_migration` and `execute_sql` still say "Destructive statements may require the user to confirm before they run." The original "Supabase" connector stayed connected and enabled.
    - `get_project`: `ai-launch-readiness-console`, `ACTIVE_HEALTHY`, Postgres `17.11.0.002`. `get_organization`: the project's organization ("git-d3po", free plan).
    - `list_migrations`: exactly the 3 earlier versions.
- **Limitations:** the `skip_elicitations` value on either connector was never observable from the session. Its presence on the Deployment connector rests on the owner's configuration.
- **Reproducibility:** recorded only.

### EVAL-065: Stage 1 production deployment
- **Date:** 16:08 to 16:09. Authorized by the owner at 16:08 for exactly one `apply_migration` call through the Supabase Deployment connector.
- **Target:** live read-only, and one live write.
- **Run and result:**
  - **Repository:** HEAD `f1e5279`, clean, in sync. `supabase/migrations/20261002115318_stage1_security_hardening.sql` is 2205 bytes, md5 `f66a638dfb93554ad4f1a2bac0826304`, with no tabs, CRs or non-ASCII bytes, and one backslash.
  - **Preflight (16:08:33 to 16:08:39):** `get_project` `ACTIVE_HEALTHY`; `list_migrations` exactly the 3 earlier versions; the name `stage1_security_hardening` not among them.
  - **The apply:** one `apply_migration` call, sent at 16:08:51 through the Supabase Deployment connector, with `project_id` set to the production project, `name` `stage1_security_hardening` and `query` the file's exact text. It returned `{"success":true}` at 16:09:01. No confirmation form appeared and nothing was retried.
  - **Read-back (16:09:04 to 16:09:06):** `list_migrations` shows 4 versions: the 3 earlier ones and `20261002160901` `stage1_security_hardening`. `get_project` `ACTIVE_HEALTHY`.
  - No `execute_sql` call was made, and the original "Supabase" connector wasn't called.
- **Limitations:** the stored statement's md5 (DR-024 step 7, test C-11) wasn't read in this entry; it was read later (EVAL-068).
- **Reproducibility:** recorded only.

### EVAL-066: Stage 1 post-deployment validation on live
- **Date:** 16:11 to 16:14.
- **Target:** live read-only, through the Supabase Deployment connector only.
- **Run and result:**
  - **State (16:11:30):** `get_project` `ACTIVE_HEALTHY`, Postgres `17.11.0.002`; `list_migrations` exactly 4 versions, the 4th `20261002160901` `stage1_security_hardening`.
  - **Advisors (16:11:33):**
    - Security: **no lints.** Lints 0028 and 0029, which listed `reset_demo_data` and `set_gate_status` before the migration (EVAL-049, EVAL-062), are gone.
    - Performance, INFO only: 0001 (3 unindexed foreign keys: `decisions_gate_id_fkey`, `decisions_risk_id_fkey`, `risks_gate_id_fkey`) and 0005 (2 unused indexes: `decisions_launch_id_idx`, `risks_launch_id_idx`). Neither relates to Stage 1, which adds or drops no index or foreign key. Earlier records say only "performance INFO only", so whether 0005 was listed before isn't recorded.
  - **Catalog test (16:13:52 to 16:13:58):** `supabase/tests/security_catalog.sql`, unchanged since `e74aaaf` (md5 `444656761f14b65700d0285f7f1e8752`), passed verbatim in one `execute_sql` call. **17 of 17 PASS**, overall PASS:
    - 6 tables with RLS; 14 readable role-relation pairs; no INSERT, UPDATE, DELETE or TRUNCATE at table or column level; MAINTAIN checked.
    - 6 sequences, 3 functions, 1 view checked; all three SECURITY DEFINER functions pin `search_path`; 10 identical privileges for each API role.
    - No default grants for future tables; check 15 "7 of 7 parts match"; no CREATE on `public`; 24 relations and 3 functions owned by `postgres`.
  - **Fingerprint (16:14:22 to 16:14:29):** `supabase/tests/fingerprint.sql`, unchanged since `e74aaaf` (md5 `006e243bd4bb725d17d2dd12ecef88f2`), passed verbatim in one `execute_sql` call. **All 12 parts equal EVAL-045**, compared as full hashes: `column_write_grants` empty (NULL), and `columns`, `constraints`, `enums`, `functions`, `indexes`, `policies`, `rls+owners`, `seed_data`, `table_grants`, `user_triggers` and `views` identical. `seed_data` `dc85e31b82116a9fa79adaac8399aa90`: the canonical seed is intact.
  - Neither SQL call was held for confirmation. Each script is a single SELECT; its write keywords appear only in comments and string literals.
- **Limitations:**
  - The scripts ran through the connector, not inside an explicit read-only transaction as their headers suggest. Both are single SELECTs.
  - Not run on live in this entry: C-11 (the stored statement's md5; run later, EVAL-068), separate row counts (the `seed_data` part covers the rows' content), and the app in a browser.
- **Reproducibility:** the catalog and fingerprint parts are reproducible from repo, read-only; the advisors are recorded only.

### EVAL-067: DR-009 rename and amendment A1 cleanup
- **Date:** 16:17 to 16:21.
- **Target:** static. Nothing in this entry touched production.
- **Run and result:**
  - **DR-009 rename (16:17):** `git mv supabase/migrations/20261002115318_stage1_security_hardening.sql supabase/migrations/20261002160901_stage1_security_hardening.sql`.
    - Git records a pure rename: `R100`, 0 insertions, 0 deletions.
    - The renamed file is byte-identical to the deployed file: 2205 bytes, md5 `f66a638dfb93554ad4f1a2bac0826304`, sha256 `a6efa904...`, Git blob `d4e3811168e2716af7f8ec94440ec50dc8d817a1`.
    - The closeout commit carries it together with these release records.
  - **Amendment A1 cleanup:** the session had no mechanism to disable or edit a claude.ai connector, so the owner removed the Supabase Deployment connector in their settings. Afterwards its MCP server disconnected from the session and its tools were withdrawn. The original "Supabase" connector remains, unchanged.
- **Limitations:** the removal is owner-reported, plus the observed tool withdrawal. The connector's `skip_elicitations` value was never readable.
- **Reproducibility:** recorded only.

### EVAL-068: C-11 migration parity on live
- **Date:** 16:28:41 to 16:28:51.
- **Target:** live read-only, and static. One `execute_sql` call through the original "Supabase" connector, authorized for exactly this check.
- **Run:**
  - **Live:** EVAL-022's query, unchanged (the C-11 definition in the reconciliation record, §10; DR-024 step 7): `select version, name, md5(array_to_string(statements, '')), length(array_to_string(statements, '')) from supabase_migrations.schema_migrations`
  - **Repo:** `md5sum supabase/migrations/*.sql`, with the staged rename in the working tree.
- **Result: PASS.** Every stored statement matches its repository file.

  | Version | Live md5 | Repo file md5 | Characters |
  |---|---|---|---|
  | `20261002092043` (`phase1_schema`) | `2d4cf41fe73b0d2801dd51d69ece8e1b` | Same | 11486 |
  | `20261002092141` (`demo_seed`) | `d3dafe0c87fc0af20d00d518e96f0380` | Same | 14673 |
  | `20261002093521` (`revoke_rls_auto_enable_execute`) | `4842aef718ae632952d694863d244b8c` | Same | 569 |
  | `20261002160901` (`stage1_security_hardening`) | `f66a638dfb93554ad4f1a2bac0826304` | Same: `supabase/migrations/20261002160901_stage1_security_hardening.sql` | 2205 (the file is 2205 bytes) |

  - The first three rows equal EVAL-022. `phase1_schema` is 11488 bytes on disk and 11486 characters as stored, because the file holds multibyte characters; the md5s are identical.
  - Exactly 4 versions are recorded, each once, and versions, names and order agree with the repository.
  - The call returned at once, with no confirmation hold. No other production call was made.
- **Reproducibility:** recorded only. The query above repeats it.

## Stage 2 local implementation (2026-10-02, 16:59 to 17:11)

Starting commit: `da583ab0188b9e6b34de99046909cecdbb8bc03b`, clean. Specification: DR-025 and DR-004 amendment A2. **Nothing in this section touched the live project:** every database here is a disposable local one.

### EVAL-069: Fresh PG17 cluster; Stage 1 baseline before any change
- **Date:** 16:59 to 17:01.
- **Target:** local. A new Postgres 17.10 cluster (the EVAL-038 binaries, `--locale-provider=icu --icu-locale=en-US`, port 5433), database built from `local_roles.sql` and the 4 Stage 1 migrations.
- **Result:** catalog 17 of 17; Stage 1 behavior 24 of 24; integrity 6 of 6; fingerprint `seed_data` `dc85e31b82116a9fa79adaac8399aa90`, equal to EVAL-045.
- **Reproducibility:** reproducible from repo.

### EVAL-070: Tests first, on the Stage 1 build
- **Date:** 17:05.
- **Target:** local, the EVAL-069 database, with the Stage 2 test changes and no Stage 2 migration.
- **Result:**
  - Catalog: 16 of 17. Check 9 fails: none of the three sandbox functions exists.
  - `stage2_sandbox_behavior.sql`, `sandbox_invariants.sql`, `integrity_checks.sql` and `fingerprint.sql` stop on the missing `source_gate_id` / `source_launch_id` columns.
  - `stage1_behavior.sql`: 19 of 24, for the same reason.
  - So every new or scoped test depends on the Stage 2 schema it describes.
- **Reproducibility:** reproducible from repo.

### EVAL-071: Fresh replay of all 7 migrations; catalog, C-14, Stage 1 behavior, B-4
- **Date:** 17:08 to 17:10.
- **Target:** local, a fresh database built from `local_roles.sql` and the 7 migrations.
- **Files** (md5, bytes):
  - `20261002170823_sandbox_provenance.sql`: `23dd3270cdca77001fe2f9a86917d518`, 3739 (after the EVAL-074 fix)
  - `20261002170824_sandbox_seed.sql`: `b6c04e38855362dc4d6d4cdd2be16a68`, 20949
  - `20261002170825_sandbox_rpcs.sql`: `4eddf462523188fefba2098e46838b15`, 5921
  - The versions are authored timestamps. The Supabase CLI isn't installed in this container, so the files were written directly. Production assigns the real versions (DR-024).
- **Result:**
  - **Catalog** (read-only): 17 of 17. Check 2: SELECT on exactly the 6 tables and the view, so `sandbox_state` is unreadable. Check 9: exactly the three sandbox functions, for both roles. Check 15: 7 of 7 against the Stage 2 baseline (EVAL-072).
  - **C-14** (read-only): 7 of 7. One sandbox, 16 of 16 gates mapped, seed copies 10/10 evidence, 4/4 decisions, 6/6 risks, 3/3 stages.
  - **Stage 1 behavior:** 24 of 24, the 41 https reject cases included.
  - **B-4:** 29 of 29. Both roles add evidence and are refused canonical gates. Decisions are by "Sandbox visitor", origin `visitor`. The I8 rules hold through the sandbox. Caps reject the 11th item and the 21st decision. I14 and the https rule hold through the functions (12 of 12 cases). Direct writes, `sandbox_state` and every owner-only function are denied with 42501 for both roles. No function takes `origin`, `decided_by` or `recorded_on`. Canonical rows are byte-identical after 41 visitor writes and two resets. A reset restores a fresh copy; a second is refused with "Try again in 5 minutes."; after the cooldown, a second reset changes nothing. A failed sandbox rebuild rolls back the whole `reset_demo_data()` call, and `reset_demo_data()` rebuilds one fresh sandbox.
- **Reproducibility:** reproducible from repo.

### EVAL-072: Stage 2 fingerprint baseline
- **Date:** 17:09.
- **Target:** local, two independent fresh builds, read-only.
- **Result:** the two builds are identical, 12 of 12.

  | Part | Stage 2 md5 | vs EVAL-045 |
  |---|---|---|
  | canonical_data | `dc85e31b82116a9fa79adaac8399aa90` | Equal to `seed_data`: canonical rows untouched |
  | column_write_grants | empty | Same |
  | columns | `5ccb40dee76743f39a4925c451918d8b` | Changed (origin, source columns, sandbox_state) |
  | constraints | `a7f08cda3a69929594e9dad491fac570` | Changed (links, composite keys, I14). First measured as `0887380c748bd9214f38e3d6d87310b4` before the EVAL-074 fix |
  | enums | `340c40cc9480c4f6a58b865484673882` | Changed (`record_origin`) |
  | functions | `fce65ee849d92f05c1319787a5c08633` | Changed (M-5, M-6) |
  | indexes | `77508543fc9b1654352bd6731e735112` | Changed (unique keys) |
  | policies | `5413a6d3b0520ccf75b53f4f7067bef1` | Same: no policy added |
  | rls+owners | `212e4cf60f3f93c8149028d284bd0282` | Changed (`sandbox_state`) |
  | table_grants | `81ed597a2d217bdefda59babdc03008a` | Same: no grant added |
  | user_triggers | `334c4a4c42fdb79d7ebc3e73b517e6f8` | Same |
  | views | `6c60d69e83dedcece4f5b8c698c2ba7e` | Same |

  Catalog check 15 now expects the Stage 2 values for its seven parts.
- **Reproducibility:** reproducible from repo.

### EVAL-073: Integrity, concurrency, function ACLs, app checks
- **Date:** 17:10 to 17:11.
- **Target:** local and build.
- **Result:**
  - **Integrity suite** (fresh database): 6 of 6, scoped to the canonical launch. Afterwards C-14 is 7 of 7 and `canonical_data` is unchanged.
  - **Concurrency** (`stage2_concurrency.sh`, a fresh disposable database, two sessions): 2 of 2. Two sessions adding the 10th visitor item: one succeeds, the other is refused by the cap, and the gate holds exactly 10. Two simultaneous resets: one succeeds, the other is refused by the cooldown.
  - **Function ACLs:** `sandbox_add_evidence`, `sandbox_set_gate_status` and `sandbox_reset` are `{postgres=X, anon=X, authenticated=X}`. `reset_demo_data()`, the new 6-argument `set_gate_status` and `build_sandbox()` are `{postgres=X}` only. The 5-argument `set_gate_status` no longer exists. Every function pins `search_path = ''`. `sandbox_state` has RLS and no grant to `anon` or `authenticated`.
  - **App:** Vitest 11 of 11, typecheck exit 0, build succeeds. No `src/` file changed.
- **Reproducibility:** reproducible from repo.

### EVAL-074: Raw bidi characters in M-4, found and fixed; full re-run
- **Date:** 17:13 to 17:16.
- **Target:** static, and local (two fresh builds).
- **Finding:** a pre-commit encoding check found raw U+202A, U+202E, U+2066 and U+2069 characters in the six I14 constraint lines of `20261002170823_sandbox_provenance.sql`, where `\u` escapes were intended. The regex classes behaved correctly (EVAL-071 passed), but invisible bidirectional characters in source are the defect class of EVAL-055.
- **Fix:** each raw character was replaced by its `\u` escape. The file is now ASCII-only. A scan of every changed and new file finds no raw bidi, invisible or control character.
- **Re-run:** two fresh builds have identical fingerprints. Only the `constraints` part changed, to `a7f08cda3a69929594e9dad491fac570`, because the stored constraint text now holds the escapes. Catalog check 15 expects that value. Catalog 17/17, C-14 7/7, Stage 1 behavior 24/24, B-4 29/29 (the I14 cases included), integrity 6/6, concurrency 2/2, `canonical_data` `dc85e31b82116a9fa79adaac8399aa90`.
- **Reproducibility:** reproducible from repo.

### EVAL-075: Reset-vs-write race and P0001 wording, found in review and fixed
- **Date:** 2026-10-02, after EVAL-074.
- **Target:** local disposable databases, and static review.
- **Finding 1 (I13):** a pre-commit review of the Stage 2 tree found that `sandbox_reset()` locked only `sandbox_state` before deleting. A visitor write that already held its gate lock, with its row uncommitted, was invisible to the delete's snapshot and survived the reset. EVAL-073's two races didn't cover that ordering.
- **Fix:** `sandbox_reset()` now locks every sandbox gate `FOR UPDATE`, in id order, after `sandbox_state` and before the deletes (reconciliation record §19). Only gate rows are locked, not launches.
- **Test:** `stage2_concurrency.sh` was rewritten so the order of events is enforced through `pg_stat_activity` and `pg_blocking_pids`, not sleeps, and gained race 3 (write held open, then reset) and race 4 (reset held open, then write). Against the pre-fix function, race 3 fails as expected:
  ```
  3 | Write then reset ... | FAIL | reset waited on visitor: no; reset held sandbox_state: no; reset queued on a gates row: f; visitor rows visible before commit=0; after: visitor rows=2, race rows=2, sandbox gates differing from source=1, canonical unchanged: yes
  ```
  With the fix, race 3 passes: the reset holds `sandbox_state`, waits on the visitor's gate row, and after the visitor commits deletes both rows and restores the gate.
- **Finding 2 (adversarial pass on the fix):** at REPEATABLE READ the gate locks aren't enough. The reset's snapshot predates its lock wait, and a visitor that only added evidence locked the gate without updating it, so no serialization error fires. A scratch probe with the gate-locking function left 1 visitor row. API calls run at READ COMMITTED through PostgREST and no caller can choose another level, but a role or function setting could. `sandbox_reset()` now refuses any other level with P0001, and the concurrency script's check 5 expects that refusal at REPEATABLE READ and SERIALIZABLE, with nothing changed.
- **Finding 3 (wording):** the M-6 header and reconciliation record §19 said every rule violation raises P0001, and DR-025 item 7 said every visitor-facing rule is a P0001 message. A rolled-back probe as `anon` showed the function rules raising P0001, a CHECK violation (control character, http source, title over 200) 23514, a null title 23502, and an unknown evidence type 22P02. All three texts now distinguish the function rules from the constraint errors. Error behavior is unchanged.
- **Deadlock stress (scratch, recorded only):** 6 sessions making random visitor writes across all 16 sandbox gates (480 calls) and 2 sessions resetting in a loop (120 calls), run on the gate-locking function before the isolation check was added, which doesn't change the locks: 0 deadlocks. The only errors were the expected P0001 rules. A final reset left 0 visitor rows and every sandbox gate equal to its source.
- **Catalog:** check 15's `functions` part changes with the new body: `fce65ee849d92f05c1319787a5c08633` to `04dd6a74f664cd7a92deb5d491a90e8f`. Every other fingerprint part is unchanged.
- **Reproducibility:** the races and check 5 are reproducible from repo. The stress run and the REPEATABLE READ probe are recorded only.

### EVAL-076: Full re-run after the EVAL-075 fixes
- **Date:** 2026-10-02, after EVAL-075.
- **Target:** local (fresh Postgres 17.10 builds of all 7 migrations), and build.
- **Files** (md5, bytes): M-4 and M-5 are unchanged from EVAL-071. `20261002170825_sandbox_rpcs.sql` is now `251c97134247b56dc91acebaa8221a6c`, 7331 (EVAL-071 recorded `4eddf462523188fefba2098e46838b15`, 5921). The Stage 1 migration is unchanged: `f66a638dfb93554ad4f1a2bac0826304`, 2205.
- **Result:**
  - Two fresh builds have identical fingerprints. Against EVAL-072 only `functions` differs (EVAL-075); `canonical_data` is `dc85e31b82116a9fa79adaac8399aa90`.
  - Catalog 17/17. C-14 7/7. Stage 1 behavior 24/24. B-4 29/29. The fingerprint is identical after the rolled-back suites.
  - Integrity 6/6; afterwards C-14 is 7/7 and `canonical_data` is unchanged.
  - Concurrency on a fresh build, run twice: races 1 to 4 and check 5 pass. Afterwards C-14 is 7/7 and `canonical_data` is unchanged.
  - Function ACLs are unchanged: the three sandbox functions are `{postgres=X, anon=X, authenticated=X}`; `reset_demo_data()`, `set_gate_status` and `build_sandbox()` are `{postgres=X}`. Every function pins `search_path = ''`, and all are owned by `postgres`. `sandbox_state` has RLS and no grant to `anon` or `authenticated`.
  - App: Vitest 11 of 11, typecheck exit 0, build succeeds.
- **Reproducibility:** reproducible from repo.

### EVAL-077: Visitor functions refuse isolation levels above READ COMMITTED
- **Date:** 2026-10-02, after EVAL-076.
- **Target:** local disposable databases.
- **Question:** EVAL-075 made `sandbox_reset()` refuse REPEATABLE READ and SERIALIZABLE. Which visitor functions also depend on READ COMMITTED for a documented invariant?
- **Probe (scratch, before the change):** lock-controlled two-session races on a fresh build. One session held a READ COMMITTED call open; the other ran at REPEATABLE READ or SERIALIZABLE and started before the first committed.

  | Function and race | REPEATABLE READ | SERIALIZABLE | Needs the refusal |
  |---|---|---|---|
  | `sandbox_add_evidence`, racing the 10th item | 11 visitor items (I12 broken) | 11 visitor items | Yes |
  | `sandbox_set_gate_status` to Passed, racing a reset that deleted the gate's only evidence | Gate Passed with 0 evidence (I8 broken) | Same | Yes |
  | `sandbox_set_gate_status`, racing the 20th decision | 40001, 20 decisions | 40001, 20 decisions | Not for the cap: every accepted change updates the gate |

  The cause is the one in EVAL-075. At the higher levels the snapshot is taken before the lock wait, and a gate row that another session only locked, without updating it, raises no serialization error.
- **Change:** `sandbox_add_evidence` and `sandbox_set_gate_status` now refuse REPEATABLE READ and SERIALIZABLE with P0001 before taking any lock, as `sandbox_reset` does. The cap values, the locks and the READ COMMITTED behavior are unchanged. The owner-only `set_gate_status` is unchanged.
- **Tests:** `stage2_concurrency.sh` gained checks 6 to 9, all lock-controlled:
  - checks 6 and 7: each visitor function succeeds at READ COMMITTED and is refused at both higher levels, with visitor data byte-identical;
  - races 8 and 9, at each higher level: the two probes above, now refused.

  Race 1 also checks that both sides of the cap race ran at READ COMMITTED. On the pre-guard build, checks 6 to 9 fail and races 8 and 9 reproduce the probe (11 items; Passed with 0 evidence). On the guarded build, 9 of 9 pass on three consecutive runs.
- **Catalog:** check 15's `functions` part changes to `849220530a3d4b56a35f4e154a6d19e6`.
- **Correction to EVAL-075:** its remark that a PostgREST role or function setting could change the isolation level of API calls wasn't verified. The M-6 header and §19 now state only what holds: an API caller can't choose the level, and the server's configuration sets it.
- **Reproducibility:** checks 6 to 9 are reproducible from repo. The probe table is recorded only.

### EVAL-078: Full re-run after EVAL-077
- **Date:** 2026-10-02, after EVAL-077. The suites below ran on the final files.
- **Target:** local (fresh Postgres 17.10 builds of all 7 migrations), and build.
- **Files** (md5, bytes): `20261002170825_sandbox_rpcs.sql` is now `283c1e59342ece367e58c693f33c029a`, 8698, the final file after a header comment was reworded (EVAL-077's correction); its function definitions are those measured in EVAL-077. M-4 and M-5 are unchanged from EVAL-071; the Stage 1 migration is unchanged (`f66a638dfb93554ad4f1a2bac0826304`, 2205).
- **Result:**
  - Two fresh builds have identical fingerprints. Against EVAL-072 only `functions` differs; `canonical_data` is `dc85e31b82116a9fa79adaac8399aa90`.
  - Catalog 17/17 on both builds. C-14 7/7. Stage 1 behavior 24/24. B-4 29/29. The fingerprint is identical after the rolled-back suites. Integrity 6/6; afterwards C-14 is 7/7 and `canonical_data` is unchanged.
  - Concurrency: 9 of 9 on two consecutive runs on a fresh build of the final files, after five earlier 9 of 9 runs on builds with the same function definitions (EVAL-077). Afterwards C-14 is 7/7 and `canonical_data` is unchanged.
  - **Function ACLs:**
    - The three sandbox functions are `{postgres=X, anon=X, authenticated=X}`. `reset_demo_data()`, `set_gate_status` and `build_sandbox()` are `{postgres=X}`.
    - No function is executable by PUBLIC.
    - Every function is owned by `postgres` and pins `search_path = ''`. Every function except `build_sandbox()` (SECURITY INVOKER) is SECURITY DEFINER.
    - No migration uses EXECUTE.
  - **RLS:** on for all seven tables; `sandbox_state` has no policy and no grant to `anon` or `authenticated`.
  - **Stress (scratch, recorded only):**
    - **Mixed run:** 480 visitor calls at READ COMMITTED on random gates, 80 calls at REPEATABLE READ or SERIALIZABLE (all 80 refused) and 120 resets. 0 deadlocks; no sandbox gate Passed without evidence, no visitor row on the canonical launch, canonical rows unchanged.
    - **Cap run, no resets:** 8 sessions making 240 adds and 240 status changes on two gates, and 30 refused REPEATABLE READ adds. 0 deadlocks. Both gates stopped at exactly 10 visitor items and 20 visitor decisions, and each gate's status equals its latest decision. C-14 7/7.
  - App: Vitest 11 of 11, typecheck exit 0, build succeeds.
- **Reproducibility:** reproducible from repo, except the stress runs.

### EVAL-079: A1, P0001 shown verbatim and other errors generic
- **Date:** 2026-10-02, after EVAL-078.
- **Target:** local (Vitest, and a local PostgREST 12.2.3 on a disposable database built from this repository). No production call.
- **Change:** `src/lib/errors.ts` is the boundary. `fetchLaunchRows` and `fetchLaunchOverview` throw `toDataError(error)` instead of `new Error(error.message)`, and both pages show `userMessage(error, 'Could not load data')` instead of the error's message. No migration, permission or dependency changed.
- **Tests:** `src/lib/errors.test.ts`, 13 tests through a real supabase-js client whose fetch returns PostgREST error bodies captured from the local database as `anon`. They cover:
  - two P0001 messages, and a structured-looking one, shown exactly as raised;
  - a CHECK violation, a NOT NULL violation and a permission error, shown only as generic text with their codes; no raw message or `details` text reaches the shown text or the thrown error;
  - a network failure, a non-JSON body, a malformed code and a non-database error, shown as generic text alone;
  - the overview path, and a successful load with its result unchanged.

  With the launches path reverted to `new Error(error.message)`, 6 of the 13 fail.
- **End to end (recorded only):** the real data layer and boundary against the local PostgREST, as `anon`. The launches load succeeds (both launches, "6 of 16 passed"). `sandbox_add_evidence` on a canonical gate shows `Only sandbox gates accept visitor evidence` verbatim. A control character (23514), a null title (23502), an unknown evidence type (22P02) and a direct insert (42501) each show `Could not save (code XXXXX)`, without the constraint or column names their raw messages carry.
- **Result:** Vitest 24 of 24 (11 existing, 13 new); typecheck exit 0; build succeeds.
- **Reproducibility:** the unit tests are reproducible from repo; the end-to-end run is recorded only.

### EVAL-080: A9 types generated from a local Stage 2 database; A8 provenance fields
- **Date:** 2026-10-02, after EVAL-079.
- **Target:** local only. A disposable database built from `local_roles.sql` and the 7 migrations; no production call, and the live project (Stage 1 only) wasn't used as a source.
- **A9, method:** the official Supabase CLI 2.119.0, installed with npm in a scratch directory outside the repository and run directly from that installation (no change to the repository's `package.json` or lockfile), in its direct-URL mode, which needs neither Docker nor a project:
  ```
  supabase gen types typescript --db-url "postgresql://postgres@127.0.0.1:5433/<local db>?sslmode=disable" --schema public | sed 's/[[:space:]]*$//'
  ```
  The `sed` only strips trailing whitespace from two blank lines; the file is otherwise the CLI's output byte for byte, and two runs produced identical output. The output is unformatted, and it has no `__InternalSupabase` block, because a database URL carries no PostgREST version; supabase-js treats that block as optional.
- **A9, check:** every column of the 8 public relations (65) and every public function with its argument names (6) appear in the file. Stage 2 adds `origin`, `source_launch_id`, `source_gate_id`, `sandbox_state`, the `record_origin` enum, the composite same-launch keys, the three sandbox functions, `build_sandbox`, and the 6-argument `set_gate_status`; the 5-argument one is gone. Like the earlier generated file, it lists owner-only objects too: types grant nothing, and the rule that the client calls only the three sandbox functions stays a code rule (§19).
- **A8:** `fetchLaunchRows` and `fetchLaunchOverview` select `source_launch_id` and expose it as `sourceLaunchId` (null for a canonical launch); the overview's latest decisions select `origin`. Errors still go through `toDataError`. `source_gate_id` isn't selected: §10 lists only `origin` and `source_launch_id`, and "link to the sandbox" (A4, §19) is satisfied by the sandbox launch; a gate-level link would be an A4 decision.
- **Tests:** 29 of 29. The new ones check the selected columns and the mapped fields for a canonical and a sandbox launch, the overview's launch source and decision origins, and that read errors are still `DataError`s; with the two new columns removed from the selects, 2 fail. The stub client from EVAL-079 moved to `src/lib/testing.ts`, and the sandbox function calls in `errors.test.ts` now use the typed client.
- **End to end (recorded only):** against a local PostgREST, as `anon`: the list returns the canonical launch with `sourceLaunchId` null and the sandbox with 1. A typed `sandbox_set_gate_status` call created a visitor decision, which the sandbox overview returns with origin `visitor` and decider "Sandbox visitor"; the canonical overview returns only `seed` decisions.
- **Reproducibility:** the generation command and unit tests are reproducible from repo; the end-to-end run is recorded only.

### EVAL-081: A3 and the refresh infrastructure
- **Date:** 2026-10-02, after EVAL-080.
- **Target:** local (Vitest; a Vite dev server against a local PostgREST on a disposable database built from the migrations, as `anon`), and build. No production call.
- **Change:**
  - **Refresh (I17; §19, Refetch):** `AppShell` owns a refresh counter and `refresh()`, passed through the router's outlet context and read with `useRefresh()`. It lives in `AppShell` because the reset button (A7) sits in its header, outside the routed pages, and the outlet context needs no new library. `LaunchesPage` and `LaunchOverviewPage` put the counter in their fetch effects. Nothing calls `refresh()` yet; A4 and A7 add the callers.
  - **Loading versus refresh:** the overview shows its loading state only when the data on screen belongs to another launch (`showsLoading` in `src/lib/refresh.ts`): an initial load or a route change. A refresh of the same launch keeps the content until the new data arrives. The launches list sets its loading state only initially, so a refresh keeps its rows too.
  - **A3:** `sourceLaunchId !== null` is the only sandbox test. The list keeps the sandbox launch and marks it with a neutral "Sandbox" `StatusChip`, preceded by a real space so its text doesn't run into the name. The title chip counts canonical launches only (`canonicalLaunches` in `src/lib/launches.ts`) and is hidden when there are none, as it was for an empty list. The sandbox overview shows the §19 banner text, informational only, above the title.
- **Tests:** 34 of 34. New: `canonicalLaunches` (order, the seeded pair counting as one canonical launch, only-sandbox and empty input) and `showsLoading` (initial load, route change, refresh).
- **Browser check (recorded only), at 1440 px light and 390 px dark:** the canonical row has no badge and the sandbox row reads "Halcyon Support Copilot (sandbox) Sandbox"; the title chip reads "1 not ready"; the sandbox overview shows the banner, with no link or button in it, and the canonical overview doesn't; no horizontal scroll. Keeping content during a refresh isn't browser-checked, because nothing triggers a refresh yet; the unit test covers the rule.
- **Result:** typecheck exit 0; build succeeds.
- **Reproducibility:** the unit tests are reproducible from repo; the browser check is recorded only.

### EVAL-082: A6, the source rendering rule
- **Date:** 2026-10-02, after EVAL-081.
- **Target:** local (Vitest) and build. No database or production involvement.
- **Change:** `sourceView` in `src/lib/source.ts` returns `none` for a null source, `text` for a visitor-origin source or a seed source that doesn't parse or isn't https, and `link` (with `href` from the parsed URL and `rel: 'noopener noreferrer nofollow'`, no `target`) for a seed source whose `new URL(source).protocol` is `'https:'`. The rule depends on the row's `origin` only, so seed rows copied into the sandbox follow the seed rule. No page uses it yet: nothing renders `source` until the gate sheet.
- **Tests:** `src/lib/source.test.ts`, 6 tests: a seed https link with the exact `rel` and no `target`; a visitor https source as text; seed `http:`, `javascript:`, `data:` and `mailto:` as text; unparseable seed sources as text; an upper-case `HTTPS:` scheme linking, as `new URL` reports `https:`; a null source as `none` for either origin. With the origin check removed, 1 test fails; with `rel` weakened to `noopener`, 2 fail.
- **Result:** 40 of 40 tests; typecheck exit 0; build succeeds.
- **Reproducibility:** reproducible from repo.

### EVAL-083: A4, the gate sheet with the sandbox link and the forms
- **Date:** 2026-10-02, after EVAL-082.
- **Target:** local (Vitest; a Vite dev server against a local PostgREST on a disposable database built from the migrations, as `anon`) and build. No production call, and no change under `supabase/`.
- **Change:** `src/lib/gate.ts` (the gate query; `addSandboxEvidence` and `setSandboxGateStatus`, which call only the two sandbox functions and omit a blank source and non-Waived waiver text; field checks; status choices), `src/pages/GateSheet.tsx` (the sheet), the nested route in `src/App.tsx`, the overview's sandbox lookup and link, `SandboxBanner` shared by the overview and the sheet, and `keepsContentOnFailure` for failed refreshes. The test stub now also passes each request's method and JSON body.
- **Tests:** 60 of 60 (20 new). They cover the gate query (columns, launch scoping, mapping, visitor counts, not found, errors); the two writes as sent over the wire (function name, POST, trimmed fields, the omitted arguments, P0001 shown verbatim, 23514 shown generically); field checks, including code-point lengths; status choices with "Add evidence first"; the overview's sandbox lookup; and the refresh-failure rule.
- **Browser walkthrough (recorded only), 29 of 29.** On a fresh local database where one canonical seed row was given an https source:
  - **Canonical pages:** the overview and a canonical gate sheet link to `/launches/2`, and have no form controls.
  - **Sheet behavior:** opening a gate goes to `/launches/1/gates/14` with its title focused and the overview inert. Escape and Back close it. A deep link opens the sheet over the overview. A gate of another launch shows "This launch has no such gate."
  - **Sources (A6):** the seed https source is a link with `rel="noopener noreferrer nofollow"` and no `target`; a visitor's https source is plain text.
  - **Forms:** an empty evidence form shows field errors and sends nothing, and Passed is disabled as "Passed (Add evidence first)". Adding evidence updated the sheet and the overview's count from 0 to 1, and a status change updated both, with the new decision in the latest decisions. A control character in a title showed "Could not save (code 23514)" without the constraint name.
  - **Refresh failure:** with reads made to fail after a successful write, both views kept their content and showed the refresh alerts with "Could not load data (code XX000)", not the raw message. No loading state replaced content during any refresh.
  - **Not built:** there is no standalone "Visitor" label (A5), and the header still has the disabled "Reset demo data" placeholder (A7).
  - **Layout:** at 390 px the sheet is full-screen with no horizontal scroll.
- **Result:** typecheck exit 0; build succeeds.
- **Reproducibility:** the unit tests are reproducible from repo; the browser walkthrough is recorded only.

### EVAL-084: A5, the "Visitor" label on listed evidence and decisions
- **Date:** 2026-10-02, after EVAL-083.
- **Target:** local (Vitest; a Vite dev server against a local PostgREST on a disposable database built from the migrations, as `anon`) and build. No production call, and no change under `supabase/`, to packages or to configuration.
- **Change:** `provenanceLabel` in `src/lib/provenance.ts` ("Visitor" for `origin` `visitor`, null for `seed`), `ProvenanceLabel` in `src/components/ProvenanceLabel.tsx` (the neutral chip), and one use each in `src/pages/GateSheet.tsx` (after the evidence type) and `src/pages/LaunchOverviewPage.tsx` (after the decider). No query, mutation, form, refresh or route changed.
- **Tests:** `src/lib/provenance.test.ts`, 5 tests: visitor evidence labeled; seed evidence unlabeled; a visitor decision labeled; a seed decision unlabeled; and origin alone deciding, with a seed decision whose decider is "Sandbox visitor" unlabeled, a visitor decision with an ordinary decider labeled, a copied seed row unlabeled, and a visitor row without source or date labeled.
- **Browser walkthrough (recorded only), 24 of 24.** On a fresh local database where one canonical seed row was given an https source (one earlier run stopped on a script error, choosing a status the gate already had, and was rerun on a rebuilt database):
  - **Seed rows:** the canonical overview's 4 decisions, the sandbox overview's 4 copied decisions, canonical gate evidence and copied sandbox evidence show no label.
  - **Visitor rows:** evidence added on a sandbox gate shows "Visitor" in its metadata row after the type (`Observation`, `Visitor`, the date), while the seed item beside it stays unlabeled. After a status change the overview shows 5 decisions; only the new one is labeled, after the unchanged decider "Sandbox visitor". Both labels persist after a full reload.
  - **Unchanged:** the seed https source is still a link with the A6 `rel` and no `target`, and the visitor source is plain text; the canonical sheet has no form controls; the sheet has no decision heading; the form's "Recorded by: Visitor" line is present; the header's "Reset demo data" placeholder is still disabled.
  - **Presentation:** both labels use the same neutral chip classes, with no emerald, amber or red. Text contrast is 16.03:1 in light mode and 18.11:1 in dark mode. No horizontal scroll at 390 px.
- **Result:** typecheck exit 0; build succeeds.
- **Reproducibility:** the unit tests are reproducible from repo; the browser walkthrough is recorded only.

### EVAL-085: A7, the header sandbox reset, and the launch list's refresh rule
- **Date:** 2026-10-02, after EVAL-084.
- **Target:** local (Vitest; a Vite dev server against a local PostgREST on a disposable database built from the migrations, as `anon`, through a scratch proxy that can fail reads, fail or slow the reset call, and log requests) and build. No production call, and no change under `supabase/`, to packages or to configuration.
- **Change:** `src/lib/reset.ts` (`resetSandbox`, which calls `sandbox_reset()` with no arguments; `runReset`, which maps the result to done, rejected or failed); `src/components/ResetSandbox.tsx` (the header button and confirmation dialog) replacing the placeholder in `AppShell`; `launchesLoaded` and `launchesFailed` in `src/lib/launches.ts`, used by `LaunchesPage` to keep its rows on a failed refresh.
- **Tests:** 14 new, 79 of 79 in total. `src/lib/reset.test.ts`: the call is one POST to `/rpc/sandbox_reset` with an empty body; P0001 kept verbatim, without a refresh; another error shown as "Could not reset the sandbox (code 42501)" with no raw text, and with a refresh; an error without a usable code as the generic text alone; the approved confirmation text; and a scan of the application source showing it calls only the three sandbox functions and writes no table. `src/lib/launches.test.ts`: a failed refresh keeps the rows with the error beside them; a later success clears it; a failed initial load shows the error; a refresh after a failed initial load stays an error. Cancel can't be unit-tested without a component harness, which wasn't added; the walkthrough covers it.
- **Browser walkthrough (recorded only), 41 of 41.** On a fresh local database. The cooldown row was aged between steps so the real `sandbox_reset()` could run again; no function was changed. The first runs failed on script errors (a status select's "Waived" option matched as text, a wrong seed count, an uncleared request log, and two reads taken too early); each was fixed in the script and rerun on a rebuilt database, and a separate probe confirmed that one reset makes the open sheet send its own three queries and the overview its eight.
  - **Control:** the header shows an enabled "Reset sandbox"; "Reset demo data" and any reset control in a page are gone.
  - **Confirmation:** the approved text; focus on Cancel; Enter on Cancel, Escape and Cancel each close the dialog and sent no request at all; focus returns to the header button; Escape in the dialog leaves an open gate sheet open.
  - **Reset:** with 10 visitor evidence items (the cap), a waiver and a visitor decision on the sandbox, one confirmed reset sent exactly one write, `POST /rpc/sandbox_reset`, and showed "Sandbox reset". The sheet then showed no visitor evidence and no "Visitor" labels, the status chip back to "Not started", and the evidence form again; the database had 0 visitor evidence, 0 visitor decisions, its 10 seed evidence rows, and every sandbox gate equal to its source. Canonical rows hashed the same before and after.
  - **Cooldown and races:** a second reset showed "The sandbox was not reset." and "The sandbox was reset recently. Try again in 5 minutes." verbatim, and sent no refetch. Two concurrent calls: one returned 204 and the other the cooldown P0001.
  - **Pending:** with the call slowed, both buttons were disabled, Escape kept the dialog, and only one call was sent.
  - **Generic failure:** a simulated 500 (`XX000`, with a message, detail and hint) showed only "Could not reset the sandbox (code XX000)", without a "not reset" claim, and refetched.
  - **Launch list:** a reset that succeeded while reads failed showed "Sandbox reset" in the dialog, and the list kept both rows beside "Could not refresh launches." with "Could not load data (code XX000)", with no loading state. A later reset with reads working cleared the alert. A failed initial load still shows "Could not load launches." with no table.
  - **Other routes:** close, reset and reopen on a capped gate gave the form back; on the sandbox overview the blocking count went from 9 to 10 after a visitor's Passed was undone, with no visitor decisions left; on the canonical overview and a canonical gate sheet the reset refetched, and the content and read-only state were identical.
  - **Gate sheet open:** the sheet's backdrop (A4) covers the header button, so with a sheet open it was reached by keyboard.
- **Superseded in part (EVAL-086):** this run tested the first A7 build, where a P0001 rejection didn't refresh and the gate sheet covered the header. Both were changed before the commit; EVAL-086 tests the final behavior.
  - **Presentation:** at 390 px the dialog fits with a 16 px margin and the page doesn't scroll sideways. Dialog text contrast is 16.74:1 in light mode and 16.03:1 in dark mode.
- **Result:** typecheck exit 0; build succeeds.
- **Reproducibility:** the unit tests are reproducible from repo; the browser walkthrough is recorded only.

### EVAL-086: A7 follow-up, reset usable with a gate sheet open, and a P0001 rejection refreshes
- **Date:** 2026-10-02, after EVAL-085.
- **Target:** as EVAL-085: local Vitest, a Vite dev server against a local PostgREST on a disposable database through the scratch proxy, and build. No production call, and no change under `supabase/`, to packages or to configuration.
- **Why:** EVAL-085 found that the gate sheet's backdrop covered the header, so the global reset couldn't be clicked from the sheet that tells the visitor to reset; and a P0001 rejection didn't refresh, which could leave pre-reset data on screen after another visitor's reset won.
- **Change:** the header is sticky (`z-30`) and `AppShell` publishes its measured height as `--header-height`; the gate sheet and its backdrop start there instead of at the top, and the sheet drops `aria-modal` (the overview stays `inert`). The skip link gained `focus:z-40`. `runReset` now asks for a refresh after a P0001 rejection too.
- **Tests:** 80 of 80. `src/lib/reset.test.ts` now checks that a P0001 rejection is shown verbatim, isn't success, sends only `sandbox_reset`, and asks for a refresh; and that P0001 messages are treated alike whatever their text, including one that reads "Sandbox reset".
- **Browser walkthrough (recorded only), 56 of 56.** The EVAL-085 walkthrough, now with the pointer everywhere, plus new checks, on a fresh database. Two runs stopped on script errors (an escaped regular expression, and a dialog closed before a contrast reading) and one failed on a script ordering error (a step that needed the cooldown aged); each was fixed and rerun on a rebuilt database.
  - **Gate sheet open:** "Reset sandbox" is the topmost element at its position and opens the dialog by click; the sheet starts exactly at the header's bottom edge (50.5 px), the overview is inert, and the sheet has no `aria-modal`. Cancel, confirm, the 10-item cap, waiver and decision reset, canonical hash and seed evidence results are as in EVAL-085.
  - **P0001:** the cooldown message is shown verbatim, without "Sandbox reset", and the sheet and the overview each refetched exactly once (one `GET /evidence`, one `GET /risks`).
  - **Stale state:** with a visitor item on screen, another visitor's reset ran (204); this visitor's reset was refused with the cooldown message, and the refresh removed the stale item. With reads failing, a refused reset showed the rejection in the dialog, and the sheet kept its content beside "Could not refresh this gate."
  - **Sheet behavior:** the heading is focused on open; clicking the backdrop and pressing Escape still close the sheet; opened from an overview scrolled 328 px, the header is on screen at the top and the sheet starts below it; the skip link is visible on top when focused.
  - **Phones (390 px):** the sheet is full width below the 82 px header with no horizontal scroll; a tap on "Reset sandbox" opens the dialog with the sheet open, and the sheet's Close stays tappable.
  - **Unchanged from EVAL-085:** the launch list's refresh rule, the generic failure, pending state, the concurrent race, the other routes, and dialog contrast (16.74:1 light, 16.03:1 dark).
- **Sticky-header focus fix (after the final A7 audit):** the audit found that the sticky header could cover keyboard focus: pressing Shift+Tab up the sandbox overview left 5 focused controls at 1440 px and 7 at 390 px partly or fully under it, several fully hidden. `src/index.css` now sets `html { scroll-padding-top: var(--header-height, 0px); }`, reusing the height `AppShell` measures, so the browser stops focus scrolling and in-page jumps below the header.
  - **Keyboard focus, 14 of 14 checks:** Tab forward and Shift+Tab back through every control on the sandbox overview (52 and 53 focus stops). Worst overlap with the header: 0 px at 1440 px (light), and 0.5 px of a 20 px link at 390 px (dark), a sub-pixel boundary that leaves it visible. The skip link itself is excluded from the measure, since it is drawn above the header when focused.
  - **Skip link:** from a page scrolled 400 px, it is visible on top when focused, and Enter goes to `#main` with the page heading below the header (128 px at 1440, 198.5 px at 390).
  - **Regressions:** no horizontal scroll; the sheet still starts exactly at the header's bottom edge; with the sheet open, "Reset sandbox" opens and cancels and the sheet's Close works, at both widths. The 56-check walkthrough was rerun with the fix and passed 56 of 56. The first focus run flagged only the skip link, which the probe wrongly measured; the probe was corrected and rerun on a rebuilt database.
- **Result:** typecheck exit 0; build succeeds.
- **Reproducibility:** the unit tests are reproducible from repo; the browser walkthrough is recorded only.

### EVAL-087: Lovable presentation pass, imported and validated
- **Date:** 2026-10-02, after EVAL-086 and the deployment runbook.
- **Target:** local (Vitest; a Vite dev server against a local PostgREST on a disposable database built from all seven migrations, as `anon`) and build. No production call, and no change under `src/lib/`, `src/domain/`, `supabase/`, packages or configuration.
- **Import (DR-004 A2):** the archive held exactly six presentation files; all were imported after review. Reconciled on import: the sandbox banner's accent border became neutral (DR-012); five About sentences were corrected: provenance is on evidence and decisions, not "every record"; source links aren't "verified"; the tests aren't run "for each release"; the reset has a 5-minute cooldown; and a marketing phrase was removed. DR-012 A1 records the owner-approved accent and red uses. Every new class was found in the built CSS, including the inset accent shadow and the `max-sm:` and `nth-child` variants.
- **Tests:** 80 of 80 (no test changed); typecheck exit 0; build succeeds.
- **Browser walkthrough (recorded only), 131 of 131,** at 1440 and 390 px, light and dark, on real seed data:
  - **Launches:** canonical and sandbox rows; blocker counts equal the database's (10), emphasized when nonzero; row hover; visible focus; header text contrast 6.76:1 or better; no page-level horizontal scroll.
  - **Canonical overview:** the summary strip shows Owner, Target, Stage and Readiness with their real values (2 by 2 on phones); the "Try this in the sandbox" link to `/launches/2` with the read-only explanation; 10 blocking gates; gates and risks tables; three numbered stages with exactly one `aria-current="step"`; four decisions without "Visitor" labels; headings h1 then h2.
  - **Sandbox:** the banner names the header reset and holds no link or button; no sandbox link or read-only text there.
  - **Gate sheets:** the canonical sheet's boxed read-only note and sandbox link, no form controls, the seed https source still a link with the A6 `rel`, and the header reset clickable over the sheet. The sandbox sheet's metadata box, both hints, and headings h2 then h3.
  - **About:** renders with "About" marked current, headings h1 then h2, focusable link below the sticky header, no horizontal scroll.
  - **Contrast:** submit buttons 6.56:1 light and 8.16:1 dark; "Current" 6.56:1 and 8.16:1; the sandbox link 6.16:1 or better; About's muted text 7:1 or better.
  - **Writes:** an empty submit sends nothing; a control character shows "Could not save (code 23514)"; a saved item is labeled "Visitor" with its source as plain text; a status change refetches with a "Visitor" decision; a reset from the restyled sheet removes both and restores the status.
- **Regression:** on a rebuilt database the EVAL-086 walkthrough passed 56 of 56 and the keyboard-focus probe 14 of 14.
- **Reproducibility:** the unit tests are reproducible from repo; the browser walkthrough is recorded only.

## Stage 2 production window, interrupted after M-4 (2026-10-03, 18:14 to 18:43)

All times in this section are UTC on **2026-10-03**. Starting commit: `988e7381228b9620fce087cc544df186ccc2db37` (`main`), clean, in sync with `origin/main`.
**One production change resulted: M-4, applied once.** Every other production call in this section was read-only. M-5 and M-6 were not applied, and nothing was retried, repaired or corrected on production.

### EVAL-088: Stage 2 production window, stopped after M-4 on a parity mismatch
- **Date:** 18:14 to 18:43 on 2026-10-03. Authorized by the owner for the Stage 2 database window under the §20 runbook of the reconciliation record (M-4, then M-5, then M-6, with hard stops).
- **Target:** live read-only, and one live write (M-4).
- **First attempt (18:14 to 18:17): preflight only, stopped before any write.**
  - Only the original "Supabase" connector was present. It holds statements containing `DROP` for a confirmation this client doesn't display (EVAL-063, EVAL-064), and M-5 contains `drop function public.set_gate_status(...)`. No DR-024 amendment A1 connection was in place.
  - Preflight P1 to P7 (§20) passed through that connector, read-only: `ACTIVE_HEALTHY`, Postgres `17.11.0.002`; exactly the 4 Stage 1 versions; C-11 for the 4 equal to their files; the Stage 1 fingerprint instrument 12 of 12 equal to EVAL-045, `seed_data` `dc85e31b82116a9fa79adaac8399aa90`; the Stage 1 catalog instrument 17 of 17; isolation `read committed` with no overrides; no security lints, and only the two known INFO performance lints (0001, 0005).
  - Stopped before M-4, so that a confirmation hold at M-5 couldn't leave production half-deployed. Nothing was applied.
- **Second attempt (18:28 to 18:37): preflight, M-4, stop.**
  - **Connectors:** the owner had added a temporary "Supabase Deployment" connector under DR-024 amendment A1. The normal "Supabase" connector was used for every read; the Deployment connector was used for exactly one call, the M-4 `apply_migration`.
  - **Repository (before any production call):** HEAD `988e738`, clean, in sync. M-4 `20261002170823_sandbox_provenance.sql` md5 `23dd3270cdca77001fe2f9a86917d518` (3739 bytes, ASCII); M-5 `b6c04e38855362dc4d6d4cdd2be16a68`; M-6 `283c1e59342ece367e58c693f33c029a`. The Stage 1 instruments from `da583ab`: fingerprint `006e243bd4bb725d17d2dd12ecef88f2`, catalog `444656761f14b65700d0285f7f1e8752`.
  - **Preflight (18:29:02 to 18:33:09), all pass:**

    | # | Result |
    |---|---|
    | P1 | `ACTIVE_HEALTHY`, Postgres `17.11.0.002` |
    | P2 | Exactly 4 versions, through `20261002160901` `stage1_security_hardening` |
    | P3 | `2d4cf41fe73b0d2801dd51d69ece8e1b`, `d3dafe0c87fc0af20d00d518e96f0380`, `4842aef718ae632952d694863d244b8c`, `f66a638dfb93554ad4f1a2bac0826304`: all equal their files |
    | P4 | Stage 1 fingerprint instrument: 12 of 12 equal EVAL-045, `seed_data` `dc85e31b82116a9fa79adaac8399aa90` |
    | P5 | Stage 1 catalog instrument: 17 of 17 |
    | P6 | `read committed`; no override for the database, `anon`, `authenticated` or `authenticator` |
    | P7 | Security: no lints. Performance: INFO 0001 (3 unindexed foreign keys) and 0005 (2 unused indexes), as in EVAL-066 |

  - **The apply:** one `apply_migration` call through the Deployment connector, sent at 18:33:25 with `name` `sandbox_provenance` and `query` the file's text. It returned `{"success":true}` at 18:33:31. No confirmation event, no timeout, no retry.
  - **History (18:33:33):** `list_migrations` shows 5 versions: the 4 Stage 1 versions, then `20261003183331` `sandbox_provenance`, exactly once.
  - **C-11 (18:33:41): FAIL for the new version.** The 4 earlier rows are unchanged. `20261003183331` is stored as one statement with md5 `4b09ad34a82823aacf22d4afa63bad53`, 3619 characters; the file is `23dd3270cdca77001fe2f9a86917d518`, 3739 bytes.
  - **Diagnosis (18:33:54 to 18:35:20, read-only):**
    - The stored statement was read back as base64 and decoded locally (3667 bytes, md5 `4b09ad34a82823aacf22d4afa63bad53`). Compared with the file, the only differences are on lines 42, 44, 48, 50, 52 and 56, the six I14 text-rule constraints: on each line the escape texts `\u202A`, `\u202E`, `\u2066` and `\u2069` became the single characters they name (U+202A, U+202E, U+2066, U+2069). That is 24 substitutions of 6 characters by 1, which accounts for all 120 missing characters. The `\u0001` to `\u009F` escapes on the same lines arrived as text.
    - **Cause:** the tool transport between the session and the database decoded those four escape sequences before Supabase stored the statement. The repository file is correct and unchanged. Why the transport decoded those four and not the others isn't known, so its behavior isn't fully characterized.
    - **Behavior is equivalent:** in a Postgres regular expression, `\u202A` and a literal U+202A select the same code point. An exhaustive comparison on production of the stored and the reviewed patterns over every code point from 1 to 1114111, surrogates excluded, found 0 differences: the single-line pattern rejects 73 code points and the multi-line pattern 70, in both forms.
    - **Text is not:** each of the six constraints holds the literal bidi characters in the production catalog. Their `pg_get_constraintdef` md5s: `decisions_decision_single_line` `36939f7c6b962d87f43ba3c5df8e92a6`, `decisions_rationale_text` `d1fc54e70998b70b7bbb4e68514a4ce1`, `decisions_waiver_rationale_text` `a47f26af6931645ac1ada5ac1eb9fcaa`, `evidence_summary_text` `c9589e78071cb8348115a68bee363a7c`, `evidence_title_single_line` `dee9990b68e6ba9b6c242c17d3eee8b4`, `gates_waiver_rationale_text` `a47f26af6931645ac1ada5ac1eb9fcaa`.
    - M-5 and M-6 contain no `\u` escape text.
  - **Stop (18:35):** C-11 and I20 fail for the applied version, so V3 to V5 can't pass as specified. M-5 and M-6 were withheld. No retry, no `migration repair`, no corrective SQL, no history edit.
  - **State after the stop (18:36:15 to 18:36:37, read-only):**
    - Stage 1 catalog instrument: **16 of 17.** Only check 15 fails, on `constraints` and `rls+owners`, the two parts M-4 changes by design. Checks 1 to 9 pass: no table, column or sequence write privilege, and no function executable by the API roles. Check 1 now covers 7 tables: `sandbox_state` has RLS on and grants nothing.
    - Canonical data: the Stage 1 `seed_data` expression gives `dc85e31b82116a9fa79adaac8399aa90`, unchanged.
    - Repository: HEAD `988e738`, clean; the three migration files' md5s unchanged.
  - **Cleanup:** the owner removed the Deployment connector after the window, as amendment A1 requires; its tools left the session at 18:42:35.
- **Resulting production state:** Stage 1 plus M-4 only (`20261003183331`). M-5 and M-6 are absent. This is the runbook's safe intermediate state: M-4 grants nothing to the API roles, so no public write path exists. Stage 2 is incomplete, and the frontend must not be deployed.
- **Not run:** the HEAD fingerprint and catalog, C-14, V1 to V9, the post-M-4 advisors, the DR-009 rename of the M-4 file, and anything on Railway or the frontend.
- **Limitations:**
  - The cause is established from the stored bytes, not from the transport's code; which escape sequences the transport decodes isn't characterized.
  - The equivalence comparison ran on production as a read-only `execute_sql` and isn't preserved as a script.
  - The Deployment connector's `skip_elicitations` value was never readable from the session; it rests on the owner's configuration.
- **Reproducibility:** recorded only. C-11's query (EVAL-022) repeats the parity reading.

## Not run (don't claim these)

This list reflects the state after the deployment-path decision (about 14:25).

**Update (Stage 1 deployment, 16:29):** Stage 1 is now applied to live (EVAL-065) and verified there read-only: catalog 17 of 17, fingerprint equal to EVAL-045, no 0028 or 0029 lints (EVAL-066), and C-11 migration parity PASS (EVAL-068). Still not run on live after Stage 1:
- The app in a browser against live.

**Update (Stage 2, 17:11; re-verified after the Stage 2 review, EVAL-075 to EVAL-078):** Stage 2 (M-4 to M-6) is implemented and verified **locally only** (EVAL-069 to EVAL-078). Not run: any Stage 2 migration on live, any Stage 2 check on live, a committed end-to-end suite, and the Stage 2 UI, which isn't built.

**Update (after EVAL-086):** the Stage 2 UI (A1, A3 to A9) is built and verified locally against disposable databases (EVAL-079 to EVAL-086). Still not run: the Stage 2 UI against live or hosted anywhere, any Stage 2 migration or check on live, and a committed end-to-end suite.

**Update (2026-10-03, EVAL-088):** M-4 alone is applied to live, as `20261003183331`; its stored statement differs from the file in 24 escape substitutions, so C-11 fails for that version. Still not run on live: M-5, M-6, the HEAD catalog and fingerprint, C-14, V1 to V9, and the Stage 2 UI. Nothing is hosted.

- **Production deployment of Stage 1 (as of 14:25; superseded, see the update above):** the migration was **not** applied to live, so live hasn't been verified after it. The deployment path is designated (DR-024), and the deployment is a separate, authorized run. On live, the catalog test passing 17 of 17, the fingerprint matching EVAL-045, and the 0028/0029 advisor lints clearing are expected but **unverified**.
- **GitHub integration settings:** not applicable. No GitHub integration has ever been connected (EVAL-060). The earlier entry here assumed one might exist.
- **Browser:** the app loaded in a browser against the **live** project. The live publishable key was never retrieved (DR-011).
- **CI:** none exists in this repository.
- **Test suites:**
  - A committed Playwright or end-to-end suite. The scripts under `artifacts/` are preserved evidence, not a suite. The Stage 1 HTTP check (EVAL-046) was ad hoc.
  - **Now committed:** catalog tests C-1 to C-10 and C-12 (as `security_catalog.sql` checks 1 to 17), and behavior tests B-1 to B-3 (`stage1_behavior.sql`).
  - **Still not scripts:** C-11 (migration parity; EVAL-022 has the query), C-13 (advisor), C-14 and B-4 (Stage 2).
- **Secret scanning:**
  - detect-secrets ran over the full history (EVAL-057) and the bundle (EVAL-058).
  - gitleaks: not run. Its download was blocked by the session's network policy.
  - GitHub secret scanning: unavailable, because GitHub Advanced Security isn't enabled on the repository.
- **Platform probing:**
  - load, rate-limit or request-size tests against the live API
  - reading the Auth settings (no longer a release gate, DR-022, but still unread)
  - whether the OpenAPI root is served to the publishable key
- **Deployment:** hosting, TLS or security-header tests. Nothing is deployed.
- **Postgres 17 on live:**
  - MAINTAIN and default-privilege behavior was verified on a local 17.10 build (EVAL-040), and live's default ACL was read (EVAL-036).
  - A behavioral probe on live wasn't run, because it would need DDL on production.
- **Supabase's own Postgres image:** not used locally, because the Docker daemon was unavailable.
