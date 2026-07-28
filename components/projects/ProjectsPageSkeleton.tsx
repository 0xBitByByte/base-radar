/**
 * PR-057 — Task 8: loading skeleton shaped like the new Projects page,
 * built entirely from the existing generic `WidgetSkeleton` primitive
 * (`components/dashboard/WidgetSkeleton.tsx`) sized via `className` — no
 * new skeleton primitive introduced, per this codebase's "reuse existing
 * design patterns" convention.
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

export function ProjectsPageSkeleton() {
  return (
    <div className="flex flex-col gap-10 pb-10" aria-busy="true" aria-label="Loading projects">
      <div className="flex flex-col gap-2">
        <WidgetSkeleton className="h-7 w-40" />
        <WidgetSkeleton className="h-4 w-72" />
      </div>

      <WidgetSkeleton className="h-11 w-full rounded-xl" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <WidgetSkeleton key={index} className="h-[76px]" />
        ))}
      </div>

      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 8 }).map((_, index) => (
          <WidgetSkeleton key={index} className="h-[104px] w-[132px] shrink-0" />
        ))}
      </div>

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
