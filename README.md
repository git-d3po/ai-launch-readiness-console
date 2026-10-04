# AI Launch Readiness Console

A launch-readiness operations product for AI systems: it records whether an AI feature is ready to move to its next rollout stage, and why. Gates, evidence, risks, rollout stages and decisions sit in one view, and readiness is computed from them instead of being typed in. Built to demonstrate AI product operations and launch governance: evidence-based readiness, staged rollout, security by design in the database, and a release process where every claim is tied to recorded evidence.

**Live demo:** [AI Launch Readiness Console on Railway](https://ai-launch-readiness-console-production.up.railway.app)

All data is synthetic: no real customers, systems or launches. The canonical launch is read-only for everyone. Visitors try the workflow in **one shared sandbox**, so changes made there are visible to other visitors until someone resets it. No visitor can change the canonical launch.

**Start here** (five entry points instead of the full record):

1. **Trust model:** [DR-013](DECISIONS.md#dr-013-trust-model-c-a-read-only-canonical-launch-plus-a-disposable-shared-sandbox-d1) and [DR-014](DECISIONS.md#dr-014-reset-applies-only-to-the-sandbox-with-a-5-minute-cooldown-d2): why a read-only canonical launch plus one shared sandbox, the options rejected, and the risk accepted.
2. **Sandbox write functions:** [the migration](supabase/migrations/20261003195305_sandbox_rpcs.sql) and [its specification](docs/security/2026-10-02-audit-2b-reconcile.md#19-stage-2-specification-dr-025-2026-10-02): how every visitor write is constrained in Postgres.
3. **Migration integrity:** [the M-4 transport incident](docs/evaluation/artifacts/2026-10-03-m4-transport-incident/README.md) and [DR-026](DECISIONS.md#dr-026-the-m-4-transport-incident-an-exact-deviation-record-a-transport-safe-corrective-migration-and-a-migration-transport-lint): a production migration stored differently from the reviewed file, caught, recorded exactly and corrected.
4. **Production server and CSP:** [DR-027](DECISIONS.md#dr-027-stage-4-hosting-a-dependency-free-node-server-for-dist-on-railway-with-the-r-12-headers-and-a-report-only-csp) and [EVAL-095](docs/evaluation/EVALUATION_LOG.md#eval-095-csp-enforced-on-production): the headers, and how the policy moved from report-only to enforced.
5. **Release evidence:** [the release gates](docs/security/2026-10-02-audit-2b-reconcile.md#11-release-gates) and [EVAL-094, the hosted smoke test](docs/evaluation/EVALUATION_LOG.md#eval-094-stage-5-hosted-smoke-test): what had to be true before release, and the evidence for each gate.

## What the product models

The demo holds one launch: **Halcyon Support Copilot**, a fictional AI support assistant for Halcyon, the fictional company in [AI Support Operations Copilot](https://github.com/git-d3po/ai-support-operations-copilot). The console is not a chatbot and runs no model. It is the operational and governance layer around one: the record a team uses to decide whether an AI system may move to its next rollout stage.

- **Rollout stages.** A launch moves through Shadow, Assist and Partial automation. Each stage has entry and exit criteria and a status (Not started, Active, Completed); the current stage is the Active one, else the next not started.
- **Gates.** Readiness is a set of gates, each with a category, pass criteria, an owner, a required flag and a status (Not started, In progress, Passed, Failed, Waived). The demo launch has 16 required gates across nine categories: Evaluation, Safety & Escalation, Human-in-the-Loop, Data & Privacy, Reliability & Operations, Monitoring, Rollback, Enablement & Training, and Stakeholder Sign-off.
- **Evidence.** Each gate collects evidence: an evaluation result, test, document, sign-off or observation, with a summary and an optional https source.
- **Decisions.** Every status change writes a decision with its rationale, who decided, and the from and to status. A gate can't be Passed without at least one evidence item, and can't be Waived without a written waiver rationale. The database enforces both.
- **Risks.** Each risk has a likelihood, impact, owner, mitigation and status; the overview surfaces open high-impact risks.
- **Readiness.** A launch is Ready only when every required gate is Passed with evidence or Waived; every other required gate is a blocker. Readiness is computed from those rows each time, never stored, so there is no score anyone can edit.

## Canonical launch and shared sandbox

| | **Canonical launch** | **Shared sandbox** |
|---|---|---|
| Purpose | The source-of-truth launch record | A disposable public copy for trying the workflow |
| Public access | Read-only | Read, plus writes through three database functions |
| Evidence | Seed evidence only | Seed evidence plus visitor evidence, labeled "Visitor" |
| Gate status changes | Not possible for visitors | Allowed through `sandbox_set_gate_status`, with the same rules as everywhere |
| Decisions | Seed decisions | Seed decisions plus each visitor status change, decided by "Sandbox visitor" |
| Reset | Never by a visitor; only the owner reseeds it | "Reset sandbox" deletes visitor rows and restores gate statuses from the canonical gates, at most once every 5 minutes |
| Provenance | Every row's `origin` is `seed` | Visitor rows get `origin = 'visitor'`, set by the database |
| Database writes | None from the browser | Only `sandbox_add_evidence`, `sandbox_set_gate_status` and `sandbox_reset` |

The two are separate launch rows. The sandbox launch, and each of its gates, points back at its canonical counterpart, so a reset knows exactly what to restore and the canonical rows are never the target of a visitor write.

**Why this model.** The original plan let anyone edit the launch, which meant any anonymous caller could make it read Ready and plant fake approvers. Making everything read-only would be truthful but would remove the interaction that makes the demo worth opening. A read-only canonical launch plus one shared, disposable sandbox is the option that is both truthful and interactive ([DR-013](DECISIONS.md#dr-013-trust-model-c-a-read-only-canonical-launch-plus-a-disposable-shared-sandbox-d1)).

**Why not per-visitor sandboxes or sign-in.** Per-visitor sandboxes need an identity for each visitor (anonymous sign-ins, CAPTCHA, cleanup of abandoned users). Adding Supabase Auth only to look production-like would add configuration and a new abuse surface without changing what the public can do. A client-only sandbox was rejected too: it would demonstrate browser logic, not database enforcement.

**Accepted risk.** The sandbox is anonymous and shared. A visitor can use up its caps or leave unwanted text in it until the next reset. This is a demo tradeoff, not tenant isolation. The upgrade path is per-visitor sandboxes through anonymous sign-ins.

**How the boundary is enforced.** In Postgres, not in the UI: browser roles hold SELECT only on every table, and the three functions refuse any gate that isn't on a sandbox launch. The reset touches only sandbox rows ([DR-014](DECISIONS.md#dr-014-reset-applies-only-to-the-sandbox-with-a-5-minute-cooldown-d2)). A canonical-data fingerprint proves it on every check: sandbox writes, status changes and resets must leave it unchanged.

## Try the demo

- Open the launch list: the canonical launch and its sandbox, with a Sandbox badge, readiness and blocker counts.
- Open the canonical launch: gates, blockers, open high-impact risks, rollout stages and latest decisions, all read-only.
- Follow "Try this in the sandbox" to the sandbox copy.
- Open a sandbox gate to add evidence, or change its status with a rationale (a waiver needs its own rationale). Your records are labeled "Visitor".
- Watch the blocker count and readiness change. After each write the page refetches from the database; nothing is shown optimistically.
- Use "Reset sandbox" in the header to return the sandbox to its seeded state. A second reset within 5 minutes is refused with the time remaining.

Every page footer carries the notice: "Synthetic portfolio data. No real customers or systems."

## Data model

Six tables, one view and one private table, all in Postgres:

- **Launches:** name, description, owner and target date. A sandbox launch points at its canonical launch through `source_launch_id`; a canonical launch has none.
- **Gates:** belong to a launch; category, title, pass criteria, owner, required flag, status and waiver rationale. A sandbox gate points at its canonical gate through `source_gate_id`.
- **Evidence:** belongs to a gate; type, title, summary, optional https source, date and `origin` (`seed` or `visitor`). The date and origin are set by the database, never by the caller.
- **Decisions:** the audit trail. A `status_change` decision records the gate, the from and to status, the rationale, who decided and the `origin`; `manual` decisions record other choices. A decision that names a gate must name a gate of its own launch.
- **Risks:** belong to a launch and optionally to one of its gates; likelihood, impact, owner, mitigation and status.
- **Rollout stages:** belong to a launch; stage, entry and exit criteria, status. The `launch_current_stage` view picks the current one.
- **Sandbox state:** one private row holding the time of the last reset, for the cooldown. Row-level security is on and no browser role can read it.

Readiness and blocker counts are not columns. The app computes them from gates and evidence (`src/domain/readiness.ts`), with the same Passed-needs-evidence rule the database enforces. Every text field has a length limit; the fields a visitor can write (evidence title and summary, decision text, rationales) also reject control and bidirectional-override characters, and evidence sources must be https URLs.

## Sandbox write path

```
Visitor action in the gate sheet or header
  -> React UI (src/pages, src/components)
  -> data layer (src/lib) calling supabase-js with the publishable key
  -> one of three SECURITY DEFINER functions over the Supabase API:
       sandbox_add_evidence(gate_id, type, title, summary, source)
       sandbox_set_gate_status(gate_id, new_status, rationale, waiver_rationale)
       sandbox_reset()
  -> Postgres checks every rule and writes sandbox rows only
  -> the UI refetches the launch from the database
```

**What the browser cannot do:** insert, update or delete any table row directly; call any other privileged function; hold a service-role key or database password (there is none in the bundle); write to the canonical launch; set a row's origin, date or decider.

**Why this design.** The database is the trust boundary. Anyone can call the public API without the UI, so a rule that lives only in React is a suggestion. Every rule a visitor is subject to is checked inside these functions or by a table constraint.

**What the functions enforce,** from the migration and its tests:

- **Sandbox only:** each function refuses a gate that isn't on a sandbox launch.
- **Provenance:** the database sets `origin = 'visitor'`, the evidence date and the decider ("Sandbox visitor"); the functions take no argument for them.
- **The gate rules, unchanged:** a status change goes through the same internal function as every other, so Passed needs evidence, Waived needs a waiver rationale, a rationale is always required, and every change writes a decision.
- **Text and source rules:** table constraints enforce length limits, reject control and bidirectional-override characters in visitor-written text, and limit evidence sources to https URLs.
- **Per-gate caps:** at most 10 visitor evidence items and 20 visitor decisions per sandbox gate, until a reset.
- **Reset cooldown:** one reset every 5 minutes for everyone; a call inside the cooldown is refused with the remaining time.
- **Concurrency:** each write locks its gate, so two visitors can't both add the 10th item, and a reset waits for in-flight writes so no visitor row survives it. The functions refuse to run at isolation levels where those locks wouldn't protect them.
- **Fixed definitions:** SECURITY DEFINER with an empty search path, no dynamic SQL and fully qualified names.

Messages for rules a function checks itself are shown to the visitor as written; any other database error is shown generically with its code.

## Security model

This is a **demonstration project** with **synthetic data only**.

**Public visitors**

- The canonical launch is read-only: browser roles have no table write privilege, and the write functions refuse canonical gates.
- The whole public write surface is the three sandbox functions. Supabase's security advisor flags exactly those three as publicly executable, as intended.
- The browser holds only the publishable key, which is meant to be public. No service-role key, secret key, database password or connection string is configured anywhere the browser can reach.
- Visitor-supplied evidence sources are shown as plain text, never as links. Only seed sources with an https address are links.
- There are no accounts and no personal data.

**HTTP and browser**

Every response from the production server carries:

- `Content-Security-Policy` (enforced): `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src <the project's Supabase origin>; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'`. The app has no inline script or style, so the policy needs no exceptions.
- `Strict-Transport-Security: max-age=31536000`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

**The shared-sandbox tradeoff**

- The sandbox is anonymous and shared. A visitor can fill its caps or leave unwanted text until someone resets it; there is no moderation.
- The caps bound how much a visitor can store; request rate is left to the platform. Load and rate-limit behavior was not tested at production scale.
- Isolating visitors from each other would need a different identity and session design (see [Canonical launch and shared sandbox](#canonical-launch-and-shared-sandbox)).

**If you deploy your own copy**

- Put only the project URL and publishable key in `VITE_` variables: every `VITE_` value ends up in the public bundle.
- Never put a service-role key, database password or other secret in the repository, a `VITE_` variable or a committed `.env` file.
- Keep the data synthetic, or review authentication, authorization, rate limiting and data retention before storing anything real.

## Local development

```sh
npm install
cp .env.example .env.local   # then fill in the two values below
npm run dev                  # Vite dev server
```

The app needs a Supabase-compatible API in front of a database built from all eight migrations in `supabase/migrations/`, applied in file-name order. This repository doesn't script a local Supabase stack. Without the two variables, pages show a "not configured" message instead of failing.

**Environment variables.** Only browser-safe values, read at build time by Vite:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | The Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The project's publishable (anon) key |

`.env*` files are git-ignored except `.env.example`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm test` | The 134 Vitest tests: app logic, the production server, and the migration lint's own tests. No database or network needed |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Typecheck, then a production build into `dist/` (`index.html`, one script, one stylesheet); needs both `VITE_` variables |
| `npm run preview` | Vite's preview server for `dist/`, for local checks only |
| `npm start` | The production server, `node server/static-server.mjs`: serves `dist/` with the security headers; needs `VITE_SUPABASE_URL`, and `PORT` (default 3000) |

Other checks, run directly:

| Command | What it does |
|---|---|
| `node supabase/tests/migration_transport_lint.mjs` | Checks every migration for characters and escape text a transport could alter |
| `node docs/evaluation/artifacts/2026-10-03-m4-transport-incident/verify.mjs` | Verifies the preserved record of the M-4 incident against the reviewed migration |
| `psql -f supabase/tests/<file>.sql` | The database tests below, against a disposable local database built with `local_roles.sql` and the migrations. The behavior tests refuse to run on a Supabase project |

There is no lint script and no CI: the checks above run locally.

## Production deployment

```
Browser
  -> Railway: node server/static-server.mjs, serving the built app from dist/
  -> Supabase API (the publishable key; row-level security and grants)
  -> Postgres 17: canonical launch, sandbox and the three functions
```

**Railway** runs one service from `main` ([`railway.json`](railway.json)): Railpack builds with `npm run build` on Node 22 (pinned in `package.json`), then starts `npm start`, with a healthcheck on `/` and a restart on failure. The server ([`server/static-server.mjs`](server/static-server.mjs), no dependencies):

- serves `dist/`, caching the content-hashed files under `/assets/` for a year and revalidating everything else;
- returns `index.html` for application routes, so deep links like `/launches/2/gates/30` load;
- returns a real 404 for a missing file with an extension, so a broken asset never comes back as HTML;
- refuses dot segments (raw or encoded), NUL bytes and methods other than GET and HEAD;
- sends the security headers above on every response, with `connect-src` taken from `VITE_SUPABASE_URL` at start-up; it refuses to start without an https URL there;
- listens on `0.0.0.0` and the `PORT` Railway assigns.

**Supabase** provides Postgres 17 and the API in front of it. Row-level security and grants make every table read-only to browser roles; the three sandbox functions are the only write path. Database changes are applied as reviewed migrations through a runbook, with read-only checks after each, never from the browser.

**Configuration.** The Railway service has exactly two variables, `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, both public by design: Vite inlines them into the bundle. The browser needs no secret, and none is configured.

**Deploying.** The Railway service doesn't deploy on every push to `main`. A code change is deployed by an explicit step on the service; documentation-only commits need no deployment. The demo runs on Railway's generated domain.

## Testing strategy

Each layer checks something the others can't. Commands are in [Scripts](#scripts).

### Application and server tests (Vitest, 134 tests in 11 files)

- **Readiness rules** (`src/domain`): Ready only when every required gate is Passed with evidence or Waived; Passed without evidence never counts.
- **Data layer** (`src/lib`): launch list and overview loading, the gate sheet's form validation and the exact function calls it makes, visitor provenance labels, safe source rendering (a visitor source is never a link), error messages, refresh behavior that keeps the last good data on failure, and the reset flow.
- **Production server** (18 tests): the single-page-app fallback for application routes, cache headers, real 404s for missing assets, refused traversal and NUL paths, HEAD and refused methods, and every security header on every response, including that the CSP is enforced and never report-only.
- **Migration lint** (36 tests): every migration passes its policy, and the lint catches the exact text the M-4 incident produced.

### Database behavior tests

Run against disposable local Postgres 17 databases built from the migrations, never against production:

- **Sandbox behavior** (29 checks): the sandbox is a complete copy; each browser role can add evidence and change status on sandbox gates and is refused on canonical ones; the gate rules hold through the sandbox; the caps; text and https rules; no caller can set origin, identity or date; the canonical launch stays byte-identical; reset, its cooldown and its idempotence.
- **Concurrency** (four races plus isolation checks): two writers racing for the last evidence slot, two resets, a write in flight during a reset, and a write queued behind one. The order of events is forced with locks, not left to timing.
- **Earlier security behavior and integrity checks** for the read-only canonical launch and the original gate rules.

### Catalog and migration verification

Read-only, so safe on production:

- **Security catalog test** (17 checks): row-level security on every table; browser roles hold SELECT only, with no write, sequence or schema-create privilege; EXECUTE on exactly the three sandbox functions; pinned search paths and no dynamic SQL in privileged functions; ownership and default privileges.
- **Sandbox invariants** (7 checks) over the data itself.
- **Fingerprint:** 12 hashes of the schema and the canonical data. Production matched a fresh database built from this repository.
- **Migration parity:** production's recorded migrations match the repository's files in order, with one recorded exception (see [Migration integrity](#migration-integrity)).
- **Transport lint and artifact verifier**, described above.

### Hosted production validation

A smoke test on the live site: the canonical launch read-only, one sandbox evidence item and one status change (each verified in the database), persistence across reload and deep link, a reset, and a second reset refused by the cooldown. The canonical fingerprint was unchanged before and after, and the sandbox was left at its seed state ([EVAL-094](docs/evaluation/EVALUATION_LOG.md#eval-094-stage-5-hosted-smoke-test)).

### CSP validation

The CSP shipped report-only first. It ran clean on production through the reads, both sandbox writes, the reset and the refused reset. Only then was it switched to enforced, with no change to its directives. Locally, a headless browser confirmed zero violations, and a negative control (a server with the wrong Supabase origin) confirmed the check does catch violations. On production, the enforced header and a clean console were confirmed in a browser ([EVAL-095](docs/evaluation/EVALUATION_LOG.md#eval-095-csp-enforced-on-production)).

## Release evidence

The console's own subject is evidence-based readiness, and it was released the same way:

- **Explicit release gates.** [Thirteen gates](docs/security/2026-10-02-audit-2b-reconcile.md#11-release-gates) defined what had to be true before release: production security hardening, migration parity, advisor results, secret scans, the hosted smoke test, the production headers and the CSP. Each is closed with a reference to its evidence, or recorded as qualified or retired with the reason.
- **An evaluation log.** [`EVALUATION_LOG.md`](docs/evaluation/EVALUATION_LOG.md) records every check that was run (EVAL-001 onward): what was checked, against what, the result, and whether it can be reproduced from the repository. A "Not run" section lists what was never checked, so it isn't claimed.
- **Local and production evidence kept apart.** Behavior tests ran on disposable databases; production saw only read-only checks (catalog, fingerprint, parity, invariants), plus the authorized smoke test, which wrote sandbox rows only.
- **Provenance on hosted evidence.** Each hosted result is marked by source: `[local]` run in the development environment, `[db]` read from the database, `[Railway]` from Railway's deployment records, and `[owner]` observed in the owner's browser. Some hosted checks were observed rather than automated, and the log says which.
- **Decisions recorded.** [`DECISIONS.md`](DECISIONS.md) holds every engineering decision (DR-001 onward) with the options considered and the tradeoff accepted.

## Migration integrity

During a production deployment, the tool path between the development session and the database decoded 24 escape sequences in one reviewed migration (M-4) into the invisible bidirectional characters they named. The constraints still behaved as reviewed, but production's stored migration no longer matched the reviewed file byte for byte. The migration-parity check caught it, and the deployment stopped before the next migration.

What followed:

- the exact statement production stored was preserved as an artifact (base64, with its md5 and every substitution listed) with a local verifier, without committing invisible characters;
- a corrective migration, written so a transport has nothing to alter, restored the reviewed constraint text;
- a migration transport lint now rejects such characters and escape text in any migration unless an exact, documented allowance exists;
- the parity check became a committed script, and production then converged on the reviewed schema, verified by fingerprint.

The point is that a subtle deployment-integrity drift was detected and corrected rather than silently accepted. Details: [DR-026](DECISIONS.md#dr-026-the-m-4-transport-incident-an-exact-deviation-record-a-transport-safe-corrective-migration-and-a-migration-transport-lint) and [the artifact record](docs/evaluation/artifacts/2026-10-03-m4-transport-incident/README.md).

## Status

- **Released:** the production database (eight migrations) and the frontend are deployed and verified, and no release gate is open ([EVAL-095](docs/evaluation/EVALUATION_LOG.md#eval-095-csp-enforced-on-production)).
- `main` is the release branch.

## What's deliberately not built

**Product scope**

- Dedicated Risk register and Decision log screens. The overview shows open high-impact risks and the latest decisions; the full screens aren't part of this release.
- Editing canonical launches, risks or rollout stages from the app. Canonical data changes only through reviewed migrations.

**Demo limitations**

- Sign-in, per-visitor sandboxes and multi-tenant isolation. The shared, anonymous sandbox is the accepted tradeoff above.
- Moderation of sandbox text, beyond the caps, text rules and reset.
- Load or rate-limit testing at production scale.
- CI: tests and checks run locally, and no workflow runs on push.

**Cosmetic backlog**

- A favicon. Browsers log a 404 for `/favicon.ico`; it has no other effect.
- A custom domain. The demo runs on Railway's generated domain.

## Stack

React 19, React Router, TypeScript, Vite, Tailwind CSS 4, and `@supabase/supabase-js` against a Supabase (Postgres 17) project. Tests use Vitest. Node.js 22 in development and on Railway.

## Documentation

- [`DECISIONS.md`](DECISIONS.md): every engineering decision (DR-001 onward), authoritative over the original plan.
- [`docs/security/`](docs/security/): the security reconciliation (invariants, release gates, the deployment runbook in [§20](docs/security/2026-10-02-audit-2b-reconcile.md#20-stage-2-deployment-runbook-deployment-preparation-2026-10-02-after-eval-086)) and one record per finding.
- [`docs/evaluation/`](docs/evaluation/): every check that was run, and the regression scenarios.
- [`PROJECT_BRIEF.md`](PROJECT_BRIEF.md): the original product brief, kept as history; `DECISIONS.md` supersedes it where they differ.
