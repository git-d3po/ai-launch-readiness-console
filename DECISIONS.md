# Decision log

The engineering decisions behind the AI Launch Readiness Console, in the order they were made. Each
entry says what was decided, why, what else was considered, and what evidence supports it.

[`PROJECT_BRIEF.md`](PROJECT_BRIEF.md) is the original product plan and is kept as history. Where it
and this log disagree, this log is authoritative.

**Related records:**
- [`docs/security/2026-10-02-audit-2b-reconcile.md`](docs/security/2026-10-02-audit-2b-reconcile.md): the security reconciliation, invariants, remediation plan and release gates
- [`docs/security/findings.md`](docs/security/findings.md): one record per confirmed security finding (SEC-001 to SEC-007)
- [`docs/evaluation/EVALUATION_LOG.md`](docs/evaluation/EVALUATION_LOG.md): every check that was run (EVAL-001 onward)
- [`docs/evaluation/scenarios.md`](docs/evaluation/scenarios.md): regression scenarios that must stay testable

**Conventions:**
- **Statuses:**
  - **Accepted:** decided and in force.
  - **Proposed:** awaiting a decision.
  - **Superseded by DR-NNN:** replaced by a later decision.
- **Implementation status** is stated separately, because a decision can be accepted before it's built.
- Times are UTC on 2026-10-02; everything so far happened that day.
- Commit hashes refer to branch `claude/phase1-schema`.
- New entries are appended. An entry is changed only to update its status, never to rewrite its history.

## Index

| ID | Decision | Status | Implementation |
|---|---|---|---|
| DR-001 | Postgres is the trust boundary | Accepted | Implemented (`03a4666`, `9c65e6c`) |
| DR-002 | Readiness is computed, never stored | Accepted | Implemented (`03a4666`) |
| DR-003 | The current rollout stage is derived, not stored | Accepted | Implemented (`03a4666`) |
| DR-004 | Build in this repository against our own Supabase project, not through Lovable | Accepted | Implemented (all code commits) |
| DR-005 | Supabase project configuration | Accepted | In place since project creation |
| DR-006 | No authentication in Phase 1; `anon` and `authenticated` have identical privileges | Accepted (extended by DR-020; its R-8 assumption retired by DR-022) | Implemented (`03a4666`) |
| DR-007 | The seeded launch has 16 gates, not 17 | Accepted | Implemented (`03a4666`, brief corrected in `9c65e6c`) |
| DR-008 | Waiver text is copied onto the decision row | Accepted | Implemented (`9c65e6c`) |
| DR-009 | Migration files carry the versions Supabase recorded | Accepted | Implemented (`9c65e6c`) |
| DR-010 | Revoke EXECUTE on `rls_auto_enable` from PUBLIC, `anon` and `authenticated` | Accepted | Implemented (`ddadd36`) |
| DR-011 | The publishable key comes from environment configuration; the live key was never fetched | Accepted | Implemented (`e8e71ef`) |
| DR-012 | One accent color; emerald, amber and red reserved for status | Accepted | Implemented (`1572708`) |
| DR-013 | Trust model C: read-only canonical launch plus a disposable shared sandbox (Phase 2B D1) | Accepted | Stage 1 part in the repository and verified locally, **not applied to live**; Stage 2 not built |
| DR-014 | Reset applies only to the sandbox, with a 5-minute cooldown (D2) | Accepted | Stage 1 part in the repository and verified locally, **not applied to live**; Stage 2 not built |
| DR-015 | All five evidence types in the sandbox, always marked as visitor evidence (D3) | Accepted | **Not yet implemented** |
| DR-016 | The database sets visitor identity and evidence dates (D4) | Accepted | **Not yet implemented** |
| DR-017 | Evidence URLs are https only; visitor URLs are never clickable (D5) | Accepted | Database rule in the repository and verified locally, **not applied to live**; rendering rule is Stage 2 |
| DR-018 | Sandbox limits: 10 visitor evidence and 20 visitor decisions per gate, 5-minute cooldown (D6) | Accepted | **Not yet implemented** (Stage 2); Stage 1's zero public-write bound is in the repository, not applied to live |
| DR-019 | One authoritative migration deployment path (D7) | Accepted | Implemented by DR-024: the Supabase connector is the single path, and release gate R-9 is met. No migration applied under it yet |
| DR-020 | No Supabase Auth at this stage; `authenticated` stays aligned with `anon` | Accepted (its R-8 consequence replaced by DR-022) | In force (nothing to build) |
| DR-021 | Stage 1 security hardening: one migration, a read-only catalog test, a local behavior test | Accepted | In the repository, pushed (`e74aaaf`, test strengthened in `8a1ad9d`) and verified locally on Postgres 17; **not applied to live**. It deploys through the connector (DR-024) |
| DR-022 | Retire release gate R-8 (the Auth settings check); no Auth is an explicit tradeoff | Accepted | In force: documentation only; enforced by catalog checks 13 and 15 |
| DR-023 | SEC-007 at the Stage 1 release: no default-privilege change; every new function is revoked explicitly | Accepted | Stage 1 part verified locally (no function exposed through the default); the Stage 2 obligation is recorded |
| DR-024 | The Supabase connector is the single authoritative production migration path | Accepted; amended by A1 (14:55) | Designated. No migration applied under it yet: the first Stage 1 attempt timed out without effect (EVAL-062). Amendment A1 sets the conditions for the next attempt; R-2 is pending |

---

## DR-001: Postgres is the trust boundary

- **Date:** 2026-10-02. Designed during planning (`PROJECT_BRIEF.md` §3, commit `5e8c659`, 08:30).
  Implemented in `03a4666` (09:14); the waiver audit was added in `9c65e6c` (09:31).
- **Status:** Accepted
- **Context:**
  - The browser talks to Supabase's Data API directly with a publishable key. There's no application server, and Phase 1 has no sign-in, so anything enforced only in React can be bypassed by calling the API directly.
  - The brief's core rules: a gate is Passed only with evidence, Waived needs a rationale, and every status change is logged.
- **Options considered:**
  1. Validate in the UI only.
  2. Database CHECK constraints plus one validated SECURITY DEFINER function for status changes.
  3. An application server or Edge Function in front of the database.
- **Decision:** option 2. The rules live in Postgres:
  - CHECK constraints and length limits on every table, and row-level security on every table.
  - Explicit grants in each migration: revoke everything, then grant the minimum.
  - `public.set_gate_status` is the only path that changes a gate's status. It validates the rationale, the decider, the same-status case, Passed-needs-evidence and Waived-needs-waiver-text. Then, in one transaction, it updates the gate under a row lock and writes exactly one decision row.
  - Both SECURITY DEFINER functions use `set search_path = ''`, fully qualified names, and no dynamic SQL.
  - Evidence and decisions are append-only for the public.
- **Rationale:**
  - UI-only validation can be bypassed.
  - A server adds code, secrets and hosting with no benefit at this size.
  - Database rules sit next to the data, can be tested with SQL, and are visible to anyone reading the repository.
- **Assumptions:** the data is synthetic, and the publishable key is public by design.
- **Consequences:**
  - The rules are tested by [`supabase/tests/integrity_checks.sql`](supabase/tests/integrity_checks.sql) (6 checks).
  - **The Phase 1 public write surface came from the brief's public-editing requirement:**
    - `anon` and `authenticated` have column INSERT on six evidence columns.
    - They have EXECUTE on `set_gate_status` and `reset_demo_data`.
  - The audits showed that enforcing the *shape* of a change without any notion of *who* made it lets an anonymous caller forge readiness (SEC-001) and erase data (SEC-002).
  - That write surface is superseded by DR-013 and DR-014. It stays live until Stage 1 migration M-1 is applied.
  - The trust-boundary principle itself stands.
- **Evidence:**
  - EVAL-002 and EVAL-007: integrity checks pass locally and on live.
  - EVAL-003: the checks detect weakened rules.
  - EVAL-016: function owner, search path, grants.
  - EVAL-017 (P6): denied paths.

## DR-002: Readiness is computed, never stored

