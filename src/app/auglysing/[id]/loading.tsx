export default function Loading() {
  return (
    <div className="mx-auto max-w-md" aria-busy aria-label="Hleð auglýsingu…">
      <div className="skeleton aspect-[4/3]" />
      <div className="space-y-4 px-4 pt-5">
        <div className="skeleton h-6 w-3/4 rounded" />
        <div className="skeleton h-8 w-1/3 rounded" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton h-16 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-24 rounded-2xl" />
      </div>
    </div>
  );
}
