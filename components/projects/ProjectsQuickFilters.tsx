"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

import { buildProjectsQuery, CONFIDENCE_LEVELS, type ProjectsQueryState } from "@/components/projects/queryState";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/data/projects/enums";
import { CATEGORY_BRANDING } from "@/lib/branding/categories";
import type { ConfidenceLevel } from "@/lib/projects/types";

type ProjectsQuickFiltersProps = {
  state: ProjectsQueryState;
};

const SELECT_CLASS =
  "bg-transparent text-sm text-radar-light-text outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:text-radar-white dark:[&>option]:bg-radar-card";
const WRAPPER_CLASS =
  "flex items-center gap-1.5 rounded-xl border border-radar-light-border bg-radar-light-surface px-3 py-2 dark:border-white/10 dark:bg-white/5";

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

/**
 * PR-071 Round 2 Task 2 — the two most-reached-for facets (Category,
 * Confidence) as compact single-selects directly in the toolbar row,
 * alongside Search/Sort — everything else (Discovery status, financial
 * ranges) stays behind the "Filters" popover, per Task 8's "keep
 * frequently-used filters immediately accessible, collapse advanced
 * filters" instruction. Deliberately does not add a "Chain" selector: no
 * chain facet exists anywhere in `ProjectsQueryState`/`lib/projects/filter.ts`
 * today, and inventing one is a new filter dimension (new query-state field,
 * new server-side filter branch, new available-options computation) — out
 * of scope for a UX-polish pass that must not introduce new architecture.
 *
 * PR-071 Round 3 — Task 2: Confidence now offers every real tier a project
 * can carry (All/High/Medium/Low, via `ProjectsQueryState.confidenceLevel` —
 * see `queryState.ts`), not just a High/All boolean. Category and Confidence
 * live *only* here now — the Filter Panel's old "Category" and "Quick
 * Filters → High Confidence" controls were removed (`ProjectsFilterBar.tsx`)
 * so the same facet is never edited from two different places.
 *
 * A single-select here (not the Filter Panel's own multi-select
 * `FilterGroup`) is intentional: this is the "quick pick" row, not the deep
 * panel — choosing a category here replaces the current category selection
 * rather than adding to it, matching what a one-line toolbar dropdown reads
 * as to a user.
 */
export function ProjectsQuickFilters({ state }: ProjectsQuickFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const disabled = state.search.length > 0;

  function navigate(overrides: Partial<ProjectsQueryState>) {
    startTransition(() => {
      router.push(`${pathname}${buildProjectsQuery(state, overrides)}`, { scroll: false });
    });
  }

  return (
    <div className="flex items-center gap-2">
      <div className={WRAPPER_CLASS}>
        <label htmlFor="projects-quick-category" className="sr-only">
          Category
        </label>
        <select
          id="projects-quick-category"
          value={state.categories[0] ?? "all"}
          disabled={disabled}
          onChange={(event) => navigate({ categories: event.target.value === "all" ? [] : [event.target.value as ProjectCategory] })}
          className={SELECT_CLASS}
        >
          <option value="all">All Categories</option>
          {PROJECT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_BRANDING[category].label}
            </option>
          ))}
        </select>
      </div>

      <div className={WRAPPER_CLASS}>
        <Sparkles className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
        <label htmlFor="projects-quick-confidence" className="sr-only">
          Confidence
        </label>
        <select
          id="projects-quick-confidence"
          value={state.confidenceLevel ?? "all"}
          disabled={disabled}
          onChange={(event) => navigate({ confidenceLevel: event.target.value === "all" ? null : (event.target.value as ConfidenceLevel) })}
          className={SELECT_CLASS}
        >
          <option value="all">All Confidence</option>
          {CONFIDENCE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {CONFIDENCE_LABELS[level]}
            </option>
          ))}
        </select>
      </div>

      {isPending && <Loader2 className="size-4 shrink-0 animate-spin text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />}
    </div>
  );
}
