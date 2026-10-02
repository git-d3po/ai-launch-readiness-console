# Regression scenarios

The behaviors that must stay testable as the system changes. Each scenario names the property, the
steps, the expected result, what is true **today**, and the specified tests that will automate it.

**Three labels:**
- **Implemented rule, current check exists:** the rule is in the schema today, and a committed check covers it. The last recorded result is cited; this documentation commit didn't re-run the destructive integrity suite.
- **Specification / future regression scenario:** the expected behavior is **not** true yet, or no test exists yet. It describes what Stage 1 or Stage 2 must make true. Nothing here should be read as a passing test.
- **Implemented in the repository and verified locally; not applied to live:** (added with Stage 1) the change and its committed tests exist and pass on a local Postgres 17 build, but **the live project doesn't have the change yet** (DR-021, DR-019). On live, the "Today" behavior still applies.

**Stage 1 release checkpoint (about 13:10):** Stage 1 is pushed but still not applied to live, because the single deploy path couldn't be established (DR-019, EVAL-052). Live was re-read at 12:39 and is unchanged (EVAL-051), so every "not applied to live" label below still holds.

**Deployment-path decision (about 14:25):** the path is now designated (DR-024: the Supabase connector), but Stage 1 still isn't applied; that's a separate, authorized run. Live was re-read at 13:39 and is unchanged (EVAL-059), so every "not applied to live" label below still holds.

**Stage 1 deployment (about 16:21):** Stage 1 is now **applied to live** (`20261002160901`, EVAL-065) and verified there with the read-only catalog test (17 of 17) and fingerprint (equal to EVAL-045), with no 0028 or 0029 lints (EVAL-066). Every "not applied to live" label below is superseded for the Stage 1 parts, which are now applied to live and verified read-only. The behavior steps themselves still run only on local databases (I19); on live, the catalog privilege checks answer them without a write.

**Rules for every behavior scenario** (Phase 2B invariant I19):
- Run only against a local or ephemeral database built from this repository, never against production.
- Run each step as `anon` **and** as `authenticated`, inside a transaction that rolls back.
- Only the read-only catalog checks (C-series) may run against production.

Test IDs (C-n, B-n, A-n) and invariants (I-n) are defined in
[`../security/2026-10-02-audit-2b-reconcile.md`](../security/2026-10-02-audit-2b-reconcile.md).
Evidence IDs (EVAL-NNN) are in [`EVALUATION_LOG.md`](EVALUATION_LOG.md).

| ID | Property | Label | Protects |
|---|---|---|---|
| A | Anonymous forged evidence or status changes can't alter the canonical launch | Stage 1: Implemented in the repository and verified locally; not applied to live. Stage 2 part: specification | SEC-001 |
| B | Canonical reset isn't available to public visitors | Stage 1: Implemented in the repository and verified locally; not applied to live. Sandbox reset: specification | SEC-002 |
| C | Unbounded evidence insertion isn't possible | Stage 1 (zero public inserts): Implemented in the repository and verified locally; not applied to live. Sandbox caps: specification | SEC-003 |
| D | Passed requires evidence | Implemented rule, current check exists (Stage 2 part is a specification) | DR-001, DR-002 |
| E | Waived requires waiver text, and the text survives the transition | Implemented rule, current check exists (Stage 2 part is a specification) | DR-008 |
| F | Visitor provenance is never confused with canonical evidence | Specification / future regression scenario | SEC-001, SEC-004 |
| G | Unsafe evidence URLs are rejected | Database rule: Implemented in the repository and verified locally; not applied to live. Rendering rule: specification | SEC-005 |
| H | New tables and the two API roles stay closed by default | Implemented in the repository and verified locally; not applied to live (tables). Functions: open finding SEC-007, disposition DR-023 | SEC-006 |

---

## Scenario A: anonymous forged evidence or status changes can't alter the canonical launch

- **Label:** Specification / future regression scenario. **Today the opposite is true:** this is SEC-001.
- **Stage 1 status:** Implemented in the repository and verified locally; not applied to live.
  - Steps 1 to 4 are denied with 42501 for both roles, and the seed is unchanged (`stage1_behavior.sql`, EVAL-043).
  - Catalog checks 3 to 9 pass (EVAL-041).
  - Over HTTP the writes return 401/403 (EVAL-046).
  - Live still allows steps 1 to 3 (EVAL-048; unchanged at 12:39, EVAL-051, and 13:39, EVAL-059).
