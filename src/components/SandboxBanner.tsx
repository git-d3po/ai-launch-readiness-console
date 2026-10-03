// The A3 sandbox banner (reconciliation record section 19): informational only,
// with no link or action, on the sandbox overview and sandbox gate sheets.
export function SandboxBanner() {
  return (
    <p className="rounded-md border border-line bg-card px-3 py-2">
      Sandbox: a shared copy of the canonical launch that anyone can change. Changes stay here, and the canonical launch
      is never changed.
    </p>
  );
}
