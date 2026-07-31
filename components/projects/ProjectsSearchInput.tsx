"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";

import { buildProjectsQuery, type ProjectsQueryState } from "@/components/projects/queryState";
import { formatNumber } from "@/lib/data/format";

type ProjectsSearchInputProps = {
  state: ProjectsQueryState;
  /** The already-computed, real match count for `state.search` — never recomputed client-side (Task 10: no duplicated business logic). */
  resultCount: number;
};

const DEBOUNCE_MS = 300;

/**
 * PR-058 — Task 1: the only client component whose whole job is turning
 * typing into a debounced navigation. `searchLiveProjects()` itself never
 * runs here — this component only ever writes the `?search=` param; the
 * Server Component re-runs the real search on the resulting request.
 */
export function ProjectsSearchInput({ state, resultCount }: ProjectsSearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(state.search);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stay in sync when the query changes from elsewhere — Clear filters,
  // browser back/forward, a "View All" click. Adjusted during render (React's
  // own recommended pattern for "derive state from a prop, but allow local
  // edits in between") rather than in an effect, which would cause an extra
  // commit-then-recommit render for every navigation.
  const [trackedSearch, setTrackedSearch] = useState(state.search);
  if (state.search !== trackedSearch) {
    setTrackedSearch(state.search);
    setValue(state.search);
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function navigate(nextSearch: string) {
    startTransition(() => {
      router.push(`${pathname}${buildProjectsQuery(state, { search: nextSearch })}`, { scroll: false });
    });
  }

  function handleChange(next: string) {
    setValue(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => navigate(next), DEBOUNCE_MS);
  }

  function handleClear() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setValue("");
    navigate("");
  }

  const isSearching = state.search.length > 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 rounded-xl border border-radar-light-border bg-radar-light-surface px-3 py-2.5 transition-colors focus-within:border-radar-primary/50 focus-within:ring-2 focus-within:ring-radar-primary/30 dark:border-white/10 dark:bg-white/5">
        <Search className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
        <input
          type="text"
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          placeholder="Search projects, symbols, contracts, websites, GitHub repos..."
          aria-label="Search projects"
          className="min-w-0 flex-1 bg-transparent text-sm text-radar-light-text outline-none placeholder:text-radar-light-muted dark:text-radar-white dark:placeholder:text-radar-muted"
        />
        {isPending && <Loader2 className="size-3.5 shrink-0 animate-spin text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="flex size-5 shrink-0 items-center justify-center rounded-md text-radar-light-muted outline-none transition-colors hover:bg-radar-light-border/50 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/10"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
      {/* `aria-live="polite"` — screen readers announce the updated count once the debounced navigation resolves, without interrupting typing. */}
      {isSearching && (
        <p aria-live="polite" className="text-xs text-radar-light-muted dark:text-radar-muted">
          {formatNumber(resultCount)} result{resultCount === 1 ? "" : "s"} for &ldquo;{state.search}&rdquo;
        </p>
      )}
    </div>
  );
}
