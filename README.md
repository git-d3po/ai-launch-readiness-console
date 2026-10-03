# AI Launch Readiness Console

A portfolio project: evidence-based launch gates for an AI feature. A launch passes through gates (evaluation, safety, human-in-the-loop, rollback and others); a gate can be Passed only with evidence, every status change records a decision, and readiness is computed from those rows, never stored. All data is synthetic.

Postgres is the trust boundary. Visitors read a canonical launch they can't change, and can try the workflow on a shared sandbox copy through three database functions that enforce every rule: provenance, caps, a reset cooldown and text and URL checks. The browser holds only the publishable key.

## Status

- **Stage 2 is implemented in this repository:** the sandbox database migrations M-4 to M-6 and the UI (gate sheet, sandbox forms, "Visitor" labels, safe source links, the global sandbox reset, an About page). It is verified locally against disposable databases. `main` is the release branch; development happens on `claude/phase1-schema` and reaches `main` through reviewed pull requests.
- **Nothing is publicly hosted.**
- **The connected production database is at Stage 1 + M-4 only.** Stage 2 is incomplete: M-4 was applied on 2026-10-03, and the window stopped on a migration-parity mismatch before M-5 and M-6 (EVAL-088 in the [evaluation log](docs/evaluation/EVALUATION_LOG.md)). Frontend deployment is prohibited until Stage 2 is complete and verified.

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

The host is Railway, building `main`, on its generated `.up.railway.app` domain for the initial release. Nothing is deployed yet, and Railway must not deploy `main` before the production database is at Stage 2. The host must provide:

- static hosting of `dist/`;
- a single-page-app fallback: every application route (for example `/launches/2/gates/30`) rewritten to `/index.html`;
- HTTPS, with HSTS;
- the security headers and Content Security Policy in release gate R-12 of [`docs/security/2026-10-02-audit-2b-reconcile.md`](docs/security/2026-10-02-audit-2b-reconcile.md), first as a Report-Only CSP (R-13), with `connect-src` set to the project's own Supabase URL;
- the two variables above, supplied at build time.

## Database compatibility

The Stage 2 application code requires migrations M-4 to M-6. **Don't host it against the current production schema (Stage 1 + M-4 only):** its reads and writes would fail. Production database changes go only through the deployment runbook in [§20 of the reconciliation record](docs/security/2026-10-02-audit-2b-reconcile.md#20-stage-2-deployment-runbook-deployment-preparation-2026-10-02-after-eval-086), with the owner's explicit authorization, not through anything in this README.

## Documentation

- [`DECISIONS.md`](DECISIONS.md): every engineering decision (DR-001 onward), authoritative over the original plan.
- [`PROJECT_BRIEF.md`](PROJECT_BRIEF.md): the original product brief, kept as history.
- [`docs/security/`](docs/security/): the security reconciliation (invariants, release gates, the Stage 2 runbook) and one record per finding.
- [`docs/evaluation/`](docs/evaluation/): every check that was run, and the regression scenarios.
