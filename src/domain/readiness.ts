export type GateStatus = 'Not started' | 'In progress' | 'Passed' | 'Failed' | 'Waived';

export interface ReadinessGate {
  required: boolean;
  status: GateStatus;
  evidenceCount: number;
}

export interface Readiness<G extends ReadinessGate> {
  passed: number;
  waived: number;
  requiredTotal: number;
  blocking: G[];
  status: 'Ready' | 'Not ready';
  label: string;
}

// The database already refuses Passed without evidence. Requiring it here too
// means a bad row can never make a launch look ready.
function isPassed(gate: ReadinessGate): boolean {
  return gate.status === 'Passed' && gate.evidenceCount > 0;
}

/**
 * Readiness of one launch, computed from its gates. Ready only when every
 * required gate is Passed (with evidence) or Waived. Optional gates never block.
 */
export function computeReadiness<G extends ReadinessGate>(gates: readonly G[]): Readiness<G> {
  const required = gates.filter((gate) => gate.required);
  const passed = required.filter(isPassed).length;
  const waived = required.filter((gate) => gate.status === 'Waived').length;
  const blocking = required.filter((gate) => !isPassed(gate) && gate.status !== 'Waived');

  return {
    passed,
    waived,
    requiredTotal: required.length,
    blocking,
    status: blocking.length === 0 ? 'Ready' : 'Not ready',
    label: `${passed} of ${required.length} passed` + (waived > 0 ? ` · ${waived} waived` : ''),
  };
}
