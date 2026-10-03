import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Browser-safe values only: the project URL and the publishable (anon) key.
// The service role key must never reach client code.
const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export type Client = ReturnType<typeof createClient<Database>>;

// No sign-in in Phase 1, so nothing is persisted to browser storage.
export const supabase: Client | null =
  url && publishableKey
    ? createClient<Database>(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;
