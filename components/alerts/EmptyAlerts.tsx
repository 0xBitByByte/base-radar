import Link from "next/link";
import { Bell } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

type EmptyAlertsProps = {
  /** `true` when alerts exist but the active filters matched none of them — different copy/action than a genuinely empty feed. */
  filtered?: boolean;
  onClearFilters?: () => void;
};

/** The Alert feed's empty state — reuses the same shared `EmptyState` primitive Watchlist already uses, so both look and feel the same. */
export function EmptyAlerts({ filtered = false, onClearFilters }: EmptyAlertsProps) {
  if (filtered) {
    return (
      <EmptyState
        icon={Bell}
        title="No alerts match these filters."
        description="Try a different status, severity, category, or project."
        className="py-16"
        action={
          onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="rounded-lg border border-radar-light-border px-4 py-2 text-sm font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
            >
              Clear filters
            </button>
          )
        }
      />
    );
  }

  return (
    <EmptyState
      icon={Bell}
      title="No alerts yet."
      description="Governance, release, TVL, and on-chain activity alerts will appear here as Base Radar starts tracking them."
      className="py-16"
      action={
        <Link
          href="/dashboard/projects"
          className="rounded-lg bg-radar-primary px-4 py-2 text-sm font-medium text-white outline-none transition-colors hover:bg-radar-primary/90 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:bg-radar-accent dark:text-radar-bg dark:hover:bg-radar-accent/90"
        >
          Explore Projects
        </Link>
      }
    />
  );
}
