"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Filter } from "lucide-react";

import { ClearFiltersButton } from "@/components/explorer/ClearFiltersButton";
import { FilterChip } from "@/components/explorer/FilterChip";
import { FilterGroup } from "@/components/explorer/FilterGroup";
import { formatLabel } from "@/components/explorer/format";
import { verificationStatusLabel } from "@/components/explorer/VerificationBadge";
import { buildProjectsQuery, countActiveFilters, hasActiveFilters, type ProjectsQueryState } from "@/components/projects/queryState";
import { PROJECT_CATEGORIES, type ProjectCategory, type VerificationStatus } from "@/data/projects/enums";
import { CATEGORY_BRANDING } from "@/lib/branding/categories";
import type { DiscoveryStatus } from "@/lib/discovery/status";
import { cn } from "@/lib/utils";

const FILTER_PANEL_ID = "projects-filter-panel";

type QuickFilterKey = "verified" | "highConfidence" | "hasVolume";
const QUICK_FILTER_OPTIONS: QuickFilterKey[] = ["verified", "highConfidence", "hasVolume"];
const QUICK_FILTER_LABELS: Record<QuickFilterKey, string> = {
  verified: "Verified",
  highConfidence: "High Confidence",
  hasVolume: "Has Volume",
};

type ProjectsFilterBarProps = {
  state: ProjectsQueryState;
  /** Every facet option is computed server-side over the full, unfiltered registry (`components/projects/filterOptions.ts`) — never recomputed here. */
  availableDiscoveryStatuses: DiscoveryStatus[];
  availableVerificationStatuses: VerificationStatus[];
};

/**
 * PR-058 — Task 3: the Filter Panel PR-055 approved. Mirrors
 * `components/explorer/ExplorerFilterBar.tsx`'s own toggle-row +
 * expand/collapse-panel + chips + Clear-filters structure exactly, built
 * from the same generic `FilterGroup`/`FilterChip`/`ClearFiltersButton`
 * primitives — no new filter-UI pattern introduced, no `filterLiveProjects()`
 * call here (that runs once, server-side, in `app/dashboard/projects/page.tsx`).
 * Every control below only ever calls `buildProjectsQuery()` and navigates.
 */
export function ProjectsFilterBar({ state, availableDiscoveryStatuses, availableVerificationStatuses }: ProjectsFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const activeCount = countActiveFilters(state);

  const rowRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      const clickedRowChild = !!rowRef.current?.contains(target) && target !== rowRef.current;
      const clickedPanel = !!panelRef.current?.contains(target);
      if (!clickedRowChild && !clickedPanel) {
        setExpanded(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [expanded]);

  function navigate(overrides: Partial<ProjectsQueryState>) {
    router.push(`${pathname}${buildProjectsQuery(state, overrides)}`, { scroll: false });
  }

  const selectedQuickFilters = QUICK_FILTER_OPTIONS.filter((key) => state[key]);

  function handleQuickFiltersChange(next: QuickFilterKey[]) {
    navigate({
      verified: next.includes("verified"),
      highConfidence: next.includes("highConfidence"),
      hasVolume: next.includes("hasVolume"),
    });
  }

  function handleCategoriesChange(next: ProjectCategory[]) {
    navigate({ categories: next });
  }

  function handleDiscoveryStatusesChange(next: DiscoveryStatus[]) {
    navigate({ discoveryStatuses: next });
  }

  function handleVerificationStatusesChange(next: VerificationStatus[]) {
    navigate({ verificationStatuses: next });
  }

  function handleClearFilters() {
    navigate({
      categories: [],
      verified: false,
      highConfidence: false,
      hasVolume: false,
      discoveryStatuses: [],
      verificationStatuses: [],
    });
  }

  const chips: { key: string; label: string; onRemove: () => void }[] = [
    ...selectedQuickFilters.map((key) => ({
      key: `quick-${key}`,
      label: QUICK_FILTER_LABELS[key],
      onRemove: () => handleQuickFiltersChange(selectedQuickFilters.filter((item) => item !== key)),
    })),
    ...state.categories.map((category) => ({
      key: `category-${category}`,
      label: `Category: ${CATEGORY_BRANDING[category].label}`,
      onRemove: () => handleCategoriesChange(state.categories.filter((item) => item !== category)),
    })),
    ...state.discoveryStatuses.map((status) => ({
      key: `discovery-${status}`,
      label: `Discovery: ${formatLabel(status)}`,
      onRemove: () => handleDiscoveryStatusesChange(state.discoveryStatuses.filter((item) => item !== status)),
    })),
    ...state.verificationStatuses.map((status) => ({
      key: `verification-${status}`,
      label: `Verification: ${verificationStatusLabel(status)}`,
      onRemove: () => handleVerificationStatusesChange(state.verificationStatuses.filter((item) => item !== status)),
    })),
  ];

  return (
    <div className="flex flex-col gap-3">
      <div ref={rowRef} className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
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

        {chips.map((chip) => (
          <FilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
        ))}

        {hasActiveFilters(state) && <ClearFiltersButton onClick={handleClearFilters} />}
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            ref={panelRef}
            id={FILTER_PANEL_ID}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-6 rounded-2xl border border-radar-light-border/70 bg-radar-light-surface p-5 dark:border-white/[0.06] dark:bg-white/[0.02]">
              <FilterGroup
                label="Quick Filters"
                options={QUICK_FILTER_OPTIONS}
                selected={selectedQuickFilters}
                onChange={handleQuickFiltersChange}
                formatOption={(value) => QUICK_FILTER_LABELS[value]}
              />
              <FilterGroup
                label="Category"
                options={PROJECT_CATEGORIES}
                selected={state.categories}
                onChange={handleCategoriesChange}
                formatOption={(value) => CATEGORY_BRANDING[value].label}
              />
              <FilterGroup
                label="Discovery Status"
                options={availableDiscoveryStatuses}
                selected={state.discoveryStatuses}
                onChange={handleDiscoveryStatusesChange}
                formatOption={formatLabel}
              />
              <FilterGroup
                label="Verification Status"
                options={availableVerificationStatuses}
                selected={state.verificationStatuses}
                onChange={handleVerificationStatusesChange}
                formatOption={(value) => verificationStatusLabel(value)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
