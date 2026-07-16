import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { formatPercent } from "@/lib/data/format";
import { cn } from "@/lib/utils";

type ChangeValueProps = {
  /** `null` renders "—" in muted gray — never a fabricated 0%. */
  value: number | null;
  className?: string;
  showIcon?: boolean;
};

/**
 * PR12.1 Req 5 — the one shared "signed percent" renderer for the whole
 * Project Profile page: green ▲ for positive, red ▼ for negative, muted
 * gray for exactly zero or unavailable. Every percent-change display on
 * this page (Token Info, Price, TVL, Health Scorecard) goes through this
 * instead of each call site re-deriving its own color/arrow logic.
 */
export function ChangeValue({ value, className, showIcon = true }: ChangeValueProps) {
  if (value === null) {
    return <span className={cn("text-radar-light-muted dark:text-radar-muted", className)}>—</span>;
  }

  const isPositive = value > 0;
  const isNegative = value < 0;
  const Icon = isPositive ? ArrowUp : isNegative ? ArrowDown : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-medium tabular-nums",
        isPositive ? "text-radar-success" : isNegative ? "text-radar-danger" : "text-radar-light-muted dark:text-radar-muted",
        className
      )}
    >
      {showIcon && <Icon className="size-3 shrink-0" aria-hidden="true" />}
      {formatPercent(value)}
    </span>
  );
}
