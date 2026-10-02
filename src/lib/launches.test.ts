import { describe, expect, it } from 'vitest';
import { formatTargetDate, toLaunchRows } from './launches';

describe('toLaunchRows', () => {
  const launch = {
    id: 7,
    name: 'Example launch',
    owner: 'AI Program Lead',
    target_date: null,
    gates: [
      { required: true, status: 'Passed' as const, evidence: [{ id: 1 }] },
      { required: true, status: 'Passed' as const, evidence: [] },
      { required: true, status: 'Waived' as const, evidence: [] },
      { required: false, status: 'Not started' as const, evidence: [] },
    ],
  };

  it('computes readiness from the gates and their evidence rows', () => {
    const [row] = toLaunchRows([launch], []);

    expect(row?.readiness.label).toBe('1 of 3 passed · 1 waived');
    expect(row?.readiness.blocking).toHaveLength(1);
    expect(row?.readiness.status).toBe('Not ready');
  });

  it('takes the current stage from the view row for that launch only', () => {
    const rows = toLaunchRows(
      [launch],
      [
        { launch_id: 99, stage: 'Assist', status: 'Active' },
        { launch_id: 7, stage: 'Shadow', status: 'Not started' },
      ],
    );
    expect(rows[0]?.currentStage).toEqual({ stage: 'Shadow', status: 'Not started' });
    expect(toLaunchRows([launch], [])[0]?.currentStage).toBeNull();
  });
});

describe('formatTargetDate', () => {
  it('renders a null target date as "Target unset"', () => {
    expect(formatTargetDate(null)).toBe('Target unset');
  });

  it('keeps the calendar date regardless of time zone', () => {
    expect(formatTargetDate('2026-11-30')).toBe('Nov 30, 2026');
  });
});
