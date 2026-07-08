"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Filter } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatLabel } from "@/components/explorer/format";
import { verificationStatusLabel } from "@/components/explorer/VerificationBadge";
import { FilterChip } from "@/components/explorer/FilterChip";
import { FilterGroup } from "@/components/explorer/FilterGroup";
import { ClearFiltersButton } from "@/components/explorer/ClearFiltersButton";
import {
  availableCategories,
  availableConfidenceLevels,
  availableHealthLabels,
  availableVerificationStatuses,
  countActiveFilters,
  type ExplorerFilters,
} from "@/components/explorer/filters";
import type { VerificationStatus } from "@/data/projects/enums";
import type { ProjectIntelligence } from "@/lib/intelligence/types";

const FILTER_PANEL_ID = "explorer-filter-panel";

type ExplorerFilterBarProps = {
  /** The full, unfiltered project list — used only to compute which facet
   * values actually exist in the registry; never filtered or searched here. */
  projects: ProjectIntelligence[];
  filters: ExplorerFilters;
  onFiltersChange: (next: ExplorerFilters) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  onClearFilters: () => void;
  /** The final, already-computed visible count — never recomputed here. */
  resultCount: number;
};

/**
 * One row's worth of facet configuration — Category, Verification, Health,
 * and Confidence (this task's explicit PR3 scope). Declared as data rather
 * than four near-identical `FilterGroup`/chip blocks, since every facet
 * differs only in its key, label, options, and label formatter.
 */
type FilterSectionConfig = {
  key: keyof ExplorerFilters;
  label: string;
  options: string[];
  formatOption: (value: string) => string;
};

/**
 * The Filter Bar — docs/explorer/03-screen-specifications.md §7: Category,
 * Verification, Health, and Confidence facets (this task's explicit PR3
 * scope). Fully controlled: every value, including expand/collapse state,
 * is owned by `ExplorerPageClient` (this task's architecture constraint) —
 * a deliberate simplification of docs/explorer/04-component-specification.md
 * §8's original suggestion that this component own its own expand/collapse
 * state. The Filter toggle button itself is folded in here rather than into
 * a separate `ExplorerToolbar`, since that component doesn't exist yet.
 */
export function ExplorerFilterBar({
  projects,
  filters,
  onFiltersChange,
  expanded,
  onToggleExpanded,
  onClearFilters,
  resultCount,
}: ExplorerFilterBarProps) {
  const activeCount = countActiveFilters(filters);

  const filterSections: FilterSectionConfig[] = [
    { key: "categories", label: "Category", options: availableCategories(projects), formatOption: formatLabel },
    {
      key: "verificationStatuses",
      label: "Verification",
      options: availableVerificationStatuses(projects),
      formatOption: (value) => verificationStatusLabel(value as VerificationStatus),
    },
    { key: "healthLabels", label: "Health", options: availableHealthLabels(projects), formatOption: formatLabel },
    {
      key: "confidenceLevels",
      label: "Confidence",
      options: availableConfidenceLevels(projects),
      formatOption: formatLabel,
    },
  ];

  const chips = filterSections.flatMap((section) => {
    const selected = filters[section.key] as string[];
    return selected.map((value) => ({
      key: `${section.key}-${value}`,
      label: `${section.label}: ${section.formatOption(value)}`,
      onRemove: () =>
        onFiltersChange({
          ...filters,
          [section.key]: selected.filter((item) => item !== value),
        } as ExplorerFilters),
    }));
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-controls={FILTER_PANEL_ID}
          className={cn(
            "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50",
            activeCount > 0
              ? "border-radar-primary/30 bg-radar-primary/10 text-radar-primary"
              : "border-radar-light-border bg-radar-light-surface text-radar-light-text hover:bg-radar-light-border/30 dark:border-white/10 dark:bg-white/5 dark:text-radar-white"
          )}
        >
          <Filter className="size-4" aria-hidden="true" />
          Filters
          {activeCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-radar-primary text-[10px] font-semibold text-white">
              {activeCount}
            </span>
          )}
        </button>

        {activeCount > 0 && (
          <span className="text-xs text-radar-light-muted dark:text-radar-muted">
            {resultCount} {resultCount === 1 ? "project" : "projects"}
          </span>
        )}

        {chips.map((chip) => (
          <FilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
        ))}

        {activeCount > 0 && <ClearFiltersButton onClick={onClearFilters} />}
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={FILTER_PANEL_ID}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-6 rounded-2xl border border-radar-light-border/70 bg-radar-light-surface p-5 dark:border-white/[0.06] dark:bg-white/[0.02]">
              {filterSections.map((section) => (
                <FilterGroup
                  key={section.key}
                  label={section.label}
                  options={section.options}
                  selected={filters[section.key] as string[]}
                  onChange={(next) => onFiltersChange({ ...filters, [section.key]: next } as ExplorerFilters)}
                  formatOption={section.formatOption}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
