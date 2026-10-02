# Phase 2B: security finding reconciliation and remediation specification

- **Date:** 2026-10-02. Audit 1 report at 10:30 UTC; Phase 2B report at 10:58 UTC.
- **Baseline:** `claude/phase1-schema` at `cb27437b03bf83557adf1f9d4775d36b5ebdeabf`
- **Performed by:** Claude Code, at the project owner's request. Read-only.
- **Status of this record:**
  - The findings are confirmed as stated below.
  - Decisions D1 to D7 were approved afterwards and are recorded as DR-013 to DR-019 in
    [`DECISIONS.md`](../../DECISIONS.md).
  - **No remediation has been implemented.**
- **Related:**
  - [`findings.md`](findings.md): one record per finding
  - [`../evaluation/EVALUATION_LOG.md`](../evaluation/EVALUATION_LOG.md): the evidence, cited as EVAL-NNN
  - [`../evaluation/scenarios.md`](../evaluation/scenarios.md): regression scenarios

## 1. Purpose

The first security audit (Audit 1, 10:24 to 10:30) found that anonymous callers could forge readiness,
erase data and write without limit. Phase 2B had four aims:

1. **Re-verify each Audit 1 finding** instead of trusting it. Keep, modify or reject each one, and say why.
2. **Establish whether the live database matched the repository,** so that tests on a local copy would count as evidence about production.
3. **Separate the actual vulnerability from the product design choice** that produced it.
4. **Specify the remediation:** invariants, migrations, tests and release gates, detailed enough to implement without further investigation.

## 2. Method

Read-only throughout. No files were changed, nothing was committed, and the live database wasn't written.

- **Git state:** read from local refs, `git ls-remote` and the GitHub API, without fetching.
- **Live Supabase:**
  - catalog SELECTs
  - the security and performance advisors
  - the migration history
  - `pg_stat_statements`
  - Supabase documentation lookups
- **No live writes, not even rolled-back ones.** Postgres sequences advance permanently even when a transaction rolls back, so a "rolled-back" insert would still leave a trace on production.
- **Behavior:** established on disposable local Postgres 16 databases, built from the repository's migrations and first proven catalog-identical to live (section 4). They were created and dropped. The earlier local test copy was used once, inside a rolled-back transaction (EVAL-032).
- **Build output:** written to a scratch directory only. The repository was verified unchanged at the end.

## 3. Baseline

**Repository** (EVAL-021)

| Item | State |
|---|---|
| Branch and HEAD | `claude/phase1-schema` at `cb27437` ("Add the launch overview"), the same commit Audit 1 used |
| Working tree | Clean; `dist/` and `node_modules/` are ignored |
| Upstream | 0 ahead, 0 behind |
| Remote `main` | `0e737dc`: a README title change made in the GitHub web UI (09:02 UTC), with no security relevance |
| Pull requests | None |
| Visibility | Private |
| History note | `03a4666` added migrations versioned `...000100` and `...000200`. `9c65e6c` renamed them before anything reached live, so those versions were never applied. |

**Live Supabase project**

| Item | State |
|---|---|
| Project | `ai-launch-readiness-console`, organization `git-d3po`, region us-west-2 |
| Engine | Postgres 17.11; the Data API types report PostgREST 14.18 |
| Health at audit time | ACTIVE_HEALTHY; no preview branches |
| Applied migrations | `20261002092043_phase1_schema`, `20261002092141_demo_seed`, `20261002093521_revoke_rls_auto_enable_execute` |
| Project reference and API keys | **Deliberately not recorded in this repository.** The history scan confirmed the project reference has never been committed (EVAL-028); it's visible in the Supabase dashboard. |

**Not verifiable with the access available:**
- Auth provider and signup settings
- API-gateway request-size and rate limits
- OpenAPI root exposure
- the GitHub integration's deploy settings
- hosting (none exists)

See section 12.

## 4. Parity: is a local copy evidence about production?

**Migration parity** (EVAL-022): the MD5 of each stored migration statement on live equals the MD5 of
the repository file, with identical character counts.

| Version | Live md5 = repository md5 | Characters |
|---|---|---|
| `20261002092043` | `2d4cf41fe73b0d2801dd51d69ece8e1b` | 11486 |
| `20261002092141` | `d3dafe0c87fc0af20d00d518e96f0380` | 14673 |
| `20261002093521` | `4842aef718ae632952d694863d244b8c` | 569 |

