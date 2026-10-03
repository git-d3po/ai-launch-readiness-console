// Tests for the migration transport lint. Every special character is built at
// run time, so this file stays ASCII.
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR, POLICY, lintFile, lintMigrations } from './migration_transport_lint.mjs';

const enc = (s) => new TextEncoder().encode(s);
const ch = (cp) => String.fromCodePoint(cp);
const BS = String.fromCharCode(92);
const rules = (problems) => problems.map((p) => p.slice(0, 2));

describe('the repository migrations', () => {
  it('all pass under the committed policy', () => {
    const { files, problems } = lintMigrations();
    expect(problems).toEqual([]);
    expect(files).toHaveLength(8);
  });

  it('allowlist only the four recorded files, and nothing for the corrective, M-5 aside, or M-6', () => {
    expect(Object.keys(POLICY).sort()).toEqual([
      '20261002092043_phase1_schema.sql',
      '20261002160901_stage1_security_hardening.sql',
      '20261003183331_sandbox_provenance.sql',
      '20261003190146_sandbox_seed.sql',
    ]);
    expect(POLICY['20261003190146_sandbox_seed.sql']).toEqual({ nonAscii: { 0x2192: 1 }, reason: expect.any(String) });
    expect(POLICY['20261003190145_sandbox_text_rules_reencode.sql']).toBeUndefined();
    expect(POLICY['20261003190147_sandbox_rpcs.sql']).toBeUndefined();
  });

  it('keep the order Stage 1, M-4, corrective, M-5, M-6', () => {
    expect(lintMigrations().files.slice(3)).toEqual([
      '20261002160901_stage1_security_hardening.sql',
      '20261003183331_sandbox_provenance.sql',
      '20261003190145_sandbox_text_rules_reencode.sql',
      '20261003190146_sandbox_seed.sql',
      '20261003190147_sandbox_rpcs.sql',
    ]);
  });

  it("catch the transported M-4: production's stored text fails even under M-4's allowlist", () => {
    const reviewed = readFileSync(join(MIGRATIONS_DIR, '20261003183331_sandbox_provenance.sql'), 'utf8');
    const transported = reviewed.replace(new RegExp(BS + BS + 'u(202A|202E|2066|2069)', 'g'), (_, h) => ch(parseInt(h, 16)));
    const problems = lintFile('m4.sql', enc(transported), POLICY['20261003183331_sandbox_provenance.sql']);
    expect(problems.filter((p) => p.startsWith('R2'))).toHaveLength(24);
    expect(problems.join('\n')).toContain('42:49: U+202A');
  });
});

describe('R2: characters that are never allowed', () => {
  const cases = {
    'left-to-right embedding': 0x202a,
    'right-to-left override': 0x202e,
    'left-to-right isolate': 0x2066,
    'pop directional isolate': 0x2069,
    'right-to-left mark': 0x200f,
    'arabic letter mark': 0x061c,
    'zero-width space': 0x200b,
    'zero-width joiner': 0x200d,
    'word joiner': 0x2060,
    'byte order mark': 0xfeff,
    'soft hyphen': 0x00ad,
    'no-break space': 0x00a0,
    'line separator': 0x2028,
    tab: 0x09,
    'carriage return': 0x0d,
    'null': 0x00,
    delete: 0x7f,
    'C1 control': 0x85,
    'private use': 0xe000,
  };
  for (const [what, cp] of Object.entries(cases)) {
    it(`rejects a ${what}, even when allowlisted`, () => {
      const problems = lintFile('x.sql', enc(`select 1;${ch(cp)}\n`), { nonAscii: { [cp]: 1 } });
      expect(rules(problems)).toContain('R2');
    });
  }
});

describe('R3: other non-ASCII code points need an exact count', () => {
  const arrow = ch(0x2192);
  const m5 = { nonAscii: { 0x2192: 1 } };
  it('passes exactly one U+2192 under the M-5 allowlist', () => {
    expect(lintFile('m5.sql', enc(`-- a ${arrow} b\n`), m5)).toEqual([]);
  });
  it('rejects a second U+2192, or none', () => {
    expect(rules(lintFile('m5.sql', enc(`-- ${arrow} ${arrow}\n`), m5))).toEqual(['R3']);
    expect(rules(lintFile('m5.sql', enc('-- none\n'), m5))).toEqual(['R3']);
  });
  it('rejects any other non-ASCII character, under the M-5 allowlist or none', () => {
    expect(rules(lintFile('m5.sql', enc(`-- ${arrow} caf${ch(0xe9)}\n`), m5))).toEqual(['R3']);
    expect(rules(lintFile('new.sql', enc(`-- ${arrow}\n`)))).toEqual(['R3']);
  });
});

