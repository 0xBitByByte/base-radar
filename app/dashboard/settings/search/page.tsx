import type { Metadata } from "next";

import { SearchPreferencesPage } from "@/components/search/SearchPreferencesPage";

export const metadata: Metadata = {
  title: "Search Preferences",
  description: "Control Global Search and Command Palette behavior, and manage your search history.",
};

/**
 * PR21 Part 3 — renders entirely client-side (`SearchPreferencesPage`): no
 * server fetch. Preferences and Recent Searches both live in `localStorage`
 * via `lib/search/preferences.ts`/`lib/search/storage.ts`.
 */
export default function SearchPreferencesRoute() {
  return <SearchPreferencesPage />;
}
