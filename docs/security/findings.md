# Security findings

One record per confirmed security finding.

- **Sources:** Audit 1 and Phase 2B, 2026-10-02, at baseline `cb27437`. Live matched the repository at the time (EVAL-022, EVAL-023).
- **Full analysis:** [`2026-10-02-audit-2b-reconcile.md`](2026-10-02-audit-2b-reconcile.md).
- **Evidence IDs (EVAL-NNN):** refer to [`../evaluation/EVALUATION_LOG.md`](../evaluation/EVALUATION_LOG.md).

**Status fields:**
- **Confirmed:** the evidence shows the finding on the baseline.
- **Remediation specified:** the fix is written down in the reconciliation record.
- **In the repository:** the fix is committed and passes its tests on a local build made from the repository's migrations.
- **Applied to live:** the fix is applied to the live project through the single deploy path (DR-019) and verified there with read-only checks.

(Before Stage 1 this record had a single "Implemented" column, meaning merged, applied and verified. It was split so that local verification is never mistaken for a production change.)

**Severity scale (Phase 2B):**
- **High:** unauthenticated, low effort, and material integrity or availability impact on the public demo today.
- **Medium:** real but limited or recoverable impact.
- **Low:** latent, or defense in depth.

Audit 1's original rating is kept beside the revised one.

| ID | Finding | Audit 1 ID | Original | Revised | Confirmed | Remediation specified | In the repository | Applied to live |
|---|---|---|---|---|---|---|---|---|
| SEC-001 | Anonymous callers can forge readiness and impersonate approvers | C1 | Critical | High | Yes | Yes | Stage 1 part: yes. Stage 2 part: yes (database EVAL-071 to EVAL-078; UI EVAL-081 to EVAL-086) | Stage 1 part: **yes** (EVAL-065, EVAL-066). Stage 2 part: no |
| SEC-002 | Anonymous callers can truncate and re-seed all launch data | C2 | Critical | Medium | Partially (it restores the seed) | Yes | Stage 1 part: yes. Stage 2 part (`sandbox_reset`, A7): yes (EVAL-071 to EVAL-078, EVAL-085, EVAL-086) | Stage 1 part: **yes** (EVAL-065, EVAL-066). Stage 2 part: no |
| SEC-003 | Unbounded public writes can push the database into read-only mode | H1, N1 | High | High | Yes | Yes | Stage 1 part (zero public writes): yes. Stage 2 caps: yes (EVAL-071 to EVAL-078; cap messages EVAL-083) | Stage 1 part: **yes** (EVAL-065, EVAL-066). Stage 2 part: no |
| SEC-004 | Visitor text is shown as authoritative on the canonical overview | H3, H4 | High, High | Medium; H4 Low | Yes | Yes | Stage 1 part: yes. Stage 2 part: yes (provenance, I14, I15: EVAL-071 to EVAL-078; Visitor labels: EVAL-084) | Stage 1 part: **yes** (EVAL-065, EVAL-066). Stage 2 part: no |
| SEC-005 | `evidence.source` accepts `javascript:` and other unsafe URLs | H2 | High | Low (latent) | Yes | Yes | Database rule: yes. Rendering rule (A6): yes (EVAL-082, EVAL-083) | Database rule: **yes** (EVAL-065, EVAL-066). Rendering rule: not hosted |
| SEC-006 | Default privileges give API roles privileges on future tables | H5 | High | Low | Yes (facts) | Yes | Yes | **Yes** (EVAL-065, EVAL-066) |
| SEC-007 | Functions that `postgres` creates are executable by PUBLIC by default | None (new in Stage 1) | n/a | Low (latent) | Yes | Yes: no default change; explicit revoke per function (DR-023) | Nothing to change in Stage 1; guarded by catalog check 9 | n/a (nothing to apply) |

