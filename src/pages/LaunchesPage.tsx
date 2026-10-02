import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { focusRing } from '../components/AppShell';
import { fetchLaunchRows, formatTargetDate, type LaunchRow } from '../lib/launches';
import { supabase } from '../lib/supabase';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; rows: LaunchRow[] };

const notConfigured =
  'The Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.';

export function LaunchesPage() {
  const [state, setState] = useState<LoadState>(() =>
    supabase ? { status: 'loading' } : { status: 'error', message: notConfigured },
  );

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    fetchLaunchRows(supabase)
      .then((rows) => !cancelled && setState({ status: 'success', rows }))
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Launches</h1>
      <p className="mt-1 max-w-prose text-sm text-zinc-600 dark:text-zinc-400">
        Readiness is computed from each launch's gates. A launch is Ready only when every required gate is Passed or
        Waived.
      </p>
      <div className="mt-6">
        {state.status === 'loading' && (
          <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">
            Loading launches…
          </p>
        )}
        {state.status === 'error' && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
          >
            <p className="font-medium">Could not load launches.</p>
            <p className="mt-1 break-words">{state.message}</p>
          </div>
        )}
        {state.status === 'success' && state.rows.length === 0 && (
          <p className="rounded-md border border-zinc-200 px-3 py-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            No launches yet.
          </p>
        )}
        {state.status === 'success' && state.rows.length > 0 && <LaunchesTable rows={state.rows} />}
      </div>
    </>
  );
}

const th = 'px-3 py-2 font-medium whitespace-nowrap';
const td = 'px-3 py-3 whitespace-nowrap';

function LaunchesTable({ rows }: { rows: LaunchRow[] }) {
  return (
    // The table scrolls inside this container on narrow screens; the page never does.
    <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Launches with readiness computed from their gates</caption>
        <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th scope="col" className={th}>Launch</th>
            <th scope="col" className={th}>Owner</th>
            <th scope="col" className={th}>Target date</th>
            <th scope="col" className={th}>Rollout stage</th>
            <th scope="col" className={th}>Readiness</th>
            <th scope="col" className={`${th} text-right`}>Blockers</th>
            <th scope="col" className={th}>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row" className={`${td} font-medium`}>
                <Link
                  to={`/launches/${row.id}`}
                  className={`rounded-sm text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100 ${focusRing}`}
                >
                  {row.name}
                </Link>
              </th>
              <td className={td}>{row.owner}</td>
              <td className={`${td} ${row.targetDate === null ? 'text-zinc-500 dark:text-zinc-400' : ''}`}>
                {formatTargetDate(row.targetDate)}
              </td>
              <td className={td}>
                {row.currentStage ? `${row.currentStage.stage} · ${row.currentStage.status}` : 'All stages completed'}
              </td>
              <td className={`${td} tabular-nums`}>{row.readiness.label}</td>
              <td className={`${td} text-right tabular-nums`}>{row.readiness.blocking.length}</td>
              <td className={td}>
                <StatusBadge status={row.readiness.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: 'Ready' | 'Not ready' }) {
  const color =
    status === 'Ready'
      ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/30 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-400/30'
      : 'bg-red-50 text-red-800 ring-red-600/30 dark:bg-red-950 dark:text-red-300 dark:ring-red-400/30';
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${color}`}>{status}</span>;
}
