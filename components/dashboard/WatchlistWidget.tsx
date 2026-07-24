"use client";

import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";

import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { ChangeValue } from "@/components/explorer/ChangeValue";
import { ScoreBadge } from "@/components/explorer/ScoreBadge";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPrice } from "@/lib/data/format";
import { useWatchedProjects } from "@/lib/hooks/useWatchedProjects";
import type { ProjectIntelligence } from "@/lib/intelligence/types";

type WatchlistWidgetProps = {
  /** The full registry's intelligence, already resolved by `app/dashboard/page.tsx` via `getAllProjectIntelligence()` — never fetched here, only filtered down to whatever's watched. */
  projects: ProjectIntelligence[];
  lastUpdated: string;
};

/**
 * PR13.1 — replaces the previous mock "pinned wallets/tokens/narratives"
 * concept with the real, `localStorage`-backed project watchlist. Reuses
 * `getAllProjectIntelligence()`'s already-computed data (health, confidence,
 * price, 24h change) — never rebuilds intelligence, only filters an
 * already-fetched array down to watched project IDs via
 * `useWatchedProjects`. Live: adding/removing a project anywhere in the app
 * updates this widget on the same tick, no refresh.
 */
export function WatchlistWidget({ projects, lastUpdated }: WatchlistWidgetProps) {
  const watched = useWatchedProjects(projects);

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
        <ul className="flex flex-col gap-3">
          {watched.map((project) => {
            const priceAvailable = project.market.available && project.market.priceUsd !== null;

            return (
              <li key={project.identity.id}>
                <Link
                  href={`/dashboard/projects/${project.identity.slug}`}
                  className="flex items-center gap-3 rounded-lg p-1 outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:hover:bg-white/5"
                >
                  <ProjectLogo logoUrl={project.identity.logoUrl} name={project.identity.name} size={32} />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-radar-light-text dark:text-radar-white">
                      {project.identity.name}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <ScoreBadge
                        type="health"
                        score={project.health.score}
                        label={project.health.label}
                        showLabel={false}
                        bare
                      />
                      <ScoreBadge
                        type="confidence"
                        score={project.confidence.score}
                        label={project.confidence.level}
                        showLabel={false}
                        bare
                      />
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold tabular-nums text-radar-light-text dark:text-radar-white">
                      {priceAvailable ? formatPrice(project.market.priceUsd as number) : "—"}
                    </p>
                    <ChangeValue value={project.market.changePct24h} className="text-[11px]" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
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
