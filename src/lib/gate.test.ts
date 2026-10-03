import { describe, expect, it } from 'vitest';
import { Constants } from './database.types';
import { DataError, userMessage } from './errors';
import {
  addSandboxEvidence,
  fetchGateSheet,
  setSandboxGateStatus,
  statusChoices,
  validateEvidence,
  validateStatusChange,
} from './gate';
import { clientAnswering, type Reply } from './testing';

const gateRow = {
  id: 17,
  launch_id: 2,
  category: 'Rollback',
  title: 'Rollback procedure documented and rehearsed',
  owner: 'AI Program Lead',
  required: true,
  status: 'Not started',
  pass_criteria: 'A rollback has been rehearsed end to end.',
  waiver_rationale: null,
};
const evidenceRows = [
  { id: 30, type: 'Observation', title: 'Visitor note', summary: 'Line one\nLine two', source: 'https://example.com/x', recorded_on: '2026-10-02', origin: 'visitor' },
  { id: 12, type: 'Document', title: 'Runbook', summary: 'Seed copy.', source: null, recorded_on: '2026-09-30', origin: 'seed' },
];

describe('fetchGateSheet (A4)', () => {
  it('reads the gate within its launch, its evidence with source and origin, and its decision origins', async () => {
    const selects: Record<string, URL> = {};
    const client = clientAnswering((path, url) => {
      const table = path.split('/').pop() ?? '';
      selects[table] = url;
      if (table === 'gates') return { status: 200, body: gateRow };
      if (table === 'evidence') return { status: 200, body: evidenceRows };
      return { status: 200, body: [{ origin: 'visitor' }, { origin: 'seed' }, { origin: 'visitor' }] };
    });
    const sheet = await fetchGateSheet(client, 2, 17);

    expect(selects.gates?.searchParams.get('id')).toBe('eq.17');
    expect(selects.gates?.searchParams.get('launch_id')).toBe('eq.2');
    expect(selects.gates?.searchParams.get('select')?.split(',')).toContain('pass_criteria');
    expect(selects.evidence?.searchParams.get('gate_id')).toBe('eq.17');
    expect(selects.evidence?.searchParams.get('select')?.split(',')).toEqual(
      expect.arrayContaining(['source', 'origin', 'recorded_on']),
    );
    expect(sheet).toMatchObject({
      id: 17,
      launchId: 2,
      title: 'Rollback procedure documented and rehearsed',
      status: 'Not started',
      passCriteria: 'A rollback has been rehearsed end to end.',
      waiverRationale: null,
      visitorEvidenceCount: 1,
      visitorDecisionCount: 2,
    });
    expect(sheet?.evidence).toEqual([
      { id: 30, type: 'Observation', title: 'Visitor note', summary: 'Line one\nLine two', source: 'https://example.com/x', recordedOn: '2026-10-02', origin: 'visitor' },
      { id: 12, type: 'Document', title: 'Runbook', summary: 'Seed copy.', source: null, recordedOn: '2026-09-30', origin: 'seed' },
    ]);
  });

  it('returns null when the launch has no such gate', async () => {
    const client = clientAnswering((path) => ({ status: 200, body: path.endsWith('/gates') ? null : [] }));
    expect(await fetchGateSheet(client, 1, 999)).toBeNull();
  });

  it('reports a failed read through the error boundary', async () => {
    const client = clientAnswering((path) =>
      path.endsWith('/evidence')
        ? { status: 401, body: { code: '42501', details: null, hint: null, message: 'permission denied for table evidence' } }
        : { status: 200, body: path.endsWith('/gates') ? gateRow : [] },
    );
    const error = await fetchGateSheet(client, 2, 17).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DataError);
    expect(userMessage(error, 'Could not load data')).toBe('Could not load data (code 42501)');
  });
});

/** A client that records each request it sends and answers every one with `reply`. */
function rpcClient(reply: Reply) {
  const calls: { fn: string; method: string; body: Record<string, unknown> }[] = [];
  const client = clientAnswering((path, _url, sent) => {
    calls.push({ fn: path.replace('/rest/v1/rpc/', ''), method: sent.method, body: sent.body as Record<string, unknown> });
    return reply;
  });
  return { client, calls };
}

describe('addSandboxEvidence (A4)', () => {
  it('calls only sandbox_add_evidence, trims the fields and returns the new id', async () => {
    const { client, calls } = rpcClient({ status: 200, body: 31 });
    const id = await addSandboxEvidence(client, 17, {
      type: 'Observation',
      title: '  Visitor note  ',
      summary: ' Checked the runbook. ',
      source: ' https://example.com/runbook ',
    });
    expect(id).toBe(31);
    expect(calls).toEqual([
      {
        fn: 'sandbox_add_evidence',
        method: 'POST',
        body: { gate_id: 17, type: 'Observation', title: 'Visitor note', summary: 'Checked the runbook.', source: 'https://example.com/runbook' },
      },
    ]);
  });

  it('omits a blank or whitespace-only source so the database defaults it to null', async () => {
    for (const source of ['', '   ']) {
      const { client, calls } = rpcClient({ status: 200, body: 32 });
      await addSandboxEvidence(client, 17, { type: 'Test', title: 't', summary: 's', source });
      expect(calls[0]?.body).not.toHaveProperty('source');
    }
  });

  it('rejects with the P0001 message verbatim, and other errors generically', async () => {
    const cap = rpcClient({
      status: 400,
      body: { code: 'P0001', details: null, hint: null, message: 'This gate already has 10 visitor evidence items. Reset the sandbox to add more.' },
    });
    const capError = await addSandboxEvidence(cap.client, 17, { type: 'Test', title: 't', summary: 's', source: '' }).catch((e: unknown) => e);
    expect(userMessage(capError, 'Could not save')).toBe('This gate already has 10 visitor evidence items. Reset the sandbox to add more.');

    const check = rpcClient({
      status: 400,
      body: { code: '23514', details: 'Failing row contains (...)', hint: null, message: 'new row for relation "evidence" violates check constraint "evidence_source_https"' },
    });
    const checkError = await addSandboxEvidence(check.client, 17, { type: 'Test', title: 't', summary: 's', source: 'https://x' }).catch((e: unknown) => e);
    expect(userMessage(checkError, 'Could not save')).toBe('Could not save (code 23514)');
  });
});

