import type { Database } from '../lib/database.types';
import { provenanceLabel } from '../lib/provenance';
import { StatusChip } from './StatusChip';

// The A5 "Visitor" label, in the neutral chip the A3 "Sandbox" badge uses:
// provenance is not a status, so it never takes a status color.
export function ProvenanceLabel({ origin }: { origin: Database['public']['Enums']['record_origin'] }) {
  const label = provenanceLabel({ origin });
  return label === null ? null : <StatusChip tone="neutral">{label}</StatusChip>;
}
