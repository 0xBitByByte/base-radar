import type { KpiValueParts } from "@/lib/data/format";
import { cn } from "@/lib/utils";

/** Secondary emphasis for every non-numeral piece (`$`, `B`/`M`/`K`, decimals, `gwei`) — the numeral stays the only hero. */
const SECONDARY_CLASS = "text-radar-light-muted dark:text-radar-muted";

type KpiValueDisplayProps = {
  parts: KpiValueParts;
  className?: string;
  suppressHydrationWarning?: boolean;
};

/**
 * The one place a KPI value's visual hierarchy is defined — every dashboard
 * metric that wants "numeral is the hero, everything around it recedes"
 * renders through this component instead of restating the same className
 * soup at each call site. `$`/`B`/`M`/`K` and the decimal portion share the
 * numeral's size, just recolored; `gwei` additionally drops to a smaller
 * size since it's a multi-letter unit word, not a single compact-notation
 * letter.
 */
export function KpiValueDisplay({ parts, className, suppressHydrationWarning }: KpiValueDisplayProps) {
  const { prefix, integer, decimal, suffix, unit } = parts;

  return (
    <span
      className={cn(
        "text-lg font-semibold tabular-nums text-radar-light-text dark:text-radar-white",
        className
      )}
      suppressHydrationWarning={suppressHydrationWarning}
    >
      {prefix && <span className={SECONDARY_CLASS}>{prefix}</span>}
      {integer}
      {decimal && <span className={SECONDARY_CLASS}>{decimal}</span>}
      {suffix && <span className={SECONDARY_CLASS}>{suffix}</span>}
      {unit && <span className={cn("ml-0.5 text-sm", SECONDARY_CLASS)}>{unit}</span>}
    </span>
  );
}
