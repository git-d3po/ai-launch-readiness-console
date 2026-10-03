import { type KeyboardEvent, type SyntheticEvent, useRef, useState } from 'react';
import { resetConfirmation, type ResetOutcome, runReset } from '../lib/reset';
import { supabase } from '../lib/supabase';
import { focusRing } from './AppShell';

type Phase = { step: 'confirm' } | { step: 'pending' } | { step: 'result'; outcome: ResetOutcome };

// A function, not a constant: focusRing comes from AppShell, which imports this module.
const buttonClass = () => `rounded-md border border-line px-2.5 py-1 disabled:cursor-wait disabled:opacity-60 ${focusRing}`;

/**
 * The single global "Reset sandbox" action (A7), in the header. A modal dialog
 * asks first, focusing Cancel; nothing is sent until "Reset sandbox" in the
 * dialog is pressed. The dialog then shows the outcome until closed. Every
 * outcome refreshes the routed pages once, including a refused reset, since
 * another visitor's reset may have run.
 */
export function ResetSandbox({ onRefresh }: { onRefresh: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [phase, setPhase] = useState<Phase>({ step: 'confirm' });

  function open() {
    setPhase({ step: 'confirm' });
    dialog.current?.showModal();
  }

  function close() {
    dialog.current?.close();
  }

  async function confirm() {
    if (phase.step !== 'confirm' || !supabase) return;
    setPhase({ step: 'pending' });
    const outcome = await runReset(supabase);
    setPhase({ step: 'result', outcome });
    if (outcome.refresh) onRefresh();
  }

  // Escape closes the dialog, except while a reset is in flight. It never
  // reaches the page's own Escape handling, such as the gate sheet's.
  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') event.stopPropagation();
  }
  function onCancel(event: SyntheticEvent) {
    if (phase.step === 'pending') event.preventDefault();
  }

  return (
    <>
      <button type="button" onClick={open} disabled={!supabase} className={`ml-auto ${buttonClass()}`}>
        Reset sandbox
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="reset-title"
        aria-describedby="reset-body"
        onKeyDown={onKeyDown}
        onCancel={onCancel}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-md border border-line bg-card p-4 text-fg backdrop:bg-black/40"
      >
        <h2 id="reset-title" className="font-semibold">
          Reset sandbox
        </h2>
        {phase.step === 'result' ? (
          <Result outcome={phase.outcome} onClose={close} />
        ) : (
          <>
            <p id="reset-body" className="mt-2">
              {resetConfirmation}
            </p>
            {phase.step === 'pending' && (
              <p role="status" className="mt-2 text-muted">
                Resetting…
              </p>
            )}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {/* autoFocus: Cancel, not the destructive action, has focus when the dialog opens. */}
              <button type="button" autoFocus onClick={close} disabled={phase.step === 'pending'} className={buttonClass()}>
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={phase.step === 'pending'}
                className={`${buttonClass()} font-medium`}
              >
                {phase.step === 'pending' ? 'Resetting…' : 'Reset sandbox'}
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}

function Result({ outcome, onClose }: { outcome: ResetOutcome; onClose: () => void }) {
  return (
    <>
      {outcome.kind === 'done' ? (
        <p id="reset-body" role="status" className="mt-2">
          {outcome.message}
        </p>
      ) : (
        <div
          id="reset-body"
          role="alert"
          className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
        >
          {/* Only a P0001 rejection is known not to have reset; another failure's outcome is unknown. */}
          {outcome.kind === 'rejected' && <p className="font-medium">The sandbox was not reset.</p>}
          <p className={outcome.kind === 'rejected' ? 'mt-1 break-words' : 'break-words'}>{outcome.message}</p>
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <button type="button" autoFocus onClick={onClose} className={buttonClass()}>
          Close
        </button>
      </div>
    </>
  );
}
