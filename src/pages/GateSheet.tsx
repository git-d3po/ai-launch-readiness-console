import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router';
import { focusRing, type RefreshContext } from '../components/AppShell';
import { ProvenanceLabel } from '../components/ProvenanceLabel';
import { SandboxBanner } from '../components/SandboxBanner';
import { gateTone, StatusChip } from '../components/StatusChip';
import { Constants } from '../lib/database.types';
import { userMessage } from '../lib/errors';
import {
  addSandboxEvidence,
  type EvidenceInput,
  fetchGateSheet,
  type GateEvidence,
  type GateSheet as GateSheetData,
  setSandboxGateStatus,
  statusChoices,
  type StatusInput,
  validateEvidence,
  validateStatusChange,
  visitorDecisionCap,
  visitorEvidenceCap,
} from '../lib/gate';
import { formatCalendarDate } from '../lib/launches';
import type { LaunchOverview } from '../lib/overview';
import { keepsContentOnFailure, showsLoading } from '../lib/refresh';
import { sourceView } from '../lib/source';
import { supabase } from '../lib/supabase';

/** What the launch overview hands its nested gate sheet route (A4). */
export interface GateSheetContext extends RefreshContext {
  launch: LaunchOverview['launch'];
  sandboxLaunchId: number | null;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'not-found' }
  | { status: 'success'; gate: GateSheetData; refreshError: string | null };

/**
 * The gate side sheet at /launches/:launchId/gates/:gateId, over the launch
 * overview (section 19): deep-linkable, closed by Back, Escape or Close, and
 * full-screen on phones. Sandbox gates get the A4 forms; canonical gates are
 * read-only and link to the sandbox launch.
 */
