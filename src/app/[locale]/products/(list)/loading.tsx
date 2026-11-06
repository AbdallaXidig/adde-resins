export default function Loading() {
  return (
    <div className="wrap py-16" aria-busy="true" aria-live="polite">
      <div className="h-10 w-2/3 animate-pulse rounded-lg bg-sand" />
      <div className="mt-4 h-5 w-1/2 animate-pulse rounded bg-sand" />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-72 animate-pulse rounded-xl bg-sand" />)}
      </div>
    </div>
  );
}
