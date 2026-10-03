import { computeReadiness, type Readiness, type ReadinessGate } from '../domain/readiness';
import type { Database } from './database.types';
import { toDataError } from './errors';
import type { Client } from './supabase';

type Enums = Database['public']['Enums'];

export interface LaunchRow {
  id: number;
  name: string;
  owner: string;
  targetDate: string | null;
  /** The canonical launch this sandbox copies; null for a canonical launch (A8). */
  sourceLaunchId: number | null;
  currentStage: { stage: Enums['stage_kind']; status: Enums['stage_status'] } | null;
  readiness: Readiness<ReadinessGate>;
}

interface LaunchWithGates {
  id: number;
  name: string;
  owner: string;
  target_date: string | null;
  source_launch_id: number | null;
  gates: { required: boolean; status: Enums['gate_status']; evidence: { id: number }[] }[];
}

type CurrentStageView = Database['public']['Views']['launch_current_stage']['Row'];

export async function fetchLaunchRows(client: Client): Promise<LaunchRow[]> {
  const [launches, stages] = await Promise.all([
    client
      .from('launches')
      .select('id, name, owner, target_date, source_launch_id, gates(required, status, evidence(id))')
      .order('name'),
    client.from('launch_current_stage').select('launch_id, stage, status'),
  ]);
  if (launches.error) throw toDataError(launches.error);
  if (stages.error) throw toDataError(stages.error);
  return toLaunchRows(launches.data, stages.data);
}

export function toLaunchRows(launches: readonly LaunchWithGates[], stages: readonly CurrentStageView[]): LaunchRow[] {
  const stageByLaunch = new Map(stages.map((s) => [s.launch_id, s]));

  return launches.map((launch) => {
    const stage = stageByLaunch.get(launch.id);
    return {
      id: launch.id,
      name: launch.name,
      owner: launch.owner,
      targetDate: launch.target_date,
      sourceLaunchId: launch.source_launch_id,
      currentStage: stage?.stage && stage.status ? { stage: stage.stage, status: stage.status } : null,
      readiness: computeReadiness(
        launch.gates.map((g) => ({ required: g.required, status: g.status, evidenceCount: g.evidence.length })),
      ),
    };
  });
}

/** Canonical launches only: a sandbox launch has a source (A3, A8). */
export function canonicalLaunches<R extends Pick<LaunchRow, 'sourceLaunchId'>>(rows: readonly R[]): R[] {
  return rows.filter((row) => row.sourceLaunchId === null);
}

/** Formats a Postgres date (YYYY-MM-DD) without shifting it across time zones. */
export function formatTargetDate(date: string | null): string {
  if (date === null) return 'Target unset';
  return formatCalendarDate(date);
}

/** Formats a Postgres date (YYYY-MM-DD), e.g. "Nov 30, 2026", without shifting it across time zones. */
export function formatCalendarDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
