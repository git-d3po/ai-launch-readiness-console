// The sandbox reset (A7; reconciliation record section 19, Reset UX). The
// client calls only sandbox_reset(), which takes no arguments; the database
// decides everything else: what is deleted and restored, the 5-minute
// cooldown, and concurrent resets. The client keeps no cooldown timer of its
// own, so nothing local can suggest a reset is allowed.
import { DataError, toDataError, userMessage } from './errors';
import type { Client } from './supabase';

export const resetConfirmation =
  'Reset the sandbox? This removes all visitor evidence and decisions on the sandbox launch and restores its gates. It affects everyone using the sandbox. The canonical launch is never changed.';

export const resetSucceeded = 'Sandbox reset';

/** Calls sandbox_reset() with no arguments. Every error is a DataError (A1). */
export async function resetSandbox(client: Client): Promise<void> {
  const { error } = await client.rpc('sandbox_reset');
  if (error) throw toDataError(error);
}

/**
 * What a reset attempt ended in. Every outcome refreshes the pages: the
 * sandbox is shared, so even a refused reset may follow another visitor's.
 * - done: the reset ran; "Sandbox reset".
 * - rejected: the database refused it on purpose (P0001), shown verbatim. The
 *   reason isn't read from the text: it may be the cooldown, or another
 *   visitor's reset that won the race, so the refresh only reconciles state
 *   and never means this reset ran.
 * - failed: anything else, shown as "Could not reset the sandbox (code X)";
 *   the outcome is unknown.
 */
export type ResetOutcome =
  | { kind: 'done'; message: typeof resetSucceeded; refresh: true }
  | { kind: 'rejected'; message: string; refresh: true }
  | { kind: 'failed'; message: string; refresh: true };

export async function runReset(client: Client): Promise<ResetOutcome> {
  try {
    await resetSandbox(client);
    return { kind: 'done', message: resetSucceeded, refresh: true };
  } catch (error) {
    if (error instanceof DataError && error.applicationMessage !== null) {
      return { kind: 'rejected', message: error.applicationMessage, refresh: true };
    }
    return { kind: 'failed', message: userMessage(error, 'Could not reset the sandbox'), refresh: true };
  }
}
