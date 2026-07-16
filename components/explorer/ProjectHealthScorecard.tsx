import { ArrowDown, ArrowRight, ArrowUp, Award, Code2, Droplets, Fish, Gauge, Landmark, ShieldCheck, TrendingUp, Users, type LucideIcon } from "lucide-react";

import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { RichTooltip } from "@/components/ui/RichTooltip";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import type { ScorecardSeverity, ScorecardTile, ScorecardTileId, ScorecardTrend } from "@/lib/intelligence/scorecard";

type ProjectHealthScorecardProps = {
  tiles: ScorecardTile[];
};

const TILE_ICON: Record<ScorecardTileId, LucideIcon> = {
  security: ShieldCheck,
  liquidity: Droplets,
  momentum: TrendingUp,
  developer: Code2,
  governance: Landmark,
  community: Users,
  whale: Fish,
  aiRating: Award,
};

const SEVERITY_CLASS: Record<ScorecardSeverity, string> = {
  excellent: "text-radar-success",
  strong: "text-radar-success",
  moderate: "text-radar-warning",
  weak: "text-radar-danger",
  unknown: "text-radar-light-muted dark:text-radar-muted",
};

const SEVERITY_ICON_BG: Record<ScorecardSeverity, string> = {
  excellent: "bg-radar-success/10",
  strong: "bg-radar-success/10",
  moderate: "bg-radar-warning/10",
  weak: "bg-radar-danger/10",
  unknown: "bg-radar-light-muted/10 dark:bg-radar-muted/10",
};

const SEVERITY_BAR_GRADIENT: Record<ScorecardSeverity, string> = {
  excellent: "bg-gradient-to-r from-radar-success/60 to-radar-success",
  strong: "bg-gradient-to-r from-radar-success/60 to-radar-success",
  moderate: "bg-gradient-to-r from-radar-warning/60 to-radar-warning",
  weak: "bg-gradient-to-r from-radar-danger/60 to-radar-danger",
  unknown: "bg-radar-light-muted/40 dark:bg-radar-muted/40",
};

const SEVERITY_CHIP_CLASS: Record<ScorecardSeverity, string> = {
  excellent: "bg-radar-success/10 text-radar-success",
  strong: "bg-radar-success/10 text-radar-success",
  moderate: "bg-radar-warning/10 text-radar-warning",
  weak: "bg-radar-danger/10 text-radar-danger",
  unknown: "bg-radar-light-muted/10 text-radar-light-muted dark:bg-radar-muted/10 dark:text-radar-muted",
};

const TREND_ICON: Record<ScorecardTrend, LucideIcon> = {
  up: ArrowUp,
  down: ArrowDown,
  stable: ArrowRight,
};

const TREND_CLASS: Record<ScorecardTrend, string> = {
  up: "text-radar-success",
  down: "text-radar-danger",
  stable: "text-radar-light-muted dark:text-radar-muted",
};

const TREND_LABEL: Record<ScorecardTrend, string> = {
  up: "Improving",
  down: "Declining",
  stable: "Stable",
};

const UNAVAILABLE_TOOLTIP = "This metric cannot currently be calculated because verified data is unavailable.";

const HEADER_CELL_CLASS = "shrink-0 text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted";

/**
 * PR12.1 Req 1.5, redesigned into a single-matrix layout (Score Matrix
 * request) — Base Radar's signature "understand this project in 5 seconds"
 * element, rendered directly below the AI Intelligence Summary. Every row is
 * still one of `buildHealthScorecard()`'s pure derivations
 * (`lib/intelligence/scorecard.ts`) from fields the engine already computed
 * (Health, Confidence, Risk contributors, TVL, market momentum, GitHub
 * activity, governance, whale detection, community links) — this pass only
 * changes how those same 8 tiles are presented (one dense, scannable table
 * instead of 8 separate cards), not what they compute. A tile with no real
 * signal (`severity === "unknown"`) shows "—" in the score column and a
 * "Not Assessed" chip rather than a guess; only `momentum` carries a real
 * `trend` (the sign of its live price-change input) — every other row shows
 * a neutral dash instead of a fabricated arrow.
 */
