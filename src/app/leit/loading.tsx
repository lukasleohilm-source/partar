import { GridSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-md md:max-w-page md:px-8 md:pt-8 space-y-3 px-4 pt-4">
      <div className="flex gap-2">
        <div className="skeleton h-[52px] flex-1 rounded-2xl" />
        <div className="skeleton size-[52px] rounded-2xl" />
      </div>
      <div className="skeleton h-[68px] rounded-2xl" />
      <GridSkeleton />
    </div>
  );
}
