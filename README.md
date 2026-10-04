# AI Launch Readiness Console

**Live demo:** https://web-production-7381e.up.railway.app

A portfolio project. All data is synthetic: there are no real customers or systems. The sandbox in the demo is shared, so changes you make there are visible to other visitors until someone resets it.

## What it is

AI Launch Readiness Console is a launch-readiness operations product for reviewing whether an AI system is ready to move through rollout stages. It brings a launch's gates (evaluation, safety, human-in-the-loop, rollback and others), their evidence, open risks, rollout state and decisions into one operational view, instead of treating readiness as an informal checklist.

A gate can be Passed only with evidence, every status change records a decision, and readiness is computed from those rows, never stored. These rules are enforced in the database, not only in the browser.

## Try the demo

- Browse the canonical launch: its gates, blockers, open high-impact risks, rollout stages and latest decisions. It is read-only.
- Follow "Try this in the sandbox" to the shared sandbox, a copy of the canonical launch.
- Open a sandbox gate to add evidence, or change its status with a rationale. Your records are labeled "Visitor".
- Watch the blocker count and readiness change as the database records your evidence and decisions.
- Use "Reset sandbox" in the header to return the sandbox to its seeded state, at most once every 5 minutes.

Dedicated Risk register and Decision log screens aren't part of this release; the overview shows open high-impact risks and the latest decisions.

## How it's built

- **Frontend:** React 19, TypeScript, Vite and Tailwind CSS 4. It talks to the database through `@supabase/supabase-js`, holding only the publishable key.
- **Server:** [`server/static-server.mjs`](server/static-server.mjs), a small dependency-free Node server for the built app: the single-page-app fallback, real 404s for missing files, and the security headers.
- **Hosting:** Railway, serving `main` on its generated domain.
- **Data and trust boundary:** Supabase Postgres 17. Row-level security and grants give browser roles read access only. The canonical launch and the sandbox are separate launches; each visitor row carries an `origin` that the database sets.
- **Writes:** three SECURITY DEFINER functions, `sandbox_add_evidence`, `sandbox_set_gate_status` and `sandbox_reset`. They act only on sandbox rows and enforce the rules: provenance, per-gate caps, text and https-source checks, and the reset cooldown.

## Security model