export function ProjectHealthScorecard({ tiles }: ProjectHealthScorecardProps) {
  return (
    <ProfileSectionCard title="Project Health Scorecard" icon={Gauge}>
      <div role="table" aria-label="Project health score matrix" className="overflow-hidden rounded-xl border border-radar-light-border dark:border-white/10">
        <div
          role="row"
          className="hidden items-center gap-4 border-b border-radar-light-border bg-radar-light-surface px-4 py-2 dark:border-white/10 dark:bg-white/[0.02] sm:flex"
        >
          <span role="columnheader" className={cn(HEADER_CELL_CLASS, "w-44")}>
            Category
          </span>
          <span role="columnheader" className={cn(HEADER_CELL_CLASS, "w-24 text-right")}>
            Score
          </span>
          <span role="columnheader" className={cn(HEADER_CELL_CLASS, "min-w-0 flex-1")}>
            Progress
          </span>
          <span role="columnheader" className={cn(HEADER_CELL_CLASS, "w-10 text-center")}>
            Trend
          </span>
          <span role="columnheader" className={cn(HEADER_CELL_CLASS, "w-32 text-right")}>
            Status
          </span>
        </div>

        <div role="rowgroup" className="divide-y divide-radar-light-border dark:divide-white/10">
          {tiles.map((tile) => {
            const Icon = TILE_ICON[tile.id];
            const unavailable = tile.severity === "unknown";
            const trendLabel = tile.trend ? `Trend: ${TREND_LABEL[tile.trend]}` : "Trend not tracked for this metric";

            return (
              <Tooltip
                key={tile.id}
                className="block w-full"
                content={
                  <RichTooltip title={tile.label} description={unavailable ? UNAVAILABLE_TOOLTIP : tile.detail}>
                    {unavailable && <p className="text-radar-light-muted dark:text-radar-muted">{tile.detail}</p>}
                    <p className="text-radar-light-muted dark:text-radar-muted">Source: {tile.source}</p>
                  </RichTooltip>
                }
              >
                <div
                  role="row"
                  tabIndex={0}
                  className="flex cursor-default flex-col gap-2.5 px-4 py-3 outline-none transition-colors hover:bg-radar-light-surface focus-visible:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-radar-primary/50 dark:hover:bg-white/[0.03] dark:focus-visible:bg-white/[0.03] sm:flex-row sm:items-center sm:gap-4"
                >
                  <div role="cell" className="flex min-w-0 items-center gap-2 sm:w-44 sm:shrink-0">
                    <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-lg", SEVERITY_ICON_BG[tile.severity])}>
                      <Icon className={cn("size-3.5 shrink-0", SEVERITY_CLASS[tile.severity])} aria-hidden="true" />
                    </span>
                    <span className="truncate text-sm font-medium text-radar-light-text dark:text-radar-white">{tile.label}</span>
                  </div>

                  <div role="cell" className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2 sm:flex-nowrap sm:gap-4">
                    <span className={cn("shrink-0 text-right text-sm font-bold whitespace-nowrap tabular-nums sm:w-24 sm:text-base", SEVERITY_CLASS[tile.severity])}>
                      {unavailable ? "—" : tile.scoreLabel}
                    </span>

                    <div className="order-last h-2 w-full min-w-0 overflow-hidden rounded-full bg-radar-light-border sm:order-none sm:w-auto sm:flex-1 dark:bg-white/10">
                      {tile.score !== null && (
                        <div
                          className={cn(
                            "h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none",
                            SEVERITY_BAR_GRADIENT[tile.severity]
                          )}
                          style={{ width: `${tile.score}%` }}
                        />
                      )}
                    </div>

                    <span className="flex w-8 shrink-0 items-center justify-center sm:w-10" aria-label={trendLabel} title={trendLabel}>
                      {tile.trend ? (
                        (() => {
                          const TrendIcon = TREND_ICON[tile.trend];
                          return <TrendIcon className={cn("size-3.5", TREND_CLASS[tile.trend])} aria-hidden="true" />;
                        })()
                      ) : (
                        <span className="text-xs text-radar-light-muted/50 dark:text-radar-muted/40" aria-hidden="true">
                          –
                        </span>
                      )}
                    </span>

                    <div className="ml-auto flex shrink-0 justify-end sm:ml-0 sm:w-32">
                      <span className={cn("w-fit rounded-full px-2 py-0.5 text-[10.5px] font-medium whitespace-nowrap", SEVERITY_CHIP_CLASS[tile.severity])}>
                        {tile.statusLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </ProfileSectionCard>
  );
}
