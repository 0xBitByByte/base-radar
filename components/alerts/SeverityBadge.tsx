import { SEVERITY_BADGE_CLASS, SEVERITY_ICON, SEVERITY_LABEL } from "@/components/alerts/meta";
import type { AlertSeverity } from "@/lib/alerts/types";
import { cn } from "@/lib/utils";

type SeverityBadgeProps = {
  severity: AlertSeverity;
  className?: string;
};

/**
 * The one Severity chip every alert surface reuses — icon + label + a
 * semantic color pulled from `components/alerts/meta.ts`, never
 * color-only (the label text and icon both carry the meaning, not just
 * the tint) so it reads correctly for colorblind users and screen readers
 * alike.
 */
export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const Icon = SEVERITY_ICON[severity];
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold",
        SEVERITY_BADGE_CLASS[severity],
        className
      )}
    >
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      {SEVERITY_LABEL[severity]}
    </span>
  );
}
