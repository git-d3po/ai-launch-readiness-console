import { describe, expect, it } from 'vitest';
import { latestRationaleByGate, missingLine, sortGates } from './overview';

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
