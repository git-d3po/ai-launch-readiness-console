import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import type { Database } from './database.types';
import { DataError, toDataError, userMessage } from './errors';
import { fetchLaunchRows } from './launches';
import { fetchLaunchOverview } from './overview';

// Error bodies are PostgREST 12.2.3 responses captured from a local database
// built from this repository's migrations, called as anon. The timestamps in
// the row images in `details` are cut short; nothing else is changed.
const responses = {
  p0001NotSandbox: {
    status: 400,
    body: { code: 'P0001', details: null, hint: null, message: 'Only sandbox gates accept visitor evidence' },
  },
  p0001Cooldown: {
    status: 400,
    body: { code: 'P0001', details: null, hint: null, message: 'The sandbox was reset recently. Try again in 5 minutes.' },
  },
  checkViolation: {
    status: 400,
    body: {
      code: '23514',
      details: 'Failing row contains (22, 17, Observation, t, s, http://example.com, ...).',
      hint: null,
      message: 'new row for relation "evidence" violates check constraint "evidence_source_https"',
    },
  },
  notNullViolation: {
    status: 400,
    body: {
      code: '23502',
      details: 'Failing row contains (23, 17, Observation, null, s, null, ...).',
      hint: null,
      message: 'null value in column "title" of relation "evidence" violates not-null constraint',
    },
  },
  permissionDenied: {
    status: 401,
    body: { code: '42501', details: null, hint: null, message: 'permission denied for table evidence' },
  },
} as const;

type Reply = { status: number; body: unknown };