**Catalog parity** (EVAL-023): the 12-part fingerprint was identical between live (Postgres 17.11) and a
fresh local database built from the repository (Postgres 16.14).
- **What it compares:** columns, constraints, indexes, policies, RLS and owners, table grants, column write grants, function bodies with their ACLs and configuration, views, enums, user triggers, and seed data.
- **Where it lives:** the query is now committed as [`supabase/tests/fingerprint.sql`](../../supabase/tests/fingerprint.sql), whose header documents each part.
- **Re-run since:** in this documentation commit, the committed file reproduced all 12 hashes on a fresh local build (EVAL-034).

**Seed-data parity** (EVAL-023, EVAL-024): live held exactly the seed.
- **Rows:** 1 launch, 16 gates (6 Passed), 10 evidence, 6 risks, 4 decisions, 3 stages.
- **Fingerprint:** the `seed_data` part matched.
- **Sequences:** `decisions 4, evidence 10, gates 16, launches 1, risks 6, rollout_stages 3`.

**Forensics** (EVAL-024):
- Every recorded statement touching `set_gate_status`, `reset_demo_data` or evidence inserts ran as `postgres` (migrations and integrity runs). None ran as `anon` or `authenticated`.
- `auth.users` had 0 rows.
- This shows no **recorded** exploitation in the statistics window. It doesn't prove there was none.

**Conclusion:** behavior shown on a fresh local copy built from the repository is evidence about
production as it stood at 10:44 UTC.

## 5. Testing strategy: local vs live

- **Production gets only read-only catalog checks.** For example: grants, policies, function definitions, migration hashes, the fingerprint, and the advisors.
- **Behavior, attack reproduction and remediation dry runs** run only on disposable local databases proven identical to live. Each probe runs as `anon` (and, in the specified tests, also as `authenticated`) inside a transaction that rolls back.
- **Why live write tests were avoided, even rolled back:**
  - Sequence increments survive a rollback, and every table uses identity columns.
  - The integrity suite is destructive by design: it ends with `reset_demo_data()`, a TRUNCATE plus re-seed (finding N3).
  - Phase 2B therefore specifies invariant I19: destructive tests run only on local or ephemeral databases.
- **Earlier phases did write to production,** before this rule existed. They're recorded honestly:
  - Migrations were applied through the connector (EVAL-008, EVAL-009).
  - The integrity suite ran on live and ended at the seed (EVAL-007).
  - One rolled-back DDL probe was run (EVAL-009).

## 6. Findings and severity history

**Severity scale used by Phase 2B:**
- **High:** unauthenticated, low effort, and material integrity or availability impact on the public demo today.
- **Medium:** real but limited or recoverable impact.
- **Low:** latent, or defense in depth.

Audit 1 also used **Critical**. Phase 2B used no level above High.

**The original ratings are kept on purpose.** The revisions, and the reasons for them, are part of the
engineering record.

| Audit 1 ID | Finding | Audit 1 | Phase 2B | Phase 2B verdict | Record |
|---|---|---|---|---|---|
| C1 | Anonymous readiness forgery and impersonation | Critical | **High** | Confirmed | SEC-001 |
| C2 | Public whole-table reset | Critical | **Medium** | Partially confirmed | SEC-002 |
| H1 | Unbounded write volume | High | **High** | Confirmed | SEC-003 |
| H2 | Unsafe `source` URLs (`javascript:`) | High | **Low** (latent) | Partially confirmed | SEC-005 |
| H3 | Arbitrary visitor text | High | **Medium** | Partially, but wider than reported | SEC-004 |
| H4 | Fabricated evidence dates and types | High | **Low** | Partially; merged into C1 and the gate-sheet spec | SEC-004, SEC-001 |
| H5 | Default privileges on future tables | High | **Low** | Facts confirmed, impact overstated | SEC-006 |
| H6 | Missing security headers | High | **Deployment release gate** | Confirmed absent; nothing is hosted | R-12, R-13 |
| M1 | Auth signups | Medium | Low | Partially; settings unreadable | R-8 |
| M2 | Database error messages shown in the UI | Medium | Rejected as security | Behavior confirmed | A1 (UX) |
| M3 | Connector has owner-level database access | Medium | Operational, Low | Confirmed | Operational |
| M4 | A risk or decision can reference a gate from another launch | Medium | Stage 2 integrity guard | Confirmed | M-4 composite keys |
| M5 | Unrestricted status transitions | Medium | Rejected as security | Confirmed (product behavior) | Deferred |
| L1 | Repository visibility | Low | Information, no action | Confirmed private; history clean | None |
| L2 | Free-plan pausing | Low | Rejected as security | Confirmed in docs | Deferred |
| L3 | Seeded decision timestamps equal the reseed time | Low | Rejected as security | Confirmed; honest by design | Deferred |
| N1 (new) | Payload grows with evidence rows | n/a | Part of H1 | Confirmed | SEC-003 |
| N2 (new) | A zero-gate launch shows "Ready" on the list | n/a | Deferred product fix | Confirmed by code | Deferred |
| N3 (new) | `integrity_checks.sql` is destructive | n/a | Process invariant | Confirmed | I19 |
| N4 (new) | Unconfirmed migration deploy path | n/a | Release gate | Not verified | R-9, DR-019 |
| N5 (new) | Route ids beyond 2^53 show a database error | n/a | Deferred | By inspection | A2 |