- **Date:** a requirement of the brief. Implemented in `03a4666` (09:14).
- **Status:** Accepted
- **Context:** the brief requires readiness to be computed. A stored readiness value can drift from the gate rows.
- **Options considered:**
  - a stored column maintained by a trigger
  - a database view
  - one pure client function over fetched rows
- **Decision:** one pure TypeScript function, `computeReadiness` in [`src/domain/readiness.ts`](src/domain/readiness.ts), used by every page.
  - A required gate counts as passed only when its status is Passed **and** it has at least one evidence row (`evidenceCount > 0`).
  - Waived doesn't block.
  - A launch is Ready when no required gate blocks.
  - Open risks don't affect readiness.
- **Rationale:**
  - It's a single source of truth, unit-tested, and can't drift.
  - The evidence rule is enforced twice: by the database at change time and by the client at display time. A bad row therefore can't make a launch look ready.
- **Assumptions:** planning assumptions A1 (Waived doesn't block) and A2 (risks don't affect Ready).
- **Consequences:**
  - The client can't tell a forged row from a genuine one; readiness is only as trustworthy as the rows it reads (SEC-001).
  - A launch with zero gates computes as Ready (finding N2, deferred; only the owner can create launches). The overview hides its chip in that case; the list doesn't.
- **Evidence:**
  - [`src/domain/readiness.test.ts`](src/domain/readiness.test.ts) (4 tests).
  - EVAL-004: the tests catch removal of the evidence rule.
  - EVAL-011 and EVAL-014: the counts change only after a database change.

## DR-003: The current rollout stage is derived, not stored

- **Date:** planning assumption A3, flagged as a change from the brief's data model. Implemented in `03a4666` (09:14).
- **Status:** Accepted
- **Context:** the brief's data model lists "current rollout stage" as a field on the launch.
- **Options considered:** store it on `launches`, or derive it from `rollout_stages`.
- **Decision:** derive it. The view `public.launch_current_stage` (`security_invoker = true`) returns the Active stage, otherwise the first Not started stage in sequence order, otherwise no row.
- **Rationale:** it can't drift from the stage rows.
- **Assumptions:** none beyond the fixed stage sequence (Shadow, Assist, Partial automation).
- **Consequences:**
  - "No row" means either "all stages completed" or "no stages exist".
    - The overview tells them apart by also reading the stages, and shows "No rollout stages".
    - The launches list still shows "All stages completed" for a launch with no stages. That's a known, deferred defect, unreachable with the seed.
  - Two Active stages are possible. Only the owner can create stages; future hardening.
- **Evidence:**
  - EVAL-011 and EVAL-014: "Shadow · Not started" rendered from the view.
  - EVAL-012: the same result on live as `anon`.

## DR-004: Build in this repository against our own Supabase project, not through Lovable

- **Date:**
  - Options set out at about 09:05.
  - Accepted in practice at 09:07, when the Phase 1 build instruction asked for the schema as Postgres migrations in this repository.
  - First code commit `03a4666` (09:14).
- **Status:** Accepted. **This decision was accepted in practice but wasn't documented until this record.**
- **Context:**
  - The brief (§1 "Tech", §3.1 and §5) planned a build on Lovable Cloud, with Lovable's agent writing the UI.
  - The owner then created their own Supabase project.
  - Lovable's GitHub sync creates its own repository and applies database changes itself. If this repository also deployed migrations, two systems would edit one database.
- **Options considered:**
  - **A. Lovable builds the app:** its own repository; Lovable applies the migrations; this repository isn't connected to Supabase.
  - **B. Build directly in `git-d3po/ai-launch-readiness-console`,** with migrations in the repository, against our own Supabase project.
- **Decision:** B.
- **Rationale:**
  - One source of truth.
  - The code is written and verified directly ("loop until verified"), not reviewed second-hand.
  - No Lovable credits spent.
  - Fewer accounts in the chain.
  - The cost: no Lovable visual editor and no one-click publishing.
- **Assumptions:** the frontend will later go on a static host. None has been chosen, and nothing is deployed.
- **Consequences:**
  - The brief's Lovable sections no longer describe the build. They're kept as history, with a notice at the top of the brief.
  - How migrations reach production became a question (DR-009, DR-019).
- **Evidence:**
  - EVAL-018: the Lovable workspace has 0 projects.
  - Every code commit is in this repository.

## DR-005: Supabase project configuration

- **Date:** the project was created at about 09:00.
- **Status:** Accepted
- **Context:** the Supabase project form offers defaults for API exposure and row-level security.
- **Options considered:** accept the defaults, or turn off automatic exposure and grant access explicitly.
- **Decision:**
  - Data API enabled.
  - "Automatically expose new tables" **off**.
  - "Enable automatic RLS" **on**.
  - GitHub not connected at creation.
  - Every table's access is granted explicitly in the migrations.
- **Rationale:**
  - Explicit grants keep the public surface reviewable in one place: the migrations.
  - Automatic RLS is a safety net for any table a migration forgets.
- **Assumptions:** none.
- **Consequences:**
  - Automatic RLS installed a platform function, `public.rls_auto_enable()`, executable by PUBLIC by default (DR-010).
  - Default privileges still give `anon` and `authenticated` MAINTAIN, REFERENCES, TRIGGER and TRUNCATE on future tables (SEC-006).
- **Evidence:**
  - The settings were reported by the owner from the creation form; the dashboard itself wasn't read.
  - **Corroborating catalog evidence:**
    - `rls_auto_enable()` exists on live, and a rolled-back probe table received RLS automatically (EVAL-009).
    - The live default privileges for tables give `anon` and `authenticated` no SELECT, INSERT, UPDATE or DELETE (EVAL-025). That's consistent with automatic exposure being off.
  - **The Data API setting isn't independently verified.** The live Data API was never called, because the publishable key was deliberately not retrieved (DR-011).

## DR-006: No authentication in Phase 1; `anon` and `authenticated` have identical privileges

- **Date:** Phase 1 scope in the brief (authentication out of scope). Implemented in `03a4666` (09:14).
- **Status:** Accepted. Extended beyond Phase 1 by DR-020, which keeps Auth out of the project at this stage. The release gate R-8 named in its assumptions was retired by DR-022.
- **Context:** there's no sign-in, but Supabase serves two API roles.
- **Options considered:** grant to `anon` only; give `authenticated` more; keep them identical.
- **Decision:**
  - The client never signs in: `persistSession: false`, `autoRefreshToken: false`, and no Auth calls.
  - Every grant to `anon` is also made to `authenticated`, and nothing more.
- **Rationale:** if signups are open (not verified), anyone can become `authenticated`. That role must never be trusted more than `anon` until Auth is designed.
- **Assumptions:** the data stays synthetic. The Auth signup settings are unverified; the owner checks them (release gate R-8).
- **Consequences:**
  - DR-013 doesn't need Auth.
  - **Auth becomes necessary for:**
    - real data
    - trustworthy per-person attribution
    - private per-visitor sandboxes
    - any OAuth integration, LinkedIn included
  - Invariant I6.
- **Evidence:**
  - EVAL-024: 0 users and 0 identities; `authenticator` is a member of `anon`, `authenticated` and `service_role`.
  - EVAL-016.
  - [`src/lib/supabase.ts`](src/lib/supabase.ts).

## DR-007: The seeded launch has 16 gates, not 17

