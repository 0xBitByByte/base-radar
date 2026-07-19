import type { Metadata } from "next";

import { NotificationCenter } from "@/components/notifications/NotificationCenter";

export const metadata: Metadata = {
  title: "Notifications",
  description: "A unified notification feed built from the Intelligence Timeline across your Watchlist.",
};

/**
 * PR19 — this route renders entirely client-side (`NotificationCenter`):
 * no server fetch, no rebuilding anything here. `useNotifications()` reads
 * the same runtime-cached `getNotifications()` the Dashboard's
 * `NotificationWidget` and the Topbar's `NotificationDrawer` read from, so
 * all three surfaces always agree.
 */
export default function NotificationsPage() {
  return <NotificationCenter />;
}
