import { RowSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-md md:max-w-2xl md:pt-10 space-y-6 px-4 pt-6">
      <div className="flex items-center justify-between">
        <div className="skeleton h-8 w-36 rounded" />
        <div className="skeleton h-9 w-24 rounded-full" />
      </div>
      <RowSkeleton count={3} />
    </div>
  );
}