### Why the ratings changed

**C1 (SEC-001), Critical to High**
- **Still High:** the attack is unauthenticated, trivial, and was reproduced on a copy proven identical to live (EVAL-029).
- **Not treated as worse:**
  - the impact is integrity only, on synthetic data
  - there's no confidentiality impact
  - the owner can restore the seed
  - no exploitation was recorded (EVAL-024)

**C2 (SEC-002), Critical to Medium**
- **What lowered it:**
  - The reset *restores* the seed, so it can't forge state.
  - Every row it erases today is non-authoritative.
  - Its reach is fixed to six tables, with no dynamic SQL.
- **What remains:** it erases post-seed rows and the decision log. Each call takes six ACCESS EXCLUSIVE locks. Its table-wide reach would destroy any future non-seed rows.

**H2 (SEC-005), High to Low**
- `javascript:` is accepted, but **no client code selects or renders `source`**, and no `href` is built from data (EVAL-027).
- It's latent. It must be fixed before any UI renders `source`.

**H5 (SEC-006), High to Low**
- **Facts confirmed:** anon and authenticated get MAINTAIN, REFERENCES, TRIGGER and TRUNCATE on future `postgres`-created tables (EVAL-025).
- **Why Low:**
  - None of those privileges is usable through the Data API.
  - Functions and sequences grant nothing by default.
  - Every current object has explicit grants.
- So there's no current exposure.

**H6, High to release gate**
- Nothing is deployed, so missing headers aren't a vulnerability today.
- They become a gate before public deployment (R-12, R-13).

**H3 (SEC-004), High to Medium, but wider than reported**
- React renders text only; there are no HTML sinks.
- However, visitor-controlled `rationale` and `decided_by` are rendered **on the canonical overview** (EVAL-027).
- The result is content injection and impersonation without code execution.

**H4, High to Low**
- `recorded_on` and evidence `type` are never fetched or rendered.
- Their only effect is through evidence counts, which is SEC-001.

### C1 decomposition (why the trust model had to change)

**The vulnerability: untrusted writes look authoritative.** Four things combine:
1. **Public write authority over canonical rows.** Evidence INSERT works on any gate, `set_gate_status` accepts any gate id, and the ids run sequentially from 1 to 16.
2. **The Passed rule accepts the caller's own evidence.** `exists (select 1 from public.evidence e where e.gate_id = ...)` has no notion of who supplied it.
3. **Identity claims come from the caller.** `decided_by` is free text, and an evidence item can carry the type "Sign-off".
4. **Every row is displayed as authoritative.**

The rule logic, the SECURITY DEFINER hygiene and the public reads are **not** at fault.

**The product design choice behind it:** the brief asks for public editing and a public reset. No
shipped UI uses either (EVAL-027), so the write surface serves only direct API callers.

**The provenance gap:** nothing separates seeded rows from visitor rows.

## 7. Public-demo trust model (decided: DR-013)

**The question the product must answer truthfully:** "Is Halcyon ready, and what blocks it?" The
answer must come from the author's curated, synthetic evidence. The project's central claim is that
**the database** enforces the rules.

