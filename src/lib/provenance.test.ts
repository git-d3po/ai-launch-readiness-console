import { describe, expect, it } from 'vitest';
import type { GateEvidence } from './gate';
import type { LaunchOverview } from './overview';
import { provenanceLabel } from './provenance';

type Decision = LaunchOverview['decisions'][number];

const evidence = (origin: GateEvidence['origin']): GateEvidence => ({
  id: 30,
  type: 'Observation',
  title: 'Note',
  summary: 'Summary.',
  source: 'https://example.com/report',
  recordedOn: '2026-10-02',
  origin,
});

const decision = (origin: Decision['origin'], decidedBy: string): Decision => ({
  id: 12,
  decidedAt: '2026-10-02T17:30:00+00:00',
  decision: 'Evaluation: In progress → Passed',
  decidedBy,
  origin,
});

describe('provenanceLabel (A5)', () => {
  it('labels visitor-origin evidence "Visitor"', () => {
    expect(provenanceLabel(evidence('visitor'))).toBe('Visitor');
  });

  it('leaves seed-origin evidence unlabeled', () => {
    expect(provenanceLabel(evidence('seed'))).toBeNull();
  });

  it('labels a visitor-origin decision "Visitor"', () => {
    expect(provenanceLabel(decision('visitor', 'Sandbox visitor'))).toBe('Visitor');
  });

  it('leaves a seed-origin decision unlabeled', () => {
    expect(provenanceLabel(decision('seed', 'Evaluation Lead'))).toBeNull();
  });

  it('follows origin only, not the decider, the source or the sandbox launch', () => {
    // A seed decision whose decider reads like a visitor stays unlabeled, and a
    // visitor decision with an ordinary decider is labeled.
    expect(provenanceLabel(decision('seed', 'Sandbox visitor'))).toBeNull();
    expect(provenanceLabel(decision('visitor', 'Evaluation Lead'))).toBe('Visitor');
    // A seed row copied into the sandbox stays seed, so it stays unlabeled.
    const copiedSeed = { ...evidence('seed'), launch: { sourceLaunchId: 1 } };
    expect(provenanceLabel(copiedSeed)).toBeNull();
    // A visitor row with no source and no date is still labeled.
    const bareVisitor: GateEvidence = { ...evidence('visitor'), source: null, recordedOn: null };
    expect(provenanceLabel(bareVisitor)).toBe('Visitor');
  });
});
