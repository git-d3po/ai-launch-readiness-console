import type { Database } from './database.types';

type Enums = Database['public']['Enums'];

// A6 (DR-017, invariant I16; reconciliation record section 19, Source links):
// how an evidence item's `source` is shown. The rule depends on the row's
// origin, not on the launch, so seed rows copied into the sandbox follow the
// seed rule.
// - visitor origin: always plain text, never a link;
// - seed origin: a link only if new URL(source).protocol === 'https:', with
//   rel="noopener noreferrer nofollow" and no target; anything else is plain text.
// Callers render `text` as a React text node.

export const sourceLinkRel = 'noopener noreferrer nofollow';

export type SourceView =
  | { kind: 'none' }
  | { kind: 'text'; text: string }
  | { kind: 'link'; text: string; href: string; rel: typeof sourceLinkRel };

/** How to show an evidence item's source; `none` when it has no source. */
export function sourceView(evidence: { source: string | null; origin: Enums['record_origin'] }): SourceView {
  const { source, origin } = evidence;
  if (source === null) return { kind: 'none' };
  if (origin !== 'seed') return { kind: 'text', text: source };
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return { kind: 'text', text: source };
  }
  if (url.protocol !== 'https:') return { kind: 'text', text: source };
  // href is the parsed URL, exactly what the browser would follow; the text
  // shown is the stored value.
  return { kind: 'link', text: source, href: url.href, rel: sourceLinkRel };
}