| Criterion | A: Shared mutable (today) | B: Read-only | **C: Canonical + disposable sandbox** |
|---|---|---|---|
| 1. Canonical claims truthful | **No** | Yes | **Yes** |
| 2. Real database-enforcement demo | Yes | No (tests and docs only) | **Yes, in the sandbox** |
| 3. No identity infrastructure | Yes | Yes | **Yes** |
| 4. Bounded storage | Needs caps | Trivially | **Caps** |
| 5. Distortion of the design | Smallest code change, keeps false claims | Removes the interactivity the brief requires | **Moderate:** an origin column, 3 functions, a scoped reset |
| 6. Reversible, testable steps | n/a | Pure revokes | Two stages, each testable |

**Recommended and now accepted:** Model C, in two steps.
- **Stage 1 (now):** no public writes, since no shipped UI depends on them.
- **Stage 2 (with the gate sheet):** add a shared sandbox launch.

**Residual risk accepted:** griefing inside the shared sandbox.

**Rejected:**
- **Visitor provenance alone:** it doesn't keep the canonical status truthful.
- **Excluding visitor rows from readiness:** that needs separate status storage, which becomes option C.
- **Labeling alone:** necessary, never sufficient.
- **Per-visitor sandboxes:** they need Auth, CAPTCHA, and cleanup of anonymous users.
- **A client-only sandbox:** it demonstrates client logic, not database enforcement.

**Auth isn't required for either stage.**
- **Auth becomes necessary for:**
  - real data
  - trustworthy per-person attribution
  - private per-visitor sandboxes
  - any OAuth integration
- **Auth wouldn't solve:**
  - provenance
  - input validation
  - storage bounds (identities can be minted; anonymous sign-ins are limited to 30 per hour per IP, EVAL-026)
  - impersonation through free-text fields

## 8. Security invariants

These are the properties the remediation must establish and the tests must keep true.

| ID | Invariant | Stage |
|---|---|---|
| I1 | No credential other than the publishable key exists in the repository, its history, or the bundle. | Holds today |
| I2 | RLS is enabled on every `public` table, and every view uses `security_invoker`. | Holds today |
| I3 | `anon` and `authenticated` hold **only SELECT**, on the 6 tables and 1 view: no table-level or column-level write, no TRUNCATE, REFERENCES, TRIGGER or MAINTAIN, and no sequence privileges. | Stage 1 |
| I4 | `anon` and `authenticated` can EXECUTE exactly an allowlist. Stage 1: none. Stage 2: `sandbox_add_evidence`, `sandbox_set_gate_status`, `sandbox_reset`. | Stage 1, then 2 |
| I5 | Every SECURITY DEFINER function in `public` is owned by `postgres`, has a pinned `search_path` (empty for application functions), contains no dynamic SQL, and fully qualifies every relation. | Holds today |
| I6 | `authenticated` has no privilege that `anon` lacks, and vice versa. | Holds today |
| I7 | Canonical rows change only through the owner (migrations or SQL). No public path modifies them. | Stage 1 |
| I8 | **The existing rules hold:**<br>• Passed requires at least one evidence row at the time of the change.<br>• Waived requires waiver text.<br>• Each change writes exactly one decision.<br>• Waiver text is retained on the decision after the gate leaves Waived. | Holds today |
| I9 | Objects that `postgres` creates in `public` grant nothing to `anon` or `authenticated` by default. | Stage 1 |
| I10 | `evidence.source` is NULL or an https URL matching the M-2 rule. | Stage 1 |
| I11 | Every evidence and decision row records an `origin` of `seed` or `visitor`. Only the sandbox functions create visitor rows, and those rows exist only on sandbox launches. | Stage 2 |
| I12 | Each sandbox gate has at most 10 visitor evidence rows and 20 visitor decisions between resets. Canonical gates have 0. | Stage 2 |
| I13 | A sandbox reset touches only sandbox rows. It deletes visitor rows and restores gate status from the source gates, at most once per 5 minutes, and never touches canonical rows. | Stage 2 |
| I14 | Visitor-writable text rejects control characters and the bidi override and isolate characters. Titles are single-line. Multilingual text is accepted. | Stage 2 |
| I15 | The database sets visitor identity and dates: `decided_by = 'Sandbox visitor'`, and `recorded_on` is the server date. | Stage 2 |
| I16 | No visitor-supplied URL renders as a link, and all database text renders as React text nodes. | Text nodes hold today; the URL rule is Stage 2 |
| I17 | Displayed readiness is computed only from fetched rows, and the client never writes it. | Holds today |
| I18 | The UI shows only deliberately raised application messages (SQLSTATE P0001). Every other error is shown generically, with its code. | Deferred (A1) |
| I19 | Destructive tests run only against local or ephemeral databases. Only read-only catalog tests run against production. | Process, now |
| I20 | Migrations reach production through exactly one path, and the repository files match `supabase_migrations` byte for byte. | DR-019 |

