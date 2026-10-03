import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useOutlet, useParams } from 'react-router';
import { focusRing, useRefresh } from '../components/AppShell';
import { ProvenanceLabel } from '../components/ProvenanceLabel';
import { SandboxBanner } from '../components/SandboxBanner';
import { gateTone, StatusChip } from '../components/StatusChip';
import { Constants } from '../lib/database.types';
import { formatTargetDate } from '../lib/launches';
import { fetchLaunchOverview, type LaunchOverview, missingLine, type OverviewGate } from '../lib/overview';
import { userMessage } from '../lib/errors';
import { keepsContentOnFailure, showsLoading } from '../lib/refresh';
import { supabase } from '../lib/supabase';
import type { GateSheetContext } from './GateSheet';
import { NotFound } from './NotFound';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'not-found' }
  | { status: 'success'; overview: LaunchOverview; refreshError: string | null };

const notConfigured =
  'The Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.';

export function LaunchOverviewPage() {
  const { launchId } = useParams();
  const id = launchId && /^\d+$/.test(launchId) ? Number(launchId) : null;
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const { refreshKey, refresh } = useRefresh();
  // The launch the data on screen belongs to; a refresh of it keeps the content.
  const shownId = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (id === null) {
      setState({ status: 'not-found' });
      return;
    }
    if (!supabase) {
      setState({ status: 'error', message: notConfigured });
      return;
    }
    let cancelled = false;
    const isRefresh = !showsLoading(shownId.current, id);
    if (!isRefresh) setState({ status: 'loading' });
    fetchLaunchOverview(supabase, id)
      .then((overview) => {
        if (cancelled) return;
        shownId.current = id;
        setState(overview ? { status: 'success', overview, refreshError: null } : { status: 'not-found' });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        shownId.current = id;
        const message = userMessage(error, 'Could not load data');
        // A failed refresh keeps the overview on screen and reports the failure beside it.
        setState((prev) =>
          keepsContentOnFailure(isRefresh, prev.status === 'success') && prev.status === 'success'
            ? { ...prev, refreshError: message }
            : { status: 'error', message },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [id, refreshKey]);

  // The nested gate sheet route, given the launch and the refresh signal.
  const sheetContext: GateSheetContext | null =
    state.status === 'success'
      ? { launch: state.overview.launch, sandboxLaunchId: state.overview.sandboxLaunchId, refreshKey, refresh }
      : null;
  const sheet = useOutlet(sheetContext);

  if (state.status === 'not-found') return <NotFound />;
  if (state.status === 'loading') return <Panel role="status">Loading launch…</Panel>;
  if (state.status === 'error') {
    return (
      <div
        role="alert"
        className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
      >
        <p className="font-medium">Could not load this launch.</p>
        <p className="mt-1 break-words">{state.message}</p>
      </div>
    );
  }
  return (
    <>
      {/* While the gate sheet is open, the overview behind it is inert. */}
      <div inert={sheet !== null}>
        {state.refreshError && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
          >
            <p className="font-medium">Could not refresh this launch.</p>
            <p className="mt-1 break-words">{state.refreshError}</p>
          </div>
        )}
        <Overview overview={state.overview} />
      </div>
      {state.status === 'success' && sheet}
    </>
  );
}

function Overview({ overview }: { overview: LaunchOverview }) {
  const { launch, readiness, gates } = overview;
  const hasGates = gates.length > 0;

  return (
    <>
      {launch.sourceLaunchId !== null && (
        <div className="mb-4">
          <SandboxBanner />
        </div>
      )}
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[15px] font-semibold tracking-tight break-words">{launch.name}</h1>
          {hasGates && (
            <StatusChip tone={readiness.status === 'Ready' ? 'success' : 'danger'}>{readiness.status}</StatusChip>
          )}
        </div>
        <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
          <Meta label="Owner">{launch.owner}</Meta>
          <Meta label="Target">{formatTargetDate(launch.targetDate)}</Meta>
          <Meta label="Stage">
            {overview.currentStage
              ? `${overview.currentStage.stage} · ${overview.currentStage.status}`
              : overview.stages.length === 0
                ? 'No rollout stages'
                : 'All stages completed'}
          </Meta>
          <Meta label="Readiness">{readiness.label}</Meta>
        </dl>
        {launch.sourceLaunchId === null && overview.sandboxLaunchId !== null && (
          // Canonical pages show no write controls and link to the sandbox launch (A4).
          <p className="mt-2">
            <Link
              to={`/launches/${overview.sandboxLaunchId}`}
              className={`rounded-sm text-accent underline-offset-2 hover:underline ${focusRing}`}
            >
              Try this in the sandbox
            </Link>
          </p>
        )}
      </header>

      <Section title="Blocking launch" count={hasGates ? readiness.blocking.length : undefined}>
        {!hasGates ? (
          <Panel>No gates are defined for this launch, so readiness cannot be assessed.</Panel>
        ) : readiness.blocking.length === 0 ? (
          <Panel>Nothing blocks this launch. Every required gate is Passed or Waived.</Panel>
        ) : (
          <ul className="divide-y divide-line rounded-md border border-line bg-card">
            {readiness.blocking.map((gate) => (
              <li key={gate.id} className="px-3 py-2.5">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <GateLink launchId={launch.id} gate={gate} />
                  <span className="text-muted">{gate.owner}</span>
                </div>
                <p className="mt-0.5 break-words text-muted">{missingLine(gate)}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Gates by category">
        {hasGates ? <GatesTable launchId={launch.id} gates={gates} /> : <Panel>No gates yet.</Panel>}
      </Section>

      <Section title="Open high-impact risks">
        {overview.risks.length === 0 ? (
          <Panel>No open high-impact risks.</Panel>
        ) : (
          <TableBox caption="Open risks with High impact">
            <thead className="border-b border-line text-muted">
              <tr>
                <th scope="col" className={th}>Risk</th>
                <th scope="col" className={th}>Likelihood</th>
                <th scope="col" className={th}>Impact</th>
                <th scope="col" className={th}>Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {overview.risks.map((risk) => (
                <tr key={risk.id}>
                  <th scope="row" className={`${td} font-normal`}>{risk.title}</th>
                  <td className={td}>{risk.likelihood}</td>
                  <td className={td}>{risk.impact}</td>
                  <td className={td}>{risk.owner}</td>
                </tr>
              ))}
            </tbody>
          </TableBox>
        )}
      </Section>

      <Section title="Rollout stages">
        {overview.stages.length === 0 ? (
          <Panel>No rollout stages defined.</Panel>
        ) : (
          <ol className="grid gap-2 sm:grid-cols-3">
            {overview.stages.map((s) => (
              <li key={s.stage} className="rounded-md border border-line bg-card px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{s.stage}</span>
                  {overview.currentStage?.stage === s.stage && <span className="text-muted">Current</span>}
                </div>
                <p className="mt-0.5 text-muted">{s.status}</p>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Latest decisions">
        {overview.decisions.length === 0 ? (
          <Panel>No decisions recorded.</Panel>
        ) : (
          <ul className="divide-y divide-line rounded-md border border-line bg-card">
            {overview.decisions.map((d) => (
              <li key={d.id} className="grid gap-x-4 gap-y-0.5 px-3 py-2.5 sm:grid-cols-[7rem_1fr_auto]">
                <time dateTime={d.decidedAt} className="text-muted">
                  {formatDecisionDate(d.decidedAt)}
                </time>
                <span className="break-words">{d.decision}</span>
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-muted">{d.decidedBy}</span>
                  <ProvenanceLabel origin={d.origin} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

function GatesTable({ launchId, gates }: { launchId: number; gates: OverviewGate[] }) {
  const categories = Constants.public.Enums.gate_category.filter((c) => gates.some((g) => g.category === c));
  return (
    <TableBox caption="Gates grouped by category">
      <thead className="text-muted">
        <tr>
          <th scope="col" className={th}>Gate</th>
          <th scope="col" className={th}>Owner</th>
          <th scope="col" className={th}>Required</th>
          <th scope="col" className={`${th} text-right`}>Evidence</th>
          <th scope="col" className={th}>Status</th>
        </tr>
      </thead>
      {categories.map((category) => (
        <tbody key={category}>
          <tr className="border-t border-line bg-page">
            <th scope="colgroup" colSpan={5} className="px-3 py-1.5 font-medium text-muted">
              {category}
            </th>
          </tr>
          {gates
            .filter((g) => g.category === category)
            .map((gate) => (
              <tr key={gate.id} className="border-t border-line">
                <th scope="row" className={`${td} font-normal`}>
                  <GateLink launchId={launchId} gate={gate} />
                </th>
                <td className={td}>{gate.owner}</td>
                <td className={td}>{gate.required ? 'Required' : 'Optional'}</td>
                <td className={`${td} text-right`}>{gate.evidenceCount}</td>
                <td className={td}>
                  <StatusChip tone={gateTone(gate.status)}>{gate.status}</StatusChip>
                </td>
              </tr>
            ))}
        </tbody>
      ))}
    </TableBox>
  );
}

const th = 'px-3 py-2 font-medium whitespace-nowrap';
const td = 'px-3 py-2.5 whitespace-nowrap';

function GateLink({ launchId, gate }: { launchId: number; gate: OverviewGate }) {
  return (
    <Link
      to={`/launches/${launchId}/gates/${gate.id}`}
      className={`rounded-sm text-accent underline-offset-2 hover:underline ${focusRing}`}
    >
      {gate.title}
    </Link>
  );
}

// Wide tables scroll inside this container; the page never does.
function TableBox({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border border-line bg-card">
      <table className="w-full text-left">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="font-semibold">
        {title}
        {count !== undefined && <span className="ml-1.5 font-normal text-muted">{count}</span>}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Panel({ role, children }: { role?: 'status'; children: ReactNode }) {
  return (
    <p role={role} className="rounded-md border border-line bg-card px-3 py-3 text-muted">
      {children}
    </p>
  );
}

function formatDecisionDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
