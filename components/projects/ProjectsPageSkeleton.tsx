/**
 * PR-057 — Task 8: loading skeleton shaped like the Projects page, built
 * entirely from the existing generic `WidgetSkeleton` primitive
 * (`components/dashboard/WidgetSkeleton.tsx`) sized via `className` — no
 * new skeleton primitive introduced, per this codebase's "reuse existing
 * design patterns" convention.
 *
 * PR-064 — Task 4: brought back in sync with the page's real section order
 * (`app/dashboard/projects/page.tsx`), which grew a "Base Today" hero panel
 * (PR-061) and a Smart Views row (PR-061) that this skeleton never
 * accounted for, and a two-row sticky interaction bar (search, then
 * filter+sort) that used to be a single search field. Each block below is
 * sized to the real component it stands in for, so the swap from skeleton
 * to real content causes no layout shift.
 */

import { WidgetSkeleton } from "@/components/dashboard/WidgetSkeleton";

function RailSkeleton({ cards }: { cards: number }) {
  return (
    <div className="flex flex-col gap-3">
      <WidgetSkeleton className="h-4 w-40" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: cards }).map((_, index) => (
          <WidgetSkeleton key={index} className="h-[280px] w-[280px] shrink-0" />
        ))}
      </div>
    </div>
  );
}

/** Stands in for `BaseTodayPanel` — heading, a 2-up spotlight row, then a 6-tile stat grid. */
function BaseTodayPanelSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-radar-light-border bg-radar-light-surface/60 p-5 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="flex flex-col gap-1.5">
        <WidgetSkeleton className="h-4 w-28" />
        <WidgetSkeleton className="h-3 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <WidgetSkeleton className="h-[68px]" />
        <WidgetSkeleton className="h-[68px]" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <WidgetSkeleton key={index} className="h-[72px]" />
        ))}
      </div>
    </div>
  );
}

/** Stands in for `ProjectsInteractionBar` — the search field, then the filter+sort row below it. */
function InteractionBarSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <WidgetSkeleton className="h-11 w-full rounded-xl" />
      <div className="flex items-center justify-between gap-3">
        <WidgetSkeleton className="h-9 w-24 rounded-xl" />
        <WidgetSkeleton className="h-9 w-48 rounded-xl" />
      </div>
    </div>
  );
}

/** Stands in for `SmartViews` — heading, then a row of preset cards. */
function SmartViewsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <WidgetSkeleton className="h-4 w-28" />
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <WidgetSkeleton key={index} className="h-[72px] min-w-[190px] flex-1 sm:flex-none" />
        ))}
      </div>
    </div>
  );
}

/** Stands in for `CategoryRail`'s featured tier — heading, then a 2/4-col grid of category cards. */
function CategoryRailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <WidgetSkeleton className="h-4 w-36" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <WidgetSkeleton key={index} className="h-[118px]" />
        ))}
      </div>
    </div>
  );
}

export function ProjectsPageSkeleton() {
  return (
    <div className="flex flex-col gap-10 pb-10" aria-busy="true" aria-label="Loading projects">
      <div className="flex flex-col gap-2">
        <WidgetSkeleton className="h-7 w-40" />
        <WidgetSkeleton className="h-4 w-72" />
      </div>

      <BaseTodayPanelSkeleton />

      <InteractionBarSkeleton />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <WidgetSkeleton key={index} className="h-[76px]" />
        ))}
      </div>

      <SmartViewsSkeleton />

      <CategoryRailSkeleton />

      <div className="flex flex-col gap-8">
        <RailSkeleton cards={4} />
        <RailSkeleton cards={4} />
        <RailSkeleton cards={4} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <WidgetSkeleton key={index} className="h-[320px]" />
        ))}
      </div>
    </div>
  );
}
