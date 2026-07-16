import { Brain, CircleAlert, CircleCheck, Database, Eye } from "lucide-react";

import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { cn } from "@/lib/utils";
import type { AiInsight } from "@/lib/intelligence/scorecard";

type ProfileAIInsightProps = {
  insight: AiInsight;
};

const OUTLOOK_TONE_CLASS: Record<AiInsight["outlookTone"], string> = {
  positive: "text-radar-success",
  negative: "text-radar-danger",
  neutral: "text-radar-light-muted dark:text-radar-muted",
};

const OUTLOOK_DOT_CLASS: Record<AiInsight["outlookTone"], string> = {
  positive: "bg-radar-success",
  negative: "bg-radar-danger",
  neutral: "bg-radar-light-muted/40 dark:bg-radar-muted/40",
};

const CONFIDENCE_CLASS: Record<AiInsight["confidenceLabel"], string> = {
  High: "text-radar-success",
  Medium: "text-radar-warning",
  Low: "text-radar-danger",
};

/**
 * PR12.1c Req 5.13 — "AI Insight," the page's analyst-note section: WHY the
 * project currently looks the way it does and WHAT to watch next, written
 * like a concise research note rather than a chatbot reply. Every line
 * comes from `buildAiInsight()` (pure, `lib/intelligence/scorecard.ts`) —
 * real Health/Confidence/Risk/TVL/GitHub/governance/whale fields the engine
 * already computed, no new provider call, nothing invented.
 */
export function ProfileAIInsight({ insight }: ProfileAIInsightProps) {
  return (
    <ProfileSectionCard icon={Brain} title="AI Insight">
      <div className="flex items-center gap-2">
        <span className={cn("size-2 shrink-0 rounded-full", OUTLOOK_DOT_CLASS[insight.outlookTone])} aria-hidden="true" />
        <span className="text-[10.5px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
          Current Outlook
        </span>
        <span className={cn("text-sm font-bold", OUTLOOK_TONE_CLASS[insight.outlookTone])}>{insight.outlook}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-[10.5px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">Why</p>
        <ul className="flex flex-col gap-1.5">
          {insight.why.map((line, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-radar-light-text dark:text-radar-white">
              <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-radar-light-border pt-3 dark:border-white/10">
        <p className="text-[10.5px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">What to Watch</p>
        <ul className="flex flex-col gap-1.5">
          {insight.whatToWatch.map((line, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-radar-light-text dark:text-radar-white">
              <Eye className="mt-0.5 size-3.5 shrink-0 text-radar-warning" aria-hidden="true" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-radar-light-border pt-3 text-xs dark:border-white/10">
        <span className="flex items-center gap-1.5">
          <CircleAlert className={cn("size-3.5 shrink-0", CONFIDENCE_CLASS[insight.confidenceLabel])} aria-hidden="true" />
          <span className="text-radar-light-muted dark:text-radar-muted">Confidence:</span>
          <span className={cn("font-semibold", CONFIDENCE_CLASS[insight.confidenceLabel])}>{insight.confidenceLabel}</span>
        </span>
        <span className="flex flex-wrap items-center gap-1.5 text-radar-light-muted dark:text-radar-muted">
          <Database className="size-3.5 shrink-0" aria-hidden="true" />
          {insight.dataSources.length > 0 ? insight.dataSources.join(", ") : "No live data sources"}
        </span>
      </div>
    </ProfileSectionCard>
  );
}
