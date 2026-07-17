import type { Metadata } from "next";

import { getAllProjectIntelligence } from "@/lib/intelligence/engine";
import { WatchlistPageClient } from "@/components/watchlist/WatchlistPageClient";

export const metadata: Metadata = {
  title: "Watchlist",
  description: "Projects you're tracking on Base Radar.",
};

/**
 * PR13.1 — mirrors `app/dashboard/projects/page.tsx`'s Explorer Shell split
 * exactly: this Server Component is the only place on this route that
 * calls the Intelligence Engine, fetching every registry project's
 * intelligence once via the same `getAllProjectIntelligence()` Explorer
 * already uses; `WatchlistPageClient` only ever filters that already-
 * resolved array down to whatever's on the (client-only, `localStorage`-
 * backed) watchlist — never a second fetch.
 */
export default async function WatchlistPage() {
  const projects = await getAllProjectIntelligence();
  return <WatchlistPageClient projects={projects} />;
}
