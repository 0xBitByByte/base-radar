import { TrendingUp } from "lucide-react";

import { formatPercent } from "@/lib/data/format";
import type { Narrative, WithSource } from "@/lib/data/types";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";

type TrendingWidgetProps = {
  data: WithSource<Narrative[]>;
  lastUpdated: string;
};

export function TrendingWidget({ data, lastUpdated }: TrendingWidgetProps) {
  return (
    <WidgetCard
      icon={<TrendingUp className="size-5" aria-hidden="true" />}
      title="Trending"
      subtitle="Narratives gaining momentum"
      accent="accent"
      source={data.source}
      lastUpdated={lastUpdated}
    >
      <div className="flex flex-col gap-3.5">
        {data.map((narrative) => (
          <div key={narrative.name} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-radar-light-text dark:text-radar-white">
                {narrative.name}
              </span>
              <GlowBadge color="muted" className="border-none px-2 py-0.5">
                {narrative.category}
              </GlowBadge>
              <span
                className={
                  narrative.change24hPct >= 0
                    ? "ml-auto font-medium text-radar-success"
                    : "ml-auto font-medium text-radar-danger"
                }
              >
                {formatPercent(narrative.change24hPct)}
              </span>
            </div>
            <ProgressBar
              value={narrative.momentum}
              showValue={false}
              colorClassName="bg-radar-accent"
            />
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}
