# Phase 2B: security finding reconciliation and remediation specification

- **Date:** 2026-10-02. Audit 1 report at 10:30 UTC; Phase 2B report at 10:58 UTC.
- **Baseline:** `claude/phase1-schema` at `cb27437b03bf83557adf1f9d4775d36b5ebdeabf`
- **Performed by:** Claude Code, at the project owner's request. Read-only.
- **Status of this record:**
  - The findings are confirmed as stated below.
  - Decisions D1 to D7 were approved afterwards and are recorded as DR-013 to DR-019 in
    [`DECISIONS.md`](../../DECISIONS.md).
  - **No remediation had been implemented when this record was written.**
  - **Update, Stage 1 (about 12:05):** Stage 1 is implemented in the repository and verified locally on Postgres 17, but **not applied to live** (§15, DR-021). Everything above §15 is the Phase 2B record as written, apart from the status columns in §9 and §11 and the items marked "Update" in §12 and §14.
  - **Update, Stage 1 release checkpoint (about 13:10):** Stage 1 is pushed to `origin/claude/phase1-schema` and still **not applied to live**. The single deploy path couldn't be established with the available tools: decision-tree Case C (§16). Release gate R-8 is retired (DR-022), and SEC-007 has a recorded disposition (DR-023).
  - **Update, deployment-path decision (14:15 to 14:25):** DR-024 designates the Supabase connector as the single production migration path, so release gate R-9 is met (§11, §17). The earlier reading that GitHub had been linked to the project was wrong; it's corrected in §16 and §17. §8 gains an "Update" note on how I20 applies. Stage 1 is still **not applied to live**.
  - **Update, Stage 1 deployment (16:08 to 16:29):** Stage 1 is **applied to live** as `20261002160901` and verified there read-only: catalog 17 of 17, fingerprint equal to EVAL-045, no 0028 or 0029 lints, and C-11 migration parity PASS. R-3 and R-6 are met. R-2's application is met, and R-2 is satisfied by the DR-009 rename to that version being committed; the closeout commit carries it (§11, §18).
  - **Update, Stage 2 specification (about 17:00):** DR-025 and DR-004 amendment A2 complete the Stage 2 specification; §19 holds the contracts. C-13 and R-6 are reworded for Stage 2, and A1 becomes a Stage 2 prerequisite.
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
| I18 | The UI shows only deliberately raised application messages (SQLSTATE P0001). Every other error is shown generically, with its code. | Deferred (A1). A1 is now in the repository (EVAL-079) |
| I19 | Destructive tests run only against local or ephemeral databases. Only read-only catalog tests run against production. | Process, now |
| I20 | Migrations reach production through exactly one path, and the repository files match `supabase_migrations` byte for byte. | DR-019 |

"Holds today" is a claim about the baseline (`cb27437`, live as read at 10:44 to 10:58 UTC). It isn't a
claim about the current live state, which this documentation commit didn't read.

**Update (DR-024): how I20 applies to connector deployments.** I20's wording is unchanged. As DR-019's rationale states, it covers version parity as well as bytes. Under DR-024 a migration passes through three states:
- **Before deployment:** the authored filename may carry the timestamp from when the migration was created.
- **During deployment:** Supabase assigns the production version when the connector applies the migration.
- **After deployment:** the repository file is renamed to that recorded version, with its contents unchanged (DR-009).

I20 is checked after the rename: the repository and production must then agree on version, contents and order. The authoring timestamp isn't part of the invariant.

## 9. Remediation sequence

| Step | What | Depends on | Establishes | Status |
|---|---|---|---|---|
| S0 | Record decisions D1 to D7 | None | None | **Done** in the commit that added this record (DR-013 to DR-019) |
| S1 | Add the read-only catalog test `supabase/tests/security_catalog.sql`. It should fail first. | None | Guards I2 to I6, I9 | **Done:** committed; fails first on the pre-Stage-1 build and on live (EVAL-041, EVAL-048) |
| S2 | Migration M-1: revoke the public write paths | D1 | I3, I4, I7 | **Applied to live** (`20261002160901`, EVAL-065) and verified there (EVAL-066) |
| S3 | Migration M-2: https check on `evidence.source` | None | I10 | **Applied to live** (refined pattern, §15; EVAL-065), verified by the fingerprint's constraints part (EVAL-066) |
| S4 | Migration M-3: default privileges | None | I9 | **Applied to live** (EVAL-065); catalog check 14 passes there (EVAL-066) |
| S5 | **Verify on production:**<br>• the catalog test passes<br>• the advisor shows no 0028 or 0029 lints<br>• migration hashes match<br>• the fingerprints match<br>• the integrity suite passes 6 of 6 **locally** | S1 to S4 | All Stage 1 invariants | **Done:** catalog 17 of 17, no 0028 or 0029 lints, fingerprint equal to EVAL-045 (EVAL-066); migration hashes match, C-11 PASS (EVAL-068). The integrity suite passed locally (EVAL-056, EVAL-061, EVAL-062) |
| S6 | The owner checks the Auth dashboard settings and records them | None | Closes M1 | **Retired** with R-8 (DR-022), not passed: the settings stay unread |
| Stage 2 | **At the start of the gate-sheet phase:**<br>• M-4: provenance, sandbox columns, composite keys, text checks<br>• M-5: `set_gate_status` gains an origin; the seed builds the sandbox<br>• M-6: the three sandbox functions<br>• application items A3 to A9 | D1 to D6 | I11 to I16 | **M-4 to M-6 in the repository and verified locally** (EVAL-071 to EVAL-078); not applied to live. A1 and A3 to A9 not started |

Stage 1 (S1 to S6) is the next implementation phase.

**Update, Stage 1:** S1 to S4 are done in the repository. S5 and S6 wait on the owner (R-9, R-8). See §15.

**Update, release checkpoint:** S1 to S4 are pushed. S5 is still blocked by R-9 (§16). S6 was retired with R-8 (DR-022).

**Update, deployment-path decision:** R-9 is met (DR-024). S5 now waits only on the separately authorized deployment run (§17).

**Update, Stage 1 deployment:** S2 to S4 are applied to live (EVAL-065). S5 is done, including the migration-hash check, C-11 (EVAL-068, §18).

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

_Update: implemented with a refined pattern that doesn't depend on the collation provider. The specification below is kept as written; see §15._

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
  - Single-line titles reject `[\x01-\x1F\x7F-\x9F\u202A-\u202E\u2066-\u2069]`.
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
- Each runs only at READ COMMITTED and refuses higher isolation levels, where its locks wouldn't guarantee its invariant (§19).
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
  - locks every sandbox gate in id order, so a visitor write in flight ends before the deletes
  - deletes visitor rows on sandbox launches
  - restores sandbox gate `status` and `waiver_rationale` from the source gates
  - uses no TRUNCATE
- **Grants:** `revoke all ... from public`, then `grant execute ... to anon, authenticated`.
- **Advisor:** lints 0028 and 0029 will list exactly these three functions, as documented public endpoints.

