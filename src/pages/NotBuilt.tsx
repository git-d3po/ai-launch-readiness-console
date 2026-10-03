export function NotBuilt({ title }: { title: string }) {
  return (
    <>
      <h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>
      <p className="mt-4 rounded-md border border-line bg-card px-3 py-2 text-muted">This screen is not built yet.</p>
    </>
  );
}
