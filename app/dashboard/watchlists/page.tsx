import type { Metadata } from "next";

import { WatchlistsWorkspace } from "@/components/watchlists/WatchlistsWorkspace";
import { getLiveProjects } from "@/lib/projects/service";

export const metadata: Metadata = {
  title: "Watchlists",
  description: "Organize projects into your own collections — create, rename, pin, and reorder watchlists.",
};

/**
 * Watchlist *membership* (`projectIds: string[]`) still comes entirely from
 * the client-side `lib/personalization/storage.ts` — untouched. What this
 * Server Component adds (PR-4) is the one piece a client component can
 * never fetch itself: `LiveProject[]`, via the same `getLiveProjects()`
 * every other Live Project consumer already uses, passed down as a prop so
 * `WatchlistsWorkspace` can render each row as a real `LiveProjectCard`
 * instead of a plain-text `<Link>`.
 */
export default async function WatchlistsPage() {
  const liveProjects = await getLiveProjects();
  return <WatchlistsWorkspace liveProjects={liveProjects} />;
}