**Stage 2, current (2026-10-02, after EVAL-086):** the Stage 2 database controls (M-4 to M-6) and the Stage 2 UI controls (A1 error boundary, A3 sandbox marking, A4 canonical read-only pages and sandbox-only forms, A5 "Visitor" labels, A6 source rendering, A7 sandbox reset) are in the repository and verified locally (EVAL-071 to EVAL-086). **None of it is applied to live or hosted**: the live project is at Stage 1. Deployment follows the reconciliation record, §20. The dated blocks below are kept as written.

**Stage 2 (2026-10-02, about 17:11):** the Stage 2 database controls for SEC-001, SEC-003 and SEC-004 (provenance, the sandbox functions, caps, database-set identity and dates, I14 text rules) are in the repository and verified locally (EVAL-071 to EVAL-074; re-verified after the review fixes, EVAL-075 to EVAL-078). They aren't applied to live, and the Stage 2 UI controls aren't built.

**Status after the Stage 1 deployment (2026-10-02, about 16:29):**
- **Applied to live:** migration `20261002160901_stage1_security_hardening`, the same file authored as `20261002115318_...`, was applied once through the Supabase connector (DR-024) at 16:09 (EVAL-065). The repository file is renamed to that version (DR-009, EVAL-067); the closeout commit carries the rename.
- **Verified on live, read-only (EVAL-066):** catalog test 17 of 17; all 12 fingerprint parts equal EVAL-045, seed intact; the security advisor shows no lints, so 0028 and 0029 are cleared.
- **Migration parity, C-11 (EVAL-068):** the stored statement's md5 equals the repository file's, `f66a638dfb93554ad4f1a2bac0826304`.
- **So the Stage 1 parts of SEC-001 to SEC-006 are applied to live.** The Stage 2 controls are still not built.
- The block below is the status as of 14:25, kept as written.

**Status after the deployment-path decision (2026-10-02, about 14:25):**
- **In the repository:** migration `supabase/migrations/20261002115318_stage1_security_hardening.sql` implements the Stage 1 part of SEC-001 to SEC-006. It was verified on a local Postgres 17 build (EVAL-039 to EVAL-047), and again after the behavior test was strengthened (EVAL-056).
- **Pushed:** `origin/claude/phase1-schema` carries it (EVAL-053). It isn't merged to `main`.
- **Not applied to the live project yet.** The deployment path is designated: the Supabase connector (DR-024), so release gate R-9 is met. Applying Stage 1 is a separate, authorized run. The earlier "unreadable GitHub setting" blocker rested on a misreading; no GitHub integration has ever been connected (EVAL-060).
- **Live, read at 12:00, 12:39 and 13:39:** unchanged. It still grants the Phase 1 public write paths, and the catalog test fails there exactly where the migration fixes things (EVAL-048, EVAL-051, EVAL-059). Up to 12:36, no external request had reached a data or function endpoint (EVAL-052).
- **SEC-007:** disposition decided (DR-023). No function is exposed through the default; the two functions live exposes today hold explicit grants, which M-1 revokes.
- **Stage 2 controls:** none are built (provenance, visitor text checks, caps, cooldown, URL rendering).

---

## SEC-001: Anonymous callers can forge readiness and impersonate approvers

- **Finding:** anyone holding the publishable key, which ships in the client, can make the canonical Halcyon launch read **Ready**. No sign-in is needed. They can also place fabricated approvers and text into the decision log that every visitor sees.
- **Attack surface:**
  - **`POST /rest/v1/evidence`:**
    - `anon` and `authenticated` have column INSERT on `gate_id, type, title, summary, source, recorded_on`.
    - The policy `"Public append"` is `with check (true)`.
  - **`POST /rest/v1/rpc/set_gate_status`:**
    - EXECUTE is granted to `anon` and `authenticated`.
    - `decided_by` and `rationale` are supplied by the caller.
  - Gate ids run sequentially from 1 to 16.
