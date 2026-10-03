// Verifies the M-4 transport incident artifact (EVAL-088). Local only: reads
// files in this repository and contacts nothing.
//
//   node docs/evaluation/artifacts/2026-10-03-m4-transport-incident/verify.mjs
//   node docs/evaluation/artifacts/2026-10-03-m4-transport-incident/verify.mjs --write-stored <path>
//
// Checks, and exits 1 on any failure:
//   1. the reviewed M-4 file has md5 23dd3270cdca77001fe2f9a86917d518, 3739 bytes;
//   2. the base64 decodes to the statement production stored: md5
//      4b09ad34a82823aacf22d4afa63bad53, 3619 characters, 3667 bytes;
//   3. replacing, in the reviewed text, exactly the escape texts for U+202A,
//      U+202E, U+2066 and U+2069 by the characters they name yields the stored
//      text byte for byte, and no other difference exists;
//   4. those replacements are exactly the 24 rows of substitutions.tsv.
//
// --write-stored writes the decoded statement to <path>, for a local replay of
// production's M-4. That file holds raw bidi characters: keep it outside the
// repository. This script itself is ASCII and holds none.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..', '..');
const reviewedPath = join(repo, 'supabase', 'migrations', '20261003183331_sandbox_provenance.sql');

const REVIEWED_MD5 = '23dd3270cdca77001fe2f9a86917d518';
const REVIEWED_BYTES = 3739;
const STORED_MD5 = '4b09ad34a82823aacf22d4afa63bad53';
const STORED_CHARS = 3619;
const STORED_BYTES = 3667;
const DECODED = ['202A', '202E', '2066', '2069'];

const md5 = (buf) => createHash('md5').update(buf).digest('hex');
const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`);
  if (!ok) failures.push(what);
};

const reviewedBuf = readFileSync(reviewedPath);
check(md5(reviewedBuf) === REVIEWED_MD5 && reviewedBuf.length === REVIEWED_BYTES,
  `reviewed file md5 ${md5(reviewedBuf)}, ${reviewedBuf.length} bytes`);

const storedBuf = Buffer.from(readFileSync(join(here, 'm4_stored_statement.b64'), 'ascii').replace(/\s+/g, ''), 'base64');
const stored = storedBuf.toString('utf8');
check(md5(storedBuf) === STORED_MD5 && [...stored].length === STORED_CHARS && storedBuf.length === STORED_BYTES,
  `stored statement md5 ${md5(storedBuf)}, ${[...stored].length} characters, ${storedBuf.length} bytes`);

// Rebuild the stored text from the reviewed one, recording every replacement.
const reviewed = reviewedBuf.toString('utf8');
const escape = new RegExp('\\\\u(' + DECODED.join('|') + ')', 'g');
const found = [];
const rebuilt = reviewed.replace(escape, (text, hex, offset) => {
  const lineStart = reviewed.lastIndexOf('\n', offset - 1) + 1;
  const line = reviewed.slice(0, offset).split('\n').length;
  found.push(`${line}\t${offset - lineStart + 1}\t${text}\tU+${hex}`);
  return String.fromCodePoint(parseInt(hex, 16));
});
check(rebuilt === stored, 'reviewed text with the four escape texts decoded equals the stored text exactly');
check(found.length === 24, `${found.length} substitutions`);
const lines = [...new Set(found.map((row) => row.split('\t')[0]))].join(',');
check(lines === '42,44,48,50,52,56', `on lines ${lines}`);

const table = readFileSync(join(here, 'substitutions.tsv'), 'ascii').trimEnd().split('\n');
check(table[0] === 'line\tcolumn\treviewed_text\tstored_code_point' && table.slice(1).join('\n') === found.join('\n'),
  'substitutions.tsv lists exactly these substitutions');

const out = process.argv.indexOf('--write-stored');
if (out !== -1) {
  if (failures.length) {
    console.log('not writing the stored statement: verification failed');
  } else {
    writeFileSync(process.argv[out + 1], storedBuf);
    console.log(`wrote the stored statement to ${process.argv[out + 1]}`);
  }
}

console.log(failures.length ? `FAIL: ${failures.length} check(s)` : 'PASS: all checks');
process.exit(failures.length ? 1 : 0);
