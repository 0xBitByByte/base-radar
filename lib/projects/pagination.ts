/**
 * PR-054 — Task 7: pagination designed for a registry that will hold
 * hundreds or thousands of `LiveProject`s, not the ~20 today's seed data
 * happens to have. Generic over `T` so it works identically for a raw
 * `LiveProject[]`, a sorted/filtered subset, or a `SearchResult[]` — the
 * pagination math doesn't care what the array holds.
 */

import type { PaginatedResult, PaginationOptions } from "@/lib/projects/types";

const MIN_PAGE_SIZE = 1;
const MAX_PAGE_SIZE = 500;

function clampPageSize(pageSize: number): number {
  return Math.max(MIN_PAGE_SIZE, Math.min(MAX_PAGE_SIZE, Math.floor(pageSize)));
}

/**
 * Slices `items` into one page. `page` is 1-indexed; a `page` beyond the
 * last real page returns an empty `items` array with accurate metadata
 * (never throws, never silently clamps back to page 1 — a caller asking for
 * page 50 of a 3-page result learns that directly from `totalPages`).
 */
export function paginateLiveProjects<T>(items: T[], options: PaginationOptions): PaginatedResult<T> {
  const pageSize = clampPageSize(options.pageSize);
  const page = Math.max(1, Math.floor(options.page));
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return {
    items: pageItems,
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
