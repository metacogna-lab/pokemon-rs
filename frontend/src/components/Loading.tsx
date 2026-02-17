/** Spinner shown when loading is true. */
export function Loading({ loading }: { loading: boolean }) {
  if (!loading) return null;
  return (
    <div className="flex justify-center items-center p-8" role="status" aria-label="Loading">
      <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
