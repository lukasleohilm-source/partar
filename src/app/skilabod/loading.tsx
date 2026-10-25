import { RowSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-md md:max-w-2xl md:pt-10 px-4 pt-6">
      <div className="skeleton mb-4 h-8 w-32 rounded" />
      <RowSkeleton />
    </div>
  );
}