"Holds today" is a claim about the baseline (`cb27437`, live as read at 10:44 to 10:58 UTC). It isn't a
claim about the current live state, which this documentation commit didn't read.

## 9. Remediation sequence

| Step | What | Depends on | Establishes | Status |
|---|---|---|---|---|
| S0 | Record decisions D1 to D7 | None | None | **Done** in the commit that added this record (DR-013 to DR-019) |
| S1 | Add the read-only catalog test `supabase/tests/security_catalog.sql` (proposed; doesn't exist yet). It should fail first. | None | Guards I2 to I6, I9 | Not started |
| S2 | Migration M-1: revoke the public write paths | D1 | I3, I4, I7 | Not started |
| S3 | Migration M-2: https check on `evidence.source` | None | I10 | Not started |
| S4 | Migration M-3: default privileges | None | I9 | Not started |
| S5 | **Verify on production:**<br>• the catalog test passes<br>• the advisor shows no 0028 or 0029 lints<br>• migration hashes match<br>• the fingerprints match<br>• the integrity suite passes 6 of 6 **locally** | S1 to S4 | All Stage 1 invariants | Not started |
| S6 | The owner checks the Auth dashboard settings and records them | None | Closes M1 | Not started |
| Stage 2 | **At the start of the gate-sheet phase:**<br>• M-4: provenance, sandbox columns, composite keys, text checks<br>• M-5: `set_gate_status` gains an origin; the seed builds the sandbox<br>• M-6: the three sandbox functions<br>• application items A3 to A9 | D1 to D6 | I11 to I16 | Not started |

Stage 1 (S1 to S6) is the next implementation phase.

### Migration specifications

M-1 to M-3 were validated as dry runs on local copies (EVAL-029, EVAL-030, EVAL-031). **None has been
applied anywhere persistent, and none exists in `supabase/migrations/`.**

**M-1 `revoke_public_write_paths` (Stage 1)**

```sql
revoke execute on function public.reset_demo_data() from anon, authenticated;
revoke execute on function public.set_gate_status(bigint, public.gate_status, text, text, text) from anon, authenticated;
revoke insert on table public.evidence from anon, authenticated;  -- also removes the 6 column-level INSERT grants (verified)
drop policy "Public append" on public.evidence;
```

- **Dry run results:**
  - `anon` has 0 executable functions and 0 non-SELECT privileges.
  - Every write is denied with a permission error.
  - Reads still work, and the owner paths work.
  - The integrity suite passes 6 of 6.
- **Application impact:** none. The client has no write calls.
- **Rollback:**

  ```sql
  grant execute on function public.reset_demo_data() to anon, authenticated;
  grant execute on function public.set_gate_status(bigint, public.gate_status, text, text, text) to anon, authenticated;
  grant insert (gate_id, type, title, summary, source, recorded_on) on public.evidence to anon, authenticated;
  create policy "Public append" on public.evidence for insert to anon, authenticated with check (true);
  ```

**M-2 `evidence_source_https` (Stage 1)**

```sql
alter table public.evidence add constraint evidence_source_https check (
  source is null or source ~ '^https://[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+(?::[0-9]{1,5})?(?:[/?#][^[:space:][:cntrl:]]*)?$'
);
```

- **Existing rows:** all seed `source` values are NULL, so the constraint validates.
- **Risk:** non-ASCII hostnames must be entered as punycode.
- **Rollback:** `alter table public.evidence drop constraint evidence_source_https;`
- **Accept and reject table:** EVAL-030. Add the empty string to the test table when this is implemented.

**M-3 `default_privileges_public` (Stage 1)**

```sql
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
```

- **Effect:** changes `pg_default_acl` only. Existing objects are unaffected, and `service_role` is kept.
- **Unverified on Postgres 17:** MAINTAIN, because the simulation ran on 16 (EVAL-031).
- **Defaults it can't change:** `supabase_admin`'s, which migrations can't alter.
- **Durable guard:** catalog test C-9. It would also detect a dashboard toggle rewriting the defaults; whether the toggle does that is unverified.
- **Rollback:** `alter default privileges for role postgres in schema public grant truncate, references, trigger, maintain on tables to anon, authenticated;`

**M-4 `sandbox_provenance` (Stage 2; a sketch, to be validated at implementation)**
- **Provenance:** a `record_origin` enum (`seed`, `visitor`), with `origin ... not null default 'seed'` on `evidence` and `decisions`.
- **Sandbox links:** `launches.source_launch_id` (null means canonical) and `gates.source_gate_id`.
- **Integrity:** `unique (id, launch_id)` on gates, plus composite foreign keys so a risk or decision can only reference a gate in its own launch (Audit 1 M4).
- **Text checks:**
  - Single-line titles reject `[\x01-\x1F\x7F-\x9F‪-‮⁦-⁩]`.
  - Multi-line fields also allow tab, LF and CR.
- **Cooldown state:** a private `sandbox_state` table (RLS enabled, no grants) holding `last_reset_at`.

**M-5 `sandbox_seed` (Stage 2)**
- `set_gate_status` gains a trailing `origin public.record_origin default 'seed'`, and its EXECUTE stays owner-only.
- `reset_demo_data()` seeds the canonical launch as today, then builds the sandbox copy:
  - the launch is named "... (sandbox)"
  - gate links are remapped
  - copied rows get `origin = 'seed'`
- **The seed facts don't change.**

**M-6 `sandbox_rpcs` (Stage 2)**
- Each function is SECURITY DEFINER with `search_path = ''` and no dynamic SQL.
- **`sandbox_add_evidence(gate_id, type, title, summary, source default null)`:**
  - locks the gate and rejects a non-sandbox gate
  - rejects the 11th visitor item
  - inserts with `recorded_on = current_date` and `origin = 'visitor'`
- **`sandbox_set_gate_status(gate_id, new_status, rationale, waiver_rationale default null)`:**
  - locks the gate and rejects a non-sandbox gate
  - rejects the 21st visitor decision
  - delegates to `set_gate_status(..., 'Sandbox visitor', ..., 'visitor')`
- **`sandbox_reset()`:**
  - locks `sandbox_state` and rejects a call within 5 minutes of the last reset
  - deletes visitor rows on sandbox launches
  - restores sandbox gate `status` and `waiver_rationale` from the source gates
  - uses no TRUNCATE
- **Grants:** `revoke all ... from public`, then `grant execute ... to anon, authenticated`.
- **Advisor:** lints 0028 and 0029 will list exactly these three functions, as documented public endpoints.

### Application items

| ID | Stage | Item |
|---|---|---|
| A1 | Low priority | Show the error message only for SQLSTATE `P0001`; otherwise show "Could not load data (code XXXXX)" |
| A2 | Low priority | Route ids match `/^\d{1,15}$/`; anything longer goes to Not found (N5) |
| A3 | Stage 2 | Sandbox banner, a "Sandbox" badge in the list; the title chip counts canonical launches only |
| A4 | Stage 2 | Canonical pages show no write controls and link to "Try this in the sandbox" |
| A5 | Stage 2 | Visitor evidence and decisions show a "Visitor" label beside the type and the decider |
| A6 | Stage 2 | **Rendering `source`:**<br>• visitor-origin `source` is plain text<br>• seed-origin `source` is a link only if `new URL(source).protocol === 'https:'`, with `rel="noopener noreferrer nofollow"` |
| A7 | Stage 2 | The header button becomes "Reset sandbox", calls `sandbox_reset` behind a confirmation, and shows the cooldown message |
| A8 | Stage 2 | Queries select `origin` and `source_launch_id` |
| A9 | Stage 2 | Regenerate `src/lib/database.types.ts` after the migrations |

## 10. Regression test specification

None of these exists as a committed test yet, except that `supabase/tests/fingerprint.sql` is C-12's
query.

**Catalog tests.** These are read-only and safe against production. Each expects 0 rows unless stated.
- **C-1:** RLS is enabled on every table.
- **C-2:** exact table privileges for `anon` and `authenticated` across SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER and MAINTAIN. Expected: SELECT on the 6 tables and the view, nothing else.
- **C-3:** no column-level writes.
- **C-4:** no sequence privileges.
- **C-5:** the function allowlist matches in both directions. Stage 1: empty. Stage 2: the three sandbox functions.
- **C-6:** every SECURITY DEFINER function has a pinned `search_path`.
- **C-7:** no dynamic `EXECUTE` in application SECURITY DEFINER functions.
- **C-8:** every view uses `security_invoker`.
- **C-9:** no `pg_default_acl` grant to `anon`, `authenticated` or PUBLIC for `postgres` in `public`.
- **C-10:** `anon` and `authenticated` have identical privileges.
- **C-11:** migration parity (EVAL-022's query).
- **C-12:** fingerprint parity against an ephemeral database built from the repository.
- **C-13:** the advisor shows zero 0028 and 0029 lints in Stage 1, and exactly the three documented functions in Stage 2.
- **C-14 (Stage 2):** no visitor rows on a canonical launch; no sandbox gate over its caps.

**Behavior tests.** Local or ephemeral databases only. Each runs as `anon` **and** as `authenticated`,
inside a rolled-back transaction.
- **B-1 (Stage 1):**
  - SELECT is allowed everywhere.
  - Denied with 42501:
    - INSERT, UPDATE and DELETE on every table
    - TRUNCATE
    - `SELECT ... FOR UPDATE`
    - `CREATE TABLE`
    - `set_gate_status`
    - `reset_demo_data`
  - As the owner, the integrity suite passes 6 of 6.
- **B-2:** a probe table created by `postgres` grants `anon` nothing.
- **B-3:** the `source` accept and reject table, and the text accept and reject table (EVAL-030).
- **B-4 (Stage 2):**
  - **Allowed:**
    - visitor evidence gets `origin = 'visitor'` and today's date
    - a decision records `decided_by = 'Sandbox visitor'`
    - a waive with text works
    - a reset after the cooldown restores the sandbox and leaves the canonical fingerprint unchanged
  - **Denied:**
    - a sandbox function called on a canonical gate
    - the 11th evidence item or the 21st decision on one gate
    - Passed without evidence
    - Waived with blank text
    - unsafe text
    - a non-https source
    - a reset inside the cooldown
    - any direct table write
    - forging `origin`
  - **Concurrency:** two sessions racing at one below the cap; exactly one succeeds.

**Client tests.**
- **Secrets:** a scan of history and the bundle.
- **Unit tests:**
  - `errorMessage()`
  - `sourceDisplay()`: visitor origin never yields an `href`; `javascript:`, `data:` and `http:` are rejected.
- **End to end:**
  - a `<script>` title renders as text
  - a visitor `source` has no anchor
  - the visitor label shows
  - canonical pages have no write controls
  - readiness changes only after a database change
  - a sandbox write leaves the canonical overview unchanged

**Regression floor:**
- Vitest, typecheck and build stay green.
- The integrity suite passes 6 of 6 locally.
- C-11 and C-12 pass.

## 11. Release gates

**To leave remediation and start the gate sheet:**

| Gate | Condition | Status |
|---|---|---|
| R-1 | D1 to D7 recorded in `DECISIONS.md`, and the brief's "Reset demo data" line updated | **Decisions recorded** in the commit that added this record. The brief line itself is kept verbatim as history, and a notice at the top of `PROJECT_BRIEF.md` supersedes it. |
| R-2 | M-1, M-2 and M-3 applied through the single chosen path, with repository files renamed to the recorded versions | Not started |
| R-3 | C-1 to C-13 pass against production | Not started |
| R-4 | B-1 to B-3 pass on an ephemeral database built from the repository, and C-12 parity holds | Not started |
| R-5 | The integrity suite passes 6 of 6 locally; Vitest, typecheck and build are green | Not started (for the remediated schema) |
| R-6 | The security advisor shows no `anon` or `authenticated` SECURITY DEFINER lints | Not started |
| R-7 | The history and bundle secret scans are clean | Not started (for the remediated build) |
| R-8 | The Auth dashboard settings are checked and recorded; signups disabled or confirmed harmless | Not started |
| R-9 | The GitHub integration deploy settings are confirmed before anything merges to `main` | Not started |
| R-10 | The gate-sheet phase begins with M-4 to M-6 and B-4, before any write UI exists | Not started |

**Before public deployment:**

| Gate | Condition | Status |
|---|---|---|
| R-11 | A3 to A7 shipped | Not started |
| R-12 | **Production headers set:**<br>• CSP `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src https://<project>.supabase.co; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'`<br>• `X-Content-Type-Options: nosniff`<br>• `Referrer-Policy: strict-origin-when-cross-origin`<br>• `Permissions-Policy: camera=(), microphone=(), geolocation=()`<br>• HTTPS with HSTS | Not started (nothing hosted) |
| R-13 | One clean Report-Only CSP pass before the header is enforced | Not started |

## 12. Unresolved verification items

These remain **unknown**. Don't treat any of them as verified.

- **Auth:** provider and signup configuration (email signup, anonymous sign-ins, other providers, CAPTCHA, email confirmation). Readable only in the dashboard or through the Management API.
- **API gateway:** request-size and rate-limit behavior for the Data API.
- **OpenAPI:** whether the root is served to the publishable key.
- **Deployment:** the GitHub/Supabase integration settings (which branch, if any, deploys migrations).
- **Data API settings:** confirmed only by the owner's report from the creation form (DR-005).
- **Postgres 17:** the MAINTAIN privilege behavior for M-3. It was simulated on Postgres 16 without MAINTAIN.
- **Default-privileges toggle:** whether the dashboard's "Default privileges for new entities" toggle rewrites `pg_default_acl`.
- **Per-IP limiting:** whether `X-Forwarded-For` can be spoofed for `db_pre_request`-style limits.
- **Database settings:** SSL enforcement and network restrictions (not read in either audit).
- **Browser against live:** the app has never been loaded against the live project.
- **CI:** none exists.
- **End-to-end suite:** no committed suite. The scratch scripts are preserved as evidence only ([`artifacts`](../evaluation/artifacts/2026-10-02-scratch-harness/README.md)).
- **Hosting:** security headers untested; nothing is hosted.
- **Secret scanning:** gitleaks or another dedicated scanner was never run; a pattern-based grep was used.
- **Connector timeouts:** the root cause is unconfirmed (EVAL-006).
- **Live state after 10:58 UTC on 2026-10-02:** not re-read; this documentation commit didn't touch production.

## 13. Deferred issues

| Issue | Reason for deferring |
|---|---|
| Auth and per-visitor sandboxes | The upgrade path if sandbox griefing occurs; not needed for Model C |
| Per-IP rate limiting | The caps bound storage; request rate is left to platform protections |
| LinkedIn integration | Needs Auth, an Edge Function, and secrets kept outside the exposed schema or in Vault |
| Status state machine (M5); multiple Active stages | Product decisions; no public path to either |
| Zero-gate "Ready" (N2); the list's "All stages completed" for a launch with no stages | Truthfulness fixes; only the owner can create launches today |
| Route ids beyond 2^53 (N5) | UX; fixed by A2 |
| Free-plan pausing (L2); seeded decision timestamps (L3) | Not security issues |
| Repository visibility | Private today; history is clean (EVAL-028) |
| Hosting headers | A deployment gate (R-12, R-13) |

## 14. What became of the Phase 2B report's draft decision entries

The Phase 2B report ended with draft entries numbered DR-01 to DR-13. That numbering is retired.
[`DECISIONS.md`](../../DECISIONS.md) uses DR-001 onward.

| Phase 2B draft | Where it stands |
|---|---|
| DR-01 Trust model | DR-013 (D1), accepted |
| DR-02 Public API is SELECT plus allowlisted functions | A consequence of DR-013; enforced by I3 and I4 |
| DR-03 Canonical data changes only through migrations | A consequence of DR-013; I7 |
| DR-04 Reset semantics | DR-014 (D2), accepted |
| DR-05 Database-set provenance | DR-013 and DR-015; I11 |
| DR-06 Visitor identity | DR-016 (D4), accepted |
| DR-07 Evidence types in the sandbox | DR-015 (D3), accepted |
| DR-08 URLs | DR-017 (D5), accepted |
| DR-09 Caps and cooldown | DR-018 (D6), accepted |
| DR-10 No Auth in Phase 1 | DR-006, accepted |
| DR-11 Destructive tests local only | Specified as invariant I19; applied as practice since Phase 2B, not separately decided |
| DR-12 Single migration deploy path | DR-019 (D7), accepted |
| DR-13 Default privileges revoked, guarded by a catalog test | Specified as M-3 and C-9 for Stage 1; not separately decided |