- **Becomes true at:** Stage 1 (migration M-1). Stage 2 extends it to the sandbox functions.
- **Invariants:** I3, I4, I7. **Decision:** DR-013.
- **Setup:** an ephemeral database from the repository migrations plus the Stage 1 migrations, at the seed.
- **Steps (as `anon` and as `authenticated`), each against a blocking canonical gate:**
  1. Insert an evidence row of type "Sign-off".
  2. Call `set_gate_status` with `Passed` and `decided_by` "Trust & Safety Lead".
  3. Call `set_gate_status` with `Waived` and waiver text.
  4. Update `gates.status` directly.
- **Expected:**
  - Every step is denied with SQLSTATE 42501.
  - Afterwards the `seed_data` part of [`supabase/tests/fingerprint.sql`](../../supabase/tests/fingerprint.sql) is unchanged, readiness is still "6 of 16 passed" with 10 blockers, and the decision count is unchanged.
- **Stage 2 extension:** `sandbox_add_evidence` and `sandbox_set_gate_status` reject a canonical gate id, and a sandbox write leaves the canonical overview unchanged.
- **Today (recorded):**
  - EVAL-017 (P1) and EVAL-029: `anon` reached `16 of 16 passed`.
  - Step 4 is already denied (integrity check 4; EVAL-007).
- **Automated by (specified):** C-2 to C-5, B-1, B-4, and the end-to-end check "a sandbox write leaves the canonical overview unchanged".

## Scenario B: canonical reset isn't available to public visitors

- **Label:** Specification / future regression scenario. **Today `anon` can run it** (SEC-002).
- **Stage 1 status:** Implemented in the repository and verified locally; not applied to live.
  - Step 1 is denied with 42501 (behavior checks 9 and 17; HTTP 401/403).
  - The owner path still works: the integrity suite's check 5 passed (EVAL-044).
  - Live still allows step 1 (EVAL-048, EVAL-049; unchanged at 12:39, EVAL-051, and 13:39, EVAL-059).
- **Becomes true at:** Stage 1 (M-1). The sandbox reset follows in Stage 2.
- **Invariants:** I4, I7, I13. **Decision:** DR-014.
- **Steps:**
  1. As `anon` and as `authenticated`, call `reset_demo_data()`.
  2. As the owner, call `reset_demo_data()`.
- **Expected:**
  - Step 1 is denied with 42501, and nothing changes.
  - Step 2 succeeds and restores the seed. The owner's reseed path must keep working, because the integrity suite depends on it.
- **Stage 2 extension:**
  - `sandbox_reset()` deletes only visitor rows on sandbox launches and restores sandbox gate statuses from their source gates.
  - The canonical fingerprint stays unchanged.
  - A second call within 5 minutes is rejected.
  - It uses no TRUNCATE, so the canonical tables take no table-wide lock.
- **Today (recorded):**
  - EVAL-016: the advisor lists `reset_demo_data` as executable by `anon`.
  - EVAL-017 (P2): visitor rows were erased.
  - The owner path works (EVAL-007, check 5).
- **Automated by (specified):** C-5, B-1, B-4.

## Scenario C: unbounded evidence insertion isn't possible

- **Label:** Specification / future regression scenario.
- **Stage 1 status:** the zero-insert bound is Implemented in the repository and verified locally; not applied to live (behavior checks 3 and 11; catalog check 3). The Stage 2 caps aren't built.
- **Becomes true at:**
  - Stage 1 bounds public inserts at zero.
  - Stage 2 bounds sandbox inserts with caps.
- **Invariants:** I3 (Stage 1), I12 (Stage 2). **Decision:** DR-018.
- **Stage 1 steps:** as `anon`, run a bulk INSERT of many evidence rows into a canonical gate. **Expected:** denied with 42501, and zero rows added.
- **Stage 2 steps:**
  1. Add 10 visitor evidence items to one sandbox gate: they succeed. The 11th is rejected.
  2. Make 20 visitor status changes on one sandbox gate: they succeed. The 21st is rejected.
  3. Two sessions race at one below the cap: exactly one succeeds.
  4. A direct INSERT into `evidence` is denied.
  5. The total of visitor rows across the 16 sandbox gates never exceeds 480.
