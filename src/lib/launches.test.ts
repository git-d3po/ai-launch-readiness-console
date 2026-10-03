import { describe, expect, it } from 'vitest';
import { DataError } from './errors';
import {
  canonicalLaunches,
  fetchLaunchRows,
  formatTargetDate,
  type LaunchesState,
  launchesFailed,
  launchesLoaded,
  type LaunchRow,
  toLaunchRows,
} from './launches';
import { clientAnswering } from './testing';

describe('toLaunchRows', () => {
  const launch = {
    id: 7,
    name: 'Example launch',
    owner: 'AI Program Lead',
    target_date: null,
    source_launch_id: null,
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

describe('provenance (A8)', () => {
  const canonical = {
    id: 1,
    name: 'Halcyon Support Copilot',
    owner: 'AI Program Lead',
    target_date: null,
    source_launch_id: null,
    gates: [{ required: true, status: 'Passed' as const, evidence: [{ id: 1 }] }],
  };
  const sandbox = { ...canonical, id: 2, name: 'Halcyon Support Copilot (sandbox)', source_launch_id: 1 };

  it('keeps source_launch_id: null for a canonical launch, the source id for a sandbox', () => {
    const rows = toLaunchRows([canonical, sandbox], []);
    expect(rows.map((r) => [r.id, r.sourceLaunchId])).toEqual([
      [1, null],
      [2, 1],
    ]);
    // Readiness is computed the same way for both.
    expect(rows[0]?.readiness).toEqual(rows[1]?.readiness);
  });

  it('selects source_launch_id and maps it through fetchLaunchRows', async () => {
    let select = '';
    const client = clientAnswering((path, url) => {
      if (path.endsWith('/launches')) {
        select = url.searchParams.get('select') ?? '';
        return { status: 200, body: [canonical, sandbox] };
      }
      return { status: 200, body: [] };
    });
    const rows = await fetchLaunchRows(client);
    expect(select.split(',')).toContain('source_launch_id');
    expect(rows.map((r) => r.sourceLaunchId)).toEqual([null, 1]);
  });

  it('still reports a failed read through the error boundary', async () => {
    const client = clientAnswering(() => ({
      status: 400,
      body: { code: '42703', details: null, hint: null, message: 'column launches.source_launch_id does not exist' },
    }));
    const error = await fetchLaunchRows(client).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DataError);
    expect((error as DataError).code).toBe('42703');
    expect((error as DataError).message).not.toContain('source_launch_id');
  });
});

describe('canonicalLaunches (A3)', () => {
  it('keeps only rows without a source, in order', () => {
    const rows = [
      { id: 1, sourceLaunchId: null },
      { id: 2, sourceLaunchId: 1 },
      { id: 3, sourceLaunchId: null },
    ];
    expect(canonicalLaunches(rows).map((r) => r.id)).toEqual([1, 3]);
  });

  it('counts the seeded pair as one canonical launch', () => {
    const base = {
      owner: 'AI Program Lead',
      target_date: null,
      gates: [{ required: true, status: 'Not started' as const, evidence: [] }],
    };
    const rows = toLaunchRows(
      [
        { ...base, id: 1, name: 'Halcyon Support Copilot', source_launch_id: null },
        { ...base, id: 2, name: 'Halcyon Support Copilot (sandbox)', source_launch_id: 1 },
      ],
      [],
    );
    const canonical = canonicalLaunches(rows);
    expect(canonical.map((r) => r.id)).toEqual([1]);
    expect(canonical.filter((r) => r.readiness.status === 'Not ready')).toHaveLength(1);
  });

  it('returns nothing when there are only sandbox launches or no launches', () => {
    expect(canonicalLaunches([{ sourceLaunchId: 4 }])).toEqual([]);
    expect(canonicalLaunches([])).toEqual([]);
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

describe('launch list refresh (A7)', () => {
  const rows = (name: string): LaunchRow[] => [
    {
      id: 1,
      name,
      owner: 'AI Program Lead',
      targetDate: null,
      sourceLaunchId: null,
      currentStage: null,
      readiness: { status: 'Ready', label: '0 of 0 required gates resolved', blocking: [], resolved: 0, required: 0 },
    } as unknown as LaunchRow,
  ];

  it('keeps the last good rows when a refresh fails, with the failure beside them', () => {
    const shown = launchesLoaded(rows('Before'));
    expect(launchesFailed(shown, true, 'Could not load data (code XX000)')).toEqual({
      status: 'success',
      rows: rows('Before'),
      refreshError: 'Could not load data (code XX000)',
    });
  });

  it('clears the refresh error on a later successful refresh', () => {
    const failed = launchesFailed(launchesLoaded(rows('Before')), true, 'Could not load data (code XX000)');
    expect(failed.status === 'success' && failed.refreshError).toBe('Could not load data (code XX000)');
    expect(launchesLoaded(rows('After'))).toEqual({ status: 'success', rows: rows('After'), refreshError: null });
  });

  it('shows the error when the initial load fails', () => {
    const loading: LaunchesState = { status: 'loading' };
    expect(launchesFailed(loading, false, 'Could not load data (code PGRST301)')).toEqual({
      status: 'error',
      message: 'Could not load data (code PGRST301)',
    });
  });

  it('keeps showing the error when a refresh follows a failed initial load', () => {
    const error: LaunchesState = { status: 'error', message: 'Could not load data (code 42501)' };
    expect(launchesFailed(error, true, 'Could not load data (code XX000)')).toEqual({
      status: 'error',
      message: 'Could not load data (code XX000)',
    });
  });
});
