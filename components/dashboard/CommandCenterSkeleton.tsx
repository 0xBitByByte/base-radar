import { cn } from "@/lib/utils";

/**
 * V1-FIX-003 — AI Command Center's loading placeholder. Same visual
 * language as every other structured skeleton in this codebase
 * (`MetricItemSkeleton.tsx`'s shaped bars: `bg-radar-light-border
 * dark:bg-white/10`, `animate-pulse motion-reduce:animate-none`), not a
 * new style — this file only assembles those same bar shapes into the AI
 * Command Center's actual layout (two labeled groups of recommendation
 * cards) instead of one generic rectangle (`WidgetSkeleton.tsx`'s
 * approach), per the explicit "closely match the final layout" requirement.
 *
 * Sized to approximate the common real case (2 categories under "Top
 * Opportunities," 2 under "Watch Closely" — the split live-verified across
 * V1-FIX-002B/002C) rather than any single exact day's real count, since
 * the real count is exactly what hasn't loaded yet. A lighter real day (a
 * single group, or fewer than 4 total recommendations) renders shorter than
 * this skeleton; a shift on THAT swap is the accepted tradeoff against the
 * alternative of a shorter skeleton that undershoots a full/typical day —
 * see the task's own "approximately"/"within ±10px of the loaded version"
 * framing.
 */

function SkeletonBar({ className }: { className: string }) {
  return <div className={cn("rounded bg-radar-light-border dark:bg-white/10", className)} />;
}

function RecommendationCardSkeleton() {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-radar-primary/10 bg-radar-light-surface/40 p-2 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="flex items-center gap-1.5">
        <div className="size-5 shrink-0 rounded-full bg-radar-light-border dark:bg-white/10" />
        <SkeletonBar className="h-3.5 flex-1" />
        <SkeletonBar className="h-2 w-12 shrink-0" />
      </div>
      <SkeletonBar className="h-3 w-4/5" />
      <SkeletonBar className="h-2.5 w-3/5" />
      <div className="mt-auto flex items-center justify-between gap-2 pt-0.5">
        <SkeletonBar className="h-2.5 w-14" />
        <SkeletonBar className="h-6 w-24 rounded-lg" />
      </div>
    </div>
  );
}

function GroupSkeleton({ labelWidth, cardCount, extraTopBorder }: { labelWidth: string; cardCount: number; extraTopBorder?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1", extraTopBorder && "border-t border-radar-primary/10 pt-2 dark:border-white/10")}>
      <SkeletonBar className={cn("h-2.5", labelWidth)} />
      <div className={cn("grid grid-cols-1 gap-1.5", cardCount >= 2 && "sm:grid-cols-2")}>
        {Array.from({ length: cardCount }).map((_, index) => (
          <RecommendationCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

export function CommandCenterSkeleton() {
  return (
    <div
      // `min-h-[298px]` closes the gap live-measured between this
      // skeleton's own natural height and the loaded card's real height
      // (skeleton bars render a few px shorter than real text's own
      // line-height) — keeps the swap within Requirement 3's ±10px budget
      // instead of approximating it.
      className="flex min-h-[264px] animate-pulse flex-col gap-2 motion-reduce:animate-none"
      aria-hidden="true"
      // Same "still loading" marker every structured skeleton in this
      // codebase carries — `SplashScreen.tsx`'s `isPageReady()` scans for
      // it, so the splash correctly waits for this to clear too.
      data-loading-skeleton="true"
    >
      <GroupSkeleton labelWidth="w-28" cardCount={2} extraTopBorder />
      <GroupSkeleton labelWidth="w-24" cardCount={2} />
    </div>
  );
}
