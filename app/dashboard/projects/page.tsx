import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { ExplorerEmptyState } from "@/components/explorer/ExplorerEmptyState";
import { ExplorerErrorState } from "@/components/explorer/ExplorerErrorState";
import { BaseTodayPanel } from "@/components/projects/BaseTodayPanel";
import { buildDirectoryPipeline } from "@/components/projects/collectionPipeline";
import { CategoryRail } from "@/components/projects/CategoryRail";
import { CollapsibleSection } from "@/components/projects/CollapsibleSection";
import { DirectoryFloatingNav } from "@/components/projects/DirectoryFloatingNav";
import { getProjectsHeroSnapshot, loadProjectsPageData } from "@/components/projects/loadProjectsData";
import { ProjectRail } from "@/components/projects/ProjectRail";
import { ProjectsHeader } from "@/components/projects/ProjectsHeader";
import { ProjectsKpiPulse } from "@/components/projects/ProjectsKpiPulse";
import { ProjectsDiscoverySkeleton, ProjectsHeroSkeleton } from "@/components/projects/ProjectsLoadingSkeletons";
import { PROJECTS_PATH, type RawSearchParams } from "@/components/projects/queryState";
import { SmartViews } from "@/components/projects/SmartViews";
import { PROJECTS_VIEW_META } from "@/components/projects/viewMeta";
import { dedupeCuratedRails } from "@/lib/projects/curation";

export const metadata: Metadata = {
  title: "Projects",
  // PR-085.04 — this page is Discover only now; "every... project" moved
  // to `/dashboard/projects/all` and has its own accurate description there.
  description: "Discover the Base ecosystem — verified, trending, and newly surfaced projects, curated in one place.",
  alternates: { canonical: PROJECTS_PATH },
};

const ZONE_LABEL_CLASS = "text-sm font-bold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted";

/** PR-061 — Task 2/7: every rail's "View All" points at that view's own dedicated collection route, not `?view=` on this page. Pure — no data dependency, shared by whichever boundary renders a rail. */
function railHref(view: keyof typeof PROJECTS_VIEW_META): string {
  return `${PROJECTS_PATH}/${PROJECTS_VIEW_META[view].slug}`;
}

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
 *
 * PR-085.02B — this page no longer awaits its data at the top level. It
 * splits into three independently-streamed `<Suspense>` boundaries (Hero,
 * Discovery, Directory), each originally calling the same, `cache()`-
 * wrapped `loadProjectsPageData()` — one real computation per request
 * regardless of how many boundaries consume it. Error/empty handling is
 * unchanged in substance (`ExplorerErrorState`/`ExplorerEmptyState`, no
 * new Error Boundary component): the Hero boundary renders whichever one
 * applies in its own slot, exactly where the page used to render it
 * full-stop; the Discovery/Directory boundaries detect the same condition
 * (from the same cached result) and render nothing rather than repeating
 * the message a second and third time.
 *
 * PR-085.02C — Hero no longer calls `loadProjectsPageData()` at all. Of
 * everything Hero shows (Header, Base Today, Overview, Smart Views), none
 * of it needs the full collection-building pipeline — only counts and
 * single "highest" projects, all served by `loadProjectsData.ts`'s new,
 * lightweight, single-traversal `getProjectsHeroSnapshot()`.
 *
 * PR-085.04 — Split the Projects Experience. This page is now Discover
 * only: Header, Base Today, Overview, Smart Views, Category Rail, and every
 * curated rail — nothing here changed in content or ranking, per Product
 * Owner Decision 3. Search/Filter/Sort and the Full Directory (the former
 * third Suspense boundary, plus the Interaction Bar's own nested boundary
 * inside Hero) moved to their own dedicated route,
 * `/dashboard/projects/all` (`app/dashboard/projects/all/page.tsx`), which
 * reuses the exact same `ProjectsCollectionPage`/`renderProjectsCollectionRoute`
 * pipeline the 11 other dedicated collection routes already used — no new
 * loading architecture, no new component, per Decision 2. A single "Browse
 * All Projects" link closes the loop at the bottom of Discovery (Decision
 * 5); `ProjectsCollectionPage`'s own back-link now points here from every
 * other collection route (Decision 4).
 */
export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const rawSearchParams = await searchParams;

  return (
    <div className="flex flex-col gap-10 pb-10">
      <Suspense fallback={<ProjectsHeroSkeleton />}>
        <ProjectsHeroSection />
      </Suspense>

      <Suspense fallback={<ProjectsDiscoverySkeleton />}>
        <ProjectsDiscoverySection rawSearchParams={rawSearchParams} />
      </Suspense>

      {/* PR-086 — always rendered (not gated behind either Suspense
          boundary above): it only reacts to real scroll position and real
          DOM ids that may or may not have streamed in yet, so it has
          nothing to wait on itself. */}
      <DirectoryFloatingNav />
    </div>
  );
}

