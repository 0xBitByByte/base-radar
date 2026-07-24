import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Shared empty-state action for every Watchlist-dependent widget — one
 * consistent way to point at the fix ("go add projects"), instead of each
 * widget growing its own bespoke button.
 */
export function ManageWatchlistAction() {
  return (
    <Link
      href="/dashboard/watchlists"
      className="flex items-center gap-1.5 rounded-xl border border-radar-light-border px-3.5 py-2 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
    >
      Manage Watchlist
      <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
  );
}
