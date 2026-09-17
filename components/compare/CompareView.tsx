"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { GitCompare, Trash2, X } from "lucide-react";

import { ChainBadgeGroup } from "@/components/branding/ChainBadgeGroup";
import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { RiskBadge } from "@/components/projects/RiskBadge";
import { CompareCharts } from "@/components/compare/CompareCharts";
import { CompareDetailSection } from "@/components/compare/CompareDetailSection";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { GLASS_SURFACE_STATIC } from "@/components/ui/glassStyles";
import { formatCompactCurrency, formatPercent } from "@/lib/data/format";
import { useCompare } from "@/lib/hooks/useCompare";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { MAX_COMPARE_PROJECTS } from "@/lib/compare/types";
import { RECOMMENDATION_FOR_RISK } from "@/lib/intelligence/report";
import type { GovernanceEvent } from "@/lib/governance/types";
import type { LiveProject } from "@/lib/projects/types";
import type { SmartCollectionResult } from "@/lib/smart-collections/types";
import { cn } from "@/lib/utils";

type CompareViewProps = {
  /** The full registry, exactly like `WatchlistsWorkspace` already receives from `app/dashboard/watchlists/page.tsx` — the Compare list is client-only selection state, so the server can't pre-filter to just the selected ids. Same precedent, not a new payload-size decision. */
  liveProjects: LiveProject[];
  /** Real Smart Collection membership, server-evaluated once for the whole registry (`evaluateServerCollections()`) — reused directly, never re-evaluated per project here. */
  serverCollections: SmartCollectionResult[];
  /** Real, ecosystem-wide Snapshot governance events (PR-091.04, `getRegistryGovernanceEvents()`) — same fetch-once-filter-client-side precedent as `serverCollections`/`liveProjects` above. */
  governanceEvents: GovernanceEvent[];
};

function changeColor(pct: number | null): string {
  if (pct === null) return "text-radar-light-muted dark:text-radar-muted";
  if (pct > 0) return "text-radar-success";
  if (pct < 0) return "text-radar-danger";
  return "text-radar-light-muted dark:text-radar-muted";
}

/** Real value or an honest "Not Tracked" — never a fabricated placeholder. */
function money(value: number | null): string {
  return value === null ? "Not Tracked" : formatCompactCurrency(value);
}

/** The single most relevant real Snapshot proposal for this project — the most recent by `end` date — or `null` when this project has no configured governance source or no proposals on record. Never fabricated; never averaged across proposals. */
function latestGovernanceEvent(projectId: string, events: GovernanceEvent[]): GovernanceEvent | null {
  const projectEvents = events.filter((event) => event.projectId === projectId);
  if (projectEvents.length === 0) return null;
  return [...projectEvents].sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime())[0];
}

/**
 * PR-091 (Compare Platform) — side-by-side comparison of up to
 * `MAX_COMPARE_PROJECTS` real, already-tracked projects. Every row reads a
 * field `LiveProject`/`SmartCollectionResult` already carries — no new
 * scoring, no new evidence model. Reuses the exact `RiskBadge`/`GlowBadge`/
 * `ProjectLogo`/`ChainBadgeGroup` Explorer's own card already renders these
 * fields with, so a project's Risk badge here looks identical to its
 * Explorer card and its Project Profile header.
 */
