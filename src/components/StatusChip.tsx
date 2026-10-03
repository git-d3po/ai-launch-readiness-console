import type { ReactNode } from 'react';
import type { GateStatus } from '../domain/readiness';

export type ChipTone = 'success' | 'danger' | 'neutral';

// Status colors only: emerald for success, red for danger, stone tokens for everything else.
const tones: Record<ChipTone, string> = {
  success:
    'bg-emerald-50 text-emerald-800 ring-emerald-700/25 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-400/25',
  danger: 'bg-red-50 text-red-800 ring-red-700/25 dark:bg-red-950 dark:text-red-300 dark:ring-red-400/25',
  neutral: 'bg-page text-fg ring-line',
};

export function StatusChip({ tone, children }: { tone: ChipTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex rounded-md px-1.5 py-px font-medium whitespace-nowrap ring-1 ring-inset motion-safe:animate-fade-in ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function gateTone(status: GateStatus): ChipTone {
  if (status === 'Passed') return 'success';
  if (status === 'Failed') return 'danger';
  return 'neutral';
}
