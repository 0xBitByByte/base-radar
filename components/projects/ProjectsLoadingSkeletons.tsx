/**
 * PR-085.02B — real, layout-matched Suspense fallbacks for the Projects
 * page's streaming boundaries, per the Loading Strategy Standard's
 * Skeleton Standard: shapes sized to match the real sections they stand in
 * for, never a generic spinner or "Loading…" text block. Each top-level
 * wrapper carries `aria-busy="true"` — it (and that attribute) is entirely
 * replaced by the real content once its Suspense boundary resolves, so the
 * busy state never goes stale. The individual pulsing shapes inside stay
 * `aria-hidden="true"`, matching `WidgetSkeleton`'s existing convention —
 * they carry no real information, only the boundary's busy state does.
 *
 * PR-085.02C — `ProjectsHeroSkeleton` remains the fallback for the outer
 * Hero boundary's brief pre-snapshot instant (still includes an
 * Interaction-Bar-shaped placeholder, since at that point nothing in Hero
 * has resolved yet). Once the lightweight snapshot resolves, the real Hero
 * JSX renders — except the Interaction Bar, which genuinely needs the full
 * collection-building pipeline (its `resultCount`) and so streams in via
 * its own nested `<Suspense>`, using the new `ProjectsInteractionBarSkeleton`
 * below, positioned in that same slot for as long as that slower pipeline
 * takes.
 */

import { cn } from "@/lib/utils";

const PULSE_CLASS =
  "animate-pulse rounded-xl border border-radar-light-border/70 bg-radar-light-surface/60 motion-reduce:animate-none dark:border-white/[0.06] dark:bg-white/[0.02]";

function Block({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn(PULSE_CLASS, className)} />;
}

/** Header (title/stats line) + Base Today (spotlight row + stat grid) + Interaction Bar (search/filters) + Overview/Smart Views panels — everything Boundary 1 owns, in the same visual order it renders in once resolved. */
export function ProjectsHeroSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-10">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Block className="h-7 w-40" />
        <Block className="h-4 w-72" />
      </div>

      {/* Base Today */}
      <div className="flex flex-col gap-4 rounded-2xl border border-radar-light-border bg-radar-light-card/60 p-5 dark:border-white/10 dark:bg-white/[0.02]">
        <Block className="h-5 w-32" />
        <div className="flex flex-wrap gap-3">
          <Block className="h-16 min-w-[220px] flex-1" />
          <Block className="h-16 min-w-[220px] flex-1" />
          <Block className="h-16 min-w-[220px] flex-1" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <Block key={index} className="h-16" />
          ))}
        </div>
      </div>

      {/* Interaction bar */}
      <div className="flex flex-wrap gap-3">
        <Block className="h-10 min-w-[240px] flex-1" />
        <Block className="h-10 w-32" />
        <Block className="h-10 w-32" />
        <Block className="h-10 w-24" />
      </div>

      {/* Overview / Smart Views */}
      <Block className="h-24" />
      <Block className="h-24" />
    </div>
  );
}

/** The Interaction Bar (search/category/confidence/filter/sort) alone — the one piece of the Hero-visual-area that genuinely needs the full collection-building pipeline (for its result count), so it streams independently of the rest of Hero via its own nested Suspense boundary, in the exact same DOM slot it's always occupied. */
export function ProjectsInteractionBarSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-wrap gap-3">
      <Block className="h-10 min-w-[240px] flex-1" />
      <Block className="h-10 w-32" />
      <Block className="h-10 w-32" />
      <Block className="h-10 w-24" />
    </div>
  );
}

/** One shared rail-row shape, reused for the Category Rail and all three curated-rail zones (Curated Discovery / Leaderboards / Needs Your Attention) — matching Boundary 2's own "these may stream together, one shared rail skeleton" scope, sized to `ProjectRail`'s real `compact` card width (`w-[236px]`). */
function RailRowSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Block className="h-5 w-40" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }, (_, index) => (
          <Block key={index} className="h-[150px] w-[236px] shrink-0" />
        ))}
      </div>
    </div>
  );
}

export function ProjectsDiscoverySkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      {/* Category Rail */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }, (_, index) => (
          <Block key={index} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      {/* Curated Discovery / Leaderboards / Needs Your Attention — same shared row shape, three times */}
      <RailRowSkeleton />
      <RailRowSkeleton />
      <RailRowSkeleton />
    </div>
  );
}

/** The Full Directory grid — matches `ProjectsDirectory`'s real breakpoint ladder exactly, with tiles sized to `LiveProjectCard`'s `detailed` variant. */
export function ProjectsDirectorySkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-5 border-t border-radar-light-border pt-8 dark:border-white/10">
      <div className="flex items-center justify-between gap-2">
        <Block className="h-6 w-48" />
        <Block className="h-4 w-20" />
      </div>
      {/* PR-085.03 — mirrors `ProjectsDirectory`'s grid cap of exactly 3 columns. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }, (_, index) => (
          <Block key={index} className="h-[420px]" />
        ))}
      </div>
    </div>
  );
}