- **Evidence:**
  - EVAL-016: grants, policy, advisor lints 0028 and 0029.
  - EVAL-017 (P1): 10 fabricated "Sign-off" rows and 10 calls gave `16 of 16 passed`.
  - EVAL-029: re-verified on a copy proven identical to live. The overview would render `decided_by` "Trust & Safety Lead" and a rationale with an external-looking link.
  - EVAL-027: the overview renders `rationale` and `decided_by`.
  - EVAL-024: no `anon` or `authenticated` calls recorded, so no recorded exploitation.
- **Root cause:** four things combine:
  1. public write authority over canonical rows
  2. a Passed rule satisfiable with the caller's own evidence
  3. identity claims that come from the caller
  4. every row displayed as authoritative

  The rule logic, the SECURITY DEFINER hygiene and the public reads are not at fault.
- **Original severity:** Critical (Audit 1).
- **Revised severity:** High (Phase 2B).
- **Reason for the change:**
  - It meets the High definition exactly: unauthenticated, trivial, with material integrity impact.
  - It isn't treated as worse because the impact is integrity only, on synthetic data. There's no confidentiality impact, the owner can restore the seed, and no exploitation was recorded.
- **Remediation (specified):**
  - **Stage 1, migration M-1 (DR-013):** revoke EXECUTE on `set_gate_status` and `reset_demo_data` from `anon` and `authenticated`, revoke INSERT on `evidence`, and drop `"Public append"`. Validated as a dry run (EVAL-029, EVAL-030).
  - **Stage 2 (DR-013, DR-015, DR-016):**
    - a shared sandbox launch
    - a database-set `origin` on evidence and decisions (M-4, M-5)
    - sandbox functions that refuse canonical gates, fix `decided_by = 'Sandbox visitor'` and set `recorded_on` on the server (M-6)
    - visitor labeling in the UI (A3 to A5)
- **Rejected alternatives:**
  - **Visitor provenance alone:** `gates.status` is one column, so a visitor's change still replaces the canonical status.
  - **Excluding visitor rows from readiness:** that needs separately stored status, which becomes the sandbox.
  - **Labeling alone:** not enforced.
  - **Requiring Auth now:** it doesn't solve provenance, validation or storage bounds, and adds heavy setup.
  - **Per-visitor sandboxes:** they need Auth, CAPTCHA, and cleanup of anonymous users.
  - **A client-only sandbox:** it demonstrates client logic, not database enforcement.
  - **Audit 1's short-term "label visitor rows, optionally exclude visitor evidence from Passed":** visitors could still change canonical status.
- **Invariants:** I3, I4, I7, I11, I15, I17.
- **Regression tests:**
  - **Stage 1:** C-2, C-3, C-4, C-5, B-1.
  - **Stage 2:** B-4, C-14, and the end-to-end test "a sandbox write leaves the canonical overview unchanged".
  - Scenarios A and F in [`scenarios.md`](../evaluation/scenarios.md).
- **Current status:**
  - Confirmed: **yes**
  - Remediation specified: **yes**
  - In the repository, verified locally: **yes, for Stage 1.** M-1 removes every public write path to the canonical launch (catalog checks 3 and 9; behavior checks 3 to 18; HTTP 401/403 with 42501; EVAL-041, EVAL-043, EVAL-046). The Stage 2 controls (provenance, the sandbox functions, labels) aren't built.
  - Applied to live: **no.** Live still grants the write paths (EVAL-048).
    - **Update (16:21): yes, for Stage 1.** Applied at 16:09 (EVAL-065); on live, evidence INSERT, `"Public append"` and `set_gate_status` EXECUTE are gone (catalog checks 3 and 9; policies part) (EVAL-066).

## SEC-002: Anonymous callers can truncate and re-seed all launch data

- **Finding:**
  - `public.reset_demo_data()` is executable by `anon` and `authenticated`.
  - It truncates `launches, gates, evidence, risks, decisions, rollout_stages` with `RESTART IDENTITY`, then re-inserts the seed.
- **Attack surface:**
  - `POST /rest/v1/rpc/reset_demo_data`, with no arguments.
  - The function is SECURITY DEFINER, owned by `postgres` (not a superuser), uses `search_path = ''`, and has no dynamic SQL.
