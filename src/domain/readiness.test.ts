import { describe, expect, it } from 'vitest';
import { computeReadiness, type GateStatus } from './readiness';

interface TestGate {
  title: string;
  required: boolean;
  status: GateStatus;
  evidenceCount: number;
}

function gate(title: string, status: GateStatus, evidenceCount: number, required = true): TestGate {
  return { title, required, status, evidenceCount };
}

// Mirrors the gates in reset_demo_data() (supabase/migrations/20261002000200_demo_seed.sql).
const halcyonSeed: TestGate[] = [
  gate('Curated scenario suite passes at 0.85', 'Passed', 1),
  gate('Imperfect passes triaged, expected behavior specified', 'In progress', 1),
  gate('Release commit re-measured live (29fd3c0)', 'Not started', 0),
  gate('Variance measured across repeated runs', 'Not started', 0),
  gate('Account compromise always escalates to Trust & Safety', 'Passed', 1),
  gate('Policy citations match retrieved policies', 'Passed', 1),
  gate('Refunds may be promised only when the resolution authorizes one', 'Passed', 1),
  gate('Live-mode prompt-injection handling documented and tested', 'Failed', 1),
  gate('Customer replies are drafts and are never sent automatically', 'Passed', 1),
  gate('Simulated demo runs are isolated from metrics and credentials', 'Passed', 1),
  gate('Safe multi-instance deployment', 'Failed', 1),
  gate('Durable persistence across restarts', 'Failed', 1),
  gate('Production monitoring and alerting defined', 'Not started', 0),
  gate('Rollback procedure documented and rehearsed', 'Not started', 0),
  gate('Support agents trained on the Assist workflow', 'Not started', 0),
  gate('Required stakeholder sign-offs recorded', 'Not started', 0),
];

describe('computeReadiness', () => {
  it('reports the Halcyon seed as 6 of 16 passed with 10 blockers, Not ready', () => {
    const result = computeReadiness(halcyonSeed);

    expect(result.passed).toBe(6);
    expect(result.waived).toBe(0);
    expect(result.requiredTotal).toBe(16);
    expect(result.blocking).toHaveLength(10);
    expect(result.status).toBe('Not ready');
    expect(result.label).toBe('6 of 16 passed');
    expect(result.blocking.map((g) => g.title)).toContain('Live-mode prompt-injection handling documented and tested');
  });

  it('treats a waived gate as non-blocking and adds it to the label', () => {
    const result = computeReadiness([
      gate('A', 'Passed', 2),
      gate('B', 'Passed', 1),
      gate('C', 'Waived', 0),
    ]);

    expect(result.blocking).toEqual([]);
    expect(result.status).toBe('Ready');
    expect(result.label).toBe('2 of 3 passed · 1 waived');
  });

  it('never counts a Passed gate with no evidence as passed', () => {
    const unsupported = gate('No evidence', 'Passed', 0);
    const result = computeReadiness([gate('A', 'Passed', 1), unsupported]);

    expect(result.passed).toBe(1);
    expect(result.blocking).toEqual([unsupported]);
    expect(result.status).toBe('Not ready');
  });

  it('ignores gates that are not required', () => {
    const result = computeReadiness([gate('A', 'Passed', 1), gate('Optional', 'Not started', 0, false)]);

    expect(result.requiredTotal).toBe(1);
    expect(result.status).toBe('Ready');
    expect(result.label).toBe('1 of 1 passed');
  });
});
