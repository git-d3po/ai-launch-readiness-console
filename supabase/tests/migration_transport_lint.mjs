// Migration transport lint: a local, deterministic check of the bytes of every
// file in supabase/migrations/ (EVAL-088; reconciliation record, section 20).
//
//   node supabase/tests/migration_transport_lint.mjs
//
// Exits 0 when every file passes, 1 otherwise. Reads files only.
//
// Why: on 2026-10-03 the tool transport between the session and the database
// decoded four escape texts in M-4 into the invisible bidi characters they name,
// so production stored a statement that differs from the reviewed file. A
// migration is safest to send when its bytes give a transport nothing to
// reinterpret.
//
// Rules, per file:
//   R1  The file is valid UTF-8 and ends with a newline.
//   R2  No control, format, surrogate, private-use or unassigned character
//       (Unicode category C) and no separator other than the ASCII space
//       (category Z), except LF. This covers the bidi controls, zero-width
//       characters, the BOM, tab, CR and the no-break space. Never allowlisted.
//   R3  Every other non-ASCII code point appears exactly as many times as the
//       file's allowlist says (0 when the file has no entry).
//   R4  Escape text of the form backslash-u plus 4 hex digits, or backslash-U
//       plus 8, appears exactly as many times as allowlisted (default 0).
//   R5  Backslashes appear exactly as many times as allowlisted (default 0).
//   R6  Every allowlist entry names an existing file and gives a reason.
//   R7  File names are VERSION_name.sql with a 14-digit version, all distinct.
//
// What it proves: each file's bytes are exactly as the policy allows, so a new
// migration can't carry invisible characters, escape text or backslashes
// unnoticed. What it doesn't prove: that a given transport delivers those
// bytes unchanged. Phase 1's U+2192, Stage 1's backslash and M-4's 64 escape
// texts all passed this lint; production stored the first two unchanged and
// decoded 24 of the escape texts. The hard gate stays C-11, read right after
// each apply_migration: the stored statement's md5 must equal the file's.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

// Exact exceptions. Any file not listed allows nothing beyond printable ASCII
// and LF, with no backslash. nonAscii maps a code point to its exact count.
export const POLICY = {
  '20261002092043_phase1_schema.sql': {
    nonAscii: { 0x2192: 1 },
    reason: 'Applied 2026-10-02. One U+2192 in a comment; production stored it unchanged (EVAL-022, EVAL-068).',
  },
  '20261002160901_stage1_security_hardening.sql': {
    backslashes: 1,
    reason: 'Applied 2026-10-02. One backslash in the https rule; production stored it unchanged (EVAL-068).',
  },
  '20261003183331_sandbox_provenance.sql': {
    backslashes: 64,
    unicodeEscapes: 64,
    reason: 'M-4, applied 2026-10-03 and never to be sent again. The transport decoded 24 of these escape texts; '
      + 'the stored statement is preserved exactly in docs/evaluation/artifacts/2026-10-03-m4-transport-incident/ (EVAL-088).',
  },
  '20261003195043_sandbox_seed.sql': {
    nonAscii: { 0x2192: 1 },
    reason: "M-5. One reviewed U+2192 in set_gate_status's decision text, kept by owner decision (2026-10-03).",
  },
};

const BACKSLASH = 0x5c;
const ESCAPE_TEXT = /\\(?:u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/g;
const NEVER_ALLOWED = /[\p{C}\p{Z}]/u;
const NAME = /^(\d{14})_[a-z0-9_]+\.sql$/;

const hex = (cp) => 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');

// Returns the problems found in one file's bytes; an empty list means it passes.
export function lintFile(name, bytes, allow = {}) {
  const problems = [];
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return [`R1 ${name}: not valid UTF-8`];
  }
  if (!text.endsWith('\n')) problems.push(`R1 ${name}: does not end with a newline`);

  const nonAscii = new Map();
  let line = 1;
  let column = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    column += 1;
    if (ch === '\n') {
      line += 1;
      column = 0;
      continue;
    }
    if (ch !== ' ' && NEVER_ALLOWED.test(ch)) {
      problems.push(`R2 ${name}:${line}:${column}: ${hex(cp)} is a control, format or separator character`);
    } else if (cp > 0x7e) {
      nonAscii.set(cp, (nonAscii.get(cp) ?? 0) + 1);
    }
  }

  const allowed = allow.nonAscii ?? {};
  for (const cp of new Set([...nonAscii.keys(), ...Object.keys(allowed).map(Number)])) {
    const found = nonAscii.get(cp) ?? 0;
    const want = allowed[cp] ?? 0;
    if (found !== want) problems.push(`R3 ${name}: ${hex(cp)} appears ${found} time(s); allowed exactly ${want}`);
  }

  const escapes = (text.match(ESCAPE_TEXT) ?? []).length;
  if (escapes !== (allow.unicodeEscapes ?? 0)) {
    problems.push(`R4 ${name}: ${escapes} unicode escape text(s); allowed exactly ${allow.unicodeEscapes ?? 0}`);
  }

  const backslashes = bytes.reduce((n, b) => n + (b === BACKSLASH ? 1 : 0), 0);
  if (backslashes !== (allow.backslashes ?? 0)) {
    problems.push(`R5 ${name}: ${backslashes} backslash(es); allowed exactly ${allow.backslashes ?? 0}`);
  }
  return problems;
}

// Lints a whole migrations directory against a policy.
export function lintMigrations(dir = MIGRATIONS_DIR, policy = POLICY) {
  const names = readdirSync(dir).filter((n) => n.endsWith('.sql')).sort();
  const problems = [];
  const versions = new Set();
  for (const name of names) {
    const m = NAME.exec(name);
    if (!m) problems.push(`R7 ${name}: name is not VERSION_name.sql with a 14-digit version`);
    else if (versions.has(m[1])) problems.push(`R7 ${name}: version ${m[1]} is used twice`);
    else versions.add(m[1]);
    problems.push(...lintFile(name, readFileSync(join(dir, name)), policy[name]));
  }
  for (const [name, entry] of Object.entries(policy)) {
    if (!names.includes(name)) problems.push(`R6 ${name}: allowlisted, but no such migration`);
    if (!entry.reason) problems.push(`R6 ${name}: allowlist entry has no reason`);
  }
  return { files: names, problems };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { files, problems } = lintMigrations();
  for (const name of files) {
    const own = problems.filter((p) => p.includes(` ${name}`));
    const entry = POLICY[name];
    const allowed = entry
      ? [
          ...Object.entries(entry.nonAscii ?? {}).map(([cp, n]) => `${hex(Number(cp))} x${n}`),
          ...(entry.unicodeEscapes ? [`unicode escape text x${entry.unicodeEscapes}`] : []),
          ...(entry.backslashes ? [`backslash x${entry.backslashes}`] : []),
        ].join(', ')
      : '';
    console.log(`${own.length ? 'FAIL' : 'PASS'}  ${name}${allowed ? `  (allowlisted: ${allowed})` : ''}`);
  }
  for (const p of problems) console.log(`  ${p}`);
  console.log(problems.length ? `FAIL: ${problems.length} problem(s)` : `PASS: ${files.length} migrations`);
  process.exit(problems.length ? 1 : 0);
}
