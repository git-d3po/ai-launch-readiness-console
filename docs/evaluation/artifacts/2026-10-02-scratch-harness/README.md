# Scratch harness, preserved as evidence (2026-10-02)

These files are the scripts that produced several results in
[`EVALUATION_LOG.md`](../../EVALUATION_LOG.md). They ran from a temporary session directory that is
deleted when the cloud container is reclaimed, so they are preserved here.

**This is not a test suite.** The scripts can't run from this repository as they are, no CI runs them,
and nothing here has been re-run since it was copied. They are kept so that each recorded result can
be traced to the exact code that produced it, and so the future committed suite can reuse their logic.

## Files

| File | Produced | Original md5 | Copy |
|---|---|---|---|
| `check.mjs` | EVAL-010 (app shell: routes, layout, footer, Reset disabled, tab order) | `e9cf4c354d8aec883931276ea53211d1` | Byte-identical |
| `e2e.mjs` | EVAL-011 (launches list: states, data-driven numbers) | `cf5cc05abac7a666c95092a125890e64` | Byte-identical |
| `visual.mjs` | EVAL-013 (tokens, contrast, type, motion) | `a47e4e3c7bf994a6c1222aa54bfcbe6d` | Byte-identical |
| `overview.mjs` | EVAL-014 (launch overview: sections, states, data-driven blockers) | `618b56ba6df865a63a320e8310052bcd` | Byte-identical |
| `proxy.mjs` | Used by EVAL-011, EVAL-013 and EVAL-014: serves local PostgREST under `/rest/v1` like Supabase | `c2820764831f167d12937ec3c8658880` | Byte-identical |
| `mutant.sql` | EVAL-003 (mutation test of integrity checks 1 to 4) | `14129bc4f716fa6c773a70bfeb1446eb` | A 12-line warning header was added; the lines after it are byte-identical (same md5) |

Each recorded run came after the file's last modification, so these are the versions that produced
the recorded results. The scratch-directory file times were matched against the session transcript to
establish this.

The sixth reusable artifact, the 12-part schema and seed fingerprint, didn't need any changes to be
reusable, so it lives with the other database tests as
[`supabase/tests/fingerprint.sql`](../../../../supabase/tests/fingerprint.sql). Only a documentation
header was added to it. Its query is byte-identical to the scratch version.

## Why these can't run as they are

- **Playwright location.** They load Playwright from a machine-specific global install
  (`createRequire('/opt/node22/lib/node_modules/')`). Playwright isn't a dependency of this project.
- **Database access.** `e2e.mjs`, `visual.mjs` and `overview.mjs` change a local database by shelling
  out to `su postgres -c "psql -d lrc_test"`. They insert evidence, call `set_gate_status`, waive
  gates, truncate tables, revoke and re-grant SELECT, and call `reset_demo_data()`. They are
  **destructive by design** and were only ever pointed at a disposable local database.
- **Fixed ports.** They expect fixed local servers:
  - PostgREST 14.18 on port 3000
  - `proxy.mjs` on 54321
  - a `vite preview` of a test build on 4173
  - a build with no Supabase configuration on 4174 (`e2e.mjs` only)
- **Runtime credential.** The test build had a throwaway local token baked in. A random signing
  secret was generated at run time, a token for the `anon` role was signed with it, and PostgREST was
  configured with the same secret. That token, the secret, and the PostgREST config file
  (`pgrst.conf`, which also held a local database connection string) were **not** committed.
- **Screenshots.** Output paths assume the scratch directory layout (`shots2/`, `shots3/`, `shots4/`).
- **`mutant.sql` is stale.** It targets the `set_gate_status` body from commit `03a4666`, before
  `9c65e6c` added `decisions.waiver_rationale`, and it alters the schema and grants. Never run it
  against a shared or hosted database.

## What was deliberately left out

| Scratch artifact | Reason |
|---|---|
| `local-anon.jwt`, `pgrst.conf` | Throwaway local signing material and a local connection string. Generate fresh at run time instead. |
| `pgrst.log`, `preview.log`, `prev1.log`, `prev2.log`, `proxy.log` | Process logs with no ongoing value |
| `shots/` to `shots4/` (screenshots) | Can be regenerated from the scripts; no ongoing test value |
| `postgrest`, `pg14/`, `*.tar.xz` | Downloaded third-party binaries (PostgREST releases), not project code |
| `dist-local/`, `dist-noconfig/`, `audit-dist/`, `recon-dist/` | Build outputs |
| `shot.mjs` | One-off screenshot used to confirm a status chip finished its fade (EVAL-013); no ongoing value |
| `r.bak` | Temporary backup of `src/domain/readiness.ts` used during the readiness mutation test (EVAL-004) |

## Turning this into a committed suite (not done)

This is the target for a later phase, listed here so the gap is explicit. A committed harness should:

1. Build an ephemeral database from `supabase/tests/local_roles.sql` plus the migrations, and never
   point at production (invariant I19).
2. Generate the signing secret and the anon token at run time, in a temporary directory.
3. Take the Playwright location, database command and ports from configuration, not from fixed paths.
4. Run the end-to-end client tests listed in section 8 of
   [`docs/security/2026-10-02-audit-2b-reconcile.md`](../../../security/2026-10-02-audit-2b-reconcile.md).
