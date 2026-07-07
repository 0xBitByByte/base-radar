import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/data/format";
import type { BriefTone, IntelligenceBrief as IntelligenceBriefData, WithSource } from "@/lib/data/types";
import { WidgetCard } from "@/components/dashboard/WidgetCard";

const TONE_DOT: Record<BriefTone, string> = {
  positive: "bg-radar-success",
  negative: "bg-radar-danger",
  neutral: "bg-radar-light-muted dark:bg-radar-muted",
};

type IntelligenceBriefProps = {
  data: WithSource<IntelligenceBriefData>;
};

export function IntelligenceBrief({ data }: IntelligenceBriefProps) {
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
      <p className="text-[11px] text-radar-light-muted/70 dark:text-radar-muted/50">
        Generated {formatRelativeTime(data.generatedAt)}
      </p>
    </WidgetCard>
  );
}
