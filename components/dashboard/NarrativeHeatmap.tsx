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

export function NarrativeHeatmap({ data, lastUpdated }: NarrativeHeatmapProps) {
  return (
    <WidgetCard
      icon={<Flame className="size-5" aria-hidden="true" />}
      title="Narrative Heatmap"
      subtitle="Category momentum across Base"
      accent="orange"
      source={data.source}
      lastUpdated={lastUpdated}
      className="sm:col-span-2 xl:col-span-3"
    >
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