export function CompareView({ liveProjects, serverCollections, governanceEvents }: CompareViewProps) {
  const { projectIds, remove, clear } = useCompare();
  const { isWatching } = useWatchlist();

  const liveProjectById = new Map(liveProjects.map((project) => [project.id, project]));
  // Preserve the user's own add order; silently drop any id whose project no longer resolves (deleted/renamed registry entry) rather than rendering a broken column.
  const compared = projectIds.map((id) => liveProjectById.get(id)).filter((project): project is LiveProject => project !== undefined);

  if (compared.length < 2) {
    const onlyProject = compared[0];
    return (
      <EmptyState
        icon={GitCompare}
        title={onlyProject ? "Add one more project" : "Nothing to compare yet"}
        description={`Visit a project's page and select "Compare" to add it here — add at least 2 projects (up to ${MAX_COMPARE_PROJECTS}) to see them side by side.`}
        action={
          onlyProject ? (
            // UX polish — a lone selected project previously had no way to
            // clear it without leaving this page; this mirrors the exact
            // same remove control (icon + `aria-label`) the full comparison
            // table already uses per column, just for the one column that
            // exists here.
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-radar-light-border px-3 py-1.5 dark:border-white/10">
                <ProjectLogo logoUrl={onlyProject.identity.logoUrl} fallbackUrls={onlyProject.identity.logoUrlFallbacks} name={onlyProject.identity.name} size={18} />
                <span className="text-xs font-medium text-radar-light-text dark:text-radar-white">{onlyProject.identity.name}</span>
                <button
                  type="button"
                  onClick={() => remove(onlyProject.id)}
                  aria-label={`Remove ${onlyProject.identity.name} from Compare`}
                  className="flex size-5 shrink-0 items-center justify-center rounded-full text-radar-light-muted outline-none transition-colors hover:bg-radar-light-border hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/10 dark:hover:text-radar-white"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </div>
              <Link
                href="/dashboard/projects"
                className="flex items-center gap-1.5 rounded-lg border border-radar-light-border px-3 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
              >
                Browse Projects
              </Link>
            </div>
          ) : (
            <Link
              href="/dashboard/projects"
              className="flex items-center gap-1.5 rounded-lg border border-radar-light-border px-3 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
            >
              Browse Projects
            </Link>
          )
        }
      />
    );
  }

  const membershipByProject = new Map<string, string[]>();
  for (const collection of serverCollections) {
    for (const match of collection.matches) {
      const list = membershipByProject.get(match.projectId) ?? [];
      list.push(collection.name);
      membershipByProject.set(match.projectId, list);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-radar-light-muted dark:text-radar-muted">
          Comparing {compared.length} of {MAX_COMPARE_PROJECTS} projects. Saved on this device only.
        </p>
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface hover:text-radar-danger focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5"
        >
          <Trash2 className="size-3.5 shrink-0" aria-hidden="true" />
          Clear all
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className={cn("w-full min-w-[640px] border-separate border-spacing-0 rounded-2xl", GLASS_SURFACE_STATIC)}>
          <thead>
            <tr>
              <th scope="col" className="w-40 p-4 text-left align-bottom text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
                Project
              </th>
              {compared.map((project) => (
                <th key={project.id} scope="col" className="min-w-[180px] border-l border-radar-light-border p-4 text-left align-bottom dark:border-white/10">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/dashboard/projects/${project.slug}`} className="flex min-w-0 items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50">
                      <ProjectLogo logoUrl={project.identity.logoUrl} fallbackUrls={project.identity.logoUrlFallbacks} name={project.identity.name} size={24} />
                      <span className="min-w-0 truncate text-sm font-semibold text-radar-light-text dark:text-radar-white">{project.identity.name}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(project.id)}
                      aria-label={`Remove ${project.identity.name} from Compare`}
                      className="flex size-6 shrink-0 items-center justify-center rounded-full text-radar-light-muted outline-none transition-colors hover:bg-radar-light-border hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/10 dark:hover:text-radar-white"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  <ChainBadgeGroup chains={project.chains} size="sm" max={2} className="mt-2" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm">
            <CompareRow label="AI Grade" compared={compared} render={(p) => p.aiRating ?? "—"} emphasize />
            <CompareRow label="Confidence" compared={compared} render={(p) => `${p.confidence.score}/100 (${p.confidence.level})`} />
            <CompareRow label="Health" compared={compared} render={(p) => (p.health ? `${p.health.score}/100 (${p.health.label})` : "Not Tracked")} />
            <CompareRow label="Risk" compared={compared} render={(p) => <RiskBadge riskLevel={p.riskLevel} compact />} />
            <CompareRow label="Recommendation" compared={compared} render={(p) => (p.riskLevel ? RECOMMENDATION_FOR_RISK[p.riskLevel] : "Not Rated")} />
            <CompareRow label="Price" compared={compared} render={(p) => money(p.market.priceUsd)} />
            <CompareRow
              label="24h Change"
              compared={compared}
              render={(p) => (p.market.changePct24h === null ? "Not Tracked" : <span className={changeColor(p.market.changePct24h)}>{formatPercent(p.market.changePct24h, { showSign: true })}</span>)}
            />
            <CompareRow
              label="7d Change"
              compared={compared}
              render={(p) => (p.market.changePct7d === null ? "Not Tracked" : <span className={changeColor(p.market.changePct7d)}>{formatPercent(p.market.changePct7d, { showSign: true })}</span>)}
            />
            <CompareRow label="Market Cap" compared={compared} render={(p) => money(p.market.marketCapUsd)} />
            <CompareRow label="FDV" compared={compared} render={(p) => money(p.market.fdvUsd)} />
            <CompareRow label="TVL" compared={compared} render={(p) => money(p.market.tvlUsd)} />
            <CompareRow label="24h Volume" compared={compared} render={(p) => money(p.market.volume24hUsd)} />
            {/* Revenue/Fees/Holders/Transactions — genuinely not tracked anywhere in this app today (not just missing from Compare); shown honestly rather than omitted, so the table's own scope is never mistaken for silent gaps. */}
            <CompareRow label="Revenue" compared={compared} render={() => "Not Tracked"} />
            <CompareRow label="Fees" compared={compared} render={() => "Not Tracked"} />
            <CompareRow label="Holders" compared={compared} render={() => "Not Tracked"} />
            <CompareRow label="Transactions" compared={compared} render={() => "Not Tracked"} />
            <CompareRow
              label="Governance"
              compared={compared}
              render={(p) => (p.governance.configured ? `${p.governance.activeProposalCount ?? 0} active proposal${p.governance.activeProposalCount === 1 ? "" : "s"}` : "Not configured")}
            />
            <CompareRow
              label="Voting Participation"
              compared={compared}
              render={(p) => {
                const event = latestGovernanceEvent(p.id, governanceEvents);
                if (!event) return p.governance.configured ? "No proposals on record" : "Not configured";
                // Real voter count only — never `event.participation` (Snapshot's raw token-weighted `scores_total`, not a percentage; confirmed live against real large-cap governance tokens, where rendering it as "N%" produced numbers over 100,000%). `voterCount` is this codebase's own documented "more honest participation basis" for exactly this reason (`lib/governance/types.ts`).
                const voters = event.voterCount !== null ? `${event.voterCount.toLocaleString()} real voter${event.voterCount === 1 ? "" : "s"}` : "voter count unknown";
                const quorum = event.quorumMet === null ? "" : event.quorumMet ? " · Quorum met" : " · Quorum not met";
                return `${voters}${quorum}`;
              }}
            />
            {/* Treasury/Delegates — confirmed not real fields in this registry's schema (see `ContractsList.tsx`'s own comment: "Treasury/Timelock/Multisig/Oracle aren't real fields here, so they're never invented as groups"). Shown as honestly unavailable, never fabricated. */}
            <CompareRow label="Treasury" compared={compared} render={() => "Not Tracked"} />
            <CompareRow label="Delegates" compared={compared} render={() => "Not Tracked"} />
            <CompareRow
              label="Engineering"
              compared={compared}
              render={(p) => (p.engineering.available ? `${p.engineering.stars?.toLocaleString() ?? 0} stars` : "Not Tracked")}
            />
            <CompareRow label="Watchlist" compared={compared} render={(p) => (isWatching(p.id) ? "Watching" : "Not watched")} />
            <CompareRow
              label="Smart Collections"
              compared={compared}
              render={(p) => {
                const names = membershipByProject.get(p.id) ?? [];
                if (names.length === 0) return "None";
                return (
                  <div className="flex flex-wrap gap-1">
                    {names.map((name) => (
                      <GlowBadge key={name} color="primary" className="text-[10px]">
                        {name}
                      </GlowBadge>
                    ))}
                  </div>
                );
              }}
            />
          </tbody>
        </table>
      </div>

      <CompareCharts compared={compared} />
      <CompareDetailSection compared={compared} />
    </div>
  );
}

type CompareRowProps = {
  label: string;
  compared: LiveProject[];
  render: (project: LiveProject) => ReactNode;
  emphasize?: boolean;
};

function CompareRow({ label, compared, render, emphasize }: CompareRowProps) {
  return (
    <tr className="border-t border-radar-light-border dark:border-white/10">
      <th scope="row" className="p-4 text-left text-xs font-medium text-radar-light-muted dark:text-radar-muted">
        {label}
      </th>
      {compared.map((project) => (
        <td key={project.id} className={cn("border-l border-radar-light-border p-4 dark:border-white/10", emphasize ? "text-base font-semibold text-radar-light-text dark:text-radar-white" : "text-radar-light-text dark:text-radar-white")}>
          {render(project)}
        </td>
      ))}
    </tr>
  );
}
