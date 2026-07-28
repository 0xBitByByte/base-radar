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
 */

import type { VerificationStatus } from "@/data/projects/enums";
import { ProjectsFilterBar } from "@/components/projects/ProjectsFilterBar";
import { ProjectsSearchInput } from "@/components/projects/ProjectsSearchInput";
import { ProjectsSortSelect } from "@/components/projects/ProjectsSortSelect";
import type { ProjectsQueryState } from "@/components/projects/queryState";
import type { DiscoveryStatus } from "@/lib/discovery/status";

type ProjectsInteractionBarProps = {
  state: ProjectsQueryState;
  resultCount: number;
  availableDiscoveryStatuses: DiscoveryStatus[];
  availableVerificationStatuses: VerificationStatus[];
};

export function ProjectsInteractionBar({
  state,
  resultCount,
  availableDiscoveryStatuses,
  availableVerificationStatuses,
}: ProjectsInteractionBarProps) {
  return (
    <div className="sticky top-16 z-20 -mx-4 flex flex-col gap-3 border-b border-radar-light-border bg-radar-light-card/90 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10 dark:border-white/10 dark:bg-radar-bg/90">
      <ProjectsSearchInput state={state} resultCount={resultCount} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ProjectsFilterBar
          state={state}
          availableDiscoveryStatuses={availableDiscoveryStatuses}
          availableVerificationStatuses={availableVerificationStatuses}
        />
        <ProjectsSortSelect state={state} />
      </div>
    </div>
  );
}
