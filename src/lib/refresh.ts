// Refresh rule (A3 to A7, reconciliation record section 19, Refetch): a fetch
// shows the loading state only when the data on screen belongs to another key,
// that is an initial load or a route change. A refresh of the same key keeps the
// rendered content until the replacement data arrives.

/** True when a fetch for `key` should first replace the screen with the loading state. */
export function showsLoading<K>(shownKey: K | undefined, key: K): boolean {
  return shownKey !== key;
}
