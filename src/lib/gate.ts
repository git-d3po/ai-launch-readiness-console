// The gate sheet's data and actions (A4; reconciliation record section 19,
// "Visitor write UI" and "UI contract resolutions"). Reads go through the
// tables the API roles can SELECT; writes go only through the two sandbox
// functions. Every error is a DataError (A1), so the UI shows P0001 messages
// verbatim and everything else generically.
import type { Database } from './database.types';
import { toDataError } from './errors';
import type { Client } from './supabase';

type Enums = Database['public']['Enums'];

/** Per-gate visitor limits enforced by the database (DR-018); mirrored here only to replace the forms. */
export const visitorEvidenceCap = 10;
export const visitorDecisionCap = 20;

export interface GateEvidence {
  id: number;
  type: Enums['evidence_type'];
  title: string;
  summary: string;
  source: string | null;
  recordedOn: string | null;
  origin: Enums['record_origin'];
}

export interface GateSheet {
  id: number;
  launchId: number;
  category: Enums['gate_category'];
  title: string;
  owner: string;
  required: boolean;
  status: Enums['gate_status'];
  passCriteria: string;
  waiverRationale: string | null;
  /** Newest first. */
  evidence: GateEvidence[];
  visitorEvidenceCount: number;
  visitorDecisionCount: number;
}

/** Returns null when the launch has no gate with this id. */
export async function fetchGateSheet(client: Client, launchId: number, gateId: number): Promise<GateSheet | null> {
  const [gate, evidence, decisions] = await Promise.all([
    client
      .from('gates')
      .select('id, launch_id, category, title, owner, required, status, pass_criteria, waiver_rationale')
      .eq('id', gateId)
      .eq('launch_id', launchId)
      .maybeSingle(),
    client
      .from('evidence')
      .select('id, type, title, summary, source, recorded_on, origin')
      .eq('gate_id', gateId)
      .order('recorded_on', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false }),
    client.from('decisions').select('origin').eq('gate_id', gateId),
  ]);
  const failed = [gate, evidence, decisions].find((r) => r.error);
  if (failed?.error) throw toDataError(failed.error);
  if (!gate.data) return null;

  const rows = evidence.data ?? [];
  return {
    id: gate.data.id,
    launchId: gate.data.launch_id,
    category: gate.data.category,
    title: gate.data.title,
    owner: gate.data.owner,
    required: gate.data.required,
    status: gate.data.status,
    passCriteria: gate.data.pass_criteria,
    waiverRationale: gate.data.waiver_rationale,
    evidence: rows.map((e) => ({
      id: e.id,
      type: e.type,
      title: e.title,
      summary: e.summary,
      source: e.source,
      recordedOn: e.recorded_on,
      origin: e.origin,
    })),
    visitorEvidenceCount: rows.filter((e) => e.origin === 'visitor').length,
    visitorDecisionCount: (decisions.data ?? []).filter((d) => d.origin === 'visitor').length,
  };
}

export interface EvidenceInput {
  type: Enums['evidence_type'] | '';
  title: string;
  summary: string;
  source: string;
}

export interface StatusInput {
  newStatus: Enums['gate_status'] | '';
  rationale: string;
  waiverRationale: string;
}

// Lengths are counted in code points, as Postgres counts characters.
const length = (value: string) => [...value].length;

/** Field errors for the add-evidence form (section 19); empty when the input may be sent. */
export function validateEvidence(input: EvidenceInput): Partial<Record<keyof EvidenceInput, string>> {
  const errors: Partial<Record<keyof EvidenceInput, string>> = {};
  const title = input.title.trim();
  const summary = input.summary.trim();
  const source = input.source.trim();
  if (input.type === '') errors.type = 'Choose an evidence type.';
  if (title === '') errors.title = 'Enter a title.';
  else if (/[\r\n]/.test(title)) errors.title = 'The title must be a single line.';
  else if (length(title) > 200) errors.title = 'The title can be at most 200 characters.';
  if (summary === '') errors.summary = 'Enter a summary.';
  else if (length(summary) > 2000) errors.summary = 'The summary can be at most 2000 characters.';
  if (source !== '') {
    if (length(source) > 500) errors.source = 'The source can be at most 500 characters.';
    else if (!isHttpsUrl(source)) errors.source = 'The source must be an https:// address.';
  }
  return errors;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Field errors for the change-status form (section 19); empty when the input may be sent. */
export function validateStatusChange(input: StatusInput): Partial<Record<keyof StatusInput, string>> {
  const errors: Partial<Record<keyof StatusInput, string>> = {};
  const rationale = input.rationale.trim();
  const waiver = input.waiverRationale.trim();
  if (input.newStatus === '') errors.newStatus = 'Choose a new status.';
  if (rationale === '') errors.rationale = 'Enter a rationale.';
  else if (length(rationale) > 2000) errors.rationale = 'The rationale can be at most 2000 characters.';
  if (input.newStatus === 'Waived') {
    if (waiver === '') errors.waiverRationale = 'Enter the waiver text.';
    else if (length(waiver) > 2000) errors.waiverRationale = 'The waiver text can be at most 2000 characters.';
  }
  return errors;
}

export interface StatusChoice {
  status: Enums['gate_status'];
  /** Why the choice is unavailable, shown with it; null when it can be chosen. */
  disabledReason: string | null;
}

/** Every status except the current one; Passed needs evidence of either origin (section 19, I8). */
export function statusChoices(current: Enums['gate_status'], evidenceCount: number, all: readonly Enums['gate_status'][]): StatusChoice[] {
  return all
    .filter((status) => status !== current)
    .map((status) => ({
      status,
      disabledReason: status === 'Passed' && evidenceCount === 0 ? 'Add evidence first' : null,
    }));
}

/** Adds one visitor evidence item to a sandbox gate. A blank source is omitted, so the database defaults it to null. */
export async function addSandboxEvidence(
  client: Client,
  gateId: number,
  input: EvidenceInput & { type: Enums['evidence_type'] },
): Promise<number> {
  const source = input.source.trim();
  const { data, error } = await client.rpc('sandbox_add_evidence', {
    gate_id: gateId,
    type: input.type,
    title: input.title.trim(),
    summary: input.summary.trim(),
    ...(source === '' ? {} : { source }),
  });
  if (error) throw toDataError(error);
  return data;
}

/** Changes a sandbox gate's status. Waiver text is sent only for Waived; otherwise it is omitted. */
export async function setSandboxGateStatus(
  client: Client,
  gateId: number,
  input: StatusInput & { newStatus: Enums['gate_status'] },
): Promise<number> {
  const { data, error } = await client.rpc('sandbox_set_gate_status', {
    gate_id: gateId,
    new_status: input.newStatus,
    rationale: input.rationale.trim(),
    ...(input.newStatus === 'Waived' ? { waiver_rationale: input.waiverRationale.trim() } : {}),
  });
  if (error) throw toDataError(error);
  return data;
}
