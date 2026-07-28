/**
 * PR-057 — Task 7: the Full Directory.
 * PR-058 — Tasks 5/7/8: real pagination (`ProjectsPagination`), a dynamic
 * title reflecting the active `?view=` collection, and a context-aware
 * empty state (`DirectoryEmptyState`) instead of one generic message.
 * `id="directory"` is the scroll target every "View All" link and
 * pagination control points at.
 *
 * PR-059 — Task 7: a stronger, intentional break from the curated rails
 * above (a top border + extra spacing, reusing the same border token every
 * other divider on this page already uses — no new color) and a real
 * `subtitle` line stating exactly what's being browsed (current view,
 * active search, or active filters — computed once in `page.tsx`, never
 * re-derived here) so the transition from "curated" to "everything" reads
 * as deliberate rather than abrupt.
 */

import { DirectoryEmptyState } from "@/components/projects/DirectoryEmptyState";
import { LiveProjectCard } from "@/components/projects/LiveProjectCard";
import { ProjectsPagination } from "@/components/projects/ProjectsPagination";
import type { ProjectsQueryState } from "@/components/projects/queryState";
import { formatNumber } from "@/lib/data/format";
import type { LiveProject, PaginatedResult } from "@/lib/projects/types";

type DirectoryEmptyStateProps = Parameters<typeof DirectoryEmptyState>[0];

type ProjectsDirectoryProps = {
  title: string;
  /** One real sentence of context — e.g. "Filtered by Category: DEX · Verified" — omitted when browsing everything with no filters/search active. */
  subtitle?: string;
  page: PaginatedResult<LiveProject>;
  state: ProjectsQueryState;
  emptyState: DirectoryEmptyStateProps;
};

export function ProjectsDirectory({ title, subtitle, page, state, emptyState }: ProjectsDirectoryProps) {
  return (
    <div id="directory" className="flex scroll-mt-6 flex-col gap-5 border-t border-radar-light-border pt-8 dark:border-white/10">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold tracking-tight text-radar-light-text dark:text-radar-white">{title}</h2>
          {subtitle && <p className="text-xs text-radar-light-muted dark:text-radar-muted">{subtitle}</p>}
        </div>
        <span className="shrink-0 text-xs font-medium text-radar-light-muted dark:text-radar-muted">
          {formatNumber(page.totalItems)} result{page.totalItems === 1 ? "" : "s"}
        </span>
      </div>

      {page.items.length === 0 ? (
        <DirectoryEmptyState {...emptyState} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {page.items.map((project) => (
            <LiveProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <ProjectsPagination
        state={state}
        currentPage={page.page}
        totalPages={page.totalPages}
        hasPreviousPage={page.hasPreviousPage}
        hasNextPage={page.hasNextPage}
      />
    </div>
  );
}