- Public visitors can't change canonical data: browser roles have no table write privilege, and the three functions refuse canonical gates.
- Visitor writes go only through those three functions. The browser holds no service-role key, database password or other secret.
- Visitor-supplied sources are shown as plain text, never as links.
- Production sends an enforced Content Security Policy (scripts, styles, images and fonts only from the site itself; connections only to the project's Supabase origin; no framing), plus HSTS, `nosniff`, `X-Frame-Options: DENY`, a referrer policy and a permissions policy.
- **Accepted tradeoff:** the sandbox is shared and anonymous, so a visitor can fill its caps or deface it until the next reset. Per-visitor sandboxes would need sign-in; see DR-013 below.

## How it was verified

- 134 automated tests (Vitest): readiness rules, the data layer, the production server's routing and headers, and the migration lint.
- Database behavior, invariant and concurrency tests against disposable local Postgres 17 databases; on production, only read-only checks: a security catalog test (17 checks), a schema and canonical-data fingerprint, and migration parity.
- A migration transport lint, added after a tool transport altered a migration's text on its way to production (see "Start here").
- A hosted smoke test on production: the canonical launch read-only, a sandbox evidence item and status change, a reset and the cooldown, with canonical data verified unchanged.
- The production CSP checked on the live site, first report-only and then enforced, with no violations.
- Explicit release gates, each closed with recorded evidence.

Some hosted checks were observed in the owner's browser rather than automated; the evaluation log marks which.

## Start here

For technical reviewers, five entry points instead of the full record:

1. [DR-013: the trust model](DECISIONS.md#dr-013-trust-model-c-a-read-only-canonical-launch-plus-a-disposable-shared-sandbox-d1) and [DR-014: the sandbox reset](DECISIONS.md#dr-014-reset-applies-only-to-the-sandbox-with-a-5-minute-cooldown-d2): why a read-only canonical launch plus one shared sandbox, the options rejected, and the residual risk accepted.
2. [The sandbox write functions](supabase/migrations/20261003195305_sandbox_rpcs.sql) and their [specification](docs/security/2026-10-02-audit-2b-reconcile.md#19-stage-2-specification-dr-025-2026-10-02): how every visitor write is constrained in Postgres.
3. [The M-4 transport incident](docs/evaluation/artifacts/2026-10-03-m4-transport-incident/README.md) and [DR-026](DECISIONS.md#dr-026-the-m-4-transport-incident-an-exact-deviation-record-a-transport-safe-corrective-migration-and-a-migration-transport-lint): a production migration stored differently from the reviewed file, how it was caught, recorded exactly and corrected.
4. [DR-027: the production server](DECISIONS.md#dr-027-stage-4-hosting-a-dependency-free-node-server-for-dist-on-railway-with-the-r-12-headers-and-a-report-only-csp) and [EVAL-095: the enforced CSP](docs/evaluation/EVALUATION_LOG.md#eval-095-csp-enforced-on-production): the headers, and how the policy moved from report-only to enforced.
5. [The release gates](docs/security/2026-10-02-audit-2b-reconcile.md#11-release-gates) and [EVAL-094: the hosted smoke test](docs/evaluation/EVALUATION_LOG.md#eval-094-stage-5-hosted-smoke-test): what had to be true before release, and the evidence for each gate.

## Status

- **Released:** the production database (eight migrations) and the frontend are deployed and verified, and none of the release gates is open (EVAL-095 in the [evaluation log](docs/evaluation/EVALUATION_LOG.md)).
- `main` is the release branch. Railway deployments are started explicitly from the service, not on every push.
- Known cosmetic gap: the app has no favicon, so browsers log a 404 for `/favicon.ico`.

## Stack

React 19, React Router, TypeScript, Vite, Tailwind CSS 4, and `@supabase/supabase-js` against a Supabase (Postgres 17) project. Tests use Vitest. Developed with Node.js 22.

## Local setup

```sh
npm install
cp .env.example .env.local   # then fill in the two values below
npm run dev                   # Vite dev server
```

Other scripts (from `package.json`):

| Command | What it does |
|---|---|
| `npm test` | Vitest unit tests |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Typecheck, then production build into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm start` | Production server for `dist/` (DR-027): SPA fallback, security headers; needs `VITE_SUPABASE_URL` and `PORT` |

`node supabase/tests/migration_transport_lint.mjs` checks every migration file for characters and escape text a transport could change (DR-026); `npm test` runs its unit tests.

The app needs a Supabase-compatible API in front of a database built from all eight migrations in `supabase/migrations/`, applied in file-name order. This repository doesn't script a local stack; without the variables below, pages show a "not configured" message.

## Environment variables

Only browser-safe values, read at build time by Vite:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | The Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The project's publishable (anon) key |

Never put a service-role key, a database password or any other secret in a `VITE_` variable, in `.env*` files that get committed, or anywhere in the repository. Every `VITE_` value ends up in the public bundle. `.env*` files are git-ignored except `.env.example`.

## Build

`npm run build` writes a static site to `dist/`: `index.html` plus one script and one stylesheet under `dist/assets/`. The two variables must be set in the build environment, because Vite inlines them.

## Hosting requirements

Production runs on Railway from `main`, on its generated `.up.railway.app` domain. The host must provide:

- static hosting of `dist/`;
- a single-page-app fallback: every application route (for example `/launches/2/gates/30`) rewritten to `/index.html`;
- HTTPS, with HSTS;
- the security headers and Content Security Policy in release gate R-12 of [`docs/security/2026-10-02-audit-2b-reconcile.md`](docs/security/2026-10-02-audit-2b-reconcile.md), first as a Report-Only CSP (R-13) and enforced since 2026-10-04 (EVAL-095), with `connect-src` set to the project's own Supabase URL;
- the two variables above, supplied at build time.

## Database compatibility

The application code requires all eight migrations, including the sandbox migrations M-4 to M-6; production has them (EVAL-091). Production database changes go only through the deployment runbook in [§20 of the reconciliation record](docs/security/2026-10-02-audit-2b-reconcile.md#20-stage-2-deployment-runbook-deployment-preparation-2026-10-02-after-eval-086), with the owner's explicit authorization, not through anything in this README.

## Documentation

- [`DECISIONS.md`](DECISIONS.md): every engineering decision (DR-001 onward), authoritative over the original plan.
- [`PROJECT_BRIEF.md`](PROJECT_BRIEF.md): the original product brief, kept as history.
- [`docs/security/`](docs/security/): the security reconciliation (invariants, release gates, the deployment runbook) and one record per finding.
- [`docs/evaluation/`](docs/evaluation/): every check that was run, and the regression scenarios.
