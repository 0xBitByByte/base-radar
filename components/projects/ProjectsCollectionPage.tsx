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

import { availableDiscoveryStatuses, availableVerificationStatuses } from "@/components/projects/filterOptions";
import { ProjectsDirectory } from "@/components/projects/ProjectsDirectory";
import { ProjectsInteractionBar } from "@/components/projects/ProjectsInteractionBar";
import { PROJECTS_PATH, type ProjectsQueryState } from "@/components/projects/queryState";
import { PROJECTS_VIEW_META } from "@/components/projects/viewMeta";
import { formatNumber } from "@/lib/data/format";
import type { LiveProject, PaginatedResult } from "@/lib/projects/types";
import type { DirectoryEmptyState } from "@/components/projects/DirectoryEmptyState";

type ProjectsCollectionPageProps = {
  view: Exclude<ProjectsQueryState["view"], "all">;
  state: ProjectsQueryState;
  directoryPage: PaginatedResult<LiveProject>;
  directoryTitle: string;
  directorySubtitle: string | undefined;
  emptyState: Parameters<typeof DirectoryEmptyState>[0];
  allProjects: LiveProject[];
};

export function ProjectsCollectionPage({
  view,
  state,
  directoryPage,
  directoryTitle,
  directorySubtitle,
  emptyState,
  allProjects,
}: ProjectsCollectionPageProps) {
  const meta = PROJECTS_VIEW_META[view];
  const Icon = meta.icon;

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col gap-3">
        <Link
          href={PROJECTS_PATH}
          className="flex w-fit items-center gap-1.5 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:text-radar-white"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Browse All Projects
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

        <p className="text-xs font-medium text-radar-light-muted dark:text-radar-muted">
          {formatNumber(directoryPage.totalItems)} project{directoryPage.totalItems === 1 ? "" : "s"} in this view · {formatNumber(allProjects.length)} tracked across the whole registry
        </p>
      </div>

      <ProjectsInteractionBar
        state={state}
        resultCount={directoryPage.totalItems}
        availableDiscoveryStatuses={availableDiscoveryStatuses(allProjects)}
        availableVerificationStatuses={availableVerificationStatuses(allProjects)}
      />

      <ProjectsDirectory title={directoryTitle} subtitle={directorySubtitle} page={directoryPage} state={state} emptyState={emptyState} />
    </div>
  );
}
