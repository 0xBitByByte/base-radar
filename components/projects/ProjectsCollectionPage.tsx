/**
 * PR-061 — Task 2 & 7: the shared body every dedicated collection route
 * (`/dashboard/projects/verified`, `/blue-chips`, `/fast-growing`, etc.)
 * renders. One real title, one real "why these projects belong here"
 * sentence (`viewMeta.ts`'s `description`), and a real, live project count —
 * never a static label. Reuses the exact same `ProjectsInteractionBar`
 * (search/filter/sort) and `ProjectsDirectory` (cards + pagination) the main
 * Projects page already uses — no forked directory UI. A persistent
 * "Browse All Projects" link (Task 6) sits directly in the header so a user
 * viewing one collection is never more than one click from everything,
 * without needing to hunt for a way to "clear" the current view.
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { availableDiscoveryStatuses, financialRangeOptions } from "@/components/projects/filterOptions";
import { FinancialSummary } from "@/components/projects/FinancialSummary";
import { ProjectsDirectory } from "@/components/projects/ProjectsDirectory";
import { ProjectsInteractionBar } from "@/components/projects/ProjectsInteractionBar";
import { PROJECTS_PATH, type ProjectsQueryState } from "@/components/projects/queryState";
import { PROJECTS_VIEW_META } from "@/components/projects/viewMeta";
import { formatNumber } from "@/lib/data/format";
import type { LiveProject, PaginatedResult } from "@/lib/projects/types";
import type { DirectoryEmptyState } from "@/components/projects/DirectoryEmptyState";
import type { FinancialSummaryEntry } from "@/components/projects/collectionPipeline";

type ProjectsCollectionPageProps = {
  view: ProjectsQueryState["view"];
  state: ProjectsQueryState;
  directoryPage: PaginatedResult<LiveProject>;
  directoryTitle: string;
  directorySubtitle: string | undefined;
  emptyState: Parameters<typeof DirectoryEmptyState>[0];
  financialSummary: FinancialSummaryEntry[];
  allProjects: LiveProject[];
};

/**
 * Performance investigation — split out of what used to be the top of
 * `ProjectsCollectionPage`'s own JSX. This part has zero dependency on the
 * expensive `loadProjectsPageData()` call (`view` alone, known synchronously
 * from the route, is enough to resolve `PROJECTS_VIEW_META`) — verified by
 * reading every prop it uses below: `meta.title`/`meta.description`/
 * `backHref`/`backLabel` are all pure functions of `view`. Rendered OUTSIDE
 * `renderProjectsCollectionRoute`'s `<Suspense>` boundary so it appears
 * immediately, even while the real provider fetch is still resolving on a
 * cold cache (live-measured up to ~8s — see that file's own doc comment) —
 * the one piece of this page that genuinely doesn't need to wait.
 */
export function ProjectsCollectionHeader({ view }: { view: ProjectsQueryState["view"] }) {
  const meta = PROJECTS_VIEW_META[view];
  const Icon = meta.icon;
  // PR-085.04 — this component now also renders the "all" view, at its own
  // dedicated route (`/dashboard/projects/all`). The header's back-link
  // reads differently there: every *other* view still points at "all" (the
  // full directory, per Product Owner Decision 4 — Discover no longer has
  // one), while "all" itself points back at Discover (Decision 5).
  const backHref = view === "all" ? PROJECTS_PATH : `${PROJECTS_PATH}/all`;
  const backLabel = view === "all" ? "Back to Discover" : "Browse All Projects";

  return (
    <div className="flex flex-col gap-3">
      <Link
        href={backHref}
        className="flex w-fit items-center gap-1.5 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:text-radar-white"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        {backLabel}
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-radar-primary/10 text-radar-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-radar-light-text dark:text-radar-white">{meta.title}</h1>
          {meta.description && <p className="text-sm text-radar-light-muted dark:text-radar-muted">{meta.description}</p>}
        </div>
      </div>
    </div>
  );
}

export function ProjectsCollectionPage({
  view,
  state,
  directoryPage,
  directoryTitle,
  directorySubtitle,
  emptyState,
  financialSummary,
  allProjects,
}: ProjectsCollectionPageProps) {
  return (
    // PR-085.05, Task 6 — gap-8 → gap-10, matching Discover's own outer
    // rhythm exactly (`app/dashboard/projects/page.tsx`), across all 12
    // views this component serves.
    //
    // Performance investigation — no longer renders its own top-level
    // wrapper + header (see `ProjectsCollectionHeader` above, now rendered
    // by `renderProjectsCollectionRoute` outside this component's own
    // `<Suspense>` boundary); this fragment is everything that genuinely
    // needs `directoryPage`/`allProjects`/`financialSummary`.
    <>
      <p className="text-xs font-medium text-radar-light-muted dark:text-radar-muted">
        {formatNumber(directoryPage.totalItems)} project{directoryPage.totalItems === 1 ? "" : "s"} in this view · {formatNumber(allProjects.length)} tracked across the whole registry
      </p>

      <ProjectsInteractionBar
        state={state}
        resultCount={directoryPage.totalItems}
        availableDiscoveryStatuses={availableDiscoveryStatuses(allProjects)}
        financialRangeOptions={financialRangeOptions(allProjects)}
      />

      <FinancialSummary entries={financialSummary} />
      <ProjectsDirectory title={directoryTitle} subtitle={directorySubtitle} page={directoryPage} state={state} emptyState={emptyState} />

      {/* PR-085.04A — "all" only; the other 11 collection views keep their
          simple header back-link unchanged. Same container pattern, width,
          and spacing as Discover's own end-of-content CTA
          (`app/dashboard/projects/page.tsx`) — a deliberate visual pair,
          not a new style. The header's own small breadcrumb-style back-link
          above is untouched — this is a considered "come back and browse
          curated content" invitation, not a replacement for it. */}
      {view === "all" && (
        <div className="flex flex-col gap-4 rounded-2xl border border-radar-light-border bg-radar-light-surface px-5 py-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/[0.02]">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-sm font-semibold text-radar-light-text dark:text-radar-white">Discover curated opportunities</h3>
            <p className="text-xs text-radar-light-muted dark:text-radar-muted">
              View Trending, Verified, Top TVL and editorial collections.
            </p>
          </div>
          <Link
            href={PROJECTS_PATH}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-radar-light-border bg-radar-light-card px-4 py-2.5 text-sm font-medium text-radar-light-text outline-none transition-colors hover:border-radar-primary/30 hover:text-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-radar-card dark:text-radar-white"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to Discover
          </Link>
        </div>
      )}
    </>
  );
}
