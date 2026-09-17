"use client";

import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";

import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { ChainBadgeGroup } from "@/components/branding/ChainBadgeGroup";
import { GLASS_TILE_SURFACE } from "@/components/ui/glassStyles";
import { formatPercent } from "@/lib/data/format";
import { categoryPrimaryMetric } from "@/lib/projects/primaryMetric";
import { cn } from "@/lib/utils";
import type { LiveProject } from "@/lib/projects/types";

type WatchedProjectRowProps = {
  project: LiveProject;
};

/**
 * A dashboard-widget-owned row — deliberately not a `LiveProjectCard`
 * `variant="micro"` row. Universal Project Card PR-3 (§12 v1.2, EN-002)
 * explicitly removed 24h change from `micro`'s canonical five-field
 * anatomy, and that file's own doc comment says a host page that needs
 * more than that anatomy owns the extra layout itself rather than
 * expanding the shared card. `WatchlistWidget` and `AIProjectsWidget` both
 * need the identical two-line shape (name+grade, then chain+value+trend),
 * so it lives here once rather than being duplicated in both. Composes the
 * same real primitives `LiveProjectCard` itself uses (`ProjectLogo`,
 * `ChainBadgeGroup`, `categoryPrimaryMetric`) instead of re-deriving any of
 * them — a new arrangement of real data, not a forked card.
 *
 * The trend indicator reads `market.changePct24h` directly — the
 * project's real 24h price change — regardless of which $ figure ends up
 * as the row's headline metric (TVL/Volume/Market Cap/Price), the same
 * convention `FeaturedProjectTile.tsx` already established: "24h" is the
 * token's own price trend, not a fabricated change rate for whichever
 * other number is shown alongside it. Renders no indicator at all when
 * `changePct24h` is null — never a fabricated 0%.
 */
export function WatchedProjectRow({ project }: WatchedProjectRowProps) {
  const { identity, chains, market, aiRating } = project;
  const metric = categoryPrimaryMetric(project);
  const change = market.changePct24h;
  const isUp = change !== null && change >= 0;

  const row = (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl px-2.5 py-2 text-sm transition-colors",
        project.source !== "discovery" && "hover:bg-radar-light-surface dark:hover:bg-white/5"
      )}
    >
      <ProjectLogo logoUrl={identity.logoUrl} fallbackUrls={identity.logoUrlFallbacks} name={identity.name} size={20} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span title={identity.name} className="min-w-0 flex-1 truncate font-medium text-radar-light-text dark:text-radar-white">
            {identity.name}
          </span>
          <span className="shrink-0 text-xs font-semibold text-radar-light-text dark:text-radar-white">{aiRating ?? "—"}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <ChainBadgeGroup chains={chains} size="sm" max={1} className="shrink-0 flex-nowrap" />
          <span
            title={metric.value ?? "Not Tracked"}
            className="min-w-0 flex-1 truncate text-xs tabular-nums text-radar-light-muted dark:text-radar-muted"
          >
            {metric.value ?? "Not Tracked"}
          </span>
          {change !== null && (
            <span
              className={cn(
                "flex shrink-0 items-center gap-0.5 text-[11px] font-semibold tabular-nums",
                isUp ? "text-radar-success" : "text-radar-danger"
              )}
            >
              {isUp ? <TrendingUp className="size-3" aria-hidden="true" /> : <TrendingDown className="size-3" aria-hidden="true" />}
              {formatPercent(change, { showSign: false })}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        // Same tile-scale treatment `WatchlistWidget.tsx`/`AIProjectsWidget.tsx`/
        // `PairCard.tsx` already established for this glass system's dense-list rows.
        "p-1 transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-radar-primary/40 hover:shadow-[0_8px_24px_-12px_rgba(var(--color-radar-primary-rgb),0.18)] motion-reduce:hover:translate-y-0 dark:hover:border-white/25",
        GLASS_TILE_SURFACE
      )}
    >
      {project.slug ? (
        <Link
          href={`/dashboard/projects/${project.slug}`}
          aria-label={identity.name}
          className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50"
        >
          {row}
        </Link>
      ) : (
        row
      )}
    </div>
  );
}