- **Date:** seeded in `03a4666` (09:14); the brief was corrected in `9c65e6c` (09:31).
- **Status:** Accepted
- **Context:**
  - **My planning proposal (Claude's) said "17 gates" and "6 of 17 passed · 11 blockers".** The gate list in that same proposal had 16 gates: 6 Passed, 1 In progress, 3 Failed and 6 Not started.
  - The Phase 1 build instruction repeated 17 and said not to add gates.
  - The miscount was caught while writing the seed.
- **Options considered:** seed the 16 listed gates, or invent a 17th.
- **Decision:** seed exactly the 16 listed gates, flag the discrepancy to the owner, and correct the brief to 16 gates, 6 passed and 10 blockers.
- **Rationale:** seed facts must be used exactly. Inventing a gate would fabricate data.
- **Assumptions:** none.
- **Consequences:**
  - Halcyon shows "6 of 16 passed", 10 blockers, Not ready.
  - The unit tests and integrity check 5 assert those numbers.
- **Evidence:**
  - EVAL-002: check 5 reports "16 gates, 6 of 16 passed, 10 blocking".
  - [`src/domain/readiness.test.ts`](src/domain/readiness.test.ts).
  - EVAL-011.

## DR-008: Waiver text is copied onto the decision row

- **Date:** `9c65e6c` (09:31).
- **Status:** Accepted
- **Context:**
  - `gates.waiver_rationale` is required only while a gate is Waived, and `set_gate_status` clears it when the gate leaves Waived.
  - Without a copy, the audit trail lost the waiver text. This was reported with `03a4666`.
- **Options considered:**
  - keep the text on the gate after it leaves Waived (stale data, against the constraint's intent)
  - a separate history table (a larger change)
  - copy the text onto the decision row of the transition to Waived
- **Decision:**
  - Add a column `decisions.waiver_rationale` (at most 2000 characters). `set_gate_status` fills it only on a transition to Waived.
  - The CHECK `decisions_waiver_rationale_only_on_waive` requires non-blank text when `to_status` is Waived, and NULL otherwise.
- **Rationale:** decision rows are append-only (no public UPDATE or DELETE), so the text survives.
- **Assumptions:** none.
- **Consequences:** integrity check 6 was added.
- **Evidence:**
  - EVAL-005: check 6, and the NULL-handling fix it exposed.
  - EVAL-007: check 6 passes on live.

## DR-009: Migration files carry the versions Supabase recorded

- **Date:** `9c65e6c` (09:31).
- **Status:** Accepted
- **Context:**
  - The migrations were applied through the Supabase connector, which recorded them as `20261002092043` and `20261002092141`. The repository files were named `...000100` and `...000200`.
  - A GitHub integration deploying from the repository could apply them a second time.
- **Options considered:**
  - keep the repository names (drift)
  - re-apply under the repository names
  - rename the repository files to the recorded versions
- **Decision:**
  - Rename the files to the recorded versions.
  - From now on, every migration file carries the version recorded when it's applied.
- **Rationale:** the repository and `supabase_migrations` should agree byte for byte and version for version.
- **Assumptions:** none.
- **Consequences:**
  - The `...000100` and `...000200` versions exist only in commit `03a4666` and were never applied to live.
  - Two possible deploy paths (the connector and the GitHub integration) remained a risk (DR-019, release gate R-9).
    - **Update (DR-024):** the second path never existed; no GitHub integration has ever been connected (see the correction in DR-019). DR-024 makes the connector the single path, and this decision's rename becomes step 6 of its deployment procedure.
- **Evidence:**
  - EVAL-022: live and repository migrations are byte-identical.
  - EVAL-008: the migration list on live.

## DR-010: Revoke EXECUTE on `rls_auto_enable` from PUBLIC, `anon` and `authenticated`

- **Date:** `ddadd36` (09:46), migration `20261002093521_revoke_rls_auto_enable_execute`.
- **Status:** Accepted
- **Context:**
  - The security advisor reported that `anon` could execute `public.rls_auto_enable()`, which "Enable automatic RLS" creates.
  - Its ACL was NULL, so the access came from Postgres's default PUBLIC grant.
- **Options considered:**
  - revoke from `anon` and `authenticated` only (a no-op, because of the PUBLIC grant)
  - revoke from PUBLIC, `anon` and `authenticated`
  - drop the function (would turn off automatic RLS)
- **Decision:** a guarded `DO` block revokes EXECUTE from all three when the function exists.
- **Rationale:**
  - Removing `anon`'s access required revoking PUBLIC.
  - The guard keeps a project created without that option from erroring.
- **Assumptions:** none.
- **Consequences:**
  - Automatic RLS still works, because its event trigger doesn't need the caller's EXECUTE.
  - `anon` can execute exactly two functions until Stage 1.
- **Evidence:** EVAL-009.

## DR-011: The publishable key comes from environment configuration; the live key was never fetched

- **Date:** `e8e71ef` (09:54).
- **Status:** Accepted
- **Context:**
  - The client needs the project URL and the publishable key.
  - **The owner's constraints:**
    - never print or commit a key
    - never put a secret in a `VITE_` variable
    - the service role must never be reachable from client code
  - The Supabase connector could fetch the publishable key, but that would print it into the session.
- **Options considered:**
  - fetch the key through the connector and test live
  - have the owner paste the key
  - test against a local PostgREST copy with a throwaway key
- **Decision:**
  - **Client configuration:** the client reads only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, typed in `src/vite-env.d.ts`.
  - **Repository hygiene:** `.env*` is git-ignored, except [`.env.example`](.env.example), which holds variable names only.
  - **The live key was never retrieved.**
  - **Testing:** UI behavior was tested against PostgREST 14.18, the same version as live, running over a local copy of the database. A throwaway signing secret was generated at run time.
- **Rationale:** it meets the constraints while still exercising the real `supabase-js` query path.
- **Assumptions:** none.
- **Consequences:**
  - The app has **never been loaded in a browser against the live project**; that remains unverified.
  - Live behavior was checked only through SQL run as `anon` (EVAL-012).
- **Evidence:**
  - EVAL-011 and EVAL-012.
  - EVAL-019: the bundle holds only the injected values, with no sourcemaps.
  - EVAL-028: the history scan is clean.

## DR-012: One accent color; emerald, amber and red reserved for status

- **Date:** `1572708` (10:05).
- **Status:** Accepted
- **Context:** the brief calls for a restrained palette with semantic status colors. The visual specification asked for a stone palette with one muted blue accent.
- **Options considered:** raw Tailwind colors in each component, or named tokens in one file.
- **Decision:**
  - **Tokens in [`src/index.css`](src/index.css):**
    - `page`, `card`, `fg`, `muted` and `line` come from the stone palette.
    - `accent` and `accent-subtle` are the single accent, used only for the current nav item, links and the focus ring.
  - **Emerald, amber and red are reserved for status:**
    - **Emerald:** Ready and Passed chips.
    - **Red:** Not ready and Failed chips, plus the error alert, which is a danger state.
    - **Amber:** reserved for warning states, and **not used anywhere yet** (`src/` contains no amber classes as of `cb27437`).
- **Rationale:** enforce "one accent, status colors only for status" in one place.
- **Assumptions:** none.
- **Consequences:** the brief's "neutral/info = blue" is replaced by accent-only use of blue.
- **Evidence:** EVAL-013: minimum text contrast 5.58:1; reduced motion turns the only animation off.

---

## Phase 2B decisions (D1 to D7)

The Phase 2B reconciliation ended with "REQUIRES SPECIFICATION DECISION". The recommended trust model
contradicts two requirements in the brief: public editing of the launch, and a public reset that
restores the whole seed. **The project owner approved D1 to D7 on 2026-10-02** (instruction received at
11:10). They're recorded below as accepted.

**Implementation status (updated after Stage 1, 2026-10-02 at about 12:05):**
- **Stage 1** (DR-021) is in the repository and verified locally on Postgres 17: migration `20261002115318_stage1_security_hardening`, plus the catalog and behavior tests.
- **Stage 1 is not applied to the live project.** The single deploy path couldn't be established, because the GitHub integration's deploy setting is unverified (DR-019, R-9). Live was read again at 12:00. It still has the Phase 1 public write surface, and the new catalog test fails there on exactly the four checks the migration fixes (EVAL-048).
- **Stage 2:** no sandbox, provenance column, sandbox function, cap or cooldown exists.
- **Update (deployment-path decision, 14:15):** the "unverified GitHub integration" above rested on a misreading; no GitHub integration has ever been connected (see the correction in DR-019). DR-024 designates the Supabase connector as the single path, so R-9 is met. Stage 1 is still **not applied to live**: that's a separate, authorized deployment run.

**Implementation order** (details in [the reconciliation record](docs/security/2026-10-02-audit-2b-reconcile.md#9-remediation-sequence)):
- **Stage 1, security hardening:** the read-only catalog test, then migrations M-1 (no public writes), M-2 (https check) and M-3 (default privileges), then verification. Done in the repository and locally. The production deployment is pending: R-9 is met (DR-024), and the deployment is a separate, authorized run.
- **Stage 2, the sandbox (later, at the start of the gate-sheet phase):** M-4 to M-6 and application items A3 to A9.

## DR-013: Trust model C: a read-only canonical launch plus a disposable shared sandbox (D1)

- **Date:** specified at 10:58 (Phase 2B report, baseline `cb27437`); approved on 2026-10-02.
- **Status:** Accepted
- **Implementation status:**
  - **Stage 1** (migration M-1) makes the canonical launch read-only to the public. It's in the repository and verified locally on Postgres 17 (DR-021), but **not applied to live**.
  - **Stage 2** (M-4 to M-6, A3 to A9) adds the sandbox. Not built.
- **Context:**
  - Any anonymous caller can make the canonical launch read Ready and plant impersonated approvers (SEC-001).
  - The public write paths exist because the brief asked for public editing, but **no shipped UI uses them**. The client makes no write calls, and Reset is disabled.
- **Options considered**, judged on six criteria: truthful canonical claims, a real database-enforcement demo, no identity infrastructure, bounded storage, least distortion, reversible steps.
  - **A. A shared mutable launch** (today's API). Not truthful.
  - **B. Read-only.** Truthful and trivially bounded, but it removes the interactivity the brief requires.
  - **C. A read-only canonical launch plus a disposable shared sandbox launch.** Truthful, interactive, no identity needed, bounded by caps. A moderate change: an origin column, three RPCs, a scoped reset.
  - **Also rejected:**
    - **Visitor provenance alone:** `gates.status` is one column, so a visitor's change still replaces the canonical status.
    - **Labeling alone:** honest, but not enforced.
    - **Per-visitor sandboxes:** they need Auth, CAPTCHA, and cleanup of anonymous users.
    - **A client-only sandbox:** it would demonstrate client logic, not database enforcement, and duplicate the rules.
- **Decision:** Model C, delivered in two steps.
  - **Stage 1:** no public writes at all. `anon` and `authenticated` keep SELECT only.
  - **Stage 2:** a shared sandbox launch that anyone can change through three allowlisted SECURITY DEFINER functions. It never touches the canonical launch.
  - **Interim:** Phase 1 is read-only.
- **Rationale:** C is the only option that is both truthful and interactive without identity infrastructure.
- **Assumptions:**
  - The data stays synthetic.
  - One shared sandbox is acceptable for a portfolio demo.
- **Consequences:**
  - **What changes from the brief:** public editing of the canonical launch and the public whole-seed reset are superseded (see DR-014).
  - **Public API surface:** SELECT, plus (in Stage 2 only) `sandbox_add_evidence`, `sandbox_set_gate_status` and `sandbox_reset`. No table writes.
  - **Canonical data:** changes only through the owner (migrations or SQL).
  - **Accepted residual risk:** griefing inside the shared sandbox, by filling its caps or defacing it. The upgrade path is per-visitor sandboxes through anonymous sign-ins.
  - **Invariants:** I3, I4, I7, I11.
- **Evidence:**
  - EVAL-017 and EVAL-029: the forgery.
  - EVAL-029: the M-1 dry run.
  - EVAL-030: the integrity suite still passes under M-1.
  - EVAL-027: no client write calls.
  - Analysis: reconciliation record §7.

## DR-014: Reset applies only to the sandbox, with a 5-minute cooldown (D2)

- **Date:** specified at 10:58; approved on 2026-10-02.
- **Status:** Accepted
- **Implementation status:**
  - **Stage 1** (M-1) revokes `anon` and `authenticated` EXECUTE on `reset_demo_data()`. It's in the repository and verified locally (DR-021), but **not applied to live**.
  - **Stage 2** (M-4 to M-6, A7) adds `sandbox_reset()`. Not built.
- **Context:** `reset_demo_data()` truncates all six tables and re-seeds them, and any anonymous caller can run it (SEC-002).
- **Options considered:**
  - **Remove it from the public API:** chosen for the canonical reseed.
  - **A bounded request mechanism:** chosen, but only as a sandbox-scoped reset.
  - **Keep it public with constraints:** rejected. No constraint makes a table-wide TRUNCATE safe for anonymous callers.
  - **Administrative or server-only:** chosen. `reset_demo_data()` stays as the owner's reseed tool.
  - **A scheduled reseed (`pg_cron`):** not needed. The interim has nothing to reset, and `pg_cron` isn't installed.
- **Decision:**
  - The canonical launch is **never** reset by an anonymous visitor. A full reseed is owner-only (migrations and the integrity suite).
  - The public reset action resets only sandbox state:
    - It deletes visitor rows on sandbox launches.
    - It restores sandbox gate statuses from their source gates.
    - It runs at most once every **5 minutes**.
    - It uses no TRUNCATE and no `RESTART IDENTITY`.
- **Rationale:** neither the canonical record nor its audit trail can be erased by a visitor.
- **Assumptions:** a reset is a deliberate human action behind a confirmation dialog.
- **Consequences:**
  - The header button becomes "Reset sandbox" (A7).
  - Invariants I4, I7 and I13.
- **Evidence:** EVAL-016, EVAL-017 (P2) and EVAL-027 (no client calls it).

## DR-015: All five evidence types in the sandbox, always marked as visitor evidence (D3)

- **Date:** specified at 10:58; approved on 2026-10-02.
- **Status:** Accepted
- **Implementation status:** **Not yet implemented** (Stage 2: M-4 adds `origin`; M-6 adds `sandbox_add_evidence`; A5 adds the label).
- **Context:** a visitor could label fabricated evidence "Sign-off" or "Evaluation result".
- **Options considered:**
  - all five types, labeled
  - only Observation, Document and Test (stricter)
  - no visitor evidence
- **Decision:**
  - The canonical launch accepts **no** visitor evidence of any type.
  - In the sandbox, all five existing types (`Evaluation result`, `Test`, `Document`, `Sign-off`, `Observation`) are allowed.
  - Every visitor-created item is explicitly identified as visitor evidence:
    - The database sets `origin = 'visitor'`, and callers can't set it.
    - The UI shows "Visitor" beside the type.
- **Rationale:**
  - The Stakeholder Sign-off gate can only be exercised faithfully with a Sign-off item.
  - Authority comes from the database-set origin and the sandbox label, never from the type label.
- **Assumptions:** "Approval" isn't an evidence type.
- **Consequences:** invariants I11 and I16; scenario F.
- **Evidence:** EVAL-017 (P1, P5).

## DR-016: The database sets visitor identity and evidence dates (D4)

- **Date:** specified at 10:58; approved on 2026-10-02.
- **Status:** Accepted
- **Implementation status:** **Not yet implemented** (Stage 2: M-6).
- **Context:**
  - `decided_by` is free text supplied by the caller, so visitors can impersonate any role.
  - `recorded_on` accepted 9999-12-31.
- **Options considered:**
  - caller-supplied values with validation
  - a "Decided by" field remembered in the browser (planning assumption A7)
  - values set by the database
- **Decision:**
  - Visitor decisions record `decided_by = 'Sandbox visitor'`, fixed by the database.
  - Visitor evidence records `recorded_on` as the server's current date.
  - Neither is a parameter of the sandbox functions.
- **Rationale:** claims the system can't verify aren't stored as facts.
- **Assumptions:** none.
- **Consequences:**
  - Planning assumption A7 is superseded for visitors.
  - Invariant I15.
- **Evidence:**
  - EVAL-017 (P5): the far-future date was stored.
  - EVAL-029: the forged decider would render.

## DR-017: Evidence URLs are https only; visitor URLs are never clickable (D5)

- **Date:** specified at 10:58; approved on 2026-10-02.
- **Status:** Accepted
- **Implementation status:**
  - **Stage 1:** M-2 adds the CHECK constraint. It's in the repository and verified locally (DR-021), but **not applied to live**. The implemented pattern refines the Phase 2B text so that it doesn't depend on the collation provider (DR-021).
  - **Stage 2:** A6 sets the rendering rule. Not built. No UI renders `source` today.
- **Context:** `evidence.source` accepts `javascript:` and other schemes. Nothing renders it today, but the gate sheet will (SEC-005).
- **Options considered:**
  - a UI-only check
  - a database CHECK plus a rendering rule
  - also allowing `http:`
- **Decision:**
  - `source` must be NULL or match the validated https pattern (M-2).
  - Visitor-provided URLs are shown as plain text and are **never** rendered as links.
  - **Specified detail (A6):** a seed-origin `source` becomes a link only if `new URL(source).protocol === 'https:'`, with `rel="noopener noreferrer nofollow"`.
- **Rationale:**
  - It prevents stored script URLs.
  - Plain text removes the phishing vector, which `rel` attributes alone wouldn't.
- **Assumptions:** non-ASCII hostnames must be entered as punycode.
- **Consequences:** invariants I10 and I16; scenario G.
- **Evidence:**
  - EVAL-030: the accept and reject table.
  - EVAL-017 (P5): `javascript:` was stored.

## DR-018: Sandbox limits: 10 visitor evidence and 20 visitor decisions per gate, 5-minute cooldown (D6)

- **Date:** specified at 10:58; approved on 2026-10-02.
- **Status:** Accepted
- **Implementation status:** **Not yet implemented** (Stage 2: M-6). Stage 1 sets the public write bound to zero; that part is in the repository and verified locally (DR-021), but not applied to live.
- **Context:** public writes are unbounded today. The free plan turns read-only above 500 MB of database size (SEC-003).
- **Options considered:**
  - **Per-gate caps inside the sandbox functions:** chosen.
  - **A per-launch or global cap:** implied by the fixed gate count times the per-gate cap.
  - **A per-session cap:** needs an identity, and a client-generated id is forgeable.
  - **Triggers:** unneeded once writes go only through the functions.
  - **An Edge Function:** adds server code and secret handling.
  - **A per-IP limit through `db_pre_request`:** deferred. It keys on the first `X-Forwarded-For` value, whose spoofability is unverified, and it writes a row per request.
- **Decision:**
  - Per sandbox gate, between resets: at most **10 visitor evidence rows** and **20 visitor decisions**.
  - At most one sandbox reset every **5 minutes**.
  - The canonical launch accepts **0** visitor rows.
  - The caps are enforced inside the SECURITY DEFINER functions, under the gate's row lock, which makes them race-free.
- **Rationale:** the limits come from the intended exploratory workflow, and they bound storage.
  - **One exploration of a gate:** it visits each of the 5 statuses once (4 transitions) and uses at most 2 evidence items (one to satisfy Passed, one to show a list).
  - **Allowing 5 explorations per gate between resets** gives 20 decisions and 10 evidence items.
  - **Storage bound:** across 16 gates that's at most 480 visitor rows, about 2 MB worst case, under 0.5% of the quota.
  - **Reset churn:** a 5-minute cooldown caps it at about 12 resets an hour × 2 MB, roughly 24 MB an hour of dead rows that autovacuum reclaims.
- **Assumptions:** these are product assumptions, kept as tunable constants.
- **Consequences:**
  - Invariant I12.
  - Scenario C.
  - A concurrency test: two sessions racing at one below the cap, where exactly one succeeds (B-4).
- **Evidence:**
  - EVAL-032: 6,000 rows and 13 MB in 0.61 s.
  - EVAL-026: the 500 MB read-only rule.

## DR-019: One authoritative migration deployment path (D7)

- **Date:** specified at 10:58; approved on 2026-10-02.
- **Status:** Accepted
- **Implementation status:** **Implemented by DR-024** (decided at 14:15): the Supabase connector is the single path, and release gate R-9 is met. No migration has been applied under it yet; Stage 1 is the first. The earlier notes below are kept as written, followed by a correction.
  - All migrations so far were applied through the Supabase connector.
  - The owner reported linking GitHub to the Supabase project. Its deploy settings haven't been verified. **(A misreading; see the correction below.)**
  - Which mechanism becomes the single path is still to be confirmed.
  - **Update (Stage 1, about 12:05):**
    - The current Supabase documentation says the GitHub integration's "Deploy to production" option applies new migrations when changes reach the production branch. It works on every plan and doesn't need branching (EVAL-037).
    - The project has no Supabase branches. That doesn't show whether the option is on, and the setting is only visible in the dashboard.
    - The single path therefore couldn't be established, so the Stage 1 migration was **not** applied to production.
    - **To unblock, the owner reads Project Settings > Integrations > GitHub** (deploy to production on or off, production branch, working directory) and picks one path:
      - **The connector or CLI,** with "Deploy to production" turned off. A file applied through the connector is renamed to its recorded version (DR-009).
      - **The GitHub integration,** in which case nothing is applied through the connector.
  - **Update (Stage 1 release checkpoint, 12:36 to 13:10):**
    - The setting still can't be read. No available tool exposes the GitHub integration's settings, and nothing observable distinguishes "Deploy to production" on from off (EVAL-052).
    - That is decision-tree Case C, so production was **not** changed.
    - Pushing `claude/phase1-schema` at 12:40 applied nothing to live: the migration history was unchanged and no new database or API log entries appeared (EVAL-053). So a push to this branch doesn't deploy. Whether a merge to `main` would is unknown.
    - Still blocking. The owner actions above are unchanged. Section 16 of the reconciliation record lists them, with the read-only verification to run after deployment.
  - **Correction (recorded with DR-024):**
    - The note "The owner reported linking GitHub to the Supabase project" misread the owner's 09:18 instruction. It said: "Supabase is now linked to this repo. Use that link." and "Apply the migrations to the linked Supabase project". It referred to the Supabase connector made available to the session, which applied migrations 1 and 2 at 09:20 and 09:21. It didn't mention GitHub, and no GitHub integration was connected.
    - The owner confirmed at 13:54 that Supabase has never been connected to GitHub: the project's GitHub integration page offers "Authorize GitHub" (EVAL-060).
    - The misreading was this documentation's, not the owner's. It also produced "since before the integration was linked" in EVAL-052 and in section 16 of the reconciliation record, and the GitHub-settings premise of the two updates above and of release gate R-9. Those records keep their wording, with correction notes added.
  - **Update (DR-024):** implemented. The connector is the single authoritative path. The GitHub integration remains an unused alternative that would need its own decision. Release gate R-9 is met; the instruction to read the integration's deploy settings no longer applies, because no integration exists.
- **Context:** two mechanisms can apply migrations to the same project: the connector or CLI, and the GitHub integration. Competing paths cause double application and drift (finding N4).
- **Options considered:** the connector or CLI as the single path; the GitHub integration as the single path; both (rejected).
- **Decision:**
  - Use exactly one authoritative migration deployment path.
  - **Before any production deployment,** verify the GitHub/Supabase integration settings, so migrations can't be applied by more than one mechanism (release gate R-9).
  - Every repository migration file carries the version recorded when it was applied (DR-009).
- **Rationale:** byte and version parity between the repository and `supabase_migrations` (invariant I20).
- **Assumptions:** none.
- **Consequences:** catalog test C-11 (migration parity) belongs to whichever path is chosen.
- **Evidence:** EVAL-022: the current state is byte-identical.

## DR-020: No Supabase Auth at this stage; `authenticated` stays aligned with `anon`

- **Date:** decided by the project owner on 2026-10-02, at the start of Stage 1.
- **Status:** Accepted. Extends DR-006 beyond Phase 1. Its R-8 consequence (the owner checks the Auth settings) was replaced by DR-022 at the Stage 1 release checkpoint.
- **Implementation status:** in force. There's nothing to build. This decision removes work rather than adding it.
- **Context:**
  - The project is a portfolio and demo system for recruiter, hiring-manager and technical review, not a customer-facing SaaS product.
  - Its canonical data is synthetic and author-curated.
  - The Phase 2B record (§7) listed what Auth would and wouldn't solve, and found that neither Stage 1 nor the Stage 2 sandbox needs it.
- **Options considered:**
  1. Add Supabase Auth now: anonymous sign-ins, per-visitor sandboxes, `auth.uid()` policies.
  2. Keep the public experience deliberately constrained and unauthenticated: a read-only canonical launch now, and later a shared sandbox reachable only through allowlisted database functions.
- **Decision:** option 2. **This project doesn't add:**
  - login, signup or anonymous sign-in
  - sessions, auth cookies or auth middleware
  - user profiles or ownership columns
  - policies that depend on `auth.uid()`
  - any Auth UI

  `authenticated` remains a PostgreSQL role whose privileges are kept identical to `anon`'s (invariant I6, catalog check 13).
- **Rationale:**
  - Authentication isn't what establishes this project's trust boundary.
  - The boundary is the database:
    - least-privilege grants (read-only for the public in Stage 1)
    - row-level security on every table
    - CHECK constraints on the data
    - a small set of controlled SECURITY DEFINER functions with pinned search paths
    - provenance planned for visitor rows
    - a hard separation between the canonical launch and the future sandbox
  - That boundary is enforced and tested whether or not a caller is signed in.
  - Adding Auth only to look production-like would add configuration, abuse surface (account creation) and cleanup work, without changing what the public can do.
- **What this doesn't mean:**
  - The system isn't "secure because it has no Auth".
  - The absence of Auth has real costs:
    - nobody can be attributed individually
    - sandboxes can't be private per visitor
    - limits can't be applied per person
    - inside the future shared sandbox, griefing is an accepted residual risk (DR-013)
- **Assumptions:** the data stays synthetic; nothing in the app needs to know who a visitor is.
- **Consequences:**
  - The Auth project settings still matter. If signups are open, anyone can obtain the `authenticated` role. That's harmless only while `authenticated` holds exactly `anon`'s privileges, so check 13 guards it, and the owner still checks the settings (release gate R-8).
  - **Revisit this decision if:**
    - real or sensitive data is added
    - per-person attribution becomes a product requirement
    - private per-visitor sandboxes are needed
    - an OAuth integration (LinkedIn included) is wanted
    - sandbox abuse occurs that the caps and cooldown can't contain
- **Evidence:**
  - EVAL-024: 0 Auth users and no identity providers in use.
  - EVAL-041 and EVAL-048: catalog check 13 shows identical privileges for the two roles, locally and on live.

## DR-021: Stage 1 security hardening: one migration, a read-only catalog test, a local behavior test

- **Date:** 2026-10-02, 11:47 to 12:05.
- **Status:** Accepted
- **Implementation status:** in the repository and **verified locally on Postgres 17.10**. **Not applied to the live project**, because the single deploy path isn't established (DR-019, R-9).
  - **Update (Stage 1 release checkpoint):**
    - Pushed to `origin/claude/phase1-schema` at 12:40 as `e74aaaf` (EVAL-053).
    - `8a1ad9d` changed only the behavior test. Five test values that had been written as raw invisible or non-ASCII characters are now escape text (EVAL-055). Eight reject cases were added: line endings, a tab, full-width letters and a lookalike letter, 41 in total (EVAL-054). The migration is unchanged.
    - The local replay passed again: catalog 17 of 17, behavior 24 of 24, fingerprint 12 of 12, integrity 6 of 6 (EVAL-056).
    - Still **not applied to live** (DR-019). SEC-007's disposition is DR-023. Release gate R-8 was retired by DR-022.
  - **Update (deployment-path decision, 14:15):** the deploy path is now designated (DR-024), so the reason given above no longer applies. Stage 1 will be the first migration applied through the connector under DR-024, in a separately authorized run. After application, the file is renamed to the version Supabase records, with its SQL unchanged (DR-009, R-2). It's still **not applied to live**.
- **Context:** Phase 2B specified Stage 1 as steps S1 to S6, migrations M-1 to M-3, the catalog tests C-1 to C-14 and the behavior tests B-1 to B-3.
- **Options considered:**
  - one migration or three
  - guarded statements (`if exists`) or strict ones
  - the Phase 2B URL pattern as written, or a pattern that doesn't depend on the collation provider
  - also changing the default privileges for functions, or not
- **Decision:**
  - **One migration, created with the Supabase CLI** (`supabase migration new`, CLI 2.119.0): `supabase/migrations/20261002115318_stage1_security_hardening.sql`.
    - **M-1:** revoke `anon` and `authenticated` EXECUTE on `reset_demo_data()` and `set_gate_status(bigint, gate_status, text, text, text)`, revoke INSERT on `evidence`, and drop the policy `"Public append"`.
    - **M-2:** the CHECK constraint `evidence_source_https`.
    - **M-3:** revoke default table privileges for tables that `postgres` creates in `public` from `anon` and `authenticated`.
    - The statements are strict. If the catalog differs from what they expect (a missing policy, a different signature), the migration fails instead of silently doing nothing.
    - It adds no write path and no function.
  - **The M-2 pattern deviates from the Phase 2B text on purpose:**
    - The Phase 2B text used the POSIX classes `[:space:]` and `[:cntrl:]` for the path. The live database's collation provider is ICU (EVAL-036), and those classes follow the provider. So the rule could behave differently on live than in any local test.
    - The implemented pattern lists its characters explicitly instead: the RFC 3986 URI characters, plus `%` followed by two hex digits.
    - **Every accept and reject case in the Phase 2B table keeps its outcome** (EVAL-043).
    - It's stricter in two ways. Raw non-ASCII text must be percent-encoded, as it must in a valid URI. And characters RFC 3986 excludes, such as `< > " \ { } | ^` and backtick, are rejected.
    - It accepts IPv4 literals such as `https://192.0.2.10/`, because they're dotted ASCII labels. That's harmless here: no server ever fetches these URLs, and visitor URLs are never links (DR-017).
  - **The default privileges for functions are deliberately not changed.** That's a separate, newly found issue (SEC-007). Fixing it needs a global change that affects every schema, so it's recorded for its own decision. Catalog check 9 guards the gap in the meantime.
  - **New test files:**
    - **`supabase/tests/security_catalog.sql`:** read-only, 17 checks plus an overall row, safe on production.
    - **`supabase/tests/stage1_behavior.sql`:** local only and rolled back. It refuses to run where Supabase's `auth` or `supabase_migrations` schema exists. It has 24 checks, and its denials must carry SQLSTATE 42501.
    - **`supabase/tests/local_roles.sql`:** now also creates `service_role` and mirrors live's per-schema default table privileges. Without that, a local build would hide the defaults M-3 removes.
  - **App code:** one comment in `src/components/AppShell.tsx` no longer points future work at `reset_demo_data()` (DR-014). No behavior changed.
- **Rationale:**
  - It's the smallest change that removes every public write path and gives each removal a test that fails first.
  - Building the local database from the same migrations, and checking that it matches live, makes local results evidence about production (EVAL-039).
- **Assumptions:** Postgres 17.10 locally behaves like live's 17.11 for privileges and default ACLs (same major version).
- **Consequences:**
  - Once applied to live, the public surface is read-only: SELECT on 6 tables and 1 view, and no executable functions.
  - The Supabase advisor lints 0028 and 0029 should then clear. That's expected, not verified.
  - **If the file is applied through the connector,** Supabase records its own version, and DR-009 applies: the file is renamed to that recorded version.
  - **If it's applied through the GitHub integration or the CLI,** the file's version is used as-is.
  - Stage 2 must update catalog checks 9 and 15 in the same commit as the sandbox migration.
- **Evidence:**
  - EVAL-039 to EVAL-047: local results.
  - EVAL-048 and EVAL-049: the live read-only posture before the migration.

## DR-022: Retire release gate R-8 (the Auth settings check); no Auth is an explicit tradeoff

- **Date:** decided by the project owner on 2026-10-02, at the Stage 1 release checkpoint (12:36).
- **Status:** Accepted. Amends DR-020 by replacing its R-8 consequence, and retires the R-8 assumption in DR-006.
- **Implementation status:** in force. Documentation only: nothing is built and no setting changes.
  - Release gate R-8 and Stage 1 step S6 are marked **retired** in the reconciliation record (sections 9, 11 and 16), not passed.
  - The replacement condition is already enforced by catalog checks 13 and 15. Both pass on the local Stage 1 build (EVAL-056). Check 13 also passes on live (EVAL-051).
- **Context:**
  - R-8 asked the owner to read the Auth signup settings in the dashboard, because if signups are open anyone can obtain the `authenticated` role (DR-006, DR-020).
  - The project deliberately doesn't use Supabase Auth (DR-020), and no available tool reads those settings.
  - Keeping R-8 made the Stage 1 release wait on the configuration of a subsystem the project doesn't use.
- **Options considered:**
  1. **Keep R-8 as an owner action.** It makes the release wait on a manual reading that proves less than the database test: it describes one setting at one moment, while checks 13 and 15 test what any `authenticated` caller can do.
  2. **Make Auth hardening a release requirement** (signups off, CAPTCHA, rate limits). Rejected: it creates an Auth dependency only to satisfy a checklist.
  3. **Retire R-8, and gate the release on a database condition** that is tested on every run.
- **Decision:** option 3.
  - Auth is intentionally not used for this synthetic public demo. Security is enforced through database permissions, row-level security, narrowly scoped functions (none callable by the public in Stage 1), provenance and sandbox isolation (both Stage 2).
  - Release gate R-8 is retired. **Its replacement:** catalog checks 13 and 15 pass on every deployment.
    - **Check 13:** `anon` and `authenticated` hold identical privileges on every table, column, sequence and function in `public`, on the schema itself, and on the database.
    - **Check 15:** the policies fingerprint pins every policy's role list, so no policy can treat the two roles differently without failing the run.
- **Rationale:**
  - The risk behind R-8 is that a stranger obtains the `authenticated` role. While the two roles hold exactly the same privileges, that role gives nothing the publishable key doesn't already give.
  - Checks 13 and 15 test that condition directly, on live as well as locally, every time they run.
- **What this doesn't mean (the tradeoff):**
  - Running without Auth isn't a security advantage, and the system isn't "secure because it has no Auth". The costs listed in DR-020 stand: no per-person attribution, no private sandboxes, no per-person limits, and no way to block one visitor.
  - **The Auth settings stay unread.** If signups are open, account creation is an abuse surface of its own: junk rows in `auth.users`, and confirmation emails sent to arbitrary addresses. Supabase's Auth rate limits govern that, and they're unverified for this project. Accounts created that way gain no data access beyond `anon`'s while checks 13 and 15 pass.
  - Checks 13 and 15 cover schema `public` and the database, which is everything the application uses. Other schemas, such as Supabase's `storage`, are outside them.
- **Assumptions:** the data stays synthetic, and DR-020's revisit triggers still apply.
- **Consequences:**
  - A change that gives `authenticated` something `anon` lacks fails check 13 or 15. It then needs a new decision that revisits DR-020 and this one; editing the test alone isn't enough.
  - Turning signups off in the dashboard remains available to the owner as optional defense in depth. It isn't a release gate and isn't tracked as one.
  - If Auth is ever introduced (DR-020's revisit triggers), its settings become part of that design, with their own gates.
- **Evidence:**
  - EVAL-024 and EVAL-051: 0 Auth users and 0 identities on live (and 0 anonymous users, EVAL-051). No policy or function in `public` refers to `auth.*` (EVAL-051).
  - EVAL-048 and EVAL-051: check 13 passes on live.
  - EVAL-041 and EVAL-056: checks 13 and 15 pass on the local Stage 1 build.

## DR-023: SEC-007 at the Stage 1 release: no default-privilege change; every new function is revoked explicitly

- **Date:** 2026-10-02, at the Stage 1 release checkpoint (12:42 to 12:50).
- **Status:** Accepted. Settles the question DR-021 left open.
- **Implementation status:**
  - **Stage 1 part:** nothing to build. The audit below found no function exposed through the default.
  - **Stage 2 part:** an obligation on the sandbox migration, recorded here and in SEC-007. Not yet implemented.
- **Context:**
  - **SEC-007:** in Postgres, a new function grants EXECUTE to PUBLIC unless that is revoked.
    - Live's per-schema default for functions in `public` (`{postgres=X/postgres}`) is added to that built-in default; it doesn't replace it.
    - A per-schema REVOKE can't remove a global default.
    - So every function `postgres` creates in `public` starts out executable by `anon` and `authenticated`, through PUBLIC.
  - **The owner's instruction:** don't broaden Stage 1 because SEC-007 exists, but don't leave an actually exposed Stage 1 security-sensitive function unresolved either. A narrow, explicit REVOKE or GRANT is preferred over a broad default-privilege change.
- **The audit (Stage 1 scope):**
  - **Live today (EVAL-051):**
    - PUBLIC holds EXECUTE on no function in `public`.
    - The two application functions are executable by `anon` and `authenticated` through explicit grants. M-1 revokes exactly those grants.
    - `rls_auto_enable()` is already owner-only (DR-010).
  - **The Stage 1 migration:** creates 0 functions and contains 0 GRANT statements (EVAL-056).
  - **After Stage 1, locally (EVAL-056):**
    - `reset_demo_data()` and `set_gate_status(...)` both have ACL `{postgres=X/postgres}`.
    - PUBLIC, `anon` and `authenticated` can't execute any function in `public` (catalog check 9).
  - **Conclusion:** no function is exposed through the default, and none will be after Stage 1: the latent default never takes effect in Stage 1, because Stage 1 creates no function. The two functions live exposes today are exposed by explicit grants (SEC-001, SEC-002), not by the default. M-1 revokes them, so that exposure ends only when Stage 1 reaches live.
- **Options considered:**
  1. **Add a narrow REVOKE to the Stage 1 migration.** Nothing needs it: M-1 already removes every grant, and no function receives the default.
  2. **Change the default globally:** `alter default privileges for role postgres revoke execute on functions from public;`, with no schema. It's the only form that removes the built-in PUBLIC default. But it changes every function `postgres` creates in **any** schema, including functions that Supabase or extensions create. That's broader than Stage 1 and needs its own testing.
  3. **Leave the default as it is in Stage 1,** require every new function to revoke EXECUTE from PUBLIC explicitly, and keep the catalog test as the guard.
- **Decision:** option 3.
  - Stage 1 makes no default-privilege change for functions. SEC-007 stays open as a documented latent finding, Low.
  - **Stage 2 obligation:**
    - Every function the sandbox migration creates runs `revoke all on function ... from public` before any GRANT, as the Phase 2B M-6 specification already requires (reconciliation record, section 9). It also revokes from `anon` and `authenticated` by name, in case a default ever grants them directly.
    - The same commit updates check 9's allowlist to exactly the functions meant to be public, and check 15's expected values.
  - The global change (option 2) stays available as a separate decision. If it's taken, it gets its own migration, local replay and review.
- **Rationale:**
  - There's no Stage 1 exposure to fix, so a Stage 1 change would add risk without removing any.
  - Check 9 fails if any function in `public` becomes executable by `anon` or `authenticated`, PUBLIC included, because both roles inherit PUBLIC's privileges (EVAL-042 shows it catching a new function). A forgotten REVOKE in Stage 2 is caught before release.
- **Assumptions:** functions in `public` are created only by `postgres` (check 17), through migrations.
- **Consequences:**
  - A function written without the explicit REVOKE is a defect that check 9 catches, not a design choice.
  - SEC-007's record points here for its disposition.
- **Evidence:**
  - EVAL-040 and EVAL-042: the built-in default on Postgres 17, and check 9 catching it.
  - EVAL-051: live function ACLs; PUBLIC holds EXECUTE on no function.
  - EVAL-056: the Stage 1 build's function ACLs; the migration has 0 functions and 0 GRANT statements.

## DR-024: The Supabase connector is the single authoritative production migration path

- **Date:** decided by the project owner on 2026-10-02 (instruction at 14:15), after the read-only deployment-path audit (13:54 to 14:04, EVAL-060).
- **Status:** Accepted. Implements DR-019 (D7).
- **Implementation status:** in force for the next production migration. No migration has been applied under it yet. Stage 1 (`20261002115318_stage1_security_hardening.sql`) is the first, and waits on a separately authorized deployment run (release gate R-2).
- **Context:**
  - DR-019 (D7) requires exactly one authoritative path for migrations to reach production. Invariant I20 requires the repository files to match `supabase_migrations`.
  - **GitHub has never been connected to the Supabase project.**
    - The owner confirmed this at 13:54 from the project's GitHub integration page, which offers "Authorize GitHub" (EVAL-060).
    - It matches every observable signal: GitHub wasn't connected at creation (DR-005), the project has no Supabase branches, `main` has never contained `supabase/`, and the logs show no deploy activity (EVAL-052, EVAL-059).
    - Earlier records said the owner had linked GitHub. That was a misreading of the 09:18 instruction (see the correction in DR-019).
  - **The connector has applied every production migration.** `20261002092043`, `20261002092141` and `20261002093521` went through it at 09:20, 09:21 and 09:35. Each is stored as one statement whose md5 equals its repository file (EVAL-022, EVAL-059).
  - **The connector assigns the version.** Its `apply_migration` operation takes a name and the SQL, with no version parameter, and Supabase records the version when the migration is applied (EVAL-059, EVAL-060).
  - **DR-009 already handles that.** Migrations 1 and 2 were committed as `...000100` and `...000200` (`03a4666`) and renamed to their recorded versions in `9c65e6c`. Migration 3 was committed under its recorded version in `ddadd36`.
  - **No other mechanism exists.** The Supabase CLI isn't linked and has no credentials here, and the repository has no CI (EVAL-060).
- **Options considered:**
  1. **The Supabase connector:** the existing mechanism, behind every production migration so far.
  2. **The Supabase GitHub integration:** never connected. Adopting it would add a third-party deployment path triggered by merges to `main`, so it would need its own decision.
  3. **The Supabase CLI** (`supabase db push`), run with the owner's credentials or in CI: neither linked nor configured. It needs credentials or new infrastructure.
  4. **History-only tools or ad hoc SQL** (`supabase migration repair`, the Management API's upsert without applying, the SQL editor): rejected. They record history without running the migration, or run SQL without recording it.
- **Decision:** the Supabase connector is the single authoritative production migration path for this project, unless a future decision explicitly replaces it.
- **Procedure,** for every production migration:
  1. Author the migration in Git.
  2. Replay and verify it locally: a fresh Postgres 17 database built from `supabase/tests/local_roles.sql` and every migration.
  3. Run the read-only production preflight: the migration isn't recorded yet, the recorded history matches the repository, and production is at the expected baseline.
  4. Apply the exact migration SQL once through the connector: `apply_migration`, with the file's name part as `name` and the file's exact bytes as `query`.
  5. Read the version Supabase actually recorded.
  6. Rename the repository file to that recorded version, without changing its SQL contents.
  7. Verify parity: the recorded version equals the filename, the stored statement's md5 equals the file's, and the migration is recorded exactly once.
  8. Run the read-only production verification. For Stage 1 it's listed in section 16 of the reconciliation record.
  9. Commit and push the renamed file and the evidence.

  **The rename in step 6 is a post-application normalization of the repository file name.** It doesn't modify production SQL or the migration's contents.
- **Safety:**
  - Applying a migration to production requires the owner's explicit authorization for that deployment run.
  - The connector is the only production migration path.
  - GitHub isn't a production deployment path, and it shouldn't be connected merely to deploy this project.
  - History-only manipulation, such as `supabase migration repair`, isn't a deployment mechanism.
  - Direct ad hoc SQL on production isn't an alternative migration path.
  - No service-role key or other secret credential is placed in the repository (invariant I1, DR-011).
- **How I20 applies to a connector deployment:**
  - **Before deployment:** the authored filename may carry the timestamp from when the migration was created.
  - **During deployment:** Supabase assigns the production version.
  - **After deployment:** the repository file is renamed to the production-recorded version, with its contents unchanged.
  - **The invariant:** once that rename is committed, the repository and production agree on version, contents and order. I20 is checked then. The authoring timestamp isn't part of the invariant, and the migration isn't required to keep it.
- **Rationale:**
  - It's the only mechanism that exists, and it has deployed all three production migrations with exact byte parity.
  - It satisfies the existing records as written: one path (DR-019), recorded versions in the repository (DR-009), and R-2's "repository files renamed to the recorded versions".
  - It needs no new infrastructure, access grant or credential.
- **Assumptions:**
  - The data stays synthetic, and the project has a single maintainer.
  - The connector stays available under the owner's authorization.
- **Consequences:**
  - **Positive:**
    - no new infrastructure
    - no new production credentials
    - consistent with the existing migration history and with how the project has been deployed
    - explicit single-path governance; release gate R-9 is met
  - **Tradeoffs:**
    - Deployment is manual.
    - Supabase assigns the migration version at application time, so an authored version is provisional until deployment.
    - The repository filename is normalized after application. Until that commit lands, the repository and production briefly disagree on the version.
    - The process depends on explicit operator authorization.
    - There's no Git-triggered automatic deployment.
    - The connector doesn't pass the Management API's idempotency key (none of the three history rows has one, EVAL-060), so the preflight in step 3 is what prevents a double application.
- **Revisit if:**
  - multiple contributors require automated deployment
  - Git-triggered deployment becomes a project requirement
  - the project needs stable authored migration versions, independent of application time
  - a CI/CD pipeline becomes justified
  - operational scale makes manual migration deployment inappropriate

  Any replacement needs its own decision, and must retire the connector as a write path before it starts, so that two mechanisms never coexist. Because every file carries its recorded version, a later switch re-runs nothing.
- **Evidence:**
  - EVAL-060: the deployment-path audit: the owner's confirmation, the 09:18 instruction's wording, the connector's contract, and the CLI and CI state.
  - EVAL-022 and EVAL-059: production migration history and byte parity.
  - DR-009 and the repository history (`03a4666`, `9c65e6c`, `ddadd36`).
- **Amendment A1 (2026-10-02, 14:55): a temporary confirmation setting for the Stage 1 deployment window.** Added after the first attempt; the decision above is unchanged.
  - **What happened:** the first Stage 1 deployment attempt made one `apply_migration` call at 14:48:23. It timed out at 14:49:27 and applied nothing (EVAL-062).
    - The Supabase connector asks for confirmation before running SQL it detects as destructive, and the migration contains `drop policy`.
    - This cloud client didn't show that confirmation to the owner. The call waited until the session's MCP tool timeout of 60 seconds (`MCP_TOOL_TIMEOUT=60000`, EVAL-063).
    - The tool never reported that it was waiting for confirmation, so this cause is an inference. It's consistent with EVAL-006 and EVAL-062.
  - **The mechanism doesn't change.** The Supabase connector remains the single production migration path. This amendment changes no database object, migration, test or project file.
  - **The accommodation:** for the controlled Stage 1 deployment window only, the owner sets the Supabase connection's `skip_elicitations=apply_migration` option.
    - It's set on the connection, outside the repository, so that `apply_migration` runs without the confirmation form this client can't display.
    - It applies to the `apply_migration` tool only. It doesn't cover `execute_sql` or any other tool.
  - **Authorization:**
    - The setting authorizes nothing by itself, and it doesn't authorize any other migration or production change.
    - The owner's explicit authorization for the Stage 1 production deployment is the authorization for that single migration operation. It stands in for the confirmation form.
  - **Removal:** the owner removes the setting after the deployment attempt, whether it succeeds or fails.
  - **The hard-stop rules still apply in full:**
    - exactly one `apply_migration` call, with no retry;
    - no `migration repair` and no manual history changes;
    - independent read-only verification afterwards.
  - **On failure:** if the attempt fails or behaves unexpectedly, the deployment stops, the setting is removed, and nothing is retried in that run.
  - **Scope:** this is a temporary operational accommodation for the current client environment. It isn't a change to the project's database architecture or to DR-024's procedure. Any future migration that triggers the same confirmation needs its own explicit authorization under this rule, or a client that shows the form.