- **Today (recorded):**
  - EVAL-017 (P3): 20,010 rows from one statement.
  - EVAL-032: 6,000 incompressible rows, 13 MB, in 0.61 s.
- **Automated by (specified):** B-1, B-4, C-14.

## Scenario D: Passed requires evidence

- **Label:** Implemented rule, current check exists. The Stage 2 extension is a Specification / future regression scenario.
- **Invariant:** I8. **Decisions:** DR-001, DR-002.
- **Steps:**
  1. As the owner, call `set_gate_status` with `Passed` on a gate that has no evidence.
  2. In the client, compute readiness for a gate with status Passed and zero evidence.
- **Expected:**
  1. Rejected with "A gate cannot be Passed without at least one evidence item". Nothing is written: the status and the decision count are unchanged.
  2. `computeReadiness` doesn't count the gate as passed and lists it as blocking.
- **Current checks:**
  - Integrity check 1 in [`supabase/tests/integrity_checks.sql`](../../supabase/tests/integrity_checks.sql).
  - The unit test "never counts a Passed gate with no evidence as passed" in [`src/domain/readiness.test.ts`](../../src/domain/readiness.test.ts).
- **Last recorded results:**
  - Check 1 passed locally (EVAL-002, EVAL-030) and on live (EVAL-007).
  - Mutation testing showed check 1 detects the rule's removal (EVAL-003), and the unit test does too (EVAL-004).
  - The unit test's latest run is EVAL-033.
  - **Stage 1:** check 1 passed on the local Postgres 17 Stage 1 build (EVAL-044), and the unit tests passed again (EVAL-047).
- **Known limit:** evidence is checked at the time of the change. That holds because evidence is append-only for the public: nobody but the owner can delete the evidence that justified a Passed.
- **Stage 2 extension:** `sandbox_set_gate_status` with `Passed` on a sandbox gate without evidence is denied (B-4).

## Scenario E: Waived requires waiver text, and the text survives the transition

- **Label:** Implemented rule, current check exists. The Stage 2 extension is a Specification / future regression scenario.
- **Invariant:** I8. **Decision:** DR-008.
- **Steps:**
  1. Waive a gate with no waiver text, then with blank text.
  2. Waive it with text.
  3. Move it to In progress.
- **Expected:**
  1. Both are rejected with "A waiver rationale is required to waive a gate", and nothing is written.
  2. The gate is Waived, and its new decision row carries the same `waiver_rationale`.
  3. The gate's `waiver_rationale` is NULL. The Waived decision still carries the text, the new decision has none, and exactly 2 decisions were added.
- **Current checks:** integrity checks 2 and 6.
- **Last recorded results:**
  - Both passed locally (EVAL-005, EVAL-030) and on live (EVAL-007).
  - A mutant that skipped copying the text made check 6 FAIL, once the check stopped vanishing on NULL (EVAL-005).
  - **Stage 1:** checks 2 and 6 passed on the local Postgres 17 Stage 1 build (EVAL-044).
- **Stage 2 extension:** waiving a sandbox gate with blank text is denied (B-4). The 5-minute reset restores `waiver_rationale` from the source gate (I13).

## Scenario F: visitor provenance is never confused with canonical evidence

- **Label:** Specification / future regression scenario. No `origin` column exists today.
- **Becomes true at:** Stage 2 (M-4 to M-6, A3 to A5).
- **Invariants:** I11, I15, I16. **Decisions:** DR-013, DR-015, DR-016.
- **Steps (all through the sandbox functions):**
  1. Add visitor evidence of type "Sign-off".
  2. Pass a sandbox gate.
  3. Try to set `origin`, `decided_by` or `recorded_on` directly.
  4. Load the canonical launch and the sandbox in the browser.
- **Expected:**
  1. The row has `origin = 'visitor'`, the type is kept as "Sign-off", and `recorded_on` is the server date.
  2. The decision has `decided_by = 'Sandbox visitor'` and `origin = 'visitor'`.
  3. Impossible: there's no such parameter, and direct table writes are denied.
  4. Browser expectations:
     - The canonical launch has 0 visitor rows (C-14) and no write controls.
     - Sandbox pages show the sandbox banner, and every visitor item shows "Visitor" beside its type and decider.
     - The list marks the sandbox row, and the title chip counts canonical launches only.