/**
 * Boundary 1 — Hero Section: Header, Base Today, Overview, Smart Views —
 * all served by the lightweight `getProjectsHeroSnapshot()`, never the
 * full collection-building pipeline. Owns the one visible error/empty
 * state; the Discovery boundary stays silent on the same condition.
 *
 * PR-085.04 — the Interaction Bar (search/filter/sort + its result count)
 * moved to the new `/all` route along with the Directory it always
 * described — this boundary no longer has a reason to touch
 * `loadProjectsPageData()`/`rawSearchParams` at all.
 */
async function ProjectsHeroSection() {
  let snapshot;
  try {
    snapshot = await getProjectsHeroSnapshot();
  } catch {
    return <ExplorerErrorState />;
  }

  if (snapshot.totalProjects === 0) {
    return <ExplorerEmptyState />;
  }

  const {
    totalProjects,
    lastUpdated,
    totalTvlUsd,
    hasAnyTvl,
    activeProposalCount,
    governanceConfiguredCount,
    newCount,
    recentlyDiscoveredCount,
    recentlyUpdatedCount,
    needsReviewCount,
    verifiedCount,
    highConfidenceCount,
    smartViewCounts,
    highestTvl,
    highestVolume,
    highestActivity,
  } = snapshot;

  return (
    <>
      <ProjectsHeader totalCount={totalProjects} lastUpdated={lastUpdated} />

      <BaseTodayPanel
        totalTvlUsd={totalTvlUsd}
        hasAnyTvl={hasAnyTvl}
        activeProposalCount={activeProposalCount}
        governanceConfiguredCount={governanceConfiguredCount}
        newCount={newCount}
        recentlyDiscoveredCount={recentlyDiscoveredCount}
        recentlyUpdatedCount={recentlyUpdatedCount}
        needsReviewCount={needsReviewCount}
        highestTvl={highestTvl}
        highestVolume={highestVolume}
        highestActivity={highestActivity}
      />

      <CollapsibleSection id="kpi-pulse" title="Overview">
        <ProjectsKpiPulse totalProjects={totalProjects} verified={verifiedCount} newlyDiscovered={newCount} highConfidence={highConfidenceCount} />
      </CollapsibleSection>

      <CollapsibleSection id="smart-views" title="Smart Views">
        <SmartViews counts={smartViewCounts} />
        {/* PR-090.06 — Explorer Integration. "Smart Views" (above, PR-061)
            and "Smart Collections" (PR-090.04) are two genuinely different
            features that happen to share a name pattern: Smart Views are
            filter presets over this same page's project list; Smart
            Collections are a separate, AI-evaluated set of 10 named
            collections with their own dedicated pages. Nothing linked
            between them before this — a plain, honest cross-navigation
            link, not a merge of the two systems. */}
        <Link
          href="/dashboard/collections"
          className="mt-2 flex w-fit items-center gap-1.5 rounded-full border border-radar-primary/20 bg-radar-primary/5 py-1.5 pr-3 pl-2.5 text-xs font-medium text-radar-primary outline-none transition-colors hover:bg-radar-primary/10 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-radar-accent/20 dark:bg-radar-accent/5 dark:text-radar-accent dark:hover:bg-radar-accent/10"
        >
          <Sparkles className="size-3.5" aria-hidden="true" />
          Explore AI-evaluated Smart Collections
        </Link>
      </CollapsibleSection>
    </>
  );
}

/** Boundary 2 — Discovery Section: Category Rail + every curated rail zone (Curated Discovery / Leaderboards / Needs Your Attention). */
async function ProjectsDiscoverySection({ rawSearchParams }: { rawSearchParams: RawSearchParams }) {
  let data;
  try {
    data = await loadProjectsPageData();
  } catch {
    // The Hero boundary already renders ExplorerErrorState for this request.
    return null;
  }

  const { projects, collections, leaderboards, smartViewLists } = data;
  if (projects.length === 0) {
    // The Hero boundary already renders ExplorerEmptyState for this request.
    return null;
  }

  const { state } = buildDirectoryPipeline({ rawSearchParams, projects, collections, leaderboards, smartViewLists });

  // PR-077 — cross-rail dedup, in the page's real display order (Curated
  // Discovery -> Leaderboards -> Needs Your Attention). Only governs these
  // 9 curated rails: each rail's own ranking/filtering (`collections`/
  // `leaderboards`) is untouched, and the Full Directory still shows every
  // project. See `lib/projects/curation.ts`.
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
    <>
      <CategoryRail byCategory={collections.byCategory} state={state} />

      {/* PR-086 — `id`+`scroll-mt-24` on each zone wrapper (previously
          unaddressable) makes these real anchors for the new floating
          section-jump helper — matches `CollapsibleSection`'s identical
          treatment above, not a new convention. */}
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

    </>
  );
}
