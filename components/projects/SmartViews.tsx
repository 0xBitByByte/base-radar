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
 *
 * PR-071 Round 2 — Task 5: compact single-line pills (icon, label, count)
 * instead of a two-line description card — the same real facts, a much
 * shorter footprint. The section heading itself moved to the caller
 * (`app/dashboard/projects/page.tsx` wraps this in `CollapsibleSection`),
 * so this component owns only the pill row now.
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
    <div className="flex flex-wrap gap-2">
      {SMART_VIEWS.map((smartView) => {
        const count = counts[smartView.id];
        const slug = PROJECTS_VIEW_META[smartView.view].slug;
        return (
          <Link
            key={smartView.id}
            href={`${PROJECTS_PATH}/${slug}`}
            className="flex items-center gap-2 rounded-full border border-radar-light-border bg-radar-light-card/80 py-1.5 pr-3 pl-2 backdrop-blur-xl outline-none transition-colors hover:border-radar-primary/30 hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-radar-card/60 dark:hover:bg-white/[0.05]"
            title={smartView.description}
          >
            <span className="text-sm leading-none" aria-hidden="true">
              {smartView.emoji}
            </span>
            <span className="text-xs font-semibold text-radar-light-text dark:text-radar-white">{smartView.label}</span>
            <span className="rounded-full bg-radar-light-surface px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums text-radar-light-muted dark:bg-white/10 dark:text-radar-muted">
              {count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
