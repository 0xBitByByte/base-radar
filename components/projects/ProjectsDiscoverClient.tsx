"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { ExplorerEmptyState } from "@/components/explorer/ExplorerEmptyState";
import { BaseTodayPanel } from "@/components/projects/BaseTodayPanel";
import { CategoryRail } from "@/components/projects/CategoryRail";
import { CollapsibleSection } from "@/components/projects/CollapsibleSection";
import { DirectoryFloatingNav } from "@/components/projects/DirectoryFloatingNav";
import { computeHeroSnapshot, computeProjectsPageData } from "@/components/projects/loadProjectsData";
import { ProjectRail } from "@/components/projects/ProjectRail";
import { ProjectsHeader } from "@/components/projects/ProjectsHeader";
import { ProjectsKpiPulse } from "@/components/projects/ProjectsKpiPulse";
import { SmartViews } from "@/components/projects/SmartViews";
import { useProjectsQueryState } from "@/lib/hooks/useProjectsQueryState";
import { PROJECTS_VIEW_META } from "@/components/projects/viewMeta";
import { dedupeCuratedRails } from "@/lib/projects/curation";
import type { LiveProject } from "@/lib/projects/types";

const ZONE_LABEL_CLASS = "text-sm font-bold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted";

/** Same helper as the original server `page.tsx` — every rail's "View All" points at that view's own dedicated collection route. */
function railHref(view: keyof typeof PROJECTS_VIEW_META): string {
  return `/dashboard/projects/${PROJECTS_VIEW_META[view].slug}`;
}

/**
 * Vercel production-hotspot follow-up — the client-side-filtering
 * replacement for `/dashboard/projects`'s previous two-Suspense-boundary
 * server render (Hero/Discovery, PR-085.02B). `projects` is the full,
 * public `LiveProject[]` array, fetched once server-side (see
 * `app/dashboard/projects/page.tsx`) and shipped as a plain prop. Since the
 * data no longer needs a slow, uncached fetch to stream around (that was
 * the entire reason for the two-Suspense split), both sections render
 * together, synchronously, from one already-resolved dataset —
 * `computeHeroSnapshot`/`computeProjectsPageData` are the exact same pure
 * functions the server used before, just called from the browser.
 *
 * `searchParams`-driven filtering never applied to this page's own content
 * (the curated rails are fixed collections, not filtered by `?query`) —
 * only `CategoryRail`'s `state` prop (for its own active-category
 * highlighting) reads it, preserved here via `useProjectsQueryState()`.
 */