describe('R4 and R5: escape text and backslashes', () => {
  it('rejects unicode escape text in a file with no allowlist', () => {
    const problems = lintFile('new.sql', enc(`select '${BS}u202A';\n`));
    expect(rules(problems).sort()).toEqual(['R4', 'R5']);
    expect(rules(lintFile('new.sql', enc(`select '${BS}U0001F600';\n`))).sort()).toEqual(['R4', 'R5']);
  });
  it('rejects a single backslash in a file with no allowlist', () => {
    expect(rules(lintFile('new.sql', enc(`select '${BS}.';\n`)))).toEqual(['R5']);
  });
  it('requires the exact allowlisted count, not a maximum', () => {
    const allow = { backslashes: 2 };
    expect(lintFile('x.sql', enc(`-- ${BS}${BS}\n`), allow)).toEqual([]);
    expect(rules(lintFile('x.sql', enc(`-- ${BS}\n`), allow))).toEqual(['R5']);
    expect(rules(lintFile('x.sql', enc(`-- ${BS}${BS}${BS}\n`), allow))).toEqual(['R5']);
  });
  it('accepts the corrective technique: chr(92) instead of a backslash', () => {
    expect(lintFile('fix.sql', enc("select '[' || chr(92) || 'u202A]';\n"))).toEqual([]);
  });
});

describe('R1, R6, R7: encoding, policy and names', () => {
  let dir;
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

  it('rejects invalid UTF-8 and a missing final newline', () => {
    expect(rules(lintFile('x.sql', new Uint8Array([0x2d, 0x2d, 0xff, 0x0a])))).toEqual(['R1']);
    expect(rules(lintFile('x.sql', enc('select 1;')))).toEqual(['R1']);
  });

  it('rejects a stale or unexplained allowlist entry, a bad name and a repeated version', () => {
    dir = mkdtempSync(join(tmpdir(), 'lint-'));
    writeFileSync(join(dir, '20261003000000_a.sql'), 'select 1;\n');
    writeFileSync(join(dir, '20261003000000_b.sql'), 'select 1;\n');
    writeFileSync(join(dir, 'bad-name.sql'), 'select 1;\n');
    const { problems } = lintMigrations(dir, {
      '20261003000000_a.sql': { reason: '' },
      '20261003999999_gone.sql': { backslashes: 1, reason: 'renamed away' },
    });
    expect(problems).toEqual([
      'R7 20261003000000_b.sql: version 20261003000000 is used twice',
      'R7 bad-name.sql: name is not VERSION_name.sql with a 14-digit version',
      'R6 20261003000000_a.sql: allowlist entry has no reason',
      'R6 20261003999999_gone.sql: allowlisted, but no such migration',
    ]);
  });
});

describe('C-11 script (migration_parity.sql)', () => {
  const sql = readFileSync(join(MIGRATIONS_DIR, '..', 'tests', 'migration_parity.sql'));
  const text = sql.toString('utf8');
  const rows = [...text.matchAll(/\((\d), (?:'(\d{14})'|null), '([a-z0-9_]+)', '([0-9a-f]{32})'\)/g)]
    .map(([, ord, version, name, md5]) => ({ ord: Number(ord), version, name, md5 }));
  const md5 = (buf) => createHash('md5').update(buf).digest('hex');
  const files = readdirSync(MIGRATIONS_DIR).filter((n) => n.endsWith('.sql')).sort();

  it('is transport-safe itself: passes the lint with no allowlist', () => {
    expect(lintFile('migration_parity.sql', sql)).toEqual([]);
  });

  it('expects every migration file, in order, with its md5', () => {
    expect(rows.map((r) => r.ord)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(rows.map((r) => r.name)).toEqual(files.map((f) => f.slice(15, -4)));
    for (const [i, r] of rows.entries()) {
      const file = files[i];
      const want = r.name === 'sandbox_provenance' ? '23dd3270cdca77001fe2f9a86917d518' : r.md5;
      expect(md5(readFileSync(join(MIGRATIONS_DIR, file))), file).toBe(want);
    }
  });

  it('fixes the version of every applied migration and of no other', () => {
    const fixed = rows.filter((r) => r.version).map((r) => `${r.version}_${r.name}.sql`);
    expect(fixed).toEqual(files.slice(0, 5));
    expect(rows.slice(5).every((r) => r.version === undefined)).toBe(true);
  });

  it('accepts only the preserved stored statement for M-4', () => {
    expect(rows[4]).toEqual({ ord: 5, version: '20261003183331', name: 'sandbox_provenance', md5: '4b09ad34a82823aacf22d4afa63bad53' });
    const b64 = readFileSync(join(MIGRATIONS_DIR, '..', '..', 'docs', 'evaluation', 'artifacts',
      '2026-10-03-m4-transport-incident', 'm4_stored_statement.b64'), 'ascii');
    expect(md5(Buffer.from(b64.replace(/\s+/g, ''), 'base64'))).toBe(rows[4].md5);
  });
});