- **Evidence:**
  - EVAL-016: the grant and the advisor lints.
  - EVAL-017 (P2): an `anon` call took decisions from 5 to 4 and evidence from 11 to 10.
  - EVAL-027: no client code calls it, and the Reset button is disabled and unwired.
- **Original severity:** Critical (Audit 1): "erase all data, including the append-only decision log".
- **Revised severity:** Medium (Phase 2B; partially confirmed).
- **Reason for the change:**
  - **What lowered it:**
    - It *restores* the seed, so it can't forge state.
    - Every row it erases today is non-authoritative.
    - Its reach is fixed to six `public` tables, with no dynamic SQL; Auth and storage are untouched.
  - **What remains:**
    - It erases post-seed rows and the decision log.
    - Each call takes six ACCESS EXCLUSIVE locks.
    - Its table-wide reach would destroy any future non-seed rows.
- **Remediation (specified):**
  - **Stage 1, M-1:** revoke EXECUTE from `anon` and `authenticated`. `reset_demo_data()` stays the owner's reseed tool.
  - **Stage 2 (DR-014), `sandbox_reset()`:**
    - deletes visitor rows on sandbox launches only
    - restores sandbox gate statuses from their source gates
    - enforces a 5-minute cooldown
    - locks every sandbox gate before deleting, so a visitor write in flight can't survive it (EVAL-075)
    - uses no TRUNCATE and no `RESTART IDENTITY`
- **Rejected alternatives:**
  - **Keep it public with constraints:** no constraint makes a table-wide TRUNCATE safe for anonymous callers. RLS doesn't apply to TRUNCATE, and the function's owner owns the tables.
  - **A scheduled reseed through `pg_cron`:** suggested by Audit 1. Not needed: the interim has nothing to reset, and `pg_cron` isn't installed.
  - **A whole-database `request_demo_reset()` with a cooldown:** suggested by Audit 1, replaced by the scoped sandbox reset.
- **Invariants:** I4, I7, I13.
- **Regression tests:**
  - **Stage 1:** C-5, B-1.
  - **Stage 2:** B-4 (scope, cooldown, canonical fingerprint unchanged).
  - Scenario B.
- **Current status:**
  - Confirmed: **partially**. The erasure and lock behavior are confirmed; it can't forge state.
  - Remediation specified: **yes**
  - In the repository, verified locally: **yes, for Stage 1.** `anon` and `authenticated` can no longer execute `reset_demo_data()`, and the owner keeps it (catalog check 9; behavior checks 9 and 17; HTTP 401/403). The sandbox reset is Stage 2 and isn't built.
  - Applied to live: **no** (EVAL-048, EVAL-049).
    - **Update (16:21): yes, for Stage 1.** Applied at 16:09 (EVAL-065); on live, `anon` and `authenticated` can't execute `reset_demo_data()` (catalog check 9); lints 0028 and 0029 are cleared (EVAL-066).

## SEC-003: Unbounded public writes can push the database into read-only mode

- **Finding:**
  - Nothing limits public write volume:
    - One `anon` bulk INSERT can add thousands of evidence rows.
    - `set_gate_status` adds one decision per call without limit.
  - On the free plan, a database above 500 MB goes read-only, blocking inserts and deletes until the owner intervenes.
  - **Related (N1):** the list and overview fetch every evidence id per gate, so page payloads grow with the row count.
- **Attack surface:**
  - `POST /rest/v1/evidence` with JSON arrays. It's bounded only by the gateway's body limit (unverified) and `anon`'s 3-second statement timeout.
  - `POST /rest/v1/rpc/set_gate_status`, with unlimited calls.
- **Evidence:**
  - EVAL-017 (P3): 20,010 rows and 2,792 kB from compressible text.
  - EVAL-017 (P4): 500 toggles produced 504 decisions.
  - **EVAL-032: 6,000 incompressible rows, 13 MB, in 0.61 s, inside the 3-second timeout.**
  - EVAL-026: the 500 MB read-only rule.
  - EVAL-016: no caps and no triggers.