function answering(route: (path: string) => Reply) {
  return async (input: RequestInfo | URL) => {
    const { pathname } = new URL(input instanceof Request ? input.url : String(input));
    const reply = route(pathname);
    return new Response(JSON.stringify(reply.body), {
      status: reply.status,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}
const options = { auth: { persistSession: false, autoRefreshToken: false } };

/** A real supabase-js client whose requests are answered by `route(path)`. */
function clientAnswering(route: (path: string) => Reply) {
  return createClient<Database>('http://localhost.test', 'test-publishable-key', {
    ...options,
    global: { fetch: answering(route) },
  });
}

// The generated types predate Stage 2 and don't list the sandbox functions, so
// the sandbox function calls use an untyped client.
function rpcClientAnswering(route: (path: string) => Reply) {
  return createClient('http://localhost.test', 'test-publishable-key', { ...options, global: { fetch: answering(route) } });
}

/** Every raw string a database error carried, none of which may reach the user. */
function rawText(body: { message: string; details: string | null }): string[] {
  return [body.message, body.details ?? ''].filter((s) => s !== '');
}

const launches = [
  {
    id: 1,
    name: 'Halcyon Support Copilot',
    owner: 'AI Program Lead',
    target_date: null,
    gates: [
      { status: 'Passed', evidence: [{ id: 1 }], required: true },
      { status: 'In progress', evidence: [{ id: 7 }], required: true },
      { status: 'Not started', evidence: [], required: true },
    ],
  },
];
const currentStages = [{ launch_id: 1, stage: 'Shadow', status: 'Not started' }];

function launchesFailingWith(reply: Reply) {
  return clientAnswering((path) =>
    path.endsWith('/launches') ? reply : { status: 200, body: currentStages },
  );
}

describe('A1: P0001 messages are shown verbatim', () => {
  it('passes a P0001 message through the data layer unchanged', async () => {
    const error = await fetchLaunchRows(launchesFailingWith(responses.p0001NotSandbox)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DataError);
    expect(userMessage(error, 'Could not load data')).toBe('Only sandbox gates accept visitor evidence');
  });

  it('does not rewrite a P0001 message with punctuation and numbers', async () => {
    const error = await fetchLaunchRows(launchesFailingWith(responses.p0001Cooldown)).catch((e: unknown) => e);
    expect(userMessage(error, 'Could not load data')).toBe('The sandbox was reset recently. Try again in 5 minutes.');
  });

  it('does not rewrite a P0001 message that looks structured', async () => {
    const message = 'Gate 42: status "Waived" -> needs {waiver_rationale}; see [section 19] (code 23514)';
    const client = rpcClientAnswering(() => ({ status: 400, body: { code: 'P0001', details: null, hint: null, message } }));
    const { error } = await client.rpc('sandbox_reset');
    expect(error).not.toBeNull();
    expect(userMessage(toDataError(error!), 'Could not reset the sandbox')).toBe(message);
  });

  it('keeps a P0001 message verbatim from a sandbox function call', async () => {
    const client = rpcClientAnswering(() => responses.p0001NotSandbox);
    const { error } = await client.rpc('sandbox_add_evidence', {
      gate_id: 1,
      type: 'Observation',
      title: 't',
      summary: 's',
    });
    expect(userMessage(toDataError(error!), 'Could not save')).toBe('Only sandbox gates accept visitor evidence');
  });
});

describe('A1: every other error is generic, with its code', () => {
  const cases = [
    ['a CHECK violation', responses.checkViolation, 'Could not load data (code 23514)'],
    ['a NOT NULL violation', responses.notNullViolation, 'Could not load data (code 23502)'],
    ['a permission error', responses.permissionDenied, 'Could not load data (code 42501)'],
  ] as const;

  it.each(cases)('hides the raw text of %s', async (_, reply, expected) => {
    const error = await fetchLaunchRows(launchesFailingWith(reply)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DataError);
    const shown = userMessage(error, 'Could not load data');
    expect(shown).toBe(expected);
    // Neither the shown text nor the thrown error carries any raw database text.
    for (const raw of rawText(reply.body)) {
      expect(shown).not.toContain(raw);
      expect((error as DataError).message).not.toContain(raw);
    }
    expect(shown).not.toMatch(/evidence_source_https|relation|Failing row/);
  });

  it('hides the raw text of a constraint error from a sandbox function call', async () => {
    const client = rpcClientAnswering(() => responses.checkViolation);
    const { error } = await client.rpc('sandbox_add_evidence', {
      gate_id: 17,
      type: 'Observation',
      title: 't',
      summary: 's',
      source: 'http://example.com',
    });
    expect(userMessage(toDataError(error!), 'Could not save')).toBe('Could not save (code 23514)');
  });

  it('hides a network failure, which has no code', async () => {
    // Retries off: postgrest-js retries a failed GET with backoff, which only slows the test.
    const client = createClient<Database>('http://localhost.test', 'test-publishable-key', {
      ...options,
      db: { retry: false },
      global: {
        fetch: async () => {
          throw new TypeError('connect ECONNREFUSED 10.0.0.5:5432 (internal-db.example)');
        },
      },
    });
    const error = await fetchLaunchRows(client).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DataError);
    expect(userMessage(error, 'Could not load data')).toBe('Could not load data');
    expect((error as DataError).message).not.toContain('ECONNREFUSED');
  });

  it('hides a non-JSON error body and a malformed code', async () => {
    expect(userMessage(toDataError({ message: '<html>502 Bad Gateway: upstream db-01</html>' }), 'Could not load data')).toBe(
      'Could not load data',
    );
    expect(userMessage(toDataError({ code: 'P0001 or drop table', message: 'x' }), 'Could not load data')).toBe(
      'Could not load data',
    );
  });

  it('hides an unexpected error that is not from the database', () => {
    expect(userMessage(new Error('Cannot read properties of undefined (reading "gates")'), 'Could not load data')).toBe(
      'Could not load data',
    );
    expect(userMessage('boom', 'Could not load data')).toBe('Could not load data');
  });

  it('applies the same rule on the launch overview path', async () => {
    const client = clientAnswering((path) =>
      path.endsWith('/gates') ? responses.notNullViolation : { status: 200, body: [] },
    );
    const error = await fetchLaunchOverview(client, 1).catch((e: unknown) => e);
    expect(userMessage(error, 'Could not load data')).toBe('Could not load data (code 23502)');
  });
});

describe('A1: success is unchanged', () => {
  it('returns the same launch rows as before', async () => {
    const client = clientAnswering((path) => ({
      status: 200,
      body: path.endsWith('/launches') ? launches : currentStages,
    }));
    const rows = await fetchLaunchRows(client);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 1,
      name: 'Halcyon Support Copilot',
      owner: 'AI Program Lead',
      targetDate: null,
      currentStage: { stage: 'Shadow', status: 'Not started' },
    });
    expect(rows[0]?.readiness.label).toBe('1 of 3 passed');
    expect(rows[0]?.readiness.status).toBe('Not ready');
  });
});
