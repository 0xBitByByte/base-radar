import { CATEGORY_LABEL } from "@/components/alerts/meta";
import type { AlertCategory } from "@/lib/alerts/types";
import { cn } from "@/lib/utils";

type ConfidenceBarProps = {
  confidence: number;
  /**
   * The distinct real signal categories backing this confidence score
   * (PR-012) — `computeConfidence` scales with how many of these agree, so
   * naming them is a direct explanation of the number, not a new fact.
   * Optional so `ConfidenceBar` still works anywhere the categories aren't
   * at hand; omit or pass `[]` for the bar alone, exactly as before.
   */
  categories?: AlertCategory[];
  className?: string;
  /** Native tooltip only — reuses `IntelligenceAlert.reasoning` (already computed, never shown elsewhere) so the same factual justification is one hover away without duplicating visible text. */
  title?: string;
};

/** "Security signal" (one) / "Security + TVL signals" (two+) — never plural for a single category, never invented beyond the real categories passed in. */
function describeCategories(categories: AlertCategory[]): string {
  const labels = categories.map((category) => CATEGORY_LABEL[category]);
  const noun = labels.length === 1 ? "signal" : "signals";
  return `${labels.join(" + ")} ${noun}`;
}

/**
 * Reusable 0-100 progress track for `IntelligenceAlert.confidence`
 * (`lib/alerts/intelligence/scoring.ts`'s `computeConfidence` — how many
 * distinct real signal categories corroborate this read, never a
 * probability estimate). Fill color is `radar-primary`/`radar-accent`
 * regardless of magnitude — this codebase has no defined confidence-tier
 * palette, so scaling color by value would fabricate a meaning ("high
 * confidence is good/bad") the engine never asserts; the number and label
 * carry that judgment, not the color. When `categories` is provided and
 * non-empty, a second line explains that number in terms of which real
 * categories back it (e.g. "Security + TVL signals") — the exact
 * "confidence, explained" pairing PR-012 asks for, never a probability
 * claim beyond what `computeConfidence` already asserts.
 */
export function ConfidenceBar({ confidence, categories, className, title }: ConfidenceBarProps) {
  const clamped = Math.max(0, Math.min(100, confidence));

  return (
    <div className={cn("flex flex-col gap-1", className)} title={title}>
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
      {categories && categories.length > 0 && (
        <span className="text-[10.5px] text-radar-light-muted/80 dark:text-radar-muted/70">
          {describeCategories(categories)}
        </span>
      )}
    </div>
  );
}
