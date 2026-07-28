/**
 * Smart Views section — sits between the KPI Pulse and the Category Rail.
 *
 * PR-061 — Task 2: each card now navigates to its own dedicated collection
 * route (`/dashboard/projects/blue-chips`, `/emerging`, etc. —
 * `viewMeta.ts`'s `slug`) instead of updating `?view=` on this same page.
 * That page explains why these projects belong there, shows a real count,
 * and reuses the same search/filter/sort/pagination/cards — so clicking a
 * Smart View never leaves a user wondering "what changed?" the way an
 * in-place query-state update did before.
 */

import Link from "next/link";

import { PROJECTS_PATH } from "@/components/projects/queryState";
import { SMART_VIEWS, type SmartViewId } from "@/components/projects/smartViewDefinitions";
import { PROJECTS_VIEW_META } from "@/components/projects/viewMeta";

type SmartViewsProps = {
  /** Real, already-computed counts for each preset's underlying view — never estimated. */
  counts: Record<SmartViewId, number>;
};

export function SmartViews({ counts }: SmartViewsProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-bold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">Smart Views</h2>
      <div className="flex flex-wrap gap-3">
        {SMART_VIEWS.map((smartView) => {
          const count = counts[smartView.id];
          const slug = PROJECTS_VIEW_META[smartView.view].slug;
          return (
            <Link
              key={smartView.id}
              href={`${PROJECTS_PATH}/${slug}`}
              className="flex min-w-[190px] flex-1 items-center gap-3 rounded-2xl border border-radar-light-border bg-radar-light-card/80 p-4 backdrop-blur-xl outline-none transition-colors hover:border-radar-primary/30 focus-visible:ring-2 focus-visible:ring-radar-primary/50 sm:flex-none dark:border-white/10 dark:bg-radar-card/60"
            >
              <span className="text-xl leading-none" aria-hidden="true">
                {smartView.emoji}
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold text-radar-light-text dark:text-radar-white">{smartView.label}</span>
                <span className="truncate text-[11px] text-radar-light-muted dark:text-radar-muted">
                  {smartView.description} · {count} project{count === 1 ? "" : "s"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
