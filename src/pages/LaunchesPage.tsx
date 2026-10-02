import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { focusRing } from '../components/AppShell';
import { StatusChip } from '../components/StatusChip';
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

  const rows = state.status === 'success' ? state.rows : [];
  const notReady = rows.filter((row) => row.readiness.status === 'Not ready').length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-[15px] font-semibold tracking-tight">Launches</h1>
        {rows.length > 0 &&
          (notReady > 0 ? (
            <StatusChip tone="danger">{notReady} not ready</StatusChip>
          ) : (
            <StatusChip tone="success">All ready</StatusChip>
          ))}
      </div>
      <div className="mt-4">
        {state.status === 'loading' && (
          <p role="status" className="rounded-md border border-line bg-card px-3 py-6 text-center text-muted">
            Loading launches…
          </p>
        )}
        {state.status === 'error' && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
            <p className="font-medium">Could not load launches.</p>
            <p className="mt-1 break-words">{state.message}</p>
          </div>
        )}
        {state.status === 'success' && rows.length === 0 && (
          <p className="rounded-md border border-line bg-card px-3 py-6 text-center text-muted">No launches yet.</p>
        )}
        {rows.length > 0 && <LaunchesTable rows={rows} />}
      </div>
    </>
  );
}

const th = 'px-3 py-2 font-medium whitespace-nowrap';
const td = 'px-3 py-2.5 whitespace-nowrap';

function LaunchesTable({ rows }: { rows: LaunchRow[] }) {
  return (
    // The table scrolls inside this container on narrow screens; the page never does.
    <div className="overflow-x-auto rounded-md border border-line bg-card">
      <table className="w-full text-left">
        <caption className="sr-only">Launches with readiness computed from their gates</caption>
        <thead className="border-b border-line text-muted">
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
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row" className={`${td} font-medium`}>
                <Link
                  to={`/launches/${row.id}`}
                  className={`rounded-sm text-accent underline-offset-2 hover:underline ${focusRing}`}
                >
                  {row.name}
                </Link>
              </th>
              <td className={td}>{row.owner}</td>
              <td className={`${td} ${row.targetDate === null ? 'text-muted' : ''}`}>{formatTargetDate(row.targetDate)}</td>
              <td className={td}>
                {row.currentStage ? `${row.currentStage.stage} · ${row.currentStage.status}` : 'All stages completed'}
              </td>
              <td className={td}>{row.readiness.label}</td>
              <td className={`${td} text-right`}>{row.readiness.blocking.length}</td>
              <td className={td}>
                <StatusChip tone={row.readiness.status === 'Ready' ? 'success' : 'danger'}>{row.readiness.status}</StatusChip>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
