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

/**
 * PR-074 — the one shared renderer for every "leading project" spotlight
 * tile. Root cause of the "Highest TVL has no logo" bug: that tile used to
 * be written by hand with a static `Landmark` icon standing in for the
 * project's actual branding, never calling `ProjectLogo` at all — so it
 * never got the registry→CoinGecko→DefiLlama→GitHub fallback chain every
 * other project surface (`LiveProjectCard`, `ProfileHeader`, the "Highest
 * GitHub Activity" tile) already goes through. Routing every spotlight
 * through this one function means a future spotlight can't reintroduce the
 * same bug by hand-rolling its own icon again.
 */
function SpotlightCard({
  project,
  href,
  eyebrow,
  metric,
}: {
  project: LiveProject;
  href: string;
  eyebrow: string;
  metric: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-w-[220px] flex-1 items-center gap-3 rounded-xl border border-radar-light-border/70 bg-radar-light-surface/60 p-3.5 outline-none transition-colors hover:border-radar-primary/30 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/[0.06] dark:bg-white/[0.02]"
    >
      <ProjectLogo logoUrl={project.identity.logoUrl} fallbackUrls={project.identity.logoUrlFallbacks} name={project.identity.name} size={36} />
      <div className="flex min-w-0 flex-col">
        <span className="text-[11px] font-medium uppercase tracking-wide text-radar-light-muted dark:text-radar-muted">{eyebrow}</span>
        <span className="truncate text-sm font-semibold text-radar-light-text dark:text-radar-white">{project.identity.name}</span>
        <span className="truncate text-xs text-radar-light-muted dark:text-radar-muted">{metric}</span>
      </div>
    </Link>
  );
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
    // PR-074 REVIEW #3 — confirmed root cause: zero of the 21 seed registry
    // projects have ever had `lifecycle.updatedAt` set (`grep -rl updatedAt
    // data/projects/seed/*.ts` returns no matches), so this tile reads "0"
    // for every real page load today — not a bug, an honest reflection of
    // the registry's current state (same precedent as the neighboring
    // `recentlyVerified` collection, see `lib/projects/collections.ts`).
    // Matches the reviewer's own instruction: hide rather than waste a
    // permanently-zero tile's space; it reappears the moment any registry
    // project's `lifecycle.updatedAt` is actually set.
    collections.recentlyUpdated.length > 0 && {
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
      // PR-074 — shortened from "N active proposals" (which wrapped across
      // up to three lines in a narrow tile at some breakpoints) to a form
      // that reads naturally on one line at the same sizes every other
      // tile's value already fits in.
      label: "Governance Activity",
      value: `${formatNumber(activeProposalCount)} Active`,
      icon: Gavel,
      href: `${PROJECTS_PATH}`,
    },
  ].filter((tile): tile is StatTile => Boolean(tile));

  // PR-074 — `topVolume` (the third real leaderboard `loadProjectsData.ts`
  // already computes) was never rendered here, so a project page with only
  // one of the two original spotlights populated left the sibling grid
  // column genuinely blank. All three spotlights now render through the
  // same `flex flex-wrap` row (via `SpotlightCard`, `flex-1` children) so
  // any count from 1 to 3 fills the row evenly — no reserved, empty column.
  const highestVolume = leaderboards.topVolume[0];
  const spotlights = [
    highestTvl && {
      key: "tvl",
      project: highestTvl,
      href: spotlightHref(highestTvl, PROJECTS_VIEW_META.topTvl.slug),
      eyebrow: "Highest TVL",
      metric: `${formatCompactCurrency(highestTvl.market.tvlUsd ?? 0)} tracked TVL`,
    },
    highestVolume && {
      key: "volume",
      project: highestVolume,
      href: spotlightHref(highestVolume, PROJECTS_VIEW_META.topVolume.slug),
      eyebrow: "Highest 24h Volume",
      metric: `${formatCompactCurrency(highestVolume.market.volume24hUsd ?? 0)} traded (24h)`,
    },
    // PR-074 — was "Highest GitHub Activity" / "commits this week", reading
    // `engineering.commitsLast7d` — always null at this catalog scale (see
    // `loadProjectsData.ts`'s `topActivity` comment). Matches the same
    // real, always-available `stars` field the leaderboard is now sorted by.
    highestActivity && {
      key: "activity",
      project: highestActivity,
      href: spotlightHref(highestActivity, PROJECTS_VIEW_META.topActivity.slug),
      eyebrow: "Most Starred Repository",
      metric: `${formatCompactNumber(highestActivity.engineering.stars ?? 0)} GitHub stars`,
    },
  ].filter((spotlight): spotlight is { key: string; project: LiveProject; href: string; eyebrow: string; metric: string } =>
    Boolean(spotlight)
  );

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-radar-light-border bg-gradient-to-b from-radar-light-card/90 to-radar-light-surface/70 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-gradient-to-b dark:from-radar-elevated/60 dark:to-radar-card/70">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-radar-light-text dark:text-radar-white">
          <TrendingUp className="size-4 text-radar-primary" aria-hidden="true" />
          Base Today
        </h2>
        <p className="text-xs text-radar-light-muted dark:text-radar-muted">What&apos;s happening on the Base ecosystem right now.</p>
      </div>

      {spotlights.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {spotlights.map((spotlight) => (
            <SpotlightCard key={spotlight.key} project={spotlight.project} href={spotlight.href} eyebrow={spotlight.eyebrow} metric={spotlight.metric} />
          ))}
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