export function ProjectsDiscoverClient({ projects }: { projects: LiveProject[] }) {
  const { state } = useProjectsQueryState();

  const snapshot = useMemo(() => computeHeroSnapshot(projects), [projects]);
  const data = useMemo(() => computeProjectsPageData(projects), [projects]);

  if (snapshot.totalProjects === 0) {
    return <ExplorerEmptyState />;
  }

  const { collections, leaderboards } = data;

  const dedupedRails = dedupeCuratedRails([
    { key: "verified", ranked: collections.verified, maxCards: PROJECTS_VIEW_META.verified.maxCards },
    { key: "trending", ranked: collections.trending, maxCards: PROJECTS_VIEW_META.trending.maxCards },
    { key: "new", ranked: collections.new, maxCards: PROJECTS_VIEW_META.new.maxCards },
    { key: "topTvl", ranked: leaderboards.topTvl, maxCards: PROJECTS_VIEW_META.topTvl.maxCards },
    { key: "topVolume", ranked: leaderboards.topVolume, maxCards: PROJECTS_VIEW_META.topVolume.maxCards },
    { key: "topActivity", ranked: leaderboards.topActivity, maxCards: PROJECTS_VIEW_META.topActivity.maxCards },
    { key: "needsReview", ranked: collections.needsReview, maxCards: PROJECTS_VIEW_META.needsReview.maxCards },
    { key: "recentlyDiscovered", ranked: collections.recentlyDiscovered, maxCards: PROJECTS_VIEW_META.recentlyDiscovered.maxCards },
    { key: "recentlyUpdated", ranked: collections.recentlyUpdated, maxCards: PROJECTS_VIEW_META.recentlyUpdated.maxCards },
  ]);

  return (
    <div className="flex flex-col gap-10 pb-10">
      <ProjectsHeader totalCount={snapshot.totalProjects} lastUpdated={snapshot.lastUpdated} />

      <BaseTodayPanel
        totalTvlUsd={snapshot.totalTvlUsd}
        hasAnyTvl={snapshot.hasAnyTvl}
        activeProposalCount={snapshot.activeProposalCount}
        governanceConfiguredCount={snapshot.governanceConfiguredCount}
        newCount={snapshot.newCount}
        recentlyDiscoveredCount={snapshot.recentlyDiscoveredCount}
        recentlyUpdatedCount={snapshot.recentlyUpdatedCount}
        needsReviewCount={snapshot.needsReviewCount}
        highestTvl={snapshot.highestTvl}
        highestVolume={snapshot.highestVolume}
        highestActivity={snapshot.highestActivity}
      />

      <CollapsibleSection id="kpi-pulse" title="Overview">
        <ProjectsKpiPulse
          totalProjects={snapshot.totalProjects}
          verified={snapshot.verifiedCount}
          newlyDiscovered={snapshot.newCount}
          highConfidence={snapshot.highConfidenceCount}
        />
      </CollapsibleSection>

      <CollapsibleSection id="smart-views" title="Smart Views">
        <SmartViews counts={snapshot.smartViewCounts} />
        <Link
          href="/dashboard/collections"
          className="mt-2 flex w-fit items-center gap-1.5 rounded-full border border-radar-primary/20 bg-radar-primary/5 py-1.5 pr-3 pl-2.5 text-xs font-medium text-radar-primary outline-none transition-colors hover:bg-radar-primary/10 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-radar-accent/20 dark:bg-radar-accent/5 dark:text-radar-accent dark:hover:bg-radar-accent/10"
        >
          <Sparkles className="size-3.5" aria-hidden="true" />
          Explore AI-evaluated Smart Collections
        </Link>
      </CollapsibleSection>

      <CategoryRail byCategory={collections.byCategory} state={state} />

      <div id="curated-discovery" className="flex scroll-mt-24 flex-col gap-6">
        <h2 className={ZONE_LABEL_CLASS}>Curated Discovery</h2>
        <div className="flex flex-col gap-8">
          <ProjectRail {...PROJECTS_VIEW_META.verified} projects={dedupedRails.verified} viewAllHref={railHref("verified")} />
          <ProjectRail {...PROJECTS_VIEW_META.trending} projects={dedupedRails.trending} viewAllHref={railHref("trending")} />
          <ProjectRail {...PROJECTS_VIEW_META.new} projects={dedupedRails.new} viewAllHref={railHref("new")} />
        </div>
      </div>

      <div id="leaderboards" className="flex scroll-mt-24 flex-col gap-6">
        <h2 className={ZONE_LABEL_CLASS}>Leaderboards</h2>
        <div className="flex flex-col gap-8">
          <ProjectRail {...PROJECTS_VIEW_META.topTvl} projects={dedupedRails.topTvl} viewAllHref={railHref("topTvl")} />
          <ProjectRail {...PROJECTS_VIEW_META.topVolume} projects={dedupedRails.topVolume} viewAllHref={railHref("topVolume")} />
          <ProjectRail {...PROJECTS_VIEW_META.topActivity} projects={dedupedRails.topActivity} viewAllHref={railHref("topActivity")} />
        </div>
      </div>

      <div id="needs-attention" className="flex scroll-mt-24 flex-col gap-6">
        <h2 className={ZONE_LABEL_CLASS}>Needs Your Attention</h2>
        <div className="flex flex-col gap-8">
          <ProjectRail {...PROJECTS_VIEW_META.needsReview} projects={dedupedRails.needsReview} viewAllHref={railHref("needsReview")} />
          <ProjectRail
            {...PROJECTS_VIEW_META.recentlyDiscovered}
            projects={dedupedRails.recentlyDiscovered}
            viewAllHref={railHref("recentlyDiscovered")}
          />
          <ProjectRail
            {...PROJECTS_VIEW_META.recentlyUpdated}
            projects={dedupedRails.recentlyUpdated}
            viewAllHref={railHref("recentlyUpdated")}
          />
        </div>
      </div>

      <DirectoryFloatingNav />
    </div>
  );
}
