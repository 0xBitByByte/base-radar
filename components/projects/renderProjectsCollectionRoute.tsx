/**
 * PR-061 — Task 2 & 7: the one function every dedicated collection route
 * (`app/dashboard/projects/verified/page.tsx`, `/blue-chips/page.tsx`, etc.)
 * calls. Each of those 11 route files is intentionally a few-line wrapper —
 * Next's App Router requires one real `page.tsx` per URL, but the actual
 * data-fetch + pipeline + render logic lives here exactly once, so there are
 * 11 route *entries*, never 11 copies of the same logic.
 *
 * Performance investigation — this function used to be `async`, called
 * directly from each route's own `async function Page()`. That meant this
 * route's ENTIRE response (not just this content) couldn't begin streaming
 * until `loadProjectsPageData()` fully resolved — live-measured on a cold
 * provider cache (`getOrSet`'s TTL window expired, e.g. after any period of
 * no traffic): `/dashboard/projects/all` took up to 7.3s (`responseEnd`,
 * Navigation Timing API) for this exact reason, dropping to ~30-60ms on a
 * warm cache. Traced the 7.3s itself to real, uncached, third-party API
 * round-trips (CoinGecko/DefiLlama/DexScreener/Blockscout/Base RPC inside
 * `fetchProviderBulkData()`) — already correctly parallelized via
 * `Promise.all`, no N+1 pattern, no missing cache; the wait is genuine
 * external network latency, not a code inefficiency, and which single
 * provider is slowest varies run to run (confirmed via per-provider timing:
 * DefiLlama's protocol list was slowest one run, CoinGecko's ecosystem
 * market list another) — consistent with the intermittent "sometimes
 * several seconds" symptom, not a deterministic bug.
 *
 * First fix, still true but incomplete: wrapping the async fetch+render in
 * a real `<Suspense>` boundary — the exact same shape
 * `app/dashboard/projects/page.tsx`'s own Hero/Discovery split already
 * proved (see that file's PR-085.02B doc comment) for its sibling route.
 * `ProjectsDirectorySkeleton` already existed for exactly this boundary
 * (built when Discovery still rendered the Directory inline, before it
 * moved to this dedicated route) but was never wired up here — confirmed
 * via grep it had zero real consumers, only its own test.
 *
 * Measured honestly afterward: that alone did NOT reduce cold-cache wall-
 * clock time for this route (8.6s after vs. 7.3s before — within the same
 * real run-to-run provider-latency variance), because every single piece
 * of `ProjectsCollectionPage`'s content depended on the one slow
 * `loadProjectsPageData()` call — there was nothing independently fast to
 * show first, unlike Discover's Hero (`getProjectsHeroSnapshot()`).
 *
 * Second pass — found one: `ProjectsCollectionHeader` (back-link, icon,
 * title, description) needs only `view`, which is known synchronously from
 * the route/URL, never `data` — confirmed by reading every prop it
 * consumes. Rendered here, outside the `<Suspense>` boundary, so it's on
 * screen immediately regardless of how long the provider fetch takes,
 * exactly the "genuinely fast, independent content" this route was missing.
 * The header is honest even on failure/empty (the title/description are
 * true regardless of whether the fetch succeeds), so it stays outside the
 * try/catch below rather than needing its own duplicated error handling.
 */

import { Suspense } from "react";

import { ExplorerEmptyState } from "@/components/explorer/ExplorerEmptyState";
import { ExplorerErrorState } from "@/components/explorer/ExplorerErrorState";
import { buildDirectoryPipeline } from "@/components/projects/collectionPipeline";
import { loadProjectsPageData } from "@/components/projects/loadProjectsData";
import { ProjectsCollectionHeader, ProjectsCollectionPage } from "@/components/projects/ProjectsCollectionPage";
import { ProjectsDirectorySkeleton } from "@/components/projects/ProjectsLoadingSkeletons";
import { TopActivityFallback } from "@/components/projects/TopActivityFallback";
import type { ProjectsView, RawSearchParams } from "@/components/projects/queryState";

export function renderProjectsCollectionRoute(view: ProjectsView, rawSearchParams: RawSearchParams) {
  return (
    <div className="flex flex-col gap-10 pb-10">
      <ProjectsCollectionHeader view={view} />
      <Suspense fallback={<ProjectsDirectorySkeleton />}>
        <CollectionRouteContent view={view} rawSearchParams={rawSearchParams} />
      </Suspense>
    </div>
  );
}

async function CollectionRouteContent({ view, rawSearchParams }: { view: ProjectsView; rawSearchParams: RawSearchParams }) {
  let data;
  try {
    data = await loadProjectsPageData();
  } catch {
    return <ExplorerErrorState />;
  }

  if (data.projects.length === 0) {
    return <ExplorerEmptyState />;
  }

  // PR-074 REVIEW #2 — "Top Activity" ranks by GitHub stars; when GitHub's
  // shared rate limit is exhausted, `engineering.available` is false for
  // every project at once and this leaderboard is genuinely empty. Rather
  // than waste the whole section on one provider's outage, show real
  // alternate rankings (TVL/Volume/Market Cap/Movers) instead. Only applies
  // when no search/filter is active — an intentionally empty *filtered*
  // result still shows the normal "no matches" state, since that's a real,
  // correct answer to the user's own query, not a provider outage.
  if (view === "topActivity" && data.leaderboards.topActivity.length === 0 && Object.keys(rawSearchParams).length === 0) {
    return <TopActivityFallback leaderboards={data.leaderboards} />;
  }

  // PR-085.04 — "all" was never a real lock (it's `ProjectsQueryState`'s own
  // default view already); passing `lockView: "all"` isn't even assignable
  // to `buildDirectoryPipeline`'s `Exclude<ProjectsView, "all">` param.
  // `undefined` here lets `state.view` come from the parsed query params
  // exactly like the main page's old Directory boundary always did.
  const { state, directoryPage, directoryTitle, directorySubtitle, emptyState, financialSummary } = buildDirectoryPipeline({
    rawSearchParams,
    projects: data.projects,
    collections: data.collections,
    leaderboards: data.leaderboards,
    smartViewLists: data.smartViewLists,
    lockView: view === "all" ? undefined : view,
  });

  return (
    <ProjectsCollectionPage
      view={view}
      state={state}
      directoryPage={directoryPage}
      directoryTitle={directoryTitle}
      directorySubtitle={directorySubtitle}
      emptyState={emptyState}
      financialSummary={financialSummary}
      allProjects={data.projects}
    />
  );
}
