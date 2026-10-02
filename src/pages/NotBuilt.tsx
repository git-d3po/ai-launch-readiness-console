export function NotBuilt({ title }: { title: string }) {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-prose rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
        This screen is not built yet.
      </p>
    </>
  );
}
