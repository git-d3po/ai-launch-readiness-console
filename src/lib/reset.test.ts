import { describe, expect, it } from 'vitest';
import { DataError } from './errors';
import { resetConfirmation, resetSandbox, runReset } from './reset';
import { clientAnswering, type Reply } from './testing';

function rpcClient(reply: Reply) {
  const calls: { path: string; method: string; body: unknown }[] = [];
  const client = clientAnswering((path, _url, sent) => {
    calls.push({ path, method: sent.method, body: sent.body });
    return reply;
  });
  return { client, calls };
}

const cooldown = {
  code: 'P0001',
  details: null,
  hint: null,
  message: 'The sandbox was reset recently. Try again in 00:04:12.',
};

describe('resetSandbox (A7)', () => {
  it('calls only sandbox_reset, by POST, with no arguments', async () => {
    const { client, calls } = rpcClient({ status: 200, body: null });
    await resetSandbox(client);
    expect(calls).toEqual([{ path: '/rest/v1/rpc/sandbox_reset', method: 'POST', body: {} }]);
  });

  it('throws a DataError that keeps a P0001 message and drops any other', async () => {
    const rejected = await resetSandbox(rpcClient({ status: 400, body: cooldown }).client).catch((e: unknown) => e);
    expect(rejected).toBeInstanceOf(DataError);
    expect((rejected as DataError).applicationMessage).toBe(cooldown.message);
  });
});

describe('runReset (A7)', () => {
  it('reports "Sandbox reset" and asks for a refresh on success', async () => {
    const { client, calls } = rpcClient({ status: 200, body: null });
    expect(await runReset(client)).toEqual({ kind: 'done', message: 'Sandbox reset', refresh: true });
    expect(calls).toHaveLength(1);
  });

  it('shows a P0001 rejection verbatim, not as success, and still asks for a refresh', async () => {
    const { client, calls } = rpcClient({ status: 400, body: cooldown });
    const outcome = await runReset(client);
    expect(outcome).toEqual({ kind: 'rejected', message: cooldown.message, refresh: true });
    expect(outcome.message).not.toBe('Sandbox reset');
    expect(calls.map((c) => c.path)).toEqual(['/rest/v1/rpc/sandbox_reset']);
  });

  it('treats every P0001 alike, whatever its text, even text that reads like success', async () => {
    for (const message of ['Sandbox reset', 'Another visitor reset the sandbox just now.', 'x']) {
      const { client } = rpcClient({ status: 400, body: { code: 'P0001', details: null, hint: null, message } });
      expect(await runReset(client)).toEqual({ kind: 'rejected', message, refresh: true });
    }
  });

  it('shows any other error generically with its code, and still asks for a refresh', async () => {
    const { client } = rpcClient({
      status: 403,
      body: { code: '42501', details: 'role anon', hint: 'grant execute', message: 'permission denied for function sandbox_reset' },
    });
    const outcome = await runReset(client);
    expect(outcome).toEqual({ kind: 'failed', message: 'Could not reset the sandbox (code 42501)', refresh: true });
    expect(JSON.stringify(outcome)).not.toMatch(/permission|anon|grant/);
  });

  it('shows a failure without a usable code as the generic text alone', async () => {
    const { client } = rpcClient({ status: 500, body: { message: 'upstream exploded at host db-1' } });
    expect(await runReset(client)).toEqual({ kind: 'failed', message: 'Could not reset the sandbox', refresh: true });
  });

  it('keeps the approved confirmation text', () => {
    expect(resetConfirmation).toBe(
      'Reset the sandbox? This removes all visitor evidence and decisions on the sandbox launch and restores its gates. It affects everyone using the sandbox. The canonical launch is never changed.',
    );
  });
});

// The client's whole write surface, read from the source: it calls only the
// three sandbox functions and writes no table, so there is no other reset path.
describe('client write surface (I4)', () => {
  const sources = import.meta.glob<string>(['../**/*.{ts,tsx}', '!../**/*.test.ts', '!../lib/database.types.ts'], {
    query: '?raw',
    import: 'default',
    eager: true,
  });
  const code = Object.values(sources).join('\n');

  it('reads every application source file', () => {
    expect(Object.keys(sources)).toEqual(expect.arrayContaining(['./reset.ts', '../components/ResetSandbox.tsx']));
  });

  it('calls only sandbox_add_evidence, sandbox_set_gate_status and sandbox_reset', () => {
    const called = [...code.matchAll(/\.rpc\(\s*'([^']+)'/g)].map((m) => m[1]);
    expect([...new Set(called)].sort()).toEqual(['sandbox_add_evidence', 'sandbox_reset', 'sandbox_set_gate_status']);
    expect(code).not.toMatch(/\.rpc\(\s*[^'\s]/);
  });

  it('writes no table and never names reset_demo_data in a call', () => {
    expect(code).not.toMatch(/\.(insert|update|upsert|delete)\(/);
    expect(code).not.toMatch(/rpc\(\s*'reset_demo_data'/);
  });
});
