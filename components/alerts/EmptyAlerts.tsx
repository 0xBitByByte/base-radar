import Link from "next/link";
import { Bell, Eye } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

type EmptyAlertsProps =
  | { variant: "no-watchlist" }
  | { variant: "no-alerts" }
  | { variant: "filtered"; onClearFilters?: () => void };

const CLEAR_FILTERS_BUTTON_CLASS =
  "rounded-lg border border-radar-light-border px-4 py-2 text-sm font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5";

const CTA_LINK_CLASS =
  "rounded-lg bg-radar-primary px-4 py-2 text-sm font-medium text-white outline-none transition-colors hover:bg-radar-primary/90 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:bg-radar-accent dark:text-radar-bg dark:hover:bg-radar-accent/90";

/**
 * The Alert feed's empty state — reuses the same shared `EmptyState`
 * primitive Watchlist already uses. PR15.1 splits this into three
 * distinct, deliberately non-generic variants (Watchlist integration
 * means "no alerts" now has two genuinely different real causes, not one):
 *
 * - `no-watchlist`: the user isn't watching any project at all, so there's
 *   nothing that could ever produce a visible alert. CTA sends them to
 *   Explorer to start watching something.
 * - `no-alerts`: they're watching real projects, but none of those
 *   projects currently have a (non-muted) alert. No CTA — there's nothing
 *   actionable, this is just the honest current state.
 * - `filtered`: alerts exist and are visible, but the active status/
 *   severity/category/project filters matched none of them — unchanged
 *   from PR15.0.
 */
export function EmptyAlerts(props: EmptyAlertsProps) {
  if (props.variant === "no-watchlist") {
    return (
      <EmptyState
        icon={Eye}
        title="You're not watching any projects yet."
        description="Add projects to your Watchlist from Explorer to start seeing alerts for them here."
        className="py-16"
        action={
          <Link href="/dashboard/projects" className={CTA_LINK_CLASS}>
            Go to Explorer
          </Link>
        }
      />
    );
  }

  if (props.variant === "no-alerts") {
    return (
      <EmptyState
        icon={Bell}
        title="No alerts for your watched projects."
        description="Governance, release, TVL, and on-chain activity alerts will appear here as they happen for the projects you're watching."
        className="py-16"
      />
    );
  }

  return (
    <EmptyState
      icon={Bell}
      title="No alerts match these filters."
      description="Try a different status, severity, category, or project."
      className="py-16"
      action={
        props.onClearFilters && (
          <button type="button" onClick={props.onClearFilters} className={CLEAR_FILTERS_BUTTON_CLASS}>
            Clear filters
          </button>
        )
      }
    />
  );
}