### Application items

| ID | Stage | Item |
|---|---|---|
| A1 | Low priority; **Stage 2 prerequisite** (DR-025) | Show the error message only for SQLSTATE `P0001`; otherwise show "Could not load data (code XXXXX)". **In the repository** (EVAL-079): `src/lib/errors.ts`, see §19 **Errors** |
| A2 | Low priority | Route ids match `/^\d{1,15}$/`; anything longer goes to Not found (N5) |
| A3 | Stage 2 | Sandbox banner, a "Sandbox" badge in the list; the title chip counts canonical launches only. **In the repository** (EVAL-081) |
| A4 | Stage 2 | Canonical pages show no write controls and link to "Try this in the sandbox" |
| A5 | Stage 2 | Visitor evidence and decisions show a "Visitor" label beside the type and the decider |
| A6 | Stage 2 | **Rendering `source`:**<br>• visitor-origin `source` is plain text<br>• seed-origin `source` is a link only if `new URL(source).protocol === 'https:'`, with `rel="noopener noreferrer nofollow"` |
| A7 | Stage 2 | The header button becomes "Reset sandbox", calls `sandbox_reset` behind a confirmation, and shows the cooldown message |
| A8 | Stage 2 | Queries select `origin` and `source_launch_id`. **In the repository** (EVAL-080): launches and the overview select `source_launch_id`; the overview's decisions select `origin` |
| A9 | Stage 2 | Regenerate `src/lib/database.types.ts` after the migrations. **In the repository** (EVAL-080): generated from a local database built from the migrations, not from live |

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
  - **Update (DR-025):** reworded: the advisor's 0028 and 0029 findings name exactly the I4 allowlist and nothing else: none in Stage 1; in Stage 2, the three sandbox functions under each lint. Catalog check 9 enforces the same allowlist from the catalog, in both directions.
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
| R-2 | M-1, M-2 and M-3 applied through the single chosen path, with repository files renamed to the recorded versions | **Application met; the DR-009 rename completes it.** Applied once through the Supabase connector (DR-024; A1's temporary Deployment connector) at 16:09, recorded as `20261002160901` (EVAL-065). The file `20261002115318_stage1_security_hardening.sql` is renamed to `20261002160901_stage1_security_hardening.sql`, contents unchanged (`R100`; DR-009, EVAL-067). R-2 is satisfied by the repository rename being committed; the closeout commit carries it |
| R-3 | C-1 to C-13 pass against production | **Passed** (16:29). On live after the migration: C-1 to C-10 pass as catalog checks 1 to 17, 17 of 17; C-12 holds, all 12 fingerprint parts equal EVAL-045; C-13 holds, no 0028 or 0029 lints (EVAL-066); C-11 passes, each stored statement's md5 equals its file, `20261002160901` `f66a638dfb93554ad4f1a2bac0826304` (EVAL-068). Before the migration the catalog test failed 4 of 17 (EVAL-048, EVAL-051, EVAL-059, EVAL-062) |
| R-4 | B-1 to B-3 pass on an ephemeral database built from the repository, and C-12 parity holds | **Met locally:** 24 of 24 (EVAL-043), and again with 41 reject cases (EVAL-056); pre-Stage-1 parity with live holds (EVAL-039, EVAL-051) |
| R-5 | The integrity suite passes 6 of 6 locally; Vitest, typecheck and build are green | **Met** (EVAL-044, EVAL-047; again in EVAL-056 and EVAL-058) |
| R-6 | The security advisor shows no `anon` or `authenticated` SECURITY DEFINER lints | **Met** (16:11, EVAL-066): the security advisor returns no lints. Before the migration 0028 and 0029 listed the two functions (EVAL-049, EVAL-051, EVAL-059, EVAL-062)<br>**Update (DR-025), wording for Stage 2:** the advisor lists `anon` or `authenticated` SECURITY DEFINER findings (0028, 0029) only for the functions on I4's allowlist, each a documented public endpoint. Stage 1: none. Stage 2: exactly `sandbox_add_evidence`, `sandbox_set_gate_status` and `sandbox_reset` under each lint, and no other function; any other function listed fails the gate |
| R-7 | The history and bundle secret scans are clean | **Met with detect-secrets:** no real secrets in the full history (EVAL-057) or the production bundle (EVAL-058). gitleaks couldn't be installed (network policy), and GitHub secret scanning isn't available on this repository |
| R-8 | The Auth dashboard settings are checked and recorded; signups disabled or confirmed harmless | **Retired, not passed** (DR-022). Auth is intentionally not used; the release instead requires catalog checks 13 and 15 on every deployment (`anon` and `authenticated` hold identical privileges and policies). The settings stay unread: a documented tradeoff, not a security advantage |
| R-9 | The GitHub integration deploy settings are confirmed before anything merges to `main` | **Met** by the deployment-path decision (DR-024, 14:15). The Supabase connector is the designated single path and has applied every production migration (EVAL-022, EVAL-059). No GitHub integration has ever been connected (owner-verified at 13:54, EVAL-060), and no CI workflow exists, so nothing deploys from `main`. The earlier "Open, blocking" status (EVAL-052, EVAL-053) rested on a misreading, corrected in DR-019 and EVAL-052 |
| R-10 | The gate-sheet phase begins with M-4 to M-6 and B-4, before any write UI exists | **Met in the repository, locally** (EVAL-071 to EVAL-074): M-4 to M-6 and B-4 exist and pass, and no write UI exists. **Not applied to live**; production deployment follows DR-024 |

**Before public deployment:**

| Gate | Condition | Status |
|---|---|---|
| R-11 | A3 to A7 shipped | Not started |
| R-12 | **Production headers set:**<br>• CSP `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src https://<project>.supabase.co; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'`<br>• `X-Content-Type-Options: nosniff`<br>• `Referrer-Policy: strict-origin-when-cross-origin`<br>• `Permissions-Policy: camera=(), microphone=(), geolocation=()`<br>• HTTPS with HSTS | Not started (nothing hosted) |
| R-13 | One clean Report-Only CSP pass before the header is enforced | Not started |

## 12. Unresolved verification items

These remain **unknown**. Don't treat any of them as verified.

- **Auth:** provider and signup configuration (email signup, anonymous sign-ins, other providers, CAPTCHA, email confirmation). Readable only in the dashboard or through the Management API.
  - **Update (release checkpoint):** still unread, and no longer a release gate (DR-022).
- **API gateway:** request-size and rate-limit behavior for the Data API.
- **OpenAPI:** whether the root is served to the publishable key.
- **Deployment:** the GitHub/Supabase integration settings (which branch, if any, deploys migrations).
  - **Update (DR-024):** resolved. No GitHub integration has ever been connected (owner-verified, EVAL-060), and the connector is the designated path.
- **Data API settings:** confirmed only by the owner's report from the creation form (DR-005).
- **Postgres 17:** the MAINTAIN privilege behavior for M-3. It was simulated on Postgres 16 without MAINTAIN.
  - **Update:** verified on a local Postgres 17.10 build that mirrors live's default ACL (EVAL-040). Not probed on live, because that needs DDL.
- **GitHub integration "Deploy to production" (added in Stage 1):** on or off, and which branch it deploys. The docs say it works without branching (EVAL-037). It blocks R-2 and R-9.
  - **Update (release checkpoint):** still unknown. No available tool exposes it (EVAL-052).
  - **Update (DR-024):** resolved: no integration exists, so there's no setting. It no longer blocks R-2 or R-9.
- **Function default privileges (added in Stage 1):** a global fix for SEC-007 hasn't been decided or tested.
  - **Update (release checkpoint):** decided for Stage 1: no default change, and an explicit revoke for every new function (DR-023). The global fix stays undecided and untested.
- **Default-privileges toggle:** whether the dashboard's "Default privileges for new entities" toggle rewrites `pg_default_acl`.
- **Per-IP limiting:** whether `X-Forwarded-For` can be spoofed for `db_pre_request`-style limits.
- **Database settings:** SSL enforcement and network restrictions (not read in either audit).
- **Browser against live:** the app has never been loaded against the live project.
- **CI:** none exists.
- **End-to-end suite:** no committed suite. The scratch scripts are preserved as evidence only ([`artifacts`](../evaluation/artifacts/2026-10-02-scratch-harness/README.md)).
- **Hosting:** security headers untested; nothing is hosted.
- **Secret scanning:** gitleaks or another dedicated scanner was never run; a pattern-based grep was used.
  - **Update (release checkpoint):** detect-secrets 1.5.0 ran over the full history and the bundle (EVAL-057, EVAL-058). gitleaks still hasn't run: its download is blocked by the network policy. GitHub secret scanning is unavailable (no Advanced Security).
- **Connector timeouts:** the root cause is unconfirmed (EVAL-006).
- **Live state after 10:58 UTC on 2026-10-02:** not re-read; this documentation commit didn't touch production.
  - **Update:** re-read, read-only, at 12:00 (EVAL-048) and 12:39 (EVAL-051): unchanged. The migration history was last checked at 13:03 (EVAL-058).
  - **Update (deployment-path decision):** re-read at 13:38 to 13:41 (EVAL-059): unchanged. The migration history was last read at 14:01 (EVAL-060).

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
| DR-13 Default privileges revoked, guarded by a catalog test | Specified as M-3 and C-9 for Stage 1. **Update:** implemented as part of DR-021 (table defaults only; see SEC-007 and DR-023 for functions) |

## 15. Stage 1 implementation (2026-10-02, 11:47 to 12:05)

**Baseline:** `ef611766c8d308a344d78d12e49e5f9079425602`. **Decisions:** DR-020 (no Auth) and DR-021 (Stage 1).
**Evidence:** EVAL-036 to EVAL-050.

**What was built** (all in the repository):

| Item | File | Notes |
|---|---|---|
| M-1, M-2, M-3 | `supabase/migrations/20261002115318_stage1_security_hardening.sql` | Created with `supabase migration new` (CLI 2.119.0). Strict statements; no new function, no new write path |
| Catalog test (S1; C-1 to C-10, C-12) | `supabase/tests/security_catalog.sql` | Read-only, 17 checks. Check 15 holds the expected Stage 1 hashes of seven fingerprint parts |
| Behavior test (B-1 to B-3) | `supabase/tests/stage1_behavior.sql` | Local only; refuses to run on a Supabase project; rolled back; denials must be SQLSTATE 42501 |
| Local mirror of live's default privileges | `supabase/tests/local_roles.sql` | Adds `service_role` and live's per-schema table defaults, so local builds show what M-3 removes |
| Stale comment | `src/components/AppShell.tsx` | No longer points future work at `reset_demo_data()`; no behavior change |

**How M-2 differs from the specification above:**
- The specification's path class `[^[:space:][:cntrl:]]` depends on the database's collation provider, and live uses ICU (EVAL-036).
- The implemented path is an explicit RFC 3986 list: `[]A-Za-z0-9._~:/?#[@!$&'()*+,;=-]`, or `%` followed by two hex digits. The scheme, host and port parts are unchanged.
- Every case in the EVAL-030 table keeps its outcome.
- **Newly rejected:**
  - raw non-ASCII text (it must be percent-encoded)
  - `< > " \ { } | ^` and backtick
  - malformed `%` escapes
  - Unicode spaces, C1 controls, and bidi and zero-width characters
- **Accepted by construction:** IPv4 literals with dotted numeric labels.

**Verified locally on Postgres 17.10 (ICU)**, on a build matching live's pre-Stage-1 state (EVAL-039):
- **Default privileges:** M-3 removes TRUNCATE, REFERENCES, TRIGGER and MAINTAIN on new tables for `anon` and `authenticated` (EVAL-040).
- **Catalog test:**
  - 17 of 17 on the Stage 1 build.
  - Fails exactly checks 3, 9, 14 and 15 on the pre-Stage-1 build (EVAL-041).
  - 16 of 17 checks flip under injected regressions; check 3 is covered by the pre-Stage-1 build (EVAL-042).
- **Behavior test:** 24 of 24 on the Stage 1 build; 16 of 24 on the pre-Stage-1 build, with the expected failures (EVAL-043).
- **Integrity suite:** 6 of 6, and the seed is intact (EVAL-044).
- **Fingerprint:** only constraints, policies, column write grants and functions changed; `seed_data` is unchanged (EVAL-045).
- **API:**
  - The app's read queries return 200 through PostgREST 14.18.
  - Writes and mutation RPCs return 42501, as HTTP 401 for `anon` and 403 for `authenticated` (EVAL-046).
- **Application:** unit tests, typecheck and build are green (EVAL-047).

**Live, read-only, before any migration** (EVAL-048, EVAL-049):
- The catalog test passes 13 of 17 and fails exactly the four checks the migration fixes.
- The advisor still lists lints 0028 and 0029 for the two functions.

**Not done, and why:**
- **The migration wasn't applied to live.** DR-019 requires one confirmed deploy path. The GitHub integration can deploy migrations from `main` on any plan (EVAL-037), and whether it's turned on is only visible in the dashboard. Applying through the connector could leave two competing mechanisms.
- **Live wasn't verified after the migration.** The expected live result is 17 of 17 on the catalog test, the fingerprint parts in EVAL-045, and no 0028/0029 lints. That's unverified.
- **A new latent finding, SEC-007, was recorded rather than fixed.** Functions that `postgres` creates are executable by PUBLIC by default. The fix is a global default-privilege change outside M-3's table scope.

**To finish Stage 1:**
1. The owner reads the GitHub integration settings and picks one deploy path (DR-019).
2. The migration is applied through that path. If that's the connector, the file is renamed to the recorded version (DR-009).
3. Read-only production verification:
   - `list_migrations`
   - migration parity (EVAL-022's query)
   - `security_catalog.sql`, expecting 17 of 17
   - `fingerprint.sql`, expecting the EVAL-045 values
   - the advisors
   - data counts
4. The owner records the Auth settings (R-8).

**Update (release checkpoint):** step 4 is retired (DR-022). Section 16 replaces this list.

**Update (deployment-path decision):** step 1's premise, a GitHub integration with unknown settings, was a misreading: no integration exists. DR-024 chose the connector, so step 2 applies with the rename (DR-009). See §17.

## 16. Stage 1 release checkpoint (2026-10-02, 12:36 to 13:10)

**Starting point:** `e74aaafdb20e23258852cedfc5458a7ed98e79cb`, clean, 2 commits ahead of `origin`.
**Decisions:** DR-022 (release gate R-8 retired) and DR-023 (SEC-007). **Evidence:** EVAL-051 to EVAL-058.

**Outcome: decision-tree Case C.** Stage 1 is **implementation-complete, verified locally and pushed**. **Production deployment is pending**, because the single deploy path couldn't be established. Production wasn't changed: nothing in this section wrote to the live project.

**Update (deployment-path decision):** this section is the record as of 13:10. G4 is now met by DR-024, and the owner actions below are superseded; see §17.

### Stage 1 gates

The four states stay separate: implemented in the repository, verified locally, applied to live, verified on live. A gate isn't passed because its code exists locally.

| Gate | Condition | Status | Evidence |
|---|---|---|---|
| G1 Implementation | M-1 to M-3 and their tests are committed | **Done:** `e74aaaf`; the behavior test was strengthened in `8a1ad9d` | DR-021 |
| G2 Local verification | A fresh Postgres 17 build passes catalog 17/17, behavior 24/24, fingerprint 12/12 and integrity 6/6 | **Done,** after the last SQL change, and again on the final files | EVAL-056, EVAL-058 |
| G3 Pushed | The commits are on `origin/claude/phase1-schema`, without force and without a merge to `main` | **Done** for `ef61176` and `e74aaaf` (12:40). `8a1ad9d` goes up with the commit that adds this section | EVAL-053 |
| G4 Deployment path (R-9) | Exactly one authoritative mechanism is established (DR-019) | **Blocked:** the GitHub integration's deploy setting can't be read with the available tools | EVAL-052 |
| G5 Production application (R-2) | The migration is applied to live through that path | **Pending** G4. Live still has the same 3 migrations (last checked 13:03) | EVAL-051, EVAL-058 |
| G6 Production verification (R-3, R-6, C-11, data) | The read-only checks below pass on live | **Pending** G5. Live today: catalog 13 of 17; lints 0028 and 0029 listed | EVAL-051 |
| R-8 Auth settings | Retired | **Retired, not passed** (DR-022). Catalog checks 13 and 15 replace it, on every deployment | DR-022 |

### Why production wasn't changed

- The GitHub integration's "Deploy to production" option applies new migrations when changes reach the production branch, on every plan and without branching (EVAL-037). Whether it's on, which branch it watches and which directory it reads are visible only in the dashboard.
- The available tools don't expose those settings. The Supabase tools cover projects, branches, migrations, logs, advisors and SQL; the GitHub tools cover repository contents, commits and workflows (EVAL-052).
- Nothing observable separates "on" from "off". `main` hasn't changed since before the integration was linked, and a push to `claude/phase1-schema` deployed nothing (EVAL-053).
  - **Correction (§17, EVAL-060):** no GitHub integration was ever linked. "Since before the integration was linked" came from a misreading of the owner's 09:18 instruction, which referred to the Supabase connector. The reasoning in this subsection rested on that premise.
- **Each available action would have broken a rule:**
  - Applying through the connector could create a second mechanism, if the integration later deploys the same file from `main` (DR-019, finding N4).
  - Merging to `main` to find out would be a production deployment through an unverified path, and merging to `main` was out of scope.

### Final security audit (14 questions)

"Live today" is the read-only state at 12:39 (EVAL-051), **before** the migration. "Stage 1 build" is a fresh local Postgres 17.10 build of the repository (EVAL-056). The live column becomes the Stage 1 column only after G5 and G6.

| # | Question | Live today | Stage 1 build | Evidence |
|---|---|---|---|---|
| 1 | Can `anon` write canonical evidence? | **Yes:** column INSERT plus the policy `"Public append"` | No: SQLSTATE 42501; HTTP 401 | EVAL-051; EVAL-046, EVAL-056 |
| 2 | Can `authenticated` write canonical evidence? | **Yes,** by the same path | No: 42501; HTTP 403 | Same |
| 3 | Can `anon` execute `set_gate_status`? | **Yes,** by explicit grant | No: 42501 | EVAL-051; EVAL-056 (catalog check 9, behavior checks 3 to 18) |
| 4 | Can `authenticated` execute `set_gate_status`? | **Yes** | No | Same |
| 5 | Can `anon` execute `reset_demo_data()`? | **Yes** | No | Same |
| 6 | Can `authenticated` execute `reset_demo_data()`? | **Yes** | No | Same |
| 7 | Can a newly created public table accidentally expose write privileges? | **Partly:** by default it grants the API roles TRUNCATE, REFERENCES, TRIGGER and MAINTAIN, though not INSERT, UPDATE or DELETE. None of the four is usable through the Data API (SEC-006) | No: none of 8 privileges | EVAL-051 (catalog check 14); EVAL-040, EVAL-056 (behavior check 21) |
| 8 | Can any Stage 1 SECURITY DEFINER function be executed unintentionally? | The two existing functions can, until the migration is applied | No: both are owner-only, and Stage 1 adds no function | EVAL-051; EVAL-056; DR-023 |
| 9 | Can the https evidence constraint be bypassed? | The constraint isn't on live yet | No bypass found: 41 reject cases plus the probe. Three inert leniencies are documented | EVAL-054, EVAL-056 |
| 10 | Has any new public mutation path appeared? | No new path: the Phase 1 paths (questions 1 to 6) remain until the migration is applied | No: SELECT only; no write, sequence or function privilege, and no CREATE on `public` | EVAL-051; EVAL-056 (catalog checks 2 to 9 and 16) |
| 11 | Does the migration match the repository migration history? | Yes for the 3 applied migrations: each stored md5 equals the file's. The Stage 1 file isn't applied, and its version sorts after them | The local build applies the same 4 files | EVAL-051 |
| 12 | Is there exactly one authoritative production deployment mechanism? | **Not established** (the G4 blocker) | n/a | EVAL-052 |
| 13 | Has Auth accidentally been introduced? | No: 0 users, 0 identities, 0 anonymous users; nothing in `public` refers to `auth.*` | No: the client makes no Auth calls, and no migration refers to `auth.*` | EVAL-051; static review |
| 14 | Are production verification claims backed by actual read-only evidence? | Yes. Every live claim is a read-only observation, and none says Stage 1 is on live | n/a | EVAL-051 to EVAL-053 |

**Defects found and fixed during the audit:** raw invisible and bidi characters in two committed files (EVAL-055, fixed in `8a1ad9d`). No Stage 1 security defect was found in the migration.

### To finish Stage 1 (owner actions)

1. **Read the setting:** Project Settings > Integrations > GitHub. Record whether "Deploy to production" is on, which branch is the production branch, and the Supabase directory.
2. **Choose the single path (DR-019),** and record the choice as an update to DR-019:
   - **The GitHub integration** (deploy on, production branch `main`, directory containing `supabase/`): the owner merges `claude/phase1-schema` into `main`. The integration applies `20261002115318`; the 3 earlier versions are already recorded. Nothing is applied through the connector.
   - **The connector or the CLI** (deploy off): apply the file through one of them only. If the connector records a different version, rename the file to it in the same change (DR-009).
3. **Run the read-only verification below,** record it as new EVAL entries, and update §11, this section, the findings index and the brief's notice.

### Read-only verification after deployment

Nothing here writes. The destructive integrity suite and `stage1_behavior.sql` stay local (invariant I19). Writes aren't attempted on production, not even inside a rolled-back transaction: the privilege checks answer the same question read-only.

| Check | How | Expected |
|---|---|---|
| Migration history | `list_migrations` | 4 versions; the 4th is `20261002115318`, or the version the connector recorded, with the file renamed |
| Migration parity (C-11) | EVAL-022's query | The 3 earlier md5s are unchanged. The connector stores the whole file, so the md5 must be `f66a638dfb93554ad4f1a2bac0826304` (2205 characters). The CLI and the integration may store the file split into statements; then compare the statements with the file |
| Catalog test | `security_catalog.sql` in a read-only transaction | 17 of 17 |
| Fingerprint | `fingerprint.sql`, read-only | All 12 parts equal EVAL-045. Against EVAL-023, only constraints, policies, column_write_grants and functions change |
| Seed intact | The fingerprint's `seed_data` part, and row counts | `dc85e31b82116a9fa79adaac8399aa90`; launches 1, gates 16 (6 Passed), evidence 10, risks 6, decisions 4, stages 3 |
| Public writes denied | Catalog checks 2 to 9, 13 and 16 (privilege functions; no write attempted) | PASS |
| Advisors | The security advisor | Lints 0028 and 0029 no longer list `reset_demo_data` or `set_gate_status`. Unrelated findings may remain, and are reported as they are |
| Canonical reads | Catalog check 2, and the app in a browser against live (the owner holds the publishable key, DR-011) | PASS; the overview shows the seed |

### Stage 2 entry

Not yet. The repository is at a clean, documented, locally verified release checkpoint, but production still has the pre-Stage-1 posture: the public write paths in questions 1 to 6 stay open on live until G4 to G6 are done. Stage 2 adds public functions on top of Stage 1's read-only boundary, so it should start from a production-verified Stage 1. Starting Stage 2 work earlier is the owner's call.

## 17. Deployment-path decision (2026-10-02, 13:54 to 14:25)

**Decision:** DR-024. **Evidence:** EVAL-059 to EVAL-061. Production wasn't changed: nothing in this section wrote to the live project.

**What changed:**
- **A correction.** The records said GitHub had been linked to the Supabase project at about 09:18 (DR-019, EVAL-052, §16). That misread the owner's 09:18 instruction, "Supabase is now linked to this repo. Use that link.", which referred to the Supabase connector. No GitHub integration has ever been connected; the owner confirmed it at 13:54 (EVAL-060). The misreading was the documentation's, not the owner's.
- **A designation.** DR-024 makes the connector, the mechanism behind all three production migrations, the single authoritative path. The GitHub integration stays an unused alternative that would need its own decision.
- **One audit answer changes.** §16's question 12, "Is there exactly one authoritative production deployment mechanism?", now reads: yes, the connector (DR-024). The other answers are unchanged; they describe live before the migration.

### Stage 1 gates now

| Gate | Status | Evidence |
|---|---|---|
| G1 Implementation | **Done:** `e74aaaf`; the behavior test strengthened in `8a1ad9d` | DR-021 |
| G2 Local verification | **Done,** and again on this section's commit: catalog 17/17, behavior 24/24, fingerprint 12/12, integrity 6/6 | EVAL-056, EVAL-058, EVAL-061 |
| G3 Pushed | **Done** through `548701b`. This section goes up with the commit that adds it | EVAL-053 |
| G4 Deployment path (R-9) | **Met** by DR-024 | EVAL-060 |
| G5 Production application (R-2) | **Not yet passed:** waits on the authorized deployment run | EVAL-059: live still has the 3 earlier migrations |
| G6 Production verification (R-3, R-6, C-11, data) | **Not yet passed:** follows G5 | EVAL-059: catalog 13 of 17; lints 0028 and 0029 listed |

### The next run: deploying Stage 1 under DR-024

It's a separate, authorized run; nothing in this section performs it.
1. Replay the committed files locally: catalog 17/17, behavior 24/24, fingerprint 12/12, integrity 6/6.
2. Read-only preflight:
   - the history holds exactly the 3 earlier versions;
   - the catalog test is 13 of 17, failing checks 3, 9, 14 and 15;
   - the fingerprint equals EVAL-023;
   - the seed is intact.
3. One `apply_migration` call: `name` = `stage1_security_hardening`, `query` = the exact bytes of `20261002115318_stage1_security_hardening.sql`.
4. Read the recorded version, `<V>`.
5. Check parity: `<V>` is recorded exactly once, and its stored statement has md5 `f66a638dfb93554ad4f1a2bac0826304` (2205 characters).
6. Rename the file to `<V>_stage1_security_hardening.sql`, contents unchanged.
7. Run the read-only verification in §16, with `<V>` as the expected 4th version.
8. Mark R-2, R-3 and R-6 with that evidence, then make one closeout commit and push.

If any check fails, stop and reconcile. Don't retry blindly, repair the history, or apply a compensating migration without analysis.

**Update (14:55, EVAL-062, EVAL-063):**
- The first deployment attempt under this plan timed out at step 3 and applied nothing. The cause: the connector held the `drop policy` statement for a confirmation that this cloud client doesn't display.
- DR-024 amendment A1 governs the next attempt. The owner sets `skip_elicitations=apply_migration` on the Supabase connection for that window only, and removes it afterwards. The steps and hard-stop rules above are unchanged.

## 18. Stage 1 production deployment and validation (2026-10-02, 15:13 to 16:29)

**Evidence:** EVAL-064 to EVAL-068. **Production change:** exactly one, the Stage 1 migration (EVAL-065). Everything else in this section was read-only on live.

**What happened:**
- **The cause of the first attempt's timeout was confirmed (EVAL-064).** Claude's own tool approval wasn't the blocker. The 60 s hold came from the Supabase server's destructive-SQL confirmation, which this client doesn't display. It appeared only for SQL containing a DROP statement.
- **Amendment A1 was carried out through a separate connector.** The directory connector's URL is copy-only, so the owner set up a second connector, "Supabase Deployment", for the deployment window. It's the same Supabase MCP server and `apply_migration` operation that DR-024 designates. Its `skip_elicitations` value was never readable from the session; it rests on the owner's configuration. The original connector stayed enabled but wasn't called during the deployment or the validation.
- **The deployment (EVAL-065):** one `apply_migration` call at 16:08:51, with the file's exact bytes, returned success at 16:09:01. Supabase recorded `20261002160901`, and no confirmation hold occurred.
- **The validation (EVAL-066):** the committed, unmodified catalog test and fingerprint ran once each, read-only.
- **Migration parity, C-11 (EVAL-068):** EVAL-022's query, run once at 16:28 through the original connector, read-only. The stored statement for `20261002160901` has md5 `f66a638dfb93554ad4f1a2bac0826304`, 2205 characters, equal to the repository file. The three earlier versions are unchanged.
- **Repository reconciliation (EVAL-067):** under DR-009 the file is renamed to `20261002160901_stage1_security_hardening.sql`, contents byte-for-byte unchanged. The closeout commit carries the rename and these records. References to `20261002115318` earlier in this record describe the authored file before deployment and are left as written.
- **A1 cleanup (EVAL-067):** the owner removed the Deployment connector after the deployment, and its tools left the session.

### Stage 1 gates now

| Gate | Status | Evidence |
|---|---|---|
| G1 Implementation | **Done** | DR-021 |
| G2 Local verification | **Done** | EVAL-056, EVAL-061, EVAL-062 |
| G3 Pushed | **Done** through `f1e5279`. The rename and this record go up with the commit that adds them | EVAL-053 |
| G4 Deployment path (R-9) | **Met** | DR-024, EVAL-060 |
| G5 Production application (R-2) | **Application met:** applied once, recorded as `20261002160901`. R-2 is satisfied by the repository rename being committed; the closeout commit carries it | EVAL-065, EVAL-067 |
| G6 Production verification (R-3, R-6, C-11, data) | **Met:** catalog 17 of 17; fingerprint equal to EVAL-045, seed intact; no 0028 or 0029 lints; C-11 PASS; `ACTIVE_HEALTHY` | EVAL-066, EVAL-068 |

**Closeout:** DR-024 step 9 is the closeout commit and push, which carries the DR-009 rename and these records. With the rename committed, R-2 and I20 are satisfied; production already matches the renamed file (EVAL-068).

### The 14 audit questions on live

§16's "Live today" column described live before the migration. On live after Stage 1, questions 1 to 8 and 10 now have the Stage 1 build's answer. That rests on catalog checks 2 to 9, 13, 14 and 16, and on the fingerprint's functions, policies and grants parts (EVAL-066); no write was attempted on production (I19). Question 9's constraint is on live (fingerprint constraints part), and its bypass analysis is the local one (EVAL-054, EVAL-056). Question 11 holds: version, order and contents agree, and C-11 passes for all four versions (EVAL-068).

### Still open

- **The app in a browser against live**, from §16's verification table. It's not run.
- **Advisor INFO findings 0001 and 0005:** performance only, unrelated to Stage 1, reported as they are (EVAL-066).

## 19. Stage 2 specification (DR-025, 2026-10-02)

The §9 sketches of M-4 to M-6 stay as written. This section is the implementation contract that refines them. Where they differ, this section governs.

### M-4 `sandbox_provenance`

- **Provenance:** enum `record_origin` (`seed`, `visitor`); `origin ... not null default 'seed'` on `evidence` and `decisions`.
- **Sandbox links:**
  - `launches.source_launch_id`: null for a canonical launch; for a sandbox launch, its canonical launch. Unique, so at most one sandbox per canonical launch.
  - `gates.source_gate_id`: null for a canonical gate; for a sandbox gate, its canonical gate. Unique.
- **Same-launch integrity:** `unique (id, launch_id)` on `gates`; composite foreign keys `decisions (gate_id, launch_id)` and `risks (gate_id, launch_id)` to `gates (id, launch_id)`.
- **Text rules (I14),** as table constraints, so they bind the seed as well as visitors:
  - single-line, rejecting U+0001 to U+001F, U+007F to U+009F, U+202A to U+202E and U+2066 to U+2069: `evidence.title`, `decisions.decision`;
  - multi-line, which also allow tab, LF and CR: `evidence.summary`, `decisions.rationale`, `decisions.waiver_rationale`, `gates.waiver_rationale`.
- **Cooldown state:** `public.sandbox_state`, a single row holding `last_reset_at`, with RLS enabled and no grants to any API role. It starts in the past, so the first reset is allowed. The advisor may report it as INFO lint 0008 (RLS enabled, no policy); that's intended.

### M-5 `sandbox_seed`

- **`set_gate_status`** gains a trailing `origin public.record_origin default 'seed'`, written to the decision. The old 5-argument signature is dropped. The new one is explicitly revoked from PUBLIC, `anon` and `authenticated` (DR-023) and stays owner-only.
- **Sandbox copy,** by one owner-only routine (no grant to any API role):
  - one sandbox launch per canonical launch, named `<name> (sandbox)`, every other column copied;
  - all of that launch's gates, every column copied (status and waiver text included), with `source_gate_id` set;
  - all evidence, risks, decisions and rollout stages, with `launch_id` set to the sandbox launch and every `gate_id` remapped through `source_gate_id`; copied evidence and decisions get `origin = 'seed'`;
  - a decision that refers to a risk is rejected by the routine (the seed has none), rather than copied with a wrong reference;
  - rows are copied in canonical id order, so the result depends only on canonical content;
  - only canonical launches are sources; a sandbox is never copied.
- **The M-5 migration** builds the sandbox from the existing canonical rows. It doesn't truncate or reseed, so canonical rows keep their ids and contents.
- **`reset_demo_data()`** stays owner-only. It reseeds the canonical launch exactly as before, then rebuilds the sandbox, **atomically**: one transaction, so a failure rolls back the reseed too. It doesn't touch `sandbox_state`.

### M-6 `sandbox_rpcs`

All three are SECURITY DEFINER, owned by `postgres`, with `search_path = ''`, no dynamic SQL, fully qualified relations, `revoke all ... from public`, then `grant execute ... to anon, authenticated`.

- **Error codes:** every rule a function checks itself (a non-sandbox or missing gate, a cap, the cooldown, an isolation level above READ COMMITTED, and the I8 rules in `set_gate_status`) is a `RAISE EXCEPTION` with the default SQLSTATE P0001 and a message fit to show a visitor. A value that breaks a table constraint fails with that constraint's own SQLSTATE: 23514 for a CHECK (the I14 text rules, the https rule, a length limit) and 23502 for NOT NULL. An argument its type rejects, such as an unknown evidence type, fails with 22P02. The functions don't translate these into P0001; the UI handles them under A1.
- **Isolation:** all three functions run only at READ COMMITTED and refuse REPEATABLE READ and SERIALIZABLE with P0001 before taking any lock. Each guarantee below rests on reading committed state after the function holds its locks. At READ COMMITTED every statement takes a fresh snapshot; at the higher levels the snapshot predates the lock wait, and a row that another session only locked, without updating it, raises no serialization error. An API caller can't choose the level; the server's configuration sets it (Postgres defaults to READ COMMITTED). The refusal keeps the guarantees from depending on that configuration. Measured without the refusal:
  - `sandbox_add_evidence` added an 11th visitor item (I12), at both higher levels (EVAL-077);
  - `sandbox_set_gate_status`, racing a reset that had deleted the gate's only evidence, passed the gate with no evidence (I8), at both higher levels (EVAL-077);
  - `sandbox_reset` left a visitor row that was uncommitted when it started (I13), at REPEATABLE READ (EVAL-075; SERIALIZABLE wasn't measured).
  The visitor decision cap alone doesn't need the refusal: every accepted status change updates the gate, so a stale caller gets 40001.

- **`sandbox_add_evidence(gate_id, type, title, summary, source default null)`:** refuses to run outside READ COMMITTED (P0001); locks the gate; rejects a gate that isn't on a sandbox launch; rejects the 11th visitor item on the gate; inserts with `origin = 'visitor'`, `recorded_on = current_date`, and `btrim`'d title, summary and source. A blank source must be sent as null; `''` is rejected by M-2.
- **`sandbox_set_gate_status(gate_id, new_status, rationale, waiver_rationale default null)`:** refuses to run outside READ COMMITTED (P0001); locks the gate; rejects a non-sandbox gate; rejects the 21st visitor decision on the gate; then calls `set_gate_status(..., 'Sandbox visitor', ..., 'visitor')`, which keeps every I8 rule.
- **`sandbox_reset()`:** refuses to run outside READ COMMITTED (P0001); locks `sandbox_state`; within 5 minutes of the last reset, raises P0001 with the remaining time; otherwise locks every sandbox gate `FOR UPDATE` in id order, then deletes visitor evidence and decisions on sandbox launches, restores each sandbox gate's `status` and `waiver_rationale` from its source gate, and records the reset time. No TRUNCATE.
  - **Why the gate locks (I13):** every visitor write holds its gate's row lock until it commits. Once the reset holds all of them, each earlier visitor write has ended and each later one waits for the reset. Under READ COMMITTED each later statement in the reset takes a fresh snapshot, so the deletes see every committed visitor row. Without the gate locks, a visitor write still uncommitted when the deletes ran survived the reset (EVAL-075).
  - **Why READ COMMITTED only:** see **Isolation** above. A visitor that only added evidence locked its gate without updating it, so at a higher level no serialization error fired and its row survived the reset (EVAL-075).
  - **Lock order:** `sandbox_state`, then sandbox gates in id order. The visitor functions lock one gate and never `sandbox_state`, so no function takes them in the reverse order. Only gate rows are locked, not launches, because a visitor's decision insert takes a key-share lock on its launch.

### Visitor write UI (A4, A5, A6 and the gate sheet)

- **Visibility:** the forms render only for gates on a sandbox launch. Canonical gate sheets are read-only and link to the sandbox.
- **Add evidence:** type (one of the five, required); title (required, at most 200, single line); summary (required, at most 2000, multi-line); source (optional; blank sent as null; at most 500; https rule). Date and "Visitor" are shown, never entered. At 10 visitor items, the form is replaced by "This gate has reached its 10 visitor evidence items. Reset the sandbox to start again."
- **Change status:** any status except the current one. Rationale is required (at most 2000, multi-line). Passed needs at least one evidence item of either origin; the option is disabled with "Add evidence first" when there's none. Waived needs waiver text (at most 2000). Changes can repeat until 20 visitor decisions exist on the gate, then a cap message replaces the form.
- **Success:** the gate, its evidence, its decisions and readiness are refetched (I17).
- **Errors:** P0001 messages are shown verbatim (A1); anything else shows "Could not save (code XXXXX)".
  - **The boundary (A1, in the repository):** the data layer turns every PostgREST error into a `DataError` (`src/lib/errors.ts`) and the UI shows only `userMessage(error, generic)`. A P0001 message is a contract between the database functions and the user, so it is passed through exactly as raised, matched on the `code` field equal to `P0001`, never on message text. Every other error, including constraint violations (23514, 23502), type errors (22P02), permission errors (42501), PostgREST errors (`PGRST...`), network failures and bugs, shows only the caller's generic text and the code; its message, details and hint, which can name constraints and echo whole rows, are dropped at the boundary. A code that isn't a five-character SQLSTATE or a `PGRST` code isn't shown, and neither is a missing one: the generic text then stands alone.
- **The client never writes a table** and calls no function except the three sandbox functions.

### Reset UX (A7)

- "Reset sandbox" in the header, behind a confirmation: "Reset the sandbox? This removes all visitor evidence and decisions on the sandbox launch and restores its gates. It affects everyone using the sandbox. The canonical launch is never changed."
- **Success:** "Sandbox reset", then a refetch. The client may disable the button for 5 minutes as a convenience; the database is authoritative.
- **Cooldown, or a concurrent reset that lost the race:** the P0001 message, verbatim.
- **Any other error:** "Could not reset the sandbox (code XXXXX)", then a refetch.

### UI contract resolutions (A3 to A7; 2026-10-02, after EVAL-080)

Recorded before the UI work starts. They settle what §10, the sections above, Scenario F and DR-013 to DR-018 leave open; nothing above is changed.

- **Gate sheet (Stage 2 scope).** Stage 2 builds the gate detail side sheet at `/launches/:launchId/gates/:gateId`, over the launch overview: deep-linkable, closed by Back, full-screen on mobile (the brief's route contract). It shows the gate's criteria, owner and status, and its evidence list with each item's type, title, summary, date and source, with the A5 label and A6 rendering. On a sandbox gate it holds the A4 forms; on a canonical gate it is read-only and carries the sandbox link. The decision log and risk register are not part of Stage 2.
- **Navigation.** Canonical pages (the overview and canonical gate sheets) link to the sandbox **launch** with the text "Try this in the sandbox". There is no gate-level link, so the UI doesn't use `source_gate_id`; the sandbox launch is found through `source_launch_id`. No schema change.
- **Sandbox banner.** Informational only, with no link or action inside it, on the sandbox overview and sandbox gate sheets. No earlier document gives its text. Wording: "Sandbox: a shared copy of the canonical launch that anyone can change. Changes stay here, and the canonical launch is never changed." Navigation into the sandbox is the separate "Try this in the sandbox" link.
- **Reset sandbox.** The single global header action, in `AppShell`, available on every page, behind the confirmation dialog in **Reset UX (A7)**. There are no page-specific reset buttons. The database decides the cooldown and concurrent resets; a client-side 5-minute disable is a convenience only, never the authority.
- **Source links (A6).** A seed-origin `source` is a link only if `new URL(source).protocol === 'https:'`, with `rel="noopener noreferrer nofollow"` and no `target`, since nothing specifies a new tab. A visitor-origin source, and a seed source that isn't https or doesn't parse, is plain text.
- **Blank optional arguments.** The generated function types stay authoritative: `source?: string` and `waiver_rationale?: string`, with no `null`. A blank or whitespace-only source is sent by omitting `source`, so the function's argument defaults to null; that is how "blank sent as null" is met. `waiver_rationale` is likewise omitted unless the new status is Waived. The database's https rule stays authoritative.
- **Refetch (I17).** `AppShell` owns a refresh counter and a function that increments it, passed to routed pages through the router's outlet context. Pages include the counter in their existing fetch effects. A successful evidence add or status change calls it; a reset calls it after success and after the error path above. No state-management or caching library is added.
  - **Update (2026-10-02, after the preflight for A3):** a refresh keeps what's on screen. Initial page loads and route changes may show the existing loading state. A refresh triggered by a sandbox evidence add, a status change or a sandbox reset keeps the currently rendered content while the replacement data is fetched: the refresh counter signals a refetch and never itself clears data already loaded.
  - **Update (2026-10-02, after EVAL-081):** a failed refresh keeps the last successfully loaded content. Failures on an initial load or a route change keep the existing error behavior. How a refresh failure is shown without replacing the content is deferred to A4 and A7, which add the first refresh callers; no new toast or error UI is added before then. As of EVAL-081 the overview still replaces its content with the error panel when a same-launch refetch fails; nothing triggers a refresh yet, so that path can't occur, and A4 or A7 brings the code into line with this rule.

### Evaluation

- **`fingerprint.sql`:** `canonical_data` replaces `seed_data` (DR-025). Expected after M-5 on a database at the seed: `dc85e31b82116a9fa79adaac8399aa90`, the EVAL-045 `seed_data` value.
- **Stage 1 tests:** lookups by gate title, and the B-1 read counts, are scoped to canonical rows, with expected values unchanged.
- **Catalog check 9:** the API roles can execute exactly the three sandbox functions. **Check 15:** new expected hashes, recorded with the Stage 2 baseline.
- **B-4:** `supabase/tests/stage2_sandbox_behavior.sql`, local only, rolled back.
- **C-14:** `supabase/tests/sandbox_invariants.sql`, read-only, safe on production.
- **Concurrency:** `supabase/tests/stage2_concurrency.sh`, two sessions on a local database, because one transaction can't race itself. The order of events is enforced through `pg_stat_activity` and `pg_blocking_pids`, not timing. Four races: add vs add at the cap; reset vs reset at the cooldown; a visitor write uncommitted when a reset starts (the reset must wait, then remove it and restore the gate); and a reset holding the gate locks when a visitor writes (the write must land after it). Then the isolation checks: a reset at REPEATABLE READ and SERIALIZABLE is refused (check 5); each visitor function succeeds at READ COMMITTED and is refused at both higher levels with visitor data byte-identical (checks 6 and 7); and at each higher level, an add racing the 10th item and a change to Passed racing a reset are refused instead of breaking I12 or I8 (races 8 and 9). Race 1 also checks that both sides of the cap race ran at READ COMMITTED.
- **Production verification:** read-only (DR-025 item 5). Because all three sandbox functions refuse to run above READ COMMITTED (**Isolation** above), Stage 2 verification on live also includes a **read-only isolation check** that API calls will run at READ COMMITTED: `show default_transaction_isolation`, and the `default_transaction_isolation` entries, if any, in `pg_db_role_setting` for the database and for `anon`, `authenticated` and `authenticator`. Any value other than `read committed` blocks the release, because every sandbox call would then be refused. The check writes nothing and calls no sandbox function. **Not yet run:** production isolation is unverified.

### Status (17:11)

- M-4 to M-6 are in the repository as `20261002170823_sandbox_provenance.sql`, `20261002170824_sandbox_seed.sql` and `20261002170825_sandbox_rpcs.sql`. These are authored versions; production assigns the real ones (DR-024).
- Verified locally on fresh Postgres 17.10 (EVAL-069 to EVAL-074): catalog 17/17, C-14 7/7, Stage 1 behavior 24/24, B-4 29/29, integrity 6/6, concurrency 2/2, fingerprint baseline reproducible.
- **Nothing is applied to live.** R-10 is met in the repository; A1 and A3 to A9 haven't started.
- **Update (2026-10-02, after EVAL-074):** a pre-commit review found two blocking issues, now fixed locally (EVAL-075, EVAL-076):
  - `sandbox_reset()` could leave a visitor row behind when a visitor write was uncommitted as the reset started. It now locks every sandbox gate before deleting, and refuses to run outside READ COMMITTED, where those locks wouldn't be enough. The concurrency script gained that race, its reverse and the isolation check, and fails against the earlier function.
  - The M-6 header and this section said every rule violation raises P0001. Constraint violations keep their own SQLSTATE; both texts now say so.
  - Re-verified on fresh builds: catalog 17/17 (check 15's `functions` value is now `04dd6a74f664cd7a92deb5d491a90e8f`), C-14 7/7, Stage 1 behavior 24/24, B-4 29/29, integrity 6/6, concurrency 4 races and check 5, `canonical_data` unchanged.
- **Update (2026-10-02, after EVAL-077):** the same isolation dependency held for the visitor functions. Above READ COMMITTED, `sandbox_add_evidence` could add an 11th item and `sandbox_set_gate_status` could pass a gate whose evidence a concurrent reset had deleted. Both now refuse REPEATABLE READ and SERIALIZABLE, as `sandbox_reset` does (see **Isolation** above; EVAL-077). Re-verified on fresh builds (EVAL-078): catalog 17/17 (check 15's `functions` value is now `849220530a3d4b56a35f4e154a6d19e6`), C-14 7/7, Stage 1 behavior 24/24, B-4 29/29, integrity 6/6, concurrency 9/9, `canonical_data` unchanged.
- **Update (2026-10-02, after EVAL-078):** A1 is in the repository and tested (EVAL-079). The two read pages use it today; the write and reset UI (A3 to A9) will call the same `userMessage`. Not deployed.
- **Update (2026-10-02, after EVAL-079):** A8 and A9 are in the repository, not yet committed (EVAL-080). A8: the read path selects `source_launch_id` for launches and `origin` for the overview's decisions. A9: `src/lib/database.types.ts` is regenerated from a disposable local database built from the migrations. Both are validated locally, without production contact. A3 to A7 aren't built.
- **Update (2026-10-02, after EVAL-080):** A8 and A9 are committed (`b423012`). The open A3 to A7 UI questions are settled in **UI contract resolutions** above; A3 to A7 aren't built.
- **Update (2026-10-02, after EVAL-081):** A3 and the refresh infrastructure are in the repository, not yet committed (EVAL-081). A4 to A7 aren't built.
- **Update (2026-10-02, after EVAL-081, commit):** A3 and the refresh infrastructure are committed (`053aaf8`), validated in EVAL-081. A4 to A7 aren't built.
- **Update (2026-10-02, after EVAL-082):** A6's rendering rule is implemented as `sourceView` in `src/lib/source.ts` and tested (EVAL-082). No page renders `source` yet; the gate sheet will use it. A4, A5 and A7 aren't built.
