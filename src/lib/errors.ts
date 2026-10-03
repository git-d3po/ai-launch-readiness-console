// The one place a database error becomes something the UI may show (A1,
// invariant I18; contract in docs/security/2026-10-02-audit-2b-reconcile.md,
// section 19).
//
// SQLSTATE P0001 is a message a database function raised on purpose, written
// to be shown to the user, so it is kept verbatim. Every other error keeps only
// its code: constraint violations (23514, 23502), permission errors, network
// failures and anything unexpected. Their message, details and hint can name
// constraints and echo whole rows, so they never leave this module.

/** An error from the data layer. `message` never holds raw database text. */
export class DataError extends Error {
  /** SQLSTATE or PostgREST code, when the response carried a well-formed one. */
  readonly code: string | null;
  /** The verbatim P0001 message; null for every other error. */
  readonly applicationMessage: string | null;

  constructor(code: string | null, applicationMessage: string | null) {
    super(applicationMessage ?? (code ? `Database error (code ${code})` : 'Database error'));
    this.name = 'DataError';
    this.code = code;
    this.applicationMessage = applicationMessage;
  }
}

// Codes are shown to the user, so only accept the two known shapes: a
// five-character SQLSTATE or a PostgREST code such as PGRST116.
const sqlstate = /^[0-9A-Z]{5}$/;
const postgrestCode = /^PGRST\d{3}$/;

/** Converts a PostgREST error (the `error` of a supabase-js result) to a DataError. */
export function toDataError(error: { code?: unknown; message?: unknown }): DataError {
  const code =
    typeof error.code === 'string' && (sqlstate.test(error.code) || postgrestCode.test(error.code)) ? error.code : null;
  const applicationMessage =
    code === 'P0001' && typeof error.message === 'string' && error.message !== '' ? error.message : null;
  return new DataError(code, applicationMessage);
}

/**
 * What to show for a failed operation: a P0001 message verbatim, otherwise the
 * caller's generic text with the error code, e.g. "Could not load data (code 23514)".
 */
export function userMessage(error: unknown, generic: string): string {
  if (error instanceof DataError) {
    if (error.applicationMessage !== null) return error.applicationMessage;
    if (error.code !== null) return `${generic} (code ${error.code})`;
  }
  return generic;
}
