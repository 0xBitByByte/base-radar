import { Flame, ArrowDown, ArrowUp, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/data/format";
import type { NarrativeHeatRow, Trend, WithSource } from "@/lib/data/types";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { ProgressBar } from "@/components/ui/ProgressBar";

const TREND_ICON: Record<Trend, typeof ArrowUp> = { up: ArrowUp, down: ArrowDown, flat: Minus };

const TREND_COLOR: Record<Trend, string> = {
  up: "text-radar-success",
  down: "text-radar-danger",
  flat: "text-radar-light-muted dark:text-radar-muted",
};

function heatColor(heat: number): string {
  if (heat >= 80) return "bg-radar-danger";
  if (heat >= 60) return "bg-radar-orange";
  if (heat >= 40) return "bg-radar-warning";
  return "bg-radar-accent";
}

type NarrativeHeatmapProps = {
  data: WithSource<NarrativeHeatRow[]>;
  lastUpdated: string;
};

/**
 * A one-line takeaway derived from the same real `data` the bars already
 * render — never a separate fetch or a fabricated claim. Handles the
 * edge cases (all-up, all-down, single row) explicitly rather than always
 * assuming a "winner vs. loser" split exists.
 */
function buildHeatmapSummary(rows: NarrativeHeatRow[]): string | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => b.change24hPct - a.change24hPct);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];

  if (rows.length === 1) {
    const verb = top.momentum === "up" ? "gaining attention" : top.momentum === "down" ? "cooling off" : "holding steady";
    return `${top.category} is ${verb} over the last 24 hours.`;
  }
  if (top.change24hPct <= 0) {
    return `All tracked categories cooled over the last 24 hours, led down by ${bottom.category}.`;
  }
  if (bottom.change24hPct >= 0) {
    return `All tracked categories gained over the last 24 hours, led by ${top.category}.`;
  }
  return `${top.category} continues gaining attention while ${bottom.category} activity cooled over the last 24 hours.`;
}

export function NarrativeHeatmap({ data, lastUpdated }: NarrativeHeatmapProps) {
  const summary = buildHeatmapSummary(data);

  return (
    <WidgetCard
      icon={<Flame className="size-5" aria-hidden="true" />}
      title="Narrative Heatmap"
      subtitle="Which project categories are gaining or losing attention on Base"
      accent="orange"
      source={data.source}
      lastUpdated={lastUpdated}
    >
      <p className="text-[11px] leading-relaxed text-radar-light-muted/80 dark:text-radar-muted/70">
        Each bar combines price and volume momentum across Base projects in that category — a taller bar means
        more relative attention right now, and the % shows the 24h change driving it.
      </p>
      {summary && (
        <p className="text-xs leading-relaxed text-radar-light-text dark:text-radar-white">{summary}</p>
      )}

      <div className="flex flex-col gap-3">
        {data.map((row) => {
          const Icon = TREND_ICON[row.momentum];
          return (
            <div key={row.category} className="flex items-center gap-3">
              <span
                className={cn("size-2 shrink-0 rounded-full", heatColor(row.heat))}
                aria-hidden="true"
              />
              <span className="w-28 shrink-0 truncate text-xs font-semibold text-radar-light-text dark:text-radar-white">
                {row.category}
              </span>
              <ProgressBar
                value={row.heat}
                showValue={false}
                colorClassName={heatColor(row.heat)}
                className="flex-1"
              />
              <span
                className={cn(
                  "flex w-16 shrink-0 items-center justify-end gap-1 text-xs font-medium",
                  TREND_COLOR[row.momentum]
                )}
              >
                <Icon className="size-3" aria-hidden="true" />
                {formatPercent(row.change24hPct)}
              </span>
            </div>
          );
        })}
      </div>
    </WidgetCard>
  );
}