- **Original severity:** High (Audit 1).
- **Revised severity:** High (Phase 2B; kept).
- **Reason:**
  - It's an unauthenticated, low-effort, realistic path to the project going read-only, and recovery needs the owner.
  - At about 2.3 KB per row, roughly 220,000 rows reach 500 MB. That figure is arithmetic, not measured.
- **Remediation (specified):**
  - **Stage 1, M-1:** the public write bound becomes zero.
  - **Stage 2 (DR-018):**
    - per-gate caps of 10 visitor evidence rows and 20 visitor decisions, enforced inside the sandbox functions under the gate's row lock, at READ COMMITTED; the functions refuse higher isolation levels, where the lock alone wouldn't hold the cap (EVAL-077)
    - a 5-minute reset cooldown
    - canonical gates accept 0
    - worst case: 480 visitor rows, about 2 MB
- **Rejected alternatives:**
  - **Triggers on direct inserts:**
    - unneeded once writes go only through the functions
    - locking needs UPDATE privilege, so the trigger would itself need SECURITY DEFINER
    - they complicate multi-row statements
  - **An Edge Function with per-IP limits:** adds server code and secret handling.
  - **`db_pre_request` per-IP limits:** keyed on the first `X-Forwarded-For` value, whose spoofability is unverified, and they write a row per request. Deferred.
  - **Per-session caps:** a client-generated id is forgeable.
  - **A global ceiling:** implied by the fixed gate count times the per-gate cap.
- **Invariants:** I3 (Stage 1), I12 (Stage 2).
- **Regression tests:**
  - **Stage 1:** C-2, C-3, B-1.
  - **Stage 2:** B-4 (the 11th evidence item and the 21st decision are denied; concurrency at one below the cap) and C-14.
  - Scenario C.
- **Current status:**
  - Confirmed: **yes**
  - Remediation specified: **yes**
  - In the repository, verified locally: **yes, for Stage 1.** The public write bound is zero, because no table write or function remains for the API roles (catalog checks 3 to 9; behavior checks 3 to 18). The per-gate caps and the cooldown are Stage 2 and aren't built.
  - Applied to live: **no.**
    - **Update (16:21): yes, for Stage 1.** Applied at 16:09 (EVAL-065); on live, no table write, sequence or function privilege remains for the API roles (catalog checks 3 to 9), so the public write bound is zero (EVAL-066).

## SEC-004: Visitor text is shown as authoritative on the canonical overview

- **Finding:**
  - The canonical overview shows visitor-controlled text as if it were authoritative:
    - each gate's latest decision `rationale`, in the "what's missing" line
    - `decided_by`, in Latest decisions
  - These fields accept bidi and control characters.
  - **Related (Audit 1 H4):** evidence `recorded_on` and `type` are set by the caller, but they're never fetched or rendered. Their only current effect is through evidence counts, which is SEC-001.
- **Attack surface:**
  - `set_gate_status` arguments: `rationale`, `decided_by`, `waiver_rationale`.
  - Evidence insert columns: `type, title, summary, source, recorded_on`.
- **Evidence:**
  - EVAL-027:
    - `src/lib/overview.ts:120` passes the rationale to `src/pages/LaunchOverviewPage.tsx:104`, and `decided_by` renders at `:171`.
    - React renders text nodes only, with no HTML sinks.
  - EVAL-017 (P5): an `anon` insert stored an HTML-like title, a summary with a right-to-left override character (U+202E), a `javascript:` source and a 9999-12-31 date. An injection-style rationale was stored as inert text.
  - EVAL-029: a forged decider and rationale render on the overview.
- **Original severity:** High for H3 and High for H4 (Audit 1).
- **Revised severity:** Medium for H3, Low for H4 (merged into SEC-001 and the gate-sheet specification) (Phase 2B).
- **Reason for the change:**
  - This is content injection and impersonation on the canonical page, without code execution.
  - It's wider than Audit 1 reported, because the canonical page displays it.
  - SEC-001's remediation removes it from the canonical launch.
