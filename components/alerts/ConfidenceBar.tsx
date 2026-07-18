import { cn } from "@/lib/utils";

type ConfidenceBarProps = {
  confidence: number;
  className?: string;
};

/**
 * Reusable 0-100 progress track for `IntelligenceAlert.confidence`
 * (`lib/alerts/intelligence/scoring.ts`'s `computeConfidence` — how many
 * distinct real signal categories corroborate this read, never a
 * probability estimate). Fill color is `radar-primary`/`radar-accent`
 * regardless of magnitude — this codebase has no defined confidence-tier
 * palette, so scaling color by value would fabricate a meaning ("high
 * confidence is good/bad") the engine never asserts; the number and label
 * carry that judgment, not the color.
 */
export function ConfidenceBar({ confidence, className }: ConfidenceBarProps) {
  const clamped = Math.max(0, Math.min(100, confidence));

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Confidence"
        className="h-1.5 w-full overflow-hidden rounded-full bg-radar-light-border dark:bg-white/10"
      >
        <div
          className="h-full rounded-full bg-radar-primary transition-[width] duration-300 dark:bg-radar-accent"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">
        {clamped}% Confidence
      </span>
    </div>
  );
}
