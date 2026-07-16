import { cn } from "@/lib/utils";

/**
 * `MetricItem`-shaped Suspense fallback (matches its `bare` label+value
 * stack exactly) for the handful of Project Profile tiles that stream in
 * after first paint (Commits (7d), TVL 7d/30d Change) — sized to hold that
 * one grid cell's place without shifting layout when the real value arrives,
 * same "generic, sized via className, not a bespoke per-widget skeleton"
 * philosophy as `WidgetSkeleton`.
 */
export function MetricItemSkeleton({ emphasize, className }: { emphasize?: boolean; className?: string }) {
  return (
    <div className={cn("flex animate-pulse flex-col gap-1.5", className)} aria-hidden="true">
      <div className="h-2.5 w-16 rounded bg-radar-light-border dark:bg-white/10" />
      <div className={cn("rounded bg-radar-light-border dark:bg-white/10", emphasize ? "h-5 w-20" : "h-3.5 w-12")} />
    </div>
  );
}
