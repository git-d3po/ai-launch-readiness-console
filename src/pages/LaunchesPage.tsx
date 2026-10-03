import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { focusRing, useRefresh } from '../components/AppShell';
import { StatusChip } from '../components/StatusChip';
import {
  canonicalLaunches,
  fetchLaunchRows,
  formatTargetDate,
  launchesFailed,
  launchesLoaded,
  type LaunchesState,
  type LaunchRow,
} from '../lib/launches';
import { userMessage } from '../lib/errors';
import { showsLoading } from '../lib/refresh';
import { supabase } from '../lib/supabase';

const notConfigured =
  'The Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.';

export function LaunchesPage() {
  const { refreshKey } = useRefresh();
  const [state, setState] = useState<LaunchesState>(() =>
    supabase ? { status: 'loading' } : { status: 'error', message: notConfigured },
  );
  // Whether the list on screen came from a fetch; a later fetch is then a refresh and keeps it (A7).
  const shown = useRef<'list' | undefined>(undefined);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    const isRefresh = !showsLoading(shown.current, 'list');
    fetchLaunchRows(supabase)
      .then((rows) => {
        if (cancelled) return;
        shown.current = 'list';
        setState(launchesLoaded(rows));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        shown.current = 'list';
        const message = userMessage(error, 'Could not load data');
        setState((prev) => launchesFailed(prev, isRefresh, message));
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const rows = state.status === 'success' ? state.rows : [];
  // The title chip counts canonical launches only (A3).
  const canonical = canonicalLaunches(rows);
  const notReady = canonical.filter((row) => row.readiness.status === 'Not ready').length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-[15px] font-semibold tracking-tight">Launches</h1>
        {canonical.length > 0 &&
          (notReady > 0 ? (
            <StatusChip tone="danger">{notReady} not ready</StatusChip>
          ) : (
            <StatusChip tone="success">All ready</StatusChip>
          ))}
      </div>
      <p className="mt-1 max-w-2xl text-muted">
        Each launch moves through gates. Readiness is computed from gate status and evidence. Open a launch to review
        its gates, risks, rollout and decisions.
      </p>
      <div className="mt-4">
        {state.status === 'success' && state.refreshError && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
          >
            <p className="font-medium">Could not refresh launches.</p>
            <p className="mt-1 break-words">{state.refreshError}</p>
          </div>
        )}
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

const th = 'px-3 py-2 text-[12px] font-medium whitespace-nowrap';
const td = 'px-3 py-2.5 whitespace-nowrap';

function LaunchesTable({ rows }: { rows: LaunchRow[] }) {
  return (
    // The table scrolls inside this container on narrow screens; the page never does.
    <div className="overflow-x-auto rounded-md border border-line bg-card">
      <table className="w-full text-left">
        <caption className="sr-only">Launches with readiness computed from their gates</caption>
        <thead className="border-b border-line bg-page/60 text-muted">
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
            <tr key={row.id} className="hover:bg-page/60">
              <th scope="row" className={`${td} font-medium`}>
                <Link
                  to={`/launches/${row.id}`}
                  className={`rounded-sm text-accent underline-offset-2 hover:underline ${focusRing}`}
                >
                  {row.name}
                </Link>
                {row.sourceLaunchId !== null && (
                  <>
                    {' '}
                    <span className="ml-1">
                      <StatusChip tone="neutral">Sandbox</StatusChip>
                    </span>
                  </>
                )}
              </th>
              <td className={td}>{row.owner}</td>
              <td className={`${td} ${row.targetDate === null ? 'text-muted' : ''}`}>{formatTargetDate(row.targetDate)}</td>
              <td className={td}>
                {row.currentStage ? `${row.currentStage.stage} · ${row.currentStage.status}` : 'All stages completed'}
              </td>
              <td className={td}>{row.readiness.label}</td>
              <td className={`${td} text-right ${row.readiness.blocking.length === 0 ? 'text-muted' : 'font-medium'}`}>{row.readiness.blocking.length}</td>
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
