import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useOutletContext } from 'react-router';
import { ResetSandbox } from './ResetSandbox';

export const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

function navLinkClass({ isActive }: { isActive: boolean }): string {
  const state = isActive ? 'bg-accent-subtle font-medium text-accent' : 'text-muted hover:text-fg';
  return `rounded-md px-2 py-1 ${state} ${focusRing}`;
}

/**
 * The refresh signal routed pages read (I17; reconciliation record section 19,
 * Refetch). Pages put `refreshKey` in their fetch effects; a write or a reset
 * calls `refresh()`. A refresh refetches but never clears content already shown.
 */
export interface RefreshContext {
  refreshKey: number;
  refresh: () => void;
}

/** The refresh signal for a page rendered inside AppShell. */
export function useRefresh(): RefreshContext {
  return useOutletContext<RefreshContext>();
}

export function AppShell() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);
  const header = useRef<HTMLElement>(null);

  // The header's height as --header-height, so the gate sheet opens below it and
  // the global "Reset sandbox" stays usable while a sheet is open (A7).
  useLayoutEffect(() => {
    const el = header.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty('--header-height', `${el.getBoundingClientRect().height}px`);
    set();
    const observer = new ResizeObserver(set);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className={`sr-only rounded-md bg-card px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-40 ${focusRing}`}
      >
        Skip to content
      </a>

      {/* Sticky, so it stays above an open gate sheet however far the page is scrolled. */}
      <header ref={header} className="sticky top-0 z-30 border-b border-line bg-page">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2.5">
          <Link to="/launches" className={`rounded-md font-semibold tracking-tight ${focusRing}`}>
            AI Launch Readiness Console
          </Link>

          {/* Second row on phones, inline from sm up. */}
          <nav aria-label="Primary" className="order-last flex w-full gap-1 sm:order-none sm:w-auto">
            <NavLink to="/launches" className={navLinkClass}>
              Launches
            </NavLink>
            <NavLink to="/about" className={navLinkClass}>
              About
            </NavLink>
          </nav>

          {/* The single global sandbox reset (A7, DR-014); reset_demo_data() stays owner-only. */}
          <ResetSandbox onRefresh={refresh} />
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet context={{ refreshKey, refresh } satisfies RefreshContext} />
      </main>

      <footer className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-3 text-muted">Synthetic portfolio data. No real customers or systems.</p>
      </footer>
    </div>
  );
}