- **Remediation (specified):**
  - **Stage 1, M-1:** no visitor text can reach the canonical launch.
  - **Stage 2:**
    - **Text checks (M-4):**
      - reject C0 controls (tab, LF and CR allowed only in multi-line fields), DEL, C1 controls, and U+202A to U+202E and U+2066 to U+2069
      - single-line titles
      - multilingual text accepted
    - a fixed `decided_by` and a server-set `recorded_on` (DR-016)
    - a "Visitor" label (A5)
    - React text nodes only (I16)
- **Rejected alternatives:**
  - **Rejecting all non-ASCII text:** breaks multilingual input. The validated rule accepts Japanese, Arabic with a right-to-left mark, Hindi with a zero-width joiner, and emoji sequences (EVAL-030).
  - **Labeling alone.**
  - **Audit 1's date bounds for visitor `recorded_on`:** superseded by the server-set date.
- **Invariants:** I14, I15, I16.
- **Regression tests:**
  - B-3: the text table.
  - B-4: unsafe text denied; the fixed decider.
  - End to end: a `<script>` title renders as text; the visitor label shows.
  - Scenario F.
- **Current status:**
  - Confirmed: **yes**
  - Remediation specified: **yes**
  - In the repository, verified locally: **yes, for Stage 1.** No visitor text can reach the canonical launch, because `set_gate_status` and evidence INSERT are closed to the API roles. The Stage 2 text checks, fixed decider and server-set dates aren't built.
  - Applied to live: **no.**
    - **Update (16:21): yes, for Stage 1.** Applied at 16:09 (EVAL-065); on live, `set_gate_status` and evidence INSERT are closed to the API roles (catalog checks 3 and 9) (EVAL-066).

## SEC-005: `evidence.source` accepts `javascript:` and other unsafe URLs

- **Finding:** `evidence.source` has only a length limit of 500, so `javascript:`, `data:` and `http:` values are accepted.
- **Attack surface:**
  - evidence INSERT, which is public today
  - any future UI that renders `source` as a link
- **Evidence:**
  - EVAL-016: the constraint listing.
  - EVAL-017 (P5): `javascript:alert(document.domain)` was stored.
  - EVAL-027: no client code selects or renders `source`, and no `href` is built from data.
- **Original severity:** High (Audit 1).
- **Revised severity:** Low, latent (Phase 2B).
- **Reason for the change:**
  - It isn't rendered anywhere. It becomes stored XSS only if a future UI turns it into a link.
  - It must be fixed before any UI renders `source`.
- **Remediation (specified):**
  - **Stage 1, M-2:** a CHECK `evidence_source_https` with the pattern validated in EVAL-030.
  - **Stage 2, A6 (DR-017):**
    - visitor-origin `source` is plain text, never a link
    - seed-origin `source` becomes a link only if `new URL(source).protocol === 'https:'`, with `rel="noopener noreferrer nofollow"`
- **Rejected alternatives:**
  - **A UI-only check:** the database rule is the durable guard.
  - **Allowing `http:`.**
  - **Making visitor URLs clickable with `rel` attributes:** still a phishing vector.
- **Invariants:** I10, I16.
- **Regression tests:**
  - B-3: the source table; add the empty string.
  - Unit tests for `sourceDisplay()`.
  - End to end: a visitor source has no anchor.
  - Scenario G.
