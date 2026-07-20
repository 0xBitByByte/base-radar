import type { Metadata } from "next";

import { PersonalizationPreferencesPage } from "@/components/personalization/PersonalizationPreferencesPage";

export const metadata: Metadata = {
  title: "Personalization Preferences",
  description: "Control Dashboard personalization, Search prioritization, and Topbar behavior, and manage your watchlists as a file.",
};

/**
 * PR22 Part 3 — renders entirely client-side
 * (`PersonalizationPreferencesPage`): no server fetch. Preferences live in
 * `localStorage` via `lib/personalization/preferences.ts`; watchlist
 * import/export reads/writes `lib/personalization/storage.ts` through
 * `useWatchlists()`.
 */
export default function PersonalizationPreferencesRoute() {
  return <PersonalizationPreferencesPage />;
}
