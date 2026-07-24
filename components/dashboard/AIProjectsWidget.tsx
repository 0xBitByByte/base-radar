import { Bot } from "lucide-react";

import { formatPercent } from "@/lib/data/format";
import type { AIProject, WithSource } from "@/lib/data/types";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";

type AIProjectsWidgetProps = {
  data: WithSource<AIProject[]>;
  lastUpdated: string;
};

export function AIProjectsWidget({ data, lastUpdated }: AIProjectsWidgetProps) {
  return (
    <WidgetCard
      icon={<Bot className="size-5" aria-hidden="true" />}
      title="AI Ecosystem"
      subtitle="Trading activity across AI-native projects on Base"
      accent="purple"
      source={data.source}
      lastUpdated={lastUpdated}
    >
      <p className="text-[11px] leading-relaxed text-radar-light-muted/80 dark:text-radar-muted/70">
        Activity compares each project&apos;s 24h trading volume to the busiest AI project right now — a fuller
        bar means more trading interest today, not a quality or safety score.
      </p>

      <div className="flex flex-col gap-3.5">
        {data.map((project) => (
          <div key={project.symbol} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-radar-light-text dark:text-radar-white">
                {project.name}
              </span>
              {project.isNewLaunch && (
                <GlowBadge color="accent" className="px-1.5 py-0 text-[10px]">
                  New
                </GlowBadge>
              )}
              <span
                className={
                  project.change24hPct >= 0
                    ? "ml-auto font-medium text-radar-success"
                    : "ml-auto font-medium text-radar-danger"
                }
              >
                {formatPercent(project.change24hPct)}
              </span>
            </div>
            <ProgressBar
              value={project.activityScore}
              label="Activity"
              colorClassName="bg-radar-purple"
            />
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}
