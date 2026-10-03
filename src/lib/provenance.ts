import type { Database } from './database.types';

type Enums = Database['public']['Enums'];

// A5 (DR-015; reconciliation record section 9 and section 19): the provenance
// label on listed evidence and decisions. The row's `origin` is the only
// authority: a seed row copied into the sandbox stays seed and is unlabeled,
// and nothing else (the launch, the decider, the source, dates, ids) decides it.

export const visitorLabel = 'Visitor';

/** The label a listed evidence item or decision carries; null for a seed row. */
export function provenanceLabel(row: { origin: Enums['record_origin'] }): typeof visitorLabel | null {
  return row.origin === 'visitor' ? visitorLabel : null;
}
