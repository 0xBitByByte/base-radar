import type { Metadata } from "next";

import { NotificationPreferencesPage } from "@/components/notifications/NotificationPreferencesPage";

export const metadata: Metadata = {
  title: "Notification Preferences",
  description: "Choose which notification types appear across Base Radar, and manage your read history.",
};

/**
 * PR19 Part 3 — renders entirely client-side (`NotificationPreferencesPage`):
 * no server fetch. Preferences and read state both live in `localStorage`
 * via `lib/notifications/preferences.ts`/`lib/notifications/storage.ts`.
 */
export default function NotificationPreferencesRoute() {
  return <NotificationPreferencesPage />;
}