- **Current status:**
  - Confirmed: **yes**
  - Remediation specified: **yes**
  - In the repository, verified locally: **yes, for the database rule.** The constraint `evidence_source_https` passes 12 of 12 accept cases and 33 of 33 reject cases, including every Phase 2B case (EVAL-043). The implemented pattern refines the Phase 2B text so that it doesn't depend on the collation provider (DR-021). The rendering rule (A6) is Stage 2; nothing renders `source` today.
  - Applied to live: **no.**
    - **Update (16:21): yes, for Stage 1.** Applied at 16:09 (EVAL-065); on live, the `evidence_source_https` constraint is present (the fingerprint's constraints part equals EVAL-045; catalog check 15) (EVAL-066).

## SEC-006: Default privileges give API roles privileges on future tables

- **Finding:**
  - For tables and views that `postgres` creates in `public`, `anon` and `authenticated` automatically receive MAINTAIN, REFERENCES, TRIGGER and TRUNCATE.
  - Objects created by `supabase_admin` give them every privilege. `postgres` isn't a member of `supabase_admin`, so migrations can't change those defaults.
- **Attack surface:**
  - a future migration that creates a table and forgets to revoke
  - none of the four privileges is usable through the Data API today
- **Evidence:**
  - EVAL-025: `pg_default_acl`, role membership, ownership.
  - EVAL-023: every current table carries exactly its explicit grants (`table_grants` and `column_write_grants` parity).
- **Original severity:** High (Audit 1).
- **Revised severity:** Low (Phase 2B; facts confirmed, impact overstated).
- **Reason for the change:**
  - There's no current exposure.
  - The four privileges aren't usable through the Data API.
  - Functions and sequences that `postgres` creates grant nothing by default.
- **Remediation (specified):**
  - **Stage 1, M-3:** `alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;`. Validated by simulation (EVAL-031), except for MAINTAIN on Postgres 17.
  - Catalog test C-9 as the durable guard.
- **Rejected or narrowed alternatives:**
  - **Audit 1's statement also covered sequences and functions.** Narrowed to tables, because `postgres`-created functions and sequences already grant nothing (EVAL-025).
  - **Changing `supabase_admin`'s defaults:** not possible from migrations.
  - **Relying only on revoke-everything in each migration:** kept as practice, but not sufficient alone.
- **Invariants:** I9, I3.
- **Regression tests:**
  - C-9, C-10, B-2.
  - Scenario H.
- **Current status:**
  - Confirmed: **yes** (facts)
  - Remediation specified: **yes**
  - In the repository, verified locally: **yes.** Migration M-3 was verified on Postgres 17.10: a new table gives `anon` and `authenticated` none of 8 privileges, MAINTAIN included, and `service_role` is unchanged (EVAL-040; catalog check 14; behavior check 21).
  - Applied to live: **no.** Live's per-schema default still grants TRUNCATE, REFERENCES, TRIGGER and MAINTAIN (EVAL-036, EVAL-048).
    - **Update (16:21): yes, for Stage 1.** Applied at 16:09 (EVAL-065); on live, no default grant to the API roles or PUBLIC for future tables (catalog check 14) (EVAL-066).

## SEC-007: Functions that `postgres` creates are executable by PUBLIC by default

- **Found:** 2026-10-02, during Stage 1 verification. It isn't an Audit 1 item.
- **Finding:**
  - A function that `postgres` creates in `public` is executable by PUBLIC, and therefore by `anon` and `authenticated`, unless its migration revokes that explicitly.
  - Live's default-privilege row for functions (`{postgres=X/postgres}`) is a **per-schema** entry. Postgres adds per-schema entries to its built-in global default, which gives EXECUTE to PUBLIC; it doesn't replace it.
  - There's no global entry for `postgres` that removes it.
- **Attack surface:** a future migration that adds a function, especially a SECURITY DEFINER one, without `revoke all on function ... from public`. Such a function would be callable at `/rest/v1/rpc/<name>`.
- **Evidence:**
  - **EVAL-036:** live's default ACL rows, with their namespace.
  - **EVAL-040:** on a local Postgres 17.10 build mirroring live, a new function had `proacl` NULL (the built-in default) and was executable by `anon`, `authenticated` and `service_role`. That was so before and after Stage 1.
  - **EVAL-042:** a new SECURITY DEFINER function was flagged by catalog check 9 as executable by both API roles.
  - **Historical corroboration:** `rls_auto_enable()`, owned by `postgres` with a NULL ACL, was executable by `anon` until DR-010 (EVAL-009).
- **Correction of earlier analysis:**
  - EVAL-025 and SEC-006's reason for the severity change both said functions that `postgres` creates "grant nothing by default". That read the per-schema row without the built-in default, and is wrong for functions.
  - Both records are left as written. This record supersedes that statement.
- **Original severity:** none (new).
- **Severity:** Low (latent).
  - No current function is exposed: catalog check 9 passes locally after Stage 1, and on live the only executable functions are the two that M-1 revokes.
  - Every function this project defines revokes PUBLIC explicitly.
- **Remediation:** **not decided.**
  - **Candidate:** `alter default privileges for role postgres revoke execute on functions from public;`.
    - It has to be global, because a per-schema REVOKE can't remove a global default.
    - It would therefore change defaults for functions `postgres` creates in **every** schema, and needs its own review and decision.
  - **Meanwhile:**
    - every migration keeps `revoke all on function ... from public`
    - catalog check 9, with an empty allowlist in Stage 1, fails if any function becomes executable by the API roles
- **Rejected alternatives:**
  - **A per-schema revoke in `public`:** no effect against the built-in global default.
  - **Folding the fix into Stage 1 M-3:** M-3 was scoped to tables, and the global change affects unrelated schemas.
- **Invariants:** I4 (the function allowlist).
- **Regression tests:** catalog check 9; EVAL-042 shows it catches the case.
- **Current status:**
  - Confirmed: **yes**, on a local PG17 mirror, plus live catalog evidence. It wasn't probed on live, because that needs DDL.
  - Remediation specified: **no** (needs a decision).
  - In the repository: no fix; guarded by check 9.
  - Applied to live: no.
- **Disposition (Stage 1 release checkpoint, DR-023):**
  - **Audit:** no function is exposed through the default, now or after Stage 1.
    - On live, PUBLIC holds EXECUTE on no function in `public`. The two functions `anon` and `authenticated` can execute hold explicit grants, which M-1 revokes (EVAL-051).
    - The Stage 1 migration creates 0 functions and contains 0 GRANT statements.
    - After Stage 1, locally, both application functions are owner-only, and check 9 passes (EVAL-056).
  - **Decision:** no default-privilege change in Stage 1. The global candidate above stays a separate decision with its own testing.
  - **Stage 2 obligation:** every new function revokes EXECUTE from PUBLIC (and from `anon` and `authenticated`) before any GRANT, and the same commit updates check 9's allowlist.
  - **Remediation specified:** yes, as that rule. The finding stays **open** and Low (latent): the built-in default is unchanged.

---

## Audit items that aren't SEC records

| Audit ID | Disposition | Where tracked |
|---|---|---|
| H6 missing security headers | Not a current vulnerability; nothing is hosted | Release gates R-12, R-13 |
| M1 Auth signups | Low; settings unread. No longer a release gate: R-8 was retired (DR-022) | Catalog checks 13 and 15 (DR-022) |
| M2 raw database error text | Rejected as security; a UX item | A1 |
| M3 connector has owner-level access | Operational, Low | Reconciliation record §6 |
| M4 cross-launch gate references | Stage 2 integrity guard | M-4 composite keys |
| M5 unrestricted transitions | Rejected as security; product behavior | Deferred |
| L1 repository visibility | Information; private, history clean | None |
| L2 free-plan pausing, L3 seeded timestamps | Rejected as security | Deferred |
| N1 payload growth | Merged | SEC-003 |
| N2 zero-gate "Ready" | Deferred product fix | Reconciliation record §13 |
| N3 destructive integrity suite | Process invariant | I19 |
| N4 unconfirmed deploy path | Resolved: the connector is the designated single path, and no GitHub integration exists (EVAL-060) | DR-024; R-9 met |
| N5 route ids beyond 2^53 | Deferred UX | A2 |
