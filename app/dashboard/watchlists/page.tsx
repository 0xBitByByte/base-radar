import type { Metadata } from "next";

import { WatchlistsWorkspace } from "@/components/watchlists/WatchlistsWorkspace";

export const metadata: Metadata = {
  title: "Watchlists",
  description: "Organize projects into your own collections — create, rename, pin, and reorder watchlists.",
};

/**
 * Renders entirely client-side (`WatchlistsWorkspace`) from the sole
 * Watchlist owner: `lib/personalization/storage.ts`.
 */
export default function WatchlistsPage() {
  return <WatchlistsWorkspace />;
}
