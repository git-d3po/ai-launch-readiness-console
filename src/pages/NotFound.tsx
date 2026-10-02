import { Link } from 'react-router';
import { focusRing } from '../components/AppShell';

export function NotFound() {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        There is no page at this address.{' '}
        <Link to="/launches" className={`rounded-sm text-blue-700 underline dark:text-blue-400 ${focusRing}`}>
          Go to Launches
        </Link>
      </p>
    </>
  );
}
