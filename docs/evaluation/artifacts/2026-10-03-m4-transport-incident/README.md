# M-4 transport incident: the statement production stored

Evidence for [EVAL-088](../../EVALUATION_LOG.md#eval-088-stage-2-production-window-stopped-after-m-4-on-a-parity-mismatch): the exact SQL production recorded for M-4, version `20261003183331` `sandbox_provenance`, and how it differs from the reviewed file. Preserved so that C-11 for that version can be checked exactly, without committing the raw characters (reconciliation record, §8 I20 and §10 C-11).

## Files

| File | What it is |
|---|---|
| `m4_stored_statement.b64` | The stored statement as production returned it: `encode(convert_to(array_to_string(statements, ''), 'UTF8'), 'base64')`, read on 2026-10-03 at 18:33:54 UTC, with Postgres's line breaks every 76 characters. Unchanged since it was read |
| `substitutions.tsv` | Every difference from the reviewed file: line, column (1-based, in the reviewed file), the reviewed escape text, and the code point production stored instead. 24 rows |
| `verify.mjs` | Checks all of the below locally and exits 1 on any failure. Contacts nothing |

## Values

| | Reviewed file | Stored on production |
|---|---|---|
| Path or version | `supabase/migrations/20261003183331_sandbox_provenance.sql` | `20261003183331` `sandbox_provenance` |
| md5 | `23dd3270cdca77001fe2f9a86917d518` | `4b09ad34a82823aacf22d4afa63bad53` |
| Length | 3739 bytes, 3739 characters (ASCII) | 3667 bytes, 3619 characters |
| Statements | One file | One statement (`array_length(statements, 1)` = 1) |

## The difference

On lines 42, 44, 48, 50, 52 and 56, the six I14 text-rule constraints, each of the escape texts `\u202A`, `\u202E`, `\u2066` and `\u2069` was stored as the single character it names: U+202A (left-to-right embedding), U+202E (right-to-left override), U+2066 (left-to-right isolate) and U+2069 (pop directional isolate). That is 4 substitutions on each of the 6 lines, 24 in all, each replacing 6 characters with 1: 120 characters fewer. Each stored character is 3 bytes in UTF-8, so the stored statement is 72 bytes shorter. Nothing else differs, including the `\u0001` to `\u009F` escapes on the same lines.

The substitutions are invisible in most editors, which is why this directory holds them only as base64 and as code point names: no file here contains a raw bidi character. Decode the statement to a path outside the repository, as below.

## Verify

```sh
node docs/evaluation/artifacts/2026-10-03-m4-transport-incident/verify.mjs
```

It checks the reviewed file's md5 and length; the decoded statement's md5, characters and bytes; that decoding exactly those four escape texts in the reviewed file reproduces the stored statement byte for byte; and that `substitutions.tsv` lists exactly those 24 replacements.

`--write-stored <path>` also writes the decoded statement to `<path>`, after the checks pass, for a local replay of production's state. It contains raw bidi characters, so `<path>` belongs outside the repository.

## What this does and doesn't establish

- **Does:** the exact text production recorded for `20261003183331`, and that it differs from the reviewed file only in these 24 substitutions.
- **Doesn't:** why the transport decoded these four escape texts and not the others. The repository file is the reviewed text and stays unchanged. The corrective migration, `20261003194751_sandbox_text_rules_reencode.sql` since it was applied (authored as `20261003190145`), restored the reviewed constraint text in production's catalog (EVAL-091).
