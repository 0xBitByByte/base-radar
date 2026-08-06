import type { Metadata } from "next";

import { ExplorerEmptyState } from "@/components/explorer/ExplorerEmptyState";
import { ExplorerErrorState } from "@/components/explorer/ExplorerErrorState";
import { BaseTodayPanel } from "@/components/projects/BaseTodayPanel";
import { buildDirectoryPipeline } from "@/components/projects/collectionPipeline";
import { CategoryRail } from "@/components/projects/CategoryRail";
import { CollapsibleSection } from "@/components/projects/CollapsibleSection";
import { availableDiscoveryStatuses, financialRangeOptions } from "@/components/projects/filterOptions";
import { FinancialSummary } from "@/components/projects/FinancialSummary";
import { loadProjectsPageData } from "@/components/projects/loadProjectsData";
import { ProjectRail } from "@/components/projects/ProjectRail";
import { ProjectsDirectory } from "@/components/projects/ProjectsDirectory";
import { ProjectsHeader } from "@/components/projects/ProjectsHeader";
import { ProjectsInteractionBar } from "@/components/projects/ProjectsInteractionBar";
import { ProjectsKpiPulse } from "@/components/projects/ProjectsKpiPulse";
import { PROJECTS_PATH, type RawSearchParams } from "@/components/projects/queryState";
import { SmartViews } from "@/components/projects/SmartViews";
import { PROJECTS_VIEW_META } from "@/components/projects/viewMeta";
import { dedupeCuratedRails } from "@/lib/projects/curation";
import type { LiveProject } from "@/lib/projects/types";

export const metadata: Metadata = {
  title: "Projects",
  description: "Browse the Base ecosystem — every verified, tracked, and discovered project in one place.",
  alternates: { canonical: PROJECTS_PATH },
};

/** The most recent `lastUpdated` across every project — real, derived data for the Header's "Updated" indicator, never a fabricated timestamp. */
function mostRecentTimestamp(projects: LiveProject[]): string | null {
  let latest: string | null = null;
  let latestMs = -Infinity;

  for (const project of projects) {
    const ms = Date.parse(project.lastUpdated);
    if (!Number.isNaN(ms) && ms > latestMs) {
      latestMs = ms;
      latest = project.lastUpdated;
    }
  }

  return latest;
}

const ZONE_LABEL_CLASS = "text-sm font-bold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted";

type ProjectsPageProps = {
  searchParams: Promise<RawSearchParams>;
};

/**
 * PR-058 — activates the PR-057 layout with real search, category
 * selection, filtering, sorting, pagination, and "View All," all backed by
 * `?query` state (`components/projects/queryState.ts`) so the page stays
 * shareable.
 *
 * PR-059 — usability pass: sticky Search/Filter/Sort, compact rail cards,
 * stronger section hierarchy.
 *
 * PR-060 — Smart Views (Blue Chips/Emerging/Needs Attention/Fast Growing).
 *
 * PR-061 — intelligence-platform pass: "Base Today" hero panel (Task 1)
 * answers "what's happening today" before any rail; Smart Views and every
 * rail's "View All" now navigate to their own dedicated collection route
 * (Task 2/7 — `components/projects/renderProjectsCollectionRoute.tsx`)
 * instead of updating `?view=` on this same page; the Category Rail has
 * real visual hierarchy (Task 3); the card answers "why should I care?"
 * (Task 8, in `LiveProjectCard.tsx`). All data computation is shared via
 * `loadProjectsPageData()`/`buildDirectoryPipeline()` with those dedicated
 * routes — no logic duplicated, `lib/projects/` itself untouched.
 */
export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const rawSearchParams = await searchParams;

  let data;
  try {
    data = await loadProjectsPageData();
  } catch {
    return <ExplorerErrorState />;
  }

  const { projects, collections, leaderboards, smartViewLists, smartViewCounts } = data;

  if (projects.length === 0) {
    return <ExplorerEmptyState />;
  }

  const { state, directoryPage, directoryTitle, directorySubtitle, emptyState, financialSummary } = buildDirectoryPipeline({
    rawSearchParams,
    projects,
    collections,
    leaderboards,
    smartViewLists,
  });

  /** PR-061 — Task 2/7: every rail's "View All" now points at that view's own dedicated collection route, not `?view=` on this page. */
  function railHref(view: keyof typeof PROJECTS_VIEW_META): string {
    return `${PROJECTS_PATH}/${PROJECTS_VIEW_META[view].slug}`;
  }

  // PR-077 — cross-rail dedup, in the page's real display order (Curated
  // Discovery -> Leaderboards -> Needs Your Attention). Only governs these
  // 9 curated rails: each rail's own ranking/filtering (`collections`/
  // `leaderboards`) is untouched, and the Full Directory below still shows
  // every project. See `lib/projects/curation.ts`.
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
      <ProjectsHeader totalCount={projects.length} lastUpdated={mostRecentTimestamp(projects)} />

      <BaseTodayPanel projects={projects} collections={collections} leaderboards={leaderboards} />

      <ProjectsInteractionBar
        state={state}
        resultCount={directoryPage.totalItems}
        availableDiscoveryStatuses={availableDiscoveryStatuses(projects)}
        financialRangeOptions={financialRangeOptions(projects)}
      />

      <CollapsibleSection id="kpi-pulse" title="Overview">
        <ProjectsKpiPulse
          totalProjects={projects.length}
          verified={collections.verified.length}
          newlyDiscovered={collections.new.length}
          highConfidence={collections.highConfidence.length}
        />
      </CollapsibleSection>

      <CollapsibleSection id="smart-views" title="Smart Views">
        <SmartViews counts={smartViewCounts} />
      </CollapsibleSection>

      <CategoryRail byCategory={collections.byCategory} state={state} />

      <div className="flex flex-col gap-6">
        <h2 className={ZONE_LABEL_CLASS}>Curated Discovery</h2>
        <div className="flex flex-col gap-8">
          <ProjectRail {...PROJECTS_VIEW_META.verified} projects={dedupedRails.verified} viewAllHref={railHref("verified")} />
          <ProjectRail {...PROJECTS_VIEW_META.trending} projects={dedupedRails.trending} viewAllHref={railHref("trending")} />
          <ProjectRail {...PROJECTS_VIEW_META.new} projects={dedupedRails.new} viewAllHref={railHref("new")} />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <h2 className={ZONE_LABEL_CLASS}>Leaderboards</h2>
        <div className="flex flex-col gap-8">
          <ProjectRail {...PROJECTS_VIEW_META.topTvl} projects={dedupedRails.topTvl} viewAllHref={railHref("topTvl")} />
          <ProjectRail {...PROJECTS_VIEW_META.topVolume} projects={dedupedRails.topVolume} viewAllHref={railHref("topVolume")} />
          <ProjectRail {...PROJECTS_VIEW_META.topActivity} projects={dedupedRails.topActivity} viewAllHref={railHref("topActivity")} />
        </div>
      </div>

      <div className="flex flex-col gap-6">
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

      <FinancialSummary entries={financialSummary} />
      <ProjectsDirectory title={directoryTitle} subtitle={directorySubtitle} page={directoryPage} state={state} emptyState={emptyState} />
    </div>
  );
}
