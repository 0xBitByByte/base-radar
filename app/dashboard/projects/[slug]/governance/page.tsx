import type { Metadata } from "next";
import { Landmark, ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { getProject } from "@/data/projects/helpers";
import { getGovernanceProvider } from "@/lib/governance";
import { GovernanceCategoryTabs } from "@/components/explorer/GovernanceCategoryTabs";
import { GovernanceExplorerFilterBar } from "@/components/explorer/GovernanceExplorerFilterBar";
import { GovernanceExplorerList } from "@/components/explorer/GovernanceExplorerList";
import { GovernanceExplorerSortSelect } from "@/components/explorer/GovernanceExplorerSortSelect";
import {
  GOVERNANCE_CATEGORIES,
  getGovernanceForCategory,
  isOutcomeUncertain,
  type GovernanceCategoryId,
} from "@/components/explorer/governanceIntelligenceHelpers";
import { MetricItem } from "@/components/explorer/MetricItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { parseGovernanceQueryState, type RawSearchParams } from "@/lib/governance/queryState";
import type { GovernanceEvent } from "@/lib/governance";

type GovernanceExplorerPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
};

export async function generateMetadata({ params }: GovernanceExplorerPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  // Matches `[slug]/page.tsx`'s convention — the root layout's title
  // template already appends " — Base Radar".
  return { title: project ? `${project.name} — Governance Explorer` : "Governance Explorer" };
}

/** One entry per non-Snapshot `governanceType` — mirrors `ProfileGovernance.tsx`'s own `GOVERNANCE_TYPE_EMPTY_STATE`, kept in sync deliberately since both describe the same three real, confirmed-mechanism states. */
const GOVERNANCE_TYPE_EMPTY_STATE: Record<"on-chain" | "forum" | "none", { title: string; description: string; badge: string }> = {
  "on-chain": {
    title: "Governance uses on-chain voting",
    description:
      "This project doesn't use Snapshot for governance — real decisions are made through on-chain voting instead, which Base Radar doesn't currently track. This isn't a missing registry entry; it's how this project actually governs itself.",
    badge: "Governance Uses On-chain Voting",
  },
  forum: {
    title: "Governance uses forum discussion",
    description:
      "This project doesn't use Snapshot for governance — real decisions are made through forum discussion and signaling instead, which Base Radar doesn't currently track. This isn't a missing registry entry; it's how this project actually governs itself.",
    badge: "Governance Uses Forum Discussion",
  },
  none: {
    title: "No governance mechanism",
    description: "This project is confirmed to have no governance mechanism — no token vote, on-chain process, or forum. There is nothing for this section to track.",
    badge: "No Governance",
  },
};

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
  const breadcrumb = (
    <div className="flex flex-col gap-2">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-radar-light-muted dark:text-radar-muted">
          <li>
            <Link href="/dashboard" className="rounded-md font-medium outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:hover:text-radar-white">
              Dashboard
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li>
            <Link href="/dashboard/projects" className="rounded-md font-medium outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:hover:text-radar-white">
              Projects
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li>
            <Link href={projectHref} className="rounded-md font-medium outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:hover:text-radar-white">
              {project?.name ?? "Project"}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li aria-current="page" className="truncate font-semibold text-radar-light-text dark:text-radar-white">
            Governance
          </li>
        </ol>
      </nav>
      <Link
        href={projectHref}
        className="group inline-flex w-fit items-center gap-1.5 rounded-lg text-xs font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:text-radar-white"
      >
        <ArrowLeft className="size-3.5 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true" />
        Back to {project?.name ?? "Project"}
      </Link>
    </div>
  );

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
        <h1 className="text-xl font-bold text-radar-light-text dark:text-radar-white">{project.name} Governance</h1>
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
        <h1 className="text-xl font-bold text-radar-light-text dark:text-radar-white">{project.name} Governance</h1>
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

  return (
    <div className="flex flex-col gap-6">
      {breadcrumb}

      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-radar-light-text dark:text-radar-white">{project.name} Governance</h1>
        <p className="text-sm text-radar-light-muted dark:text-radar-muted">
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

      <GovernanceExplorerList events={displayEvents} />
    </div>
  );
}
