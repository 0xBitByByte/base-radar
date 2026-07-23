import { Check, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/data/format";
import type { BriefTone, IntelligenceBrief as IntelligenceBriefData, WithSource } from "@/lib/data/types";
import type { DashboardEvidenceSummaryItem, DashboardSourceAttribution } from "@/lib/ai-intelligence/dashboard-adapter";
import { WidgetCard } from "@/components/dashboard/WidgetCard";

const TONE_DOT: Record<BriefTone, string> = {
  positive: "bg-radar-success",
  negative: "bg-radar-danger",
  neutral: "bg-radar-light-muted dark:bg-radar-muted",
};

type IntelligenceBriefProps = {
  data: WithSource<IntelligenceBriefData>;
  /** PR-042 — real evidence counts backing the currently-displayed brief (e.g. "3 Registry Updates"). Omitted/empty hides this section entirely — never an empty heading. */
  evidenceSummary?: DashboardEvidenceSummaryItem[];
  /** PR-042 — real contributing sources for the currently-displayed brief. Omitted/empty hides this section entirely. */
  sources?: DashboardSourceAttribution[];
};

export function IntelligenceBrief({ data, evidenceSummary, sources }: IntelligenceBriefProps) {
  return (
    <WidgetCard
      icon={<Sparkles className="size-5" aria-hidden="true" />}
      title="Base Intelligence Brief"
      subtitle="AI-generated summary"
      accent="purple"
      source={data.source}
    >
      <ul className="flex flex-col gap-2.5">
        {data.points.map((point) => (
          <li
            key={point.id}
            className="flex items-start gap-2.5 text-sm text-radar-light-text dark:text-radar-white"
          >
            <span
              className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", TONE_DOT[point.tone])}
              aria-hidden="true"
            />
            {point.text}
          </li>
        ))}
      </ul>

      {evidenceSummary && evidenceSummary.length > 0 && (
        <ul className="flex flex-col gap-1.5 border-t border-radar-light-border/60 pt-3 dark:border-white/5">
          {evidenceSummary.map((item) => (
            <li
              key={item.label}
              className="flex items-start gap-2.5 text-xs text-radar-light-muted dark:text-radar-muted"
            >
              <span
                className="mt-1 size-1 shrink-0 rounded-full bg-radar-light-muted/60 dark:bg-radar-muted/60"
                aria-hidden="true"
              />
              {item.count} {item.label}
            </li>
          ))}
        </ul>
      )}

      {sources && sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-radar-light-border/60 pt-3 dark:border-white/5">
          {sources.map((source) =>
            source.url ? (
              <a
                key={source.name}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-radar-light-text underline-offset-2 hover:underline dark:text-radar-white"
              >
                <Check className="size-3.5 shrink-0 text-radar-success" aria-hidden="true" />
                {source.name}
              </a>
            ) : (
              <span
                key={source.name}
                className="flex items-center gap-1.5 text-xs text-radar-light-text dark:text-radar-white"
              >
                <Check className="size-3.5 shrink-0 text-radar-success" aria-hidden="true" />
                {source.name}
              </span>
            )
          )}
        </div>
      )}

      <p className="text-[11px] text-radar-light-muted/70 dark:text-radar-muted/50">
        Generated {formatRelativeTime(data.generatedAt)}
      </p>
    </WidgetCard>
  );
}
