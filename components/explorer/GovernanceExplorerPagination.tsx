/**
 * PR-097.01 (Performance — C1) — mirrors `components/explorer/
 * WhaleExplorerPagination.tsx`'s exact pattern (itself mirroring
 * `components/projects/ProjectsPagination.tsx`) for the Governance
 * Explorer's own `GovernanceQueryState`/`buildGovernanceQuery`. A
 * dedicated component rather than a shared generic one, matching this
 * route family's established one-component-per-domain convention.
 */

import Link from "next/link";

import { buildGovernanceQuery, type GovernanceQueryState } from "@/lib/governance/queryState";
import { cn } from "@/lib/utils";

type GovernanceExplorerPaginationProps = {
  /** This project's own Governance route (`/dashboard/projects/[slug]/governance`) — passed down rather than read via `usePathname()` so this stays a plain Server Component. */
  basePath: string;
  state: GovernanceQueryState;
  currentPage: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

/** Identical windowing rule to `WhaleExplorerPagination.tsx`'s own. */
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

const controlClass =
  "rounded-lg border border-radar-light-border px-3 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10";
const enabledClass = "text-radar-light-text hover:bg-radar-light-surface dark:text-radar-white dark:hover:bg-white/5";
const disabledClass = "text-radar-light-muted opacity-50 dark:text-radar-muted";

export function GovernanceExplorerPagination({
  basePath,
  state,
  currentPage,
  totalPages,
  hasPreviousPage,
  hasNextPage,
}: GovernanceExplorerPaginationProps) {
  if (totalPages <= 1) return null;

  const pageWindow = buildPageWindow(currentPage, totalPages);
  const hrefForPage = (page: number) => `${basePath}${buildGovernanceQuery(state, { page })}`;

  return (
    <nav aria-label="Governance pagination" className="flex flex-wrap items-center justify-center gap-2 pt-2">
      {hasPreviousPage ? (
        <Link href={hrefForPage(currentPage - 1)} aria-label="Previous page" className={cn(controlClass, enabledClass)}>
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
              href={hrefForPage(entry)}
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
        <Link href={hrefForPage(currentPage + 1)} aria-label="Next page" className={cn(controlClass, enabledClass)}>
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