export function GateSheet() {
  const { gateId } = useParams();
  const { launch, sandboxLaunchId, refreshKey, refresh } = useOutletContext<GateSheetContext>();
  const navigate = useNavigate();
  const overviewPath = `/launches/${launch.id}`;
  const id = gateId && /^\d+$/.test(gateId) ? Number(gateId) : null;
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  // The gate the data on screen belongs to; a refresh of it keeps the content.
  const shownId = useRef<number | undefined>(undefined);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (id === null) {
      setState({ status: 'not-found' });
      return;
    }
    if (!supabase) return;
    let cancelled = false;
    const isRefresh = !showsLoading(shownId.current, id);
    if (!isRefresh) setState({ status: 'loading' });
    fetchGateSheet(supabase, launch.id, id)
      .then((gate) => {
        if (cancelled) return;
        shownId.current = id;
        setState(gate ? { status: 'success', gate, refreshError: null } : { status: 'not-found' });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        shownId.current = id;
        const message = userMessage(error, 'Could not load data');
        setState((prev) =>
          keepsContentOnFailure(isRefresh, prev.status === 'success') && prev.status === 'success'
            ? { ...prev, refreshError: message }
            : { status: 'error', message },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [id, launch.id, refreshKey]);

  // Focus the sheet's heading when it opens or moves to another gate.
  useEffect(() => {
    headingRef.current?.focus();
  }, [id, state.status === 'success']);

  // Escape closes the sheet, like Back and Close.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') navigate(overviewPath);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navigate, overviewPath]);

  const isSandbox = launch.sourceLaunchId !== null;
  const title = state.status === 'success' ? state.gate.title : 'Gate';

  return (
    <>
      <div aria-hidden="true" className="fixed inset-0 z-10 hidden bg-black/40 sm:block" onClick={() => navigate(overviewPath)} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="gate-sheet-title"
        className="fixed inset-0 z-20 flex flex-col overflow-y-auto bg-page sm:left-auto sm:w-full sm:max-w-xl sm:border-l sm:border-line sm:shadow-xl"
      >
        <div className="flex items-start gap-3 border-b border-line px-4 py-3">
          <h2
            id="gate-sheet-title"
            ref={headingRef}
            tabIndex={-1}
            className="flex-1 text-[15px] font-semibold tracking-tight break-words outline-none"
          >
            {title}
          </h2>
          <Link to={overviewPath} className={`rounded-md border border-line px-2.5 py-1 ${focusRing}`}>
            Close
          </Link>
        </div>

        <div className="flex flex-col gap-4 px-4 py-4">
          {state.status === 'loading' && <Note role="status">Loading gate…</Note>}
          {state.status === 'not-found' && <Note>This launch has no such gate.</Note>}
          {state.status === 'error' && <Alert title="Could not load this gate.">{state.message}</Alert>}
          {state.status === 'success' && (
            <GateBody
              gate={state.gate}
              refreshError={state.refreshError}
              isSandbox={isSandbox}
              sandboxLaunchId={sandboxLaunchId}
              onSaved={refresh}
            />
          )}
        </div>
      </section>
    </>
  );
}

function GateBody({
  gate,
  refreshError,
  isSandbox,
  sandboxLaunchId,
  onSaved,
}: {
  gate: GateSheetData;
  refreshError: string | null;
  isSandbox: boolean;
  sandboxLaunchId: number | null;
  onSaved: () => void;
}) {
  return (
    <>
      {refreshError && <Alert title="Could not refresh this gate.">{refreshError}</Alert>}
      {isSandbox && <SandboxBanner />}
      {!isSandbox && sandboxLaunchId !== null && (
        <p>
          This gate is read-only.{' '}
          <Link
            to={`/launches/${sandboxLaunchId}`}
            className={`rounded-sm text-accent underline-offset-2 hover:underline ${focusRing}`}
          >
            Try this in the sandbox
          </Link>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <StatusChip tone={gateTone(gate.status)}>{gate.status}</StatusChip>
        <span className="text-muted">{gate.required ? 'Required' : 'Optional'}</span>
      </div>
      <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[8rem_1fr]">
        <dt className="text-muted">Category</dt>
        <dd>{gate.category}</dd>
        <dt className="text-muted">Owner</dt>
        <dd>{gate.owner}</dd>
        <dt className="text-muted">Pass criteria</dt>
        <dd className="break-words whitespace-pre-line">{gate.passCriteria}</dd>
        {gate.status === 'Waived' && gate.waiverRationale && (
          <>
            <dt className="text-muted">Waiver</dt>
            <dd className="break-words whitespace-pre-line">{gate.waiverRationale}</dd>
          </>
        )}
      </dl>

      <SheetSection title={`Evidence (${gate.evidence.length})`}>
        {gate.evidence.length === 0 ? (
          <Note>No evidence yet.</Note>
        ) : (
          <ul className="divide-y divide-line rounded-md border border-line bg-card">
            {gate.evidence.map((e) => (
              <EvidenceItem key={e.id} evidence={e} />
            ))}
          </ul>
        )}
      </SheetSection>

      {isSandbox && (
        <>
          <SheetSection title="Add evidence">
            {gate.visitorEvidenceCount >= visitorEvidenceCap ? (
              <Note>This gate has reached its 10 visitor evidence items. Reset the sandbox to start again.</Note>
            ) : (
              <EvidenceForm gateId={gate.id} onSaved={onSaved} />
            )}
          </SheetSection>
          <SheetSection title="Change status">
            {gate.visitorDecisionCount >= visitorDecisionCap ? (
              <Note>This gate has reached its 20 visitor decisions. Reset the sandbox to start again.</Note>
            ) : (
              <StatusForm gate={gate} onSaved={onSaved} />
            )}
          </SheetSection>
        </>
      )}
    </>
  );
}

function EvidenceItem({ evidence }: { evidence: GateEvidence }) {
  const source = sourceView(evidence);
  return (
    <li className="px-3 py-2.5">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className="text-muted">{evidence.type}</span>
        <ProvenanceLabel origin={evidence.origin} />
        {evidence.recordedOn && (
          <time dateTime={evidence.recordedOn} className="text-muted">
            {formatCalendarDate(evidence.recordedOn)}
          </time>
        )}
      </div>
      <p className="mt-0.5 font-medium break-words">{evidence.title}</p>
      <p className="mt-0.5 break-words whitespace-pre-line">{evidence.summary}</p>
      {source.kind === 'text' && <p className="mt-0.5 break-all text-muted">{source.text}</p>}
      {source.kind === 'link' && (
        <p className="mt-0.5 break-all">
          <a href={source.href} rel={source.rel} className={`rounded-sm text-accent underline-offset-2 hover:underline ${focusRing}`}>
            {source.text}
          </a>
        </p>
      )}
    </li>
  );
}

const emptyEvidence: EvidenceInput = { type: '', title: '', summary: '', source: '' };

function EvidenceForm({ gateId, onSaved }: { gateId: number; onSaved: () => void }) {
  const [values, setValues] = useState<EvidenceInput>(emptyEvidence);
  const [errors, setErrors] = useState<ReturnType<typeof validateEvidence>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const set = (field: keyof EvidenceInput) => (value: string) => setValues((v) => ({ ...v, [field]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found = validateEvidence(values);
    setErrors(found);
    setSaveError(null);
    if (Object.keys(found).length > 0 || values.type === '' || !supabase) return;
    setSaving(true);
    try {
      await addSandboxEvidence(supabase, gateId, { ...values, type: values.type });
      setValues(emptyEvidence);
      onSaved();
    } catch (error) {
      setSaveError(userMessage(error, 'Could not save'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-3">
      <Field id="evidence-type" label="Type" error={errors.type}>
        <select
          id="evidence-type"
          value={values.type}
          onChange={(e) => set('type')(e.target.value)}
          aria-invalid={errors.type ? true : undefined}
          aria-describedby={errors.type ? 'evidence-type-error' : undefined}
          className={inputClass}
        >
          <option value="">Choose a type</option>
          {Constants.public.Enums.evidence_type.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>
      <Field id="evidence-title" label="Title" error={errors.title}>
        <input
          id="evidence-title"
          value={values.title}
          onChange={(e) => set('title')(e.target.value)}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? 'evidence-title-error' : undefined}
          className={inputClass}
        />
      </Field>
      <Field id="evidence-summary" label="Summary" error={errors.summary}>
        <textarea
          id="evidence-summary"
          rows={4}
          value={values.summary}
          onChange={(e) => set('summary')(e.target.value)}
          aria-invalid={errors.summary ? true : undefined}
          aria-describedby={errors.summary ? 'evidence-summary-error' : undefined}
          className={inputClass}
        />
      </Field>
      <Field id="evidence-source" label="Source (optional)" error={errors.source}>
        <input
          id="evidence-source"
          type="url"
          inputMode="url"
          placeholder="https://"
          value={values.source}
          onChange={(e) => set('source')(e.target.value)}
          aria-invalid={errors.source ? true : undefined}
          aria-describedby={errors.source ? 'evidence-source-error' : undefined}
          className={inputClass}
        />
      </Field>
      <p className="text-muted">Recorded by: Visitor · Date: today, set by the database</p>
      {saveError && <Alert title="Could not add the evidence.">{saveError}</Alert>}
      <SubmitButton saving={saving}>Add evidence</SubmitButton>
    </form>
  );
}

const emptyStatus: StatusInput = { newStatus: '', rationale: '', waiverRationale: '' };

function StatusForm({ gate, onSaved }: { gate: GateSheetData; onSaved: () => void }) {
  const [values, setValues] = useState<StatusInput>(emptyStatus);
  const [errors, setErrors] = useState<ReturnType<typeof validateStatusChange>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const choices = statusChoices(gate.status, gate.evidence.length, Constants.public.Enums.gate_status);
  const set = (field: keyof StatusInput) => (value: string) => setValues((v) => ({ ...v, [field]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found = validateStatusChange(values);
    setErrors(found);
    setSaveError(null);
    if (Object.keys(found).length > 0 || values.newStatus === '' || !supabase) return;
    setSaving(true);
    try {
      await setSandboxGateStatus(supabase, gate.id, { ...values, newStatus: values.newStatus });
      setValues(emptyStatus);
      onSaved();
    } catch (error) {
      setSaveError(userMessage(error, 'Could not save'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-3">
      <Field id="gate-new-status" label="New status" error={errors.newStatus}>
        <select
          id="gate-new-status"
          value={values.newStatus}
          onChange={(e) => set('newStatus')(e.target.value)}
          aria-invalid={errors.newStatus ? true : undefined}
          aria-describedby={errors.newStatus ? 'gate-new-status-error' : undefined}
          className={inputClass}
        >
          <option value="">Choose a status</option>
          {choices.map((c) => (
            <option key={c.status} value={c.status} disabled={c.disabledReason !== null}>
              {c.disabledReason ? `${c.status} (${c.disabledReason})` : c.status}
            </option>
          ))}
        </select>
      </Field>
      <Field id="gate-rationale" label="Rationale" error={errors.rationale}>
        <textarea
          id="gate-rationale"
          rows={3}
          value={values.rationale}
          onChange={(e) => set('rationale')(e.target.value)}
          aria-invalid={errors.rationale ? true : undefined}
          aria-describedby={errors.rationale ? 'gate-rationale-error' : undefined}
          className={inputClass}
        />
      </Field>
      {values.newStatus === 'Waived' && (
        <Field id="gate-waiver" label="Waiver text" error={errors.waiverRationale}>
          <textarea
            id="gate-waiver"
            rows={3}
            value={values.waiverRationale}
            onChange={(e) => set('waiverRationale')(e.target.value)}
            aria-invalid={errors.waiverRationale ? true : undefined}
            aria-describedby={errors.waiverRationale ? 'gate-waiver-error' : undefined}
            className={inputClass}
          />
        </Field>
      )}
      {saveError && <Alert title="Could not change the status.">{saveError}</Alert>}
      <SubmitButton saving={saving}>Change status</SubmitButton>
    </form>
  );
}

const inputClass = `w-full rounded-md border border-line bg-card px-2.5 py-1.5 ${focusRing}`;

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-red-800 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

function SubmitButton({ saving, children }: { saving: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className={`self-start rounded-md border border-line bg-card px-3 py-1.5 font-medium disabled:cursor-wait disabled:opacity-60 ${focusRing}`}
    >
      {saving ? 'Saving…' : children}
    </button>
  );
}

function SheetSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-medium">{title}</h3>
      {children}
    </section>
  );
}

function Note({ role, children }: { role?: 'status'; children: ReactNode }) {
  return (
    <p role={role} className="rounded-md border border-line bg-card px-3 py-2 text-muted">
      {children}
    </p>
  );
}

function Alert({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1 break-words">{children}</p>
    </div>
  );
}
