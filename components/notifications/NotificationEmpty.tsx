import { Bell } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

type NotificationEmptyVariant = "none" | "search" | "filter" | "watchlist";

const NOTIFICATION_EMPTY_COPY: Record<NotificationEmptyVariant, { title: string; description?: string }> = {
  none: {
    title: "No notifications yet.",
    description: "Notifications will appear here once your watched projects have scoreable signals.",
  },
  search: { title: "No results match your search." },
  filter: { title: "No notifications match the selected filters." },
  watchlist: { title: "No notifications for this watchlist." },
};

type NotificationEmptyProps = {
  variant: NotificationEmptyVariant;
  /** Only used by the `"watchlist"` variant, to name the active watchlist in the description. */
  watchlistName?: string;
  className?: string;
};

/**
 * The Notification Center's four distinct empty states — one component,
 * not several ad-hoc `EmptyState` calls scattered across `NotificationCenter`
 * and `NotificationDrawer`, so the exact copy for "no data at all" vs. "no
 * search results" vs. "no filter results" vs. "nothing in the active
 * watchlist" (PR22 Part 2) only ever needs to be written once. Same icon
 * across all variants (mirrors `components/timeline/Timeline.tsx`'s own
 * precedent of reusing one icon for both its empty states) — only the
 * message changes.
 */
export function NotificationEmpty({ variant, watchlistName, className }: NotificationEmptyProps) {
  const copy = NOTIFICATION_EMPTY_COPY[variant];
  const description =
    variant === "watchlist" && watchlistName
      ? `None of the projects in "${watchlistName}" have notifications yet.`
      : copy.description;
  return <EmptyState icon={Bell} title={copy.title} description={description} className={className ?? "py-16"} />;
}
