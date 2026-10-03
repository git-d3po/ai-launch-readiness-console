// Test support only: a real supabase-js client whose HTTP requests are answered
// in memory, so tests exercise supabase-js's own request building and response
// parsing without a network or a database.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type Reply = { status: number; body: unknown };

export const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };

/** What a request carried: its method and its JSON body, if any. */
export type Sent = { method: string; body: unknown };

/** A typed client whose requests are answered by `route(path, url, sent)`, e.g. path '/rest/v1/launches'. */
export function clientAnswering(route: (path: string, url: URL, sent: Sent) => Reply) {
  const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined;
    const reply = route(url.pathname, url, { method: init?.method ?? 'GET', body });
    return new Response(JSON.stringify(reply.body), {
      status: reply.status,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  return createClient<Database>('http://localhost.test', 'test-publishable-key', { ...clientOptions, global: { fetch } });
}