describe('setSandboxGateStatus (A4)', () => {
  it('calls only sandbox_set_gate_status and omits the waiver text unless the status is Waived', async () => {
    const { client, calls } = rpcClient({ status: 200, body: 40 });
    await setSandboxGateStatus(client, 17, { newStatus: 'In progress', rationale: ' Started. ', waiverRationale: 'ignored' });
    expect(calls).toEqual([
      { fn: 'sandbox_set_gate_status', method: 'POST', body: { gate_id: 17, new_status: 'In progress', rationale: 'Started.' } },
    ]);
  });

  it('sends trimmed waiver text for Waived', async () => {
    const { client, calls } = rpcClient({ status: 200, body: 41 });
    await setSandboxGateStatus(client, 17, { newStatus: 'Waived', rationale: 'Out of scope.', waiverRationale: ' Not needed for Shadow. ' });
    expect(calls[0]?.body).toEqual({ gate_id: 17, new_status: 'Waived', rationale: 'Out of scope.', waiver_rationale: 'Not needed for Shadow.' });
  });

  it('rejects an I8 rule with its P0001 message verbatim', async () => {
    const { client } = rpcClient({
      status: 400,
      body: { code: 'P0001', details: null, hint: null, message: 'A gate cannot be Passed without at least one evidence item' },
    });
    const error = await setSandboxGateStatus(client, 17, { newStatus: 'Passed', rationale: 'r', waiverRationale: '' }).catch((e: unknown) => e);
    expect(userMessage(error, 'Could not save')).toBe('A gate cannot be Passed without at least one evidence item');
  });
});

describe('validateEvidence (A4)', () => {
  const ok = { type: 'Observation' as const, title: 'Title', summary: 'Summary', source: '' };

  it('accepts a complete item, with or without an https source', () => {
    expect(validateEvidence(ok)).toEqual({});
    expect(validateEvidence({ ...ok, source: 'https://example.com/a' })).toEqual({});
  });

  it('requires a type, a title and a summary', () => {
    expect(validateEvidence({ type: '', title: ' ', summary: '', source: '' })).toEqual({
      type: 'Choose an evidence type.',
      title: 'Enter a title.',
      summary: 'Enter a summary.',
    });
  });

  it('keeps the title to one line and 200 characters, counted as Postgres counts them', () => {
    expect(validateEvidence({ ...ok, title: 'one\ntwo' }).title).toBe('The title must be a single line.');
    expect(validateEvidence({ ...ok, title: 'x'.repeat(201) }).title).toBe('The title can be at most 200 characters.');
    expect(validateEvidence({ ...ok, title: '😀'.repeat(200) })).toEqual({});
  });

  it('limits the summary to 2000 and the source to 500 characters, and the source to https', () => {
    expect(validateEvidence({ ...ok, summary: 'x'.repeat(2001) }).summary).toBe('The summary can be at most 2000 characters.');
    expect(validateEvidence({ ...ok, source: `https://example.com/${'x'.repeat(500)}` }).source).toBe('The source can be at most 500 characters.');
    for (const source of ['http://example.com', 'javascript:alert(1)', 'example.com']) {
      expect(validateEvidence({ ...ok, source }).source).toBe('The source must be an https:// address.');
    }
  });
});

describe('validateStatusChange (A4)', () => {
  it('requires a status and a rationale', () => {
    expect(validateStatusChange({ newStatus: '', rationale: '  ', waiverRationale: '' })).toEqual({
      newStatus: 'Choose a new status.',
      rationale: 'Enter a rationale.',
    });
  });

  it('requires waiver text only for Waived', () => {
    expect(validateStatusChange({ newStatus: 'Failed', rationale: 'r', waiverRationale: '' })).toEqual({});
    expect(validateStatusChange({ newStatus: 'Waived', rationale: 'r', waiverRationale: ' ' }).waiverRationale).toBe('Enter the waiver text.');
    expect(validateStatusChange({ newStatus: 'Waived', rationale: 'r', waiverRationale: 'x'.repeat(2001) }).waiverRationale).toBe(
      'The waiver text can be at most 2000 characters.',
    );
  });
});

describe('statusChoices (A4)', () => {
  const all = Constants.public.Enums.gate_status;

  it('offers every status except the current one', () => {
    expect(statusChoices('In progress', 1, all).map((c) => c.status)).toEqual(['Not started', 'Passed', 'Failed', 'Waived']);
  });

  it('disables Passed with "Add evidence first" when the gate has no evidence of either origin', () => {
    expect(statusChoices('Not started', 0, all).find((c) => c.status === 'Passed')).toEqual({ status: 'Passed', disabledReason: 'Add evidence first' });
    expect(statusChoices('Not started', 1, all).every((c) => c.disabledReason === null)).toBe(true);
  });
});

