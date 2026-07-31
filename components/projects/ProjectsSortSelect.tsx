"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowUpDown, Loader2 } from "lucide-react";

import { SORT_OPTIONS, buildProjectsQuery, sortValueFor, type ProjectsQueryState } from "@/components/projects/queryState";

type ProjectsSortSelectProps = {
  state: ProjectsQueryState;
};

/**
 * PR-058 — Task 4: sort control for the Full Directory. Mirrors
 * `components/explorer/ExplorerSort.tsx`'s own "native `<select>` +
 * `SORT_OPTIONS` array" pattern exactly, adapted to `lib/projects`'s
 * `SortField`/`SortOrder` instead of Explorer's. `sortLiveProjects()` itself
 * runs only in the Server Component — this writes the `?sort=` param.
 *
 * Disabled while a search is active: search results are ranked by
 * relevance (`searchLiveProjects()`'s own scoring), and offering a
 * conflicting sort control during that would either be ignored (confusing)
 * or would silently discard the relevance ranking (dishonest about what's
 * actually driving the order).
 */
export function ProjectsSortSelect({ state }: ProjectsSortSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const disabled = state.search.length > 0;
  const value = sortValueFor(state.sortField, state.sortOrder);

  function handleChange(nextValue: string) {
    const option = SORT_OPTIONS.find((candidate) => candidate.value === nextValue);
    if (!option) return;
    startTransition(() => {
      router.push(`${pathname}${buildProjectsQuery(state, { sortField: option.field, sortOrder: option.order })}`, { scroll: false });
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-radar-light-border bg-radar-light-surface px-3 py-2 dark:border-white/10 dark:bg-white/5">
      <ArrowUpDown className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
      <label htmlFor="projects-sort" className="sr-only">
        Sort projects
      </label>
      <select
        id="projects-sort"
        value={value}
        disabled={disabled}
        onChange={(event) => handleChange(event.target.value)}
        title={disabled ? "Sorted by search relevance while searching" : undefined}
        className="bg-transparent text-sm text-radar-light-text outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:text-radar-white dark:[&>option]:bg-radar-card"
      >
        {disabled ? (
          <option>Relevance</option>
        ) : (
          SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))
        )}
      </select>
      {isPending && <Loader2 className="size-3.5 shrink-0 animate-spin text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />}
    </div>
  );
}
