import { Bell } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

type NotificationEmptyVariant = "none" | "search" | "filter";

const NOTIFICATION_EMPTY_COPY: Record<NotificationEmptyVariant, { title: string; description?: string }> = {
  none: {
    title: "No notifications yet.",
    description: "Notifications will appear here once your watched projects have scoreable signals.",
  },
  search: { title: "No results match your search." },
  filter: { title: "No notifications match the selected filters." },
};

type NotificationEmptyProps = {
  variant: NotificationEmptyVariant;
  className?: string;
};

/**
 * The Notification Center's three distinct empty states — one component,
 * not three ad-hoc `EmptyState` calls scattered across `NotificationCenter`
 * and `NotificationDrawer`, so the exact copy for "no data at all" vs. "no
 * search results" vs. "no filter results" only ever needs to be written
 * once. Same icon across all three variants (mirrors
 * `components/timeline/Timeline.tsx`'s own precedent of reusing one icon
 * for both its empty states) — only the message changes.
 */
export function NotificationEmpty({ variant, className }: NotificationEmptyProps) {
  const copy = NOTIFICATION_EMPTY_COPY[variant];
  return <EmptyState icon={Bell} title={copy.title} description={copy.description} className={className ?? "py-16"} />;
}
