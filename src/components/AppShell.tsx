import { Link, NavLink, Outlet } from 'react-router';

export const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

function navLinkClass({ isActive }: { isActive: boolean }): string {
  const state = isActive ? 'bg-accent-subtle font-medium text-accent' : 'text-muted hover:text-fg';
  return `rounded-md px-2 py-1 ${state} ${focusRing}`;
}

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className={`sr-only rounded-md bg-card px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 ${focusRing}`}
      >
        Skip to content
      </a>

      <header className="border-b border-line">
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

          {/* Placeholder until the Stage 2 sandbox reset (confirmation dialog + sandbox_reset, DR-014) is built.
              reset_demo_data() is owner-only since Stage 1. */}
          <button
            type="button"
            disabled
            title="Not available yet"
            className="ml-auto cursor-not-allowed rounded-md border border-line px-2.5 py-1 text-muted opacity-60"
          >
            Reset demo data
          </button>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-3 text-muted">Synthetic portfolio data. No real customers or systems.</p>
      </footer>
    </div>
  );
}
