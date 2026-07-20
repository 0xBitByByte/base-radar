import type { Metadata } from "next";

import { WatchlistsWorkspace } from "@/components/watchlists/WatchlistsWorkspace";

export const metadata: Metadata = {
  title: "Watchlists",
  description: "Organize projects into your own collections — create, rename, pin, and reorder watchlists.",
};

/**
 * PR22 Part 1 — renders entirely client-side (`WatchlistsWorkspace`): no
 * server fetch. Backed by `lib/personalization/storage.ts`, completely
 * separate from the existing single flat Watchlist (`lib/watchlist/`,
 * still used at `/dashboard/watchlist` and by `WatchButton` everywhere
 * else) — this PR does not touch that foundation.
 */
export default function WatchlistsPage() {
  return <WatchlistsWorkspace />;
}
