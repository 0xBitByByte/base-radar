/**
 * PR-061 — Task 1: "Base Today" — the page's new hero section, directly
 * below the header. Answers "what's happening on Base today?" in one
 * glance, before any rail or card. Every number here is a real, already-
 * computed aggregate over the same `LiveProject[]` the rest of the page
 * reads — `getStats()` (below) does nothing `page.tsx` couldn't already do
 * inline; it's just one place that also enforces the "hide, never fabricate"
 * rule per insight. An insight with no real backing data (e.g. no project
 * anywhere has tracked TVL) is simply omitted, never shown as `$0` or `—`.
 */

import Link from "next/link";
import { Compass, Gavel, Landmark, RefreshCw, Rocket, ShieldAlert, TrendingUp, type LucideIcon } from "lucide-react";

import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { PROJECTS_PATH } from "@/components/projects/queryState";
import { PROJECTS_VIEW_META } from "@/components/projects/viewMeta";
import { formatCompactCurrency, formatCompactNumber, formatNumber } from "@/lib/data/format";
import type { LiveProject, LiveProjectCollections } from "@/lib/projects/types";
import type { ProjectsLeaderboards } from "@/components/projects/loadProjectsData";

type BaseTodayPanelProps = {
  projects: LiveProject[];
  collections: LiveProjectCollections;
  leaderboards: ProjectsLeaderboards;
};

type StatTile = { key: string; label: string; value: string; icon: LucideIcon; href: string };

function spotlightHref(project: LiveProject, fallbackSlug: string): string {
  return project.slug ? `/dashboard/projects/${project.slug}` : `${PROJECTS_PATH}/${fallbackSlug}`;
}

export function BaseTodayPanel({ projects, collections, leaderboards }: BaseTodayPanelProps) {
  const totalTvlUsd = projects.reduce((sum, project) => sum + (project.market.tvlUsd ?? 0), 0);
  const hasAnyTvl = projects.some((project) => project.market.tvlUsd !== null);

  const activeProposalCount = projects.reduce((sum, project) => sum + (project.governance.activeProposalCount ?? 0), 0);
  const governanceConfiguredCount = projects.filter((project) => project.governance.configured).length;

  const highestTvl = leaderboards.topTvl[0];
  const highestActivity = leaderboards.topActivity[0];

  const stats: StatTile[] = [
    hasAnyTvl && {
      key: "tvl",
      label: "Total TVL Tracked",
      value: formatCompactCurrency(totalTvlUsd),
      icon: Landmark,
      href: `${PROJECTS_PATH}/${PROJECTS_VIEW_META.topTvl.slug}`,
    },
    {
      key: "new",
      label: "New Listings",
      value: formatNumber(collections.new.length),
      icon: Rocket,
      href: `${PROJECTS_PATH}/${PROJECTS_VIEW_META.new.slug}`,
    },
    {
      key: "recentlyDiscovered",
      label: "Recently Discovered",
      value: formatNumber(collections.recentlyDiscovered.length),
      icon: Compass,
      href: `${PROJECTS_PATH}/${PROJECTS_VIEW_META.recentlyDiscovered.slug}`,
    },
    {
      key: "recentlyUpdated",
      label: "Recently Updated",
      value: formatNumber(collections.recentlyUpdated.length),
      icon: RefreshCw,
      href: `${PROJECTS_PATH}/${PROJECTS_VIEW_META.recentlyUpdated.slug}`,
    },
    {
      key: "needsReview",
      label: "Needs Review",
      value: formatNumber(collections.needsReview.length),
      icon: ShieldAlert,
      href: `${PROJECTS_PATH}/${PROJECTS_VIEW_META.needsReview.slug}`,
    },
    governanceConfiguredCount > 0 && {
      key: "governance",
      label: "Governance Activity",
      value: `${formatNumber(activeProposalCount)} active proposal${activeProposalCount === 1 ? "" : "s"}`,
      icon: Gavel,
      href: `${PROJECTS_PATH}`,
    },
  ].filter((tile): tile is StatTile => Boolean(tile));

  const hasSpotlight = Boolean(highestTvl) || Boolean(highestActivity);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-radar-light-border bg-gradient-to-b from-radar-light-card/90 to-radar-light-surface/70 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-gradient-to-b dark:from-radar-elevated/60 dark:to-radar-card/70">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-radar-light-text dark:text-radar-white">
          <TrendingUp className="size-4 text-radar-primary" aria-hidden="true" />
          Base Today
        </h2>
        <p className="text-xs text-radar-light-muted dark:text-radar-muted">What&apos;s happening on the Base ecosystem right now.</p>
      </div>

      {hasSpotlight && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {highestTvl && (
            <Link
              href={spotlightHref(highestTvl, PROJECTS_VIEW_META.topTvl.slug)}
              className="flex items-center gap-3 rounded-xl border border-radar-light-border/70 bg-radar-light-surface/60 p-3.5 outline-none transition-colors hover:border-radar-primary/30 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/[0.06] dark:bg-white/[0.02]"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-radar-primary/10 text-radar-primary">
                <Landmark className="size-4" aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="text-[11px] font-medium uppercase tracking-wide text-radar-light-muted dark:text-radar-muted">
                  Highest TVL
                </span>
                <span className="truncate text-sm font-semibold text-radar-light-text dark:text-radar-white">
                  {highestTvl.identity.name}
                </span>
                <span className="text-xs text-radar-light-muted dark:text-radar-muted">
                  {formatCompactCurrency(highestTvl.market.tvlUsd ?? 0)} tracked TVL
                </span>
              </div>
            </Link>
          )}

          {highestActivity && (
            <Link
              href={spotlightHref(highestActivity, PROJECTS_VIEW_META.topActivity.slug)}
              className="flex items-center gap-3 rounded-xl border border-radar-light-border/70 bg-radar-light-surface/60 p-3.5 outline-none transition-colors hover:border-radar-primary/30 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/[0.06] dark:bg-white/[0.02]"
            >
              <ProjectLogo
                logoUrl={highestActivity.identity.logoUrl}
                fallbackUrls={highestActivity.identity.logoUrlFallbacks}
                name={highestActivity.identity.name}
                size={36}
              />
              <div className="flex min-w-0 flex-col">
                <span className="text-[11px] font-medium uppercase tracking-wide text-radar-light-muted dark:text-radar-muted">
                  Highest GitHub Activity
                </span>
                <span className="truncate text-sm font-semibold text-radar-light-text dark:text-radar-white">
                  {highestActivity.identity.name}
                </span>
                <span className="text-xs text-radar-light-muted dark:text-radar-muted">
                  {formatCompactNumber(highestActivity.engineering.commitsLast7d ?? 0)} commits this week
                </span>
              </div>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.key}
              href={stat.href}
              className="flex flex-col gap-1.5 rounded-xl border border-radar-light-border/70 bg-radar-light-surface/60 p-3 outline-none transition-colors hover:border-radar-primary/30 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/[0.06] dark:bg-white/[0.02]"
            >
              <Icon className="size-3.5 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
              <span className="text-lg font-bold tracking-tight tabular-nums text-radar-light-text dark:text-radar-white">
                {stat.value}
              </span>
              <span className="truncate text-[10.5px] font-medium uppercase tracking-wide text-radar-light-muted dark:text-radar-muted">
                {stat.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
