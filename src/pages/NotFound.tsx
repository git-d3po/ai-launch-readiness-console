import { Link } from 'react-router';
import { focusRing } from '../components/AppShell';

export function NotFound() {
  return (
    <>
      <h1 className="text-[15px] font-semibold tracking-tight">Page not found</h1>
      <p className="mt-4 text-muted">
        There is no page at this address.{' '}
        <Link to="/launches" className={`rounded-sm text-accent underline underline-offset-2 ${focusRing}`}>
          Go to Launches
        </Link>
      </p>
    </>
  );
}
