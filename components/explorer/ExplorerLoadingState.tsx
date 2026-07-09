import { Skeleton } from "@/components/ui/skeleton";

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-radar-light-border bg-radar-light-card/80 p-5 dark:border-white/10 dark:bg-radar-card/60">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-10 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

/**
 * The one genuine loading wait in this architecture — the initial batch
 * build of intelligence for every registry project (docs/explorer/03 §17).
 * Shaped like Grid View's real layout (docs/explorer/03 §17's "a skeleton
 * mimics the real shape of what it's replacing") — updated in PR4 to
 * mirror `ProjectCard`'s anatomy instead of PR1's identity-row shape.
 */
export function ExplorerLoadingState() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-8 w-72" />
        <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        <Skeleton className="mt-3 h-3 w-48" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-48 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    </div>
  );
}
