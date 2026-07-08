import { Skeleton } from "@/components/ui/skeleton";

function SkeletonRow() {
  return (
    <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <Skeleton className="size-8 shrink-0 rounded-full" />
      <Skeleton className="h-4 w-40 flex-1" />
      <Skeleton className="hidden h-5 w-16 shrink-0 rounded-full sm:block" />
      <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
    </li>
  );
}

/**
 * The one genuine loading wait in this architecture — the initial batch
 * build of intelligence for every registry project (docs/explorer/03 §17).
 * Shaped like PR1's real layout (identity list), not the future Grid card.
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

      <ul className="divide-y divide-radar-light-border overflow-hidden rounded-2xl border border-radar-light-border dark:divide-white/10 dark:border-white/10">
        {Array.from({ length: 8 }).map((_, index) => (
          <SkeletonRow key={index} />
        ))}
      </ul>
    </div>
  );
}
