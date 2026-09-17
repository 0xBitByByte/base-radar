import type { Metadata } from "next";
import { Landmark } from "lucide-react";

import { getProject } from "@/data/projects/helpers";
import { ProjectSubpageBreadcrumb } from "@/components/explorer/ProjectSubpageBreadcrumb";
import { getGovernanceProvider } from "@/lib/governance";
import { paginateLiveProjects } from "@/lib/projects/pagination";
import { GovernanceCategoryTabs } from "@/components/explorer/GovernanceCategoryTabs";
import { GovernanceExplorerFilterBar } from "@/components/explorer/GovernanceExplorerFilterBar";
import { GovernanceExplorerList } from "@/components/explorer/GovernanceExplorerList";
import { GovernanceExplorerPagination } from "@/components/explorer/GovernanceExplorerPagination";
import { GovernanceExplorerSortSelect } from "@/components/explorer/GovernanceExplorerSortSelect";
import {
  GOVERNANCE_CATEGORIES,
  GOVERNANCE_TYPE_EMPTY_STATE,
  getGovernanceForCategory,
  isOutcomeUncertain,
  type GovernanceCategoryId,
} from "@/components/explorer/governanceIntelligenceHelpers";
import { MetricItem } from "@/components/explorer/MetricItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { parseGovernanceQueryState, type RawSearchParams } from "@/lib/governance/queryState";
import { PAGE_HEADER_GROUP_CLASS, PAGE_HEADER_TITLE_CLASS, PAGE_HEADER_SUBTITLE_CLASS } from "@/components/dashboard/pageHeaderStyles";
import type { GovernanceEvent } from "@/lib/governance";

type GovernanceExplorerPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
};

/**
 * PR-097.01 (Performance — C1) — same real gap and same fix already
 * applied to the Whale Explorer (`app/dashboard/projects/[slug]/whale/
 * page.tsx`): this page previously rendered every real matching proposal
 * in one unbounded list.
 */
const GOVERNANCE_PAGE_SIZE = 25;

export async function generateMetadata({ params }: GovernanceExplorerPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  // Matches `[slug]/page.tsx`'s convention — the root layout's title
  // template already appends " — Base Radar".
  return { title: project ? `${project.name} — Governance Explorer` : "Governance Explorer" };
}

/**
 * PR-084.04 — the destination behind the main project page's "View All
 * Governance (N)" link. Deliberately lightweight, same philosophy as
 * `pools/page.tsx`/`contracts/page.tsx`: only `getProject` (registry lookup)
 * + the real `getGovernanceProvider().fetchEvents(...)` call for this one
 * project — the exact same call `lib/intelligence/engine.ts`'s
 * `fetchProjectGovernanceEvents` already makes for the main page, made
 * directly here instead of via that wrapper. No `buildProjectIntelligence`,
 * no scoring.
 */
