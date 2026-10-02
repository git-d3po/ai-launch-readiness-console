import { Link, NavLink, Outlet } from 'react-router';

export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400';

function navLinkClass({ isActive }: { isActive: boolean }): string {
  const state = isActive
    ? 'bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100';
  return `rounded-md px-2 py-1 text-sm ${state} ${focusRing}`;
}

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className={`sr-only rounded-md bg-white px-3 py-2 text-sm focus:not-sr-only focus:absolute focus:top-2 focus:left-2 dark:bg-zinc-900 ${focusRing}`}
      >
        Skip to content
      </a>

      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/launches" className={`rounded-md text-sm font-semibold tracking-tight ${focusRing}`}>
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

          {/* Placeholder until the reset flow (confirmation dialog + reset_demo_data) is built. */}
          <button
            type="button"
            disabled
            title="Not available yet"
            className="ml-auto cursor-not-allowed rounded-md border border-zinc-200 px-2.5 py-1 text-sm text-zinc-400 dark:border-zinc-800 dark:text-zinc-500"
          >
            Reset demo data
          </button>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-zinc-600 dark:text-zinc-400">
          Synthetic portfolio data. No real customers or systems.
        </p>
      </footer>
    </div>
  );
}
