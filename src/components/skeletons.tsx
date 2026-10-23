// Hleðsluskuggar sem birtast meðan síða sækir gögn

export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-black/5">
      <div className="skeleton aspect-[4/3]" />
      <div className="space-y-2 p-3">
        <div className="skeleton h-4 w-20 rounded" />
        <div className="skeleton h-3.5 w-full rounded" />
        <div className="skeleton h-3 w-2/3 rounded" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3" aria-busy aria-label="Hleð…">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <CardSkeleton />
        </li>
      ))}
    </ul>
  );
}

export function RowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl bg-surface" aria-busy aria-label="Hleð…">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex gap-3 p-3">
          <div className="skeleton size-14 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2 py-1">
            <div className="skeleton h-4 w-1/2 rounded" />
            <div className="skeleton h-3 w-3/4 rounded" />
          </div>
        </li>
      ))}
    </ul>
  );
}
