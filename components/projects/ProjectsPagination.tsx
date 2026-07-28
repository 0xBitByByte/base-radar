/**
 * PR-058 — Task 5: real pagination, replacing PR-057's static placeholder.
 * `paginateLiveProjects()` (`app/dashboard/projects/page.tsx`) already
 * computes `page`/`totalPages`/`hasNextPage`/`hasPreviousPage` — this
 * component only decides which page *numbers* to render as links and
 * builds their hrefs via `buildProjectsQuery()`. Plain `<Link>`s throughout,
 * no client state: paging is pure navigation.
 */

import Link from "next/link";

import { buildProjectsQuery, PROJECTS_PATH, type ProjectsQueryState } from "@/components/projects/queryState";
import { cn } from "@/lib/utils";

type ProjectsPaginationProps = {
  state: ProjectsQueryState;
  currentPage: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

/** First, last, current, and one neighbor on each side — with an ellipsis for any real gap. Standard, bounded window regardless of how many total pages exist (PR-054's own "future-ready at 10,000+ projects" scalability goal — a 1,000-page directory still renders ~7 controls, never 1,000 links). */
function buildPageWindow(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = new Set<number>([1, total, current]);
  if (current - 1 >= 1) pages.add(current - 1);
  if (current + 1 <= total) pages.add(current + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const withGaps: (number | "ellipsis")[] = [];
  sorted.forEach((page, index) => {
    withGaps.push(page);
    const next = sorted[index + 1];
    if (next !== undefined && next - page > 1) withGaps.push("ellipsis");
  });
  return withGaps;
}

function hrefForPage(state: ProjectsQueryState, page: number): string {
  return `${PROJECTS_PATH}${buildProjectsQuery(state, { page })}#directory`;
}

const controlClass =
  "rounded-lg border border-radar-light-border px-3 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10";
const enabledClass = "text-radar-light-text hover:bg-radar-light-surface dark:text-radar-white dark:hover:bg-white/5";
const disabledClass = "text-radar-light-muted opacity-50 dark:text-radar-muted";

export function ProjectsPagination({ state, currentPage, totalPages, hasPreviousPage, hasNextPage }: ProjectsPaginationProps) {
  if (totalPages <= 1) return null;

  const pageWindow = buildPageWindow(currentPage, totalPages);

  return (
    <nav aria-label="Projects pagination" className="flex flex-wrap items-center justify-center gap-2 pt-2">
      {hasPreviousPage ? (
        <Link href={hrefForPage(state, currentPage - 1)} aria-label="Previous page" className={cn(controlClass, enabledClass)}>
          Previous
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(controlClass, disabledClass)}>
          Previous
        </span>
      )}

      <div className="flex items-center gap-1">
        {pageWindow.map((entry, index) =>
          entry === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="px-1 text-xs text-radar-light-muted dark:text-radar-muted" aria-hidden="true">
              …
            </span>
          ) : (
            <Link
              key={entry}
              href={hrefForPage(state, entry)}
              aria-label={`Page ${entry}`}
              aria-current={entry === currentPage ? "page" : undefined}
              className={cn(
                "flex size-8 items-center justify-center rounded-lg text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50",
                entry === currentPage
                  ? "bg-radar-primary text-white"
                  : "text-radar-light-muted hover:bg-radar-light-surface dark:text-radar-muted dark:hover:bg-white/5"
              )}
            >
              {entry}
            </Link>
          )
        )}
      </div>

      {hasNextPage ? (
        <Link href={hrefForPage(state, currentPage + 1)} aria-label="Next page" className={cn(controlClass, enabledClass)}>
          Next
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(controlClass, disabledClass)}>
          Next
        </span>
      )}
    </nav>
  );
}
