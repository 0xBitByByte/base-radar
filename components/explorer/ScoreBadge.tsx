import { Info } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatLabel } from "@/components/explorer/format";
import { RichTooltip } from "@/components/ui/RichTooltip";
import { Tooltip } from "@/components/ui/Tooltip";

type ScoreBadgeType = "health" | "confidence";

type ScoreBadgeProps = {
  type: ScoreBadgeType;
  score: number;
  label: string;
  className?: string;
  /** Grid shows the "Health"/"Confidence" label; Table hides it since the column header already identifies it. */
  showLabel?: boolean;
  /** Fallback one-sentence explanation shown when `factors` isn't passed — Grid/Table never pass `factors`, so this is what their info icon shows. */
  infoTooltip?: string;
  /** The Engine's own plain-English reasoning behind the score — Quick View only (Grid/Table never pass this). When present, the info tooltip shows this real breakdown instead of `infoTooltip`'s generic sentence — always the Engine's actual computed factors, never invented. */
  factors?: string[];
  /** Renders as a plain label+value stack with no border/background/padding of its own — Table's dense cells. Grid/Quick View never pass this. */
  bare?: boolean;
};

const TOOLTIP_LIST_CLASS = "mt-1 flex flex-col gap-0.5";

function ScoreTooltipContent({
  typeTitle,
  label,
  score,
  factors,
  fallback,
}: {
  typeTitle: string;
  label: string;
  score: number;
  factors?: string[];
  fallback?: string;
}) {
  return (
    <RichTooltip title={`${typeTitle} Score`} description={`Overall score: ${formatLabel(label)} (${score})`}>
      {factors && factors.length > 0 ? (
        <>
          <p className="text-radar-light-muted dark:text-radar-muted">Calculated from:</p>
          <ul className={TOOLTIP_LIST_CLASS}>
            {factors.map((factor) => (
              <li key={factor}>✓ {factor}</li>
            ))}
          </ul>
        </>
      ) : (
        fallback && <p className="text-radar-light-muted dark:text-radar-muted">{fallback}</p>
      )}
    </RichTooltip>
  );
}

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
export function ScoreBadge({
  type,
  score,
  label,
  className,
  showLabel = true,
  infoTooltip,
  factors,
  bare,
}: ScoreBadgeProps) {
  const color =
    (type === "health" ? HEALTH_COLOR[label] : CONFIDENCE_COLOR[label]) ??
    "text-radar-light-muted dark:text-radar-muted";
  const hasFactors = Boolean(factors && factors.length > 0);
  const hasTooltip = hasFactors || Boolean(infoTooltip);
  const tooltipContent = hasTooltip && (
    <ScoreTooltipContent
      typeTitle={TYPE_TITLE[type]}
      label={label}
      score={score}
      factors={factors}
      fallback={infoTooltip}
    />
  );

  const valueSpan = (
    <span
      // Only ever keyboard-focusable when it's also the tooltip trigger
      // (`!showLabel && hasTooltip`, below) — otherwise this plain `<span>`
      // has nothing to focus for.
      tabIndex={!showLabel && hasTooltip ? 0 : undefined}
      className={cn(
        "text-sm tabular-nums outline-none",
        !showLabel && hasTooltip && "rounded focus-visible:ring-2 focus-visible:ring-radar-primary/50",
        bare ? "whitespace-nowrap font-normal" : "font-semibold",
        color
      )}
    >
      {formatLabel(label)} <span className="text-radar-light-muted dark:text-radar-muted">· {score}</span>
    </span>
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-0.5",
        !bare && "rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]",
        className
      )}
    >
      {showLabel && (
        <span className="flex items-center gap-1 text-[10.5px] text-radar-light-muted dark:text-radar-muted">
          {TYPE_TITLE[type]}
          {hasTooltip && (
            <Tooltip content={tooltipContent}>
              <button
                type="button"
                onClick={(event) => event.stopPropagation()}
                aria-label={`About ${TYPE_TITLE[type]}`}
                className="text-radar-light-muted/60 outline-none transition-colors hover:text-radar-light-muted focus-visible:text-radar-light-muted dark:text-radar-muted/50 dark:hover:text-radar-muted dark:focus-visible:text-radar-muted"
              >
                <Info className="size-3" aria-hidden="true" />
              </button>
            </Tooltip>
          )}
        </span>
      )}
      {/* `!showLabel` (Table's dense `bare` cells) hides the label+icon row
          entirely for space — the value itself becomes the tooltip trigger
          instead, so Health/Confidence stay hoverable there too rather than
          silently losing their info tooltip. */}
      {!showLabel && hasTooltip ? (
        <Tooltip content={tooltipContent}>{valueSpan}</Tooltip>
      ) : (
        valueSpan
      )}
      {factors && factors.length > 0 && (
        <ul className="mt-1 flex flex-col gap-1 text-xs text-radar-light-muted dark:text-radar-muted">
          {factors.map((factor) => (
            <li key={factor} className="flex gap-1.5">
              <span aria-hidden="true">·</span>
              <span>{factor}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
