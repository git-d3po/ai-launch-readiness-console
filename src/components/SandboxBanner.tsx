// The A3 sandbox banner (reconciliation record section 19): informational only,
// with no link or action, on the sandbox overview and sandbox gate sheets.
export function SandboxBanner() {
  return (
    <p className="rounded-md border border-line border-l-4 border-l-muted bg-card px-3 py-2">
      <span className="font-semibold">Sandbox.</span> A shared copy of the canonical launch that anyone can change.
      Changes stay here; the canonical launch is never changed. Use Reset sandbox in the header to start over.
    </p>
  );
}
