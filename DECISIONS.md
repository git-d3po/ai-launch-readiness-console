# Decision log

The engineering decisions behind the AI Launch Readiness Console, in the order they were made. Each
entry says what was decided, why, what else was considered, and what evidence supports it.

[`PROJECT_BRIEF.md`](PROJECT_BRIEF.md) is the original product plan and is kept as history. Where it
and this log disagree, this log is authoritative.

**Related records:**
- [`docs/security/2026-10-02-audit-2b-reconcile.md`](docs/security/2026-10-02-audit-2b-reconcile.md): the security reconciliation, invariants, remediation plan and release gates
- [`docs/security/findings.md`](docs/security/findings.md): one record per confirmed security finding (SEC-001 to SEC-006)
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
| DR-006 | No authentication in Phase 1; `anon` and `authenticated` have identical privileges | Accepted (extended by DR-020) | Implemented (`03a4666`) |
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
| DR-019 | One authoritative migration deployment path (D7) | Accepted | **Not yet implemented**; blocks production deployment (release gate R-9) |
| DR-020 | No Supabase Auth at this stage; `authenticated` stays aligned with `anon` | Accepted | In force (nothing to build) |
| DR-021 | Stage 1 security hardening: one migration, a read-only catalog test, a local behavior test | Accepted | In the repository and verified locally on Postgres 17; **not applied to live** |

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
- **Status:** Accepted. Extended beyond Phase 1 by DR-020, which keeps Auth out of the project at this stage.
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

**Implementation order** (details in [the reconciliation record](docs/security/2026-10-02-audit-2b-reconcile.md#9-remediation-sequence)):
- **Stage 1, security hardening:** the read-only catalog test, then migrations M-1 (no public writes), M-2 (https check) and M-3 (default privileges), then verification. Done in the repository and locally; the production deployment is pending R-9.
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
- **Implementation status:** **Not yet implemented.**
  - All migrations so far were applied through the Supabase connector.
  - The owner reported linking GitHub to the Supabase project. Its deploy settings haven't been verified.
  - Which mechanism becomes the single path is still to be confirmed.
  - **Update (Stage 1, about 12:05):**
    - The current Supabase documentation says the GitHub integration's "Deploy to production" option applies new migrations when changes reach the production branch. It works on every plan and doesn't need branching (EVAL-037).
    - The project has no Supabase branches. That doesn't show whether the option is on, and the setting is only visible in the dashboard.
    - The single path therefore couldn't be established, so the Stage 1 migration was **not** applied to production.
    - **To unblock, the owner reads Project Settings > Integrations > GitHub** (deploy to production on or off, production branch, working directory) and picks one path:
      - **The connector or CLI,** with "Deploy to production" turned off. A file applied through the connector is renamed to its recorded version (DR-009).
      - **The GitHub integration,** in which case nothing is applied through the connector.
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
- **Status:** Accepted. Extends DR-006 beyond Phase 1.
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
