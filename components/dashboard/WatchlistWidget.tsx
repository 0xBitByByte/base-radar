"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";

import { WatchedProjectRow } from "@/components/dashboard/WatchedProjectRow";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import type { LiveProject } from "@/lib/projects/types";

type WatchlistWidgetProps = {
  /** The full `LiveProject[]`, already fetched by `app/dashboard/page.tsx` via `getLiveProjects()` — never fetched here, only filtered down to whatever's watched. */
  liveProjects: LiveProject[];
  lastUpdated: string;
};

/**
 * Universal Project Card, PR-6 — retired `ProjectIntelligence[]` for the
 * canonical `LiveProject` model, per §3's "one source of truth." Filters
 * via `useWatchlist()` directly (not the `ProjectIntelligence`-typed
 * `useWatchedProjects`, left untouched for its one remaining consumer,
 * `AlertsPageClient`) — the same local-filter-over-canonical-data pattern
 * PR-4's `WatchlistsWorkspace` already established.
 *
 * Bug fix (visual formatting) — rows render via `WatchedProjectRow`, this
 * dashboard's own two-line row (name+grade, then chain+value+24h trend),
 * not `LiveProjectCard`'s `variant="micro"` — see that file's own doc
 * comment for why 24h change specifically isn't part of `micro`'s
 * canonical anatomy, and `WatchedProjectRow`'s for why a host-owned row is
 * the correct extension point rather than reopening that anatomy.
 */
export function WatchlistWidget({ liveProjects, lastUpdated }: WatchlistWidgetProps) {
  const { projectIds } = useWatchlist();
  const watched = useMemo(() => {
    const watchedIds = new Set(projectIds);
    return liveProjects.filter((project) => watchedIds.has(project.id));
  }, [liveProjects, projectIds]);

  return (
    <WidgetCard
      icon={<Star className="size-5" aria-hidden="true" />}
      title="Watchlist"
      subtitle="Projects you're watching"
      accent="primary"
      source="live"
      lastUpdated={lastUpdated}
    >
      {watched.length === 0 ? (
        <EmptyState
          icon={Star}
          title="Nothing watched yet."
          description="Star a project from Projects or its profile page to track it here — and unlock personalized intelligence, notifications, and automation across the dashboard."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {watched.map((project) => (
            <WatchedProjectRow key={project.id} project={project} />
          ))}
        </div>
      )}

      <Link
        href="/dashboard/watchlists"
        className="flex items-center gap-1 self-start text-xs font-medium text-radar-primary outline-none transition-colors hover:text-radar-primary/80 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-accent dark:hover:text-radar-accent/80"
      >
        View full watchlist
        <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
      </Link>
    </WidgetCard>
  );
}
