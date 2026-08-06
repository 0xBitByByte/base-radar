import { cn } from "@/lib/utils";

/**
 * Generic Suspense fallback for any dashboard widget/section (PR9.3.4 §3) —
 * a plain pulsing card sized via `className`, not a bespoke skeleton per
 * widget. Each widget streams in independently behind its own `<Suspense>`,
 * so this only ever needs to hold that one card's place for a moment, not
 * imitate its exact internal layout.
 */
export function WidgetSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-3xl border border-radar-light-border bg-radar-light-card/60 motion-reduce:animate-none dark:border-white/10 dark:bg-white/[0.03]",
        className
      )}
      aria-hidden="true"
      // PR-074 REVIEW #2 — a real, page-agnostic "still loading" marker
      // `SplashScreen` scans for (`components/branding/SplashScreen.tsx`)
      // instead of guessing readiness from a timeout. Every Suspense
      // fallback that renders a generic pulsing placeholder (as opposed to
      // real, already-known content) carries this attribute; the splash
      // only completes once none remain in the DOM.
      data-loading-skeleton="true"
    />
  );
}
