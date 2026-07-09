import { cn } from "@/lib/utils";
import { formatLabel } from "@/components/explorer/format";

type ScoreBadgeType = "health" | "confidence";

type ScoreBadgeProps = {
  type: ScoreBadgeType;
  score: number;
  label: string;
  className?: string;
};

const TYPE_TITLE: Record<ScoreBadgeType, string> = {
  health: "Health",
  confidence: "Confidence",
};

const HEALTH_COLOR: Record<string, string> = {
  excellent: "text-radar-success",
  good: "text-radar-accent",
  fair: "text-radar-warning",
  poor: "text-radar-danger",
  unknown: "text-radar-light-muted dark:text-radar-muted",
};

const CONFIDENCE_COLOR: Record<string, string> = {
  high: "text-radar-success",
  medium: "text-radar-warning",
  low: "text-radar-danger",
};

/**
 * One reusable score display — docs/explorer/04-component-specification.md
 * §13's ScoreIndicator concept, collapsed into a single component per this
 * PR's approved architecture (rather than separate HealthBadge/
 * ConfidenceBadge components delegating to a hidden shared primitive).
 * Shares layout and styling with `MetricItem`; only the value's color
 * varies, by `type` + `label`. `score`/`label` are always already-computed
 * by the Intelligence Engine (`scoring.ts`/`confidence.ts`) — never
 * derived or recomputed here.
 */
export function ScoreBadge({ type, score, label, className }: ScoreBadgeProps) {
  const color =
    (type === "health" ? HEALTH_COLOR[label] : CONFIDENCE_COLOR[label]) ??
    "text-radar-light-muted dark:text-radar-muted";

  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]",
        className
      )}
    >
      <span className="text-[10.5px] text-radar-light-muted dark:text-radar-muted">{TYPE_TITLE[type]}</span>
      <span className={cn("text-sm font-semibold tabular-nums", color)}>
        {formatLabel(label)} <span className="text-radar-light-muted dark:text-radar-muted">· {score}</span>
      </span>
    </div>
  );
}
