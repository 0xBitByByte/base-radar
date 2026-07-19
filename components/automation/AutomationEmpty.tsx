import Link from "next/link";
import { Zap } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

type AutomationEmptyVariant = "none" | "search" | "filter" | "disabled";

const AUTOMATION_EMPTY_COPY: Record<AutomationEmptyVariant, { title: string; description?: string }> = {
  none: {
    title: "No automation results yet.",
    description: "Results will appear here once a rule matches a real notification from your Watchlist.",
  },
  search: { title: "No results match your search." },
  filter: { title: "No automation results match the selected filters." },
  disabled: {
    title: "Automation is disabled.",
    description: "No rule can fire while Automation is turned off.",
  },
};

type AutomationEmptyProps = {
  variant: AutomationEmptyVariant;
  className?: string;
};

/**
 * The Automation Center's four distinct empty states — one component, not
 * ad-hoc `EmptyState` calls scattered across `AutomationCenter` and
 * `AutomationWidget`. Mirrors `components/notifications/NotificationEmpty.tsx`'s
 * three-variant shape, plus a PR20 Part 3 `"disabled"` variant so turning
 * off the master preference reads as a deliberate, honest state rather
 * than being conflated with "no rules matched" — the two have different
 * causes and the copy says so. The `"disabled"` variant is the one case
 * that links onward (to `/dashboard/settings/automation`), since the fix
 * is a single toggle away.
 */
export function AutomationEmpty({ variant, className }: AutomationEmptyProps) {
  const copy = AUTOMATION_EMPTY_COPY[variant];
  const action =
    variant === "disabled" ? (
      <Link
        href="/dashboard/settings/automation"
        className="text-xs font-medium text-radar-primary outline-none transition-colors hover:text-radar-primary/80 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-accent dark:hover:text-radar-accent/80"
      >
        Go to Automation Preferences
      </Link>
    ) : undefined;

  return (
    <EmptyState
      icon={Zap}
      title={copy.title}
      description={copy.description}
      action={action}
      className={className ?? "py-16"}
    />
  );
}