- **Today:** visitor rows are indistinguishable from seed rows. EVAL-029 shows a forged decider rendering as authoritative.
- **Automated by (specified):** C-14, B-4 ("forging origin" denied), and end-to-end checks (visitor label; canonical pages without write controls).

## Scenario G: unsafe evidence URLs are rejected

- **Label:** Specification / future regression scenario.
- **Stage 1 status:** the database rule is Implemented in the repository and verified locally; not applied to live.
  - 12 of 12 accept cases are accepted, and 33 of 33 reject cases are rejected by `evidence_source_https`, the empty string included (EVAL-043).
  - **Since `8a1ad9d`:** 41 of 41 reject cases. The eight added cases cover a trailing LF, CR or CRLF after a valid URL, an LF after the host, a leading LF, a tab inside `://`, full-width scheme letters, and a Cyrillic lookalike letter in the host (EVAL-054, EVAL-056).
  - **Accepted, and inert (documented leniencies):** `%0a` as escaped text, a port above 65535, and `javascript:` as text inside an https path (EVAL-054).
  - The implemented pattern refines the Phase 2B text (DR-021).
  - The rendering rule (A6) isn't built, and nothing renders `source`.
- **Becomes true at:**
  - Stage 1 (M-2) for the database rule.
  - Stage 2 (A6) for rendering.
- **Invariants:** I10, I16. **Decision:** DR-017.
- **Steps:** insert each value from the EVAL-030 table, as the owner and, in Stage 2, through `sandbox_add_evidence`. Add the empty string to the table.
- **Expected:**
  - **Accepted:**
    - NULL
    - `https://docs.example.com/eval/run-0924`
    - `https://example.com`
    - `https://xn--bcher-kva.example/p?q=1#a`
  - **Rejected:**
    - `javascript:` in any case
    - `data:`
    - `http:`
    - user-info such as `https://good.example@evil.example/`
    - `https:/example.com`
    - whitespace in the path
    - a protocol-relative `//host`
    - single-label hosts
    - a leading space
    - an embedded newline
    - the empty string
  - **In the browser:**
    - A visitor-origin `source` renders as plain text with no `<a>`.
    - A seed-origin `source` becomes a link only when `new URL(source).protocol === 'https:'`, with `rel="noopener noreferrer nofollow"`.
- **Today (recorded):**
  - EVAL-017 (P5): `javascript:alert(document.domain)` was stored.
  - It's latent, because no client code renders `source` (EVAL-027).
- **Automated by (specified):** B-3, unit tests for `sourceDisplay()`, and the end-to-end check "visitor source has no anchor".

## Scenario H: new tables and the two API roles stay closed by default

- **Label:** Specification / future regression scenario.
- **Stage 1 status:** for tables, Implemented in the repository and verified locally; not applied to live.
  - Step 1 passes on Postgres 17.10, MAINTAIN included (EVAL-040; behavior check 21; catalog check 14).
  - Step 2 passes (catalog check 13).
  - **Functions aren't covered:** a new `postgres`-created function is still executable by PUBLIC (SEC-007). Catalog check 9 guards that.
  - **Disposition (DR-023):** no default change in Stage 1. Every new function revokes EXECUTE from PUBLIC explicitly, and check 9 fails if one doesn't.
- **Becomes true at:** Stage 1 (M-3).
- **Invariants:** I3, I6, I9.
- **Steps:**
  1. As `postgres`, inside a rolled-back transaction, create a probe table in `public`, then read the privileges `anon` and `authenticated` hold on it.
  2. Compare the full privilege sets of `anon` and `authenticated`.
- **Expected:**
  1. They hold no privileges on the new table, including MAINTAIN on Postgres 17.
  2. The two sets are identical.
- **Today (recorded):**
  - EVAL-025: new `postgres`-created tables give both roles MAINTAIN, REFERENCES, TRIGGER and TRUNCATE.
  - EVAL-031: the M-3 statement removes them in a simulation that couldn't test MAINTAIN.
  - Role parity holds today (DR-006).
- **Automated by (specified):** B-2, C-9, C-10.
