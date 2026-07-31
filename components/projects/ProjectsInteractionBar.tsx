/**
 * PR-059 — Task 1/2: Search, Filters, and Sort move to the top of the page
 * (directly under the Header) and stay sticky as the user scrolls, so
 * refinement happens *before* browsing rather than being discovered only
 * after scrolling past the whole curated section. Purely a layout wrapper —
 * `ProjectsSearchInput`/`ProjectsFilterBar`/`ProjectsSortSelect` themselves
 * are unchanged, still the only things that write `?query` state.
 *
 * `sticky top-16` docks directly under the dashboard shell's own sticky
 * `Topbar` (`h-16`, `components/dashboard/Topbar.tsx`) — reusing that exact
 * offset rather than a new one. `position: sticky` never removes the bar
 * from flow, so there is no layout shift when it docks; the negative-margin
 * + matching-padding pair below bleeds it edge-to-edge (the same technique
 * `Topbar`/`LiveStatusBar` already use for full-width chrome), and the
 * background/blur/border reuse `Topbar`'s own tokens so the docked bar reads
 * as part of the same chrome, not a new visual pattern.
 *
 * PR-071 Round 3 — Task 3: `availableVerificationStatuses` dropped. The
 * Filter Panel's own Verification Status multi-select was removed (see
 * `ProjectsFilterBar.tsx`'s doc comment) so this bar no longer has anything
 * to pass it for.
 *
 * PR-071 Round 5 — Filters moved before Sort (Category → Confidence →
 * Filters → Sort). At the row's far-right edge, the Filters trigger left the
 * popover with no room to open into — every extra pixel of panel width had
 * to come from shrinking or flipping. One slot earlier, the popover's fixed
 * left-anchor (`ProjectsFilterBar.tsx`) now expands into space that's
 * actually free on every desktop width this page supports.
 */

import { ProjectsFilterBar } from "@/components/projects/ProjectsFilterBar";
import { ProjectsQuickFilters } from "@/components/projects/ProjectsQuickFilters";
import { ProjectsSearchInput } from "@/components/projects/ProjectsSearchInput";
import { ProjectsSortSelect } from "@/components/projects/ProjectsSortSelect";
import type { ProjectsQueryState } from "@/components/projects/queryState";
import type { DiscoveryStatus } from "@/lib/discovery/status";
import type { FinancialMetric, FinancialRangeDef } from "@/lib/projects/types";

type ProjectsInteractionBarProps = {
  state: ProjectsQueryState;
  resultCount: number;
  availableDiscoveryStatuses: DiscoveryStatus[];
  /** PR-063 — Task 1/2: passed straight through to `ProjectsFilterBar`; see that component's own prop doc. */
  financialRangeOptions: Record<FinancialMetric, FinancialRangeDef[]>;
};

export function ProjectsInteractionBar({
  state,
  resultCount,
  availableDiscoveryStatuses,
  financialRangeOptions,
}: ProjectsInteractionBarProps) {
  return (
    <div className="sticky top-16 z-20 -mx-4 flex flex-col gap-3 border-b border-radar-light-border bg-radar-light-card/90 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-10 lg:flex-row lg:items-center lg:px-10 dark:border-white/10 dark:bg-radar-bg/90">
      {/* Capped width on desktop so Search never crowds Filters/Sort off the row — Task 3's "everything fits naturally on one row on desktop." Stays full-width on mobile/tablet, where the row wraps instead. */}
      <div className="lg:w-80 lg:shrink-0">
        <ProjectsSearchInput state={state} resultCount={resultCount} />
      </div>
      {/* Task 2 — Search, Category, Confidence, Filters, Sort read left-to-right in one row on desktop, matching a compact trading-software toolbar; wraps naturally on smaller widths instead of stacking into separate blocks.
          Round 5 — Filters sits before Sort (not last) so its popover always has real
          room to open into, rather than being pinned against the row's right edge. */}
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <ProjectsQuickFilters state={state} />
        <ProjectsFilterBar
          state={state}
          availableDiscoveryStatuses={availableDiscoveryStatuses}
          financialRangeOptions={financialRangeOptions}
        />
        <ProjectsSortSelect state={state} />
      </div>
    </div>
  );
}
