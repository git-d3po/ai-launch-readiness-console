import { computeReadiness, type Readiness } from '../domain/readiness';
import { Constants, type Database } from './database.types';
import { toDataError } from './errors';
import type { Client } from './supabase';

type Enums = Database['public']['Enums'];

export interface OverviewGate {
  id: number;
  category: Enums['gate_category'];
  title: string;
  owner: string;
  required: boolean;
  status: Enums['gate_status'];
  evidenceCount: number;
  latestRationale: string | null;
}

export interface LaunchOverview {
  /** sourceLaunchId is the canonical launch a sandbox copies; null for a canonical launch (A8). */
  launch: { id: number; name: string; owner: string; targetDate: string | null; sourceLaunchId: number | null };
  /** The sandbox copy of this launch, for the "Try this in the sandbox" link (A4); null for a sandbox launch or none. */
  sandboxLaunchId: number | null;
  currentStage: { stage: Enums['stage_kind']; status: Enums['stage_status'] } | null;
  gates: OverviewGate[];
  readiness: Readiness<OverviewGate>;
  risks: { id: number; title: string; likelihood: Enums['level']; impact: Enums['level']; owner: string }[];
  stages: { stage: Enums['stage_kind']; status: Enums['stage_status'] }[];
  /** origin is set by the database: 'visitor' for sandbox visitor decisions (A8). */
  decisions: { id: number; decidedAt: string; decision: string; decidedBy: string; origin: Enums['record_origin'] }[];
}

/** Returns null when no launch has this id. */
export async function fetchLaunchOverview(client: Client, launchId: number): Promise<LaunchOverview | null> {
  const [launch, gates, risks, stages, currentStage, latestDecisions, gateDecisions, sandbox] = await Promise.all([
    client.from('launches').select('id, name, owner, target_date, source_launch_id').eq('id', launchId).maybeSingle(),
    client
      .from('gates')
      .select('id, category, title, owner, required, status, evidence(id)')
      .eq('launch_id', launchId),
    client
      .from('risks')
      .select('id, title, likelihood, impact, owner')
      .eq('launch_id', launchId)
      .eq('status', 'Open')
      .eq('impact', 'High')
      .order('id'),
    client.from('rollout_stages').select('stage, status').eq('launch_id', launchId),
    client.from('launch_current_stage').select('stage, status').eq('launch_id', launchId).maybeSingle(),
    client
      .from('decisions')
      .select('id, decided_at, decision, decided_by, origin')
      .eq('launch_id', launchId)
      .order('decided_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(5),
    // Newest first, so the first row per gate is that gate's latest decision.
    client
      .from('decisions')
      .select('gate_id, rationale')
      .eq('launch_id', launchId)
      .not('gate_id', 'is', null)
      .order('decided_at', { ascending: false })
      .order('id', { ascending: false }),
    // The sandbox that copies this launch; none for a sandbox launch.
    client.from('launches').select('id').eq('source_launch_id', launchId).maybeSingle(),
  ]);

  const failed = [launch, gates, risks, stages, currentStage, latestDecisions, gateDecisions, sandbox].find((r) => r.error);
  if (failed?.error) throw toDataError(failed.error);
  if (!launch.data) return null;

  const latestRationale = latestRationaleByGate(gateDecisions.data ?? []);
  const overviewGates = sortGates(
    (gates.data ?? []).map((g) => ({
      id: g.id,
      category: g.category,
      title: g.title,
      owner: g.owner,
      required: g.required,
      status: g.status,
      evidenceCount: g.evidence.length,
      latestRationale: latestRationale.get(g.id) ?? null,
    })),
  );
  const stageOrder = Constants.public.Enums.stage_kind;
  const current = currentStage.data;

  return {
    launch: {
      id: launch.data.id,
      name: launch.data.name,
      owner: launch.data.owner,
      targetDate: launch.data.target_date,
      sourceLaunchId: launch.data.source_launch_id,
    },
    sandboxLaunchId: sandbox.data?.id ?? null,
    currentStage: current?.stage && current.status ? { stage: current.stage, status: current.status } : null,
    gates: overviewGates,
    readiness: computeReadiness(overviewGates),
    risks: risks.data ?? [],
    stages: [...(stages.data ?? [])].sort((a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage)),
    decisions: (latestDecisions.data ?? []).map((d) => ({
      id: d.id,
      decidedAt: d.decided_at,
      decision: d.decision,
      decidedBy: d.decided_by,
      origin: d.origin,
    })),
  };
}

/** Rows must be newest first; keeps the first rationale seen for each gate. */
export function latestRationaleByGate(rows: readonly { gate_id: number | null; rationale: string }[]): Map<number, string> {
  const latest = new Map<number, string>();
  for (const row of rows) {
    if (row.gate_id !== null && !latest.has(row.gate_id)) latest.set(row.gate_id, row.rationale);
  }
  return latest;
}

/** Category enum order, then creation order within a category. */
export function sortGates<G extends { category: Enums['gate_category']; id: number }>(gates: readonly G[]): G[] {
  const order = Constants.public.Enums.gate_category;
  return [...gates].sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.id - b.id);
}

/** What a blocking gate is missing, built only from stored facts. */
export function missingLine(gate: Pick<OverviewGate, 'status' | 'evidenceCount' | 'latestRationale'>): string {
  const evidence =
    gate.evidenceCount === 0
      ? 'No evidence'
      : `${gate.evidenceCount} evidence ${gate.evidenceCount === 1 ? 'item' : 'items'}`;
  const parts: string[] = [gate.status, evidence];
  if (gate.latestRationale) parts.push(`Latest decision: ${gate.latestRationale}`);
  return parts.join(' · ');
}
