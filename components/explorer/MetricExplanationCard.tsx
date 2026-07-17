import type { MetricExplanation } from "@/lib/intelligence/report";

/**
 * PR13.8 Goal 5 — one "Key Metrics Explained" card: Score, Rating, Evidence,
 * Meaning, in that order, matching the goal's own worked example format
 * ("Developer Activity — 100/100 — Excellent — 26 contributors, 10 releases
 * — Healthy development cadence"). Shared by the synchronous cards
 * (`ProfileExecutiveIntelligence`) and the one streamed card
 * (`ProfileMetricsExplainedDeveloperAsync`) so a resolved evidence swap-in
 * renders through the exact same recipe as every other card.
 */
export function MetricExplanationCard({ explanation }: { explanation: MetricExplanation }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-3.5 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">{explanation.label}</span>
        <span className="text-sm font-bold tabular-nums text-radar-light-text dark:text-radar-white">{explanation.scoreLabel}</span>
      </div>
      <span className="w-fit rounded-full bg-radar-light-border/60 px-1.5 py-0.5 text-[10px] font-medium text-radar-light-muted dark:bg-white/5 dark:text-radar-muted">
        {explanation.ratingLabel}
      </span>
      <p className="text-xs leading-relaxed text-radar-light-text dark:text-radar-white">{explanation.evidence}</p>
      <p className="text-[11px] leading-relaxed text-radar-light-muted italic dark:text-radar-muted">{explanation.meaning}</p>
    </div>
  );
}