export default async function GovernanceExplorerPage({ params, searchParams }: GovernanceExplorerPageProps) {
  const { slug } = await params;
  const project = getProject(slug);

  const projectHref = `/dashboard/projects/${slug}`;
  const breadcrumb = <ProjectSubpageBreadcrumb projectName={project?.name ?? null} projectHref={projectHref} currentPageLabel="Governance" />;

  if (!project) {
    return (
      <div className="flex flex-col gap-6">
        {breadcrumb}
        <EmptyState icon={Landmark} title="Project not found" description="This project isn't in the Base Radar registry." />
      </div>
    );
  }

  const snapshotSpace = project.governance?.snapshotSpace;
  const governanceType = project.governance?.governanceType ?? null;

  if (!snapshotSpace) {
    const knownType = governanceType === "on-chain" || governanceType === "forum" || governanceType === "none" ? governanceType : null;
    return (
      <div className="flex flex-col gap-6">
        {breadcrumb}
        <h1 className={PAGE_HEADER_TITLE_CLASS}>{project.name} Governance</h1>
        {knownType ? (
          <EmptyState
            icon={Landmark}
            title={GOVERNANCE_TYPE_EMPTY_STATE[knownType].title}
            description={GOVERNANCE_TYPE_EMPTY_STATE[knownType].description}
            action={
              <span className="inline-flex items-center gap-1.5 rounded-full border border-radar-light-border bg-radar-light-card px-2.5 py-1 text-[11px] font-medium text-radar-light-muted dark:border-white/10 dark:bg-white/[0.04] dark:text-radar-muted">
                {GOVERNANCE_TYPE_EMPTY_STATE[knownType].badge}
              </span>
            }
          />
        ) : (
          <EmptyState
            icon={Landmark}
            title="No governance proposals detected"
            description="No Snapshot space is configured for this project in the Base Radar registry. This page will populate automatically once one is added."
            action={
              <span className="inline-flex items-center gap-1.5 rounded-full border border-radar-light-border bg-radar-light-card px-2.5 py-1 text-[11px] font-medium text-radar-light-muted dark:border-white/10 dark:bg-white/[0.04] dark:text-radar-muted">
                Registry Missing
              </span>
            }
          />
        )}
      </div>
    );
  }

  const events: GovernanceEvent[] = await getGovernanceProvider().fetchEvents({
    projects: [{ projectId: project.id, projectName: project.name, snapshotSpace }],
  });

  if (events.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {breadcrumb}
        <h1 className={PAGE_HEADER_TITLE_CLASS}>{project.name} Governance</h1>
        <EmptyState
          icon={Landmark}
          title="No active proposals"
          description="This project's Snapshot space is configured, but returned zero proposals just now. This page updates automatically as new proposals are created."
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-radar-success/30 bg-radar-success/10 px-2.5 py-1 text-[11px] font-medium text-radar-success">
              Registry Status: Configured
            </span>
          }
        />
      </div>
    );
  }

  const resolvedSearchParams = await searchParams;
  const parsedState = parseGovernanceQueryState(resolvedSearchParams);
  const hasActiveProposal = events.some((event) => event.status === "active");
  // The URL itself never named a category — pick a real default from the
  // fetched data rather than a hardcoded one that could land on a
  // guaranteed-empty tab for most projects most of the time.
  const state = { ...parsedState, category: resolvedSearchParams.category ? parsedState.category : hasActiveProposal ? "active" : "all" } as typeof parsedState;

  const totalCount = events.length;
  const activeCount = events.filter((event) => event.status === "active").length;
  const passedCount = events.filter((event) => event.status === "passed").length;
  const outcomeUncertainCount = events.filter(isOutcomeUncertain).length;

  const categoryCounts = Object.fromEntries(
    GOVERNANCE_CATEGORIES.map((category) => [category.id, getGovernanceForCategory(events, category.id).length])
  ) as Record<GovernanceCategoryId, number>;

  let displayEvents = getGovernanceForCategory(events, state.category);

  if (state.search) {
    const query = state.search.toLowerCase();
    displayEvents = displayEvents.filter(
      (event) => event.title.toLowerCase().includes(query) || (event.proposerAddress ?? "").toLowerCase().includes(query)
    );
  }

  if (state.sortExplicit) {
    const direction = state.sortOrder === "desc" ? -1 : 1;
    displayEvents = [...displayEvents].sort((a, b) => {
      if (state.sortField === "voterCount") {
        return direction * ((a.voterCount ?? -1) - (b.voterCount ?? -1));
      }
      return direction * (new Date(a.end).getTime() - new Date(b.end).getTime());
    });
  }

  const paginated = paginateLiveProjects(displayEvents, { page: state.page, pageSize: GOVERNANCE_PAGE_SIZE });

  return (
    <div className="flex flex-col gap-6">
      {breadcrumb}

      <div className={PAGE_HEADER_GROUP_CLASS}>
        <h1 className={PAGE_HEADER_TITLE_CLASS}>{project.name} Governance</h1>
        <p className={PAGE_HEADER_SUBTITLE_CLASS}>
          Every proposal Base Radar has fetched from {project.name}&apos;s Snapshot space — not a raw Snapshot mirror.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricItem label="Total Proposals" value={String(totalCount)} emphasize />
        <MetricItem label="Active" value={String(activeCount)} emphasize />
        <MetricItem label="Passed" value={String(passedCount)} emphasize />
        <MetricItem
          label="Outcome Uncertain"
          value={String(outcomeUncertainCount)}
          infoTooltip="Base Radar Intelligence: this space set no quorum threshold, so the Passed/Failed label is unverified."
          emphasize
        />
      </div>

      <GovernanceCategoryTabs state={state} counts={categoryCounts} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <GovernanceExplorerFilterBar state={state} />
        </div>
        <GovernanceExplorerSortSelect state={state} />
      </div>

      <GovernanceExplorerList events={paginated.items} />
      <GovernanceExplorerPagination
        basePath={`${projectHref}/governance`}
        state={state}
        currentPage={paginated.page}
        totalPages={paginated.totalPages}
        hasPreviousPage={paginated.hasPreviousPage}
        hasNextPage={paginated.hasNextPage}
      />
    </div>
  );
}
