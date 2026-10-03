import { describe, expect, it } from 'vitest';
import { fetchLaunchOverview, latestRationaleByGate, missingLine, sortGates } from './overview';
import { clientAnswering } from './testing';

describe('missingLine', () => {
  it('uses only status, evidence count, and the latest decision rationale', () => {
    expect(missingLine({ status: 'Not started', evidenceCount: 0, latestRationale: null })).toBe('Not started · No evidence');
    expect(missingLine({ status: 'Failed', evidenceCount: 1, latestRationale: 'Ticket text is not delimited.' })).toBe(
      'Failed · 1 evidence item · Latest decision: Ticket text is not delimited.',
    );
    expect(missingLine({ status: 'In progress', evidenceCount: 2, latestRationale: null })).toBe('In progress · 2 evidence items');
  });
});

describe('latestRationaleByGate', () => {
  it('keeps the first (newest) rationale per gate and skips launch-level decisions', () => {
    const latest = latestRationaleByGate([
      { gate_id: 3, rationale: 'newest for 3' },
      { gate_id: null, rationale: 'launch-level' },
      { gate_id: 3, rationale: 'older for 3' },
      { gate_id: 5, rationale: 'only for 5' },
    ]);
    expect([...latest]).toEqual([
      [3, 'newest for 3'],
      [5, 'only for 5'],
    ]);
  });
});

describe('sortGates', () => {
  it('orders by category enum order, then id', () => {
    const sorted = sortGates([
      { id: 9, category: 'Rollback' as const },
      { id: 4, category: 'Evaluation' as const },
      { id: 2, category: 'Safety & Escalation' as const },
      { id: 1, category: 'Evaluation' as const },
    ]);
    expect(sorted.map((g) => g.id)).toEqual([1, 4, 2, 9]);
  });
});

describe('fetchLaunchOverview provenance (A8)', () => {
  const sandboxLaunch = { id: 2, name: 'Halcyon Support Copilot (sandbox)', owner: 'AI Program Lead', target_date: null, source_launch_id: 1 };
  const decisions = [
    { id: 12, decided_at: '2026-10-02T17:30:00+00:00', decision: 'Rollback: Not started → In progress', decided_by: 'Sandbox visitor', origin: 'visitor' },
    { id: 8, decided_at: '2026-09-30T10:00:00+00:00', decision: 'Evaluation: In progress → Passed', decided_by: 'Evaluation Lead', origin: 'seed' },
  ];

  it('exposes the launch source and each decision origin, and selects both', async () => {
    const selects: Record<string, string> = {};
    const client = clientAnswering((path, url) => {
      const table = path.split('/').pop() ?? '';
      const select = url.searchParams.get('select') ?? '';
      selects[`${table}:${select}`] = select;
      if (table === 'launches') return { status: 200, body: sandboxLaunch };
      if (table === 'decisions' && select.includes('decided_by')) return { status: 200, body: decisions };
      if (table === 'launch_current_stage') return { status: 200, body: null };
      return { status: 200, body: [] };
    });
    const overview = await fetchLaunchOverview(client, 2);
    expect(overview?.launch).toEqual({
      id: 2,
      name: 'Halcyon Support Copilot (sandbox)',
      owner: 'AI Program Lead',
      targetDate: null,
      sourceLaunchId: 1,
    });
    expect(overview?.decisions.map((d) => [d.id, d.decidedBy, d.origin])).toEqual([
      [12, 'Sandbox visitor', 'visitor'],
      [8, 'Evaluation Lead', 'seed'],
    ]);
    const launchSelect = Object.keys(selects).find((k) => k.startsWith('launches:'));
    const decisionSelect = Object.keys(selects).find((k) => k.startsWith('decisions:') && k.includes('decided_by'));
    expect(launchSelect?.split(':')[1]?.split(',')).toContain('source_launch_id');
    expect(decisionSelect?.split(':')[1]?.split(',')).toContain('origin');
  });

  it('still returns null for a launch that does not exist', async () => {
    const client = clientAnswering((path) => ({ status: 200, body: path.endsWith('/launches') ? null : [] }));
    expect(await fetchLaunchOverview(client, 999)).toBeNull();
  });
});
