import type { Metadata } from "next";
import { Fish } from "lucide-react";

import { getProject } from "@/data/projects/helpers";
import { ProjectSubpageBreadcrumb } from "@/components/explorer/ProjectSubpageBreadcrumb";
import { getRawWhaleEvents } from "@/lib/data/aggregate";
import { CHAIN_BRANDING } from "@/lib/branding/chains";
import { paginateLiveProjects } from "@/lib/projects/pagination";
import { WhaleCategoryTabs } from "@/components/explorer/WhaleCategoryTabs";
import { WhaleExplorerFilterBar } from "@/components/explorer/WhaleExplorerFilterBar";
import { WhaleExplorerList } from "@/components/explorer/WhaleExplorerList";
import { WhaleExplorerPagination } from "@/components/explorer/WhaleExplorerPagination";
import { WhaleExplorerSortSelect } from "@/components/explorer/WhaleExplorerSortSelect";
import { WHALE_CATEGORIES, getWhaleEventsForCategory, type WhaleCategoryId } from "@/components/explorer/whaleIntelligenceHelpers";
import { MetricItem } from "@/components/explorer/MetricItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCompactCurrency } from "@/lib/data/format";
import { parseWhaleQueryState, type RawSearchParams } from "@/lib/whale/queryState";
import { PAGE_HEADER_GROUP_CLASS, PAGE_HEADER_TITLE_CLASS, PAGE_HEADER_SUBTITLE_CLASS } from "@/components/dashboard/pageHeaderStyles";
import type { WhaleEvent } from "@/lib/whale";

type WhaleExplorerPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
};

/**
 * PR-097.01 (Performance — C1) — `docs/PERFORMANCE_AUDIT.md`'s C1 finding:
 * this page rendered every real matching transfer in one unbounded list,
 * with "no pagination and no virtualization." A watched project's transfer
 * feed genuinely grows without bound over its real lifetime — the one
 * Explorer sub-page of the four (Governance/Whale/Contracts/Pools) most
 * likely to actually reach a real, large count in production, so it's the
 * first fixed. Same real, already-tested `paginateLiveProjects()`
 * (`lib/projects/pagination.ts`) the main Projects Directory already
 * uses — it's fully generic over `T`, not Projects-specific despite its
 * name, so this reuses it rather than writing a second implementation.
 */
const WHALE_PAGE_SIZE = 25;

export async function generateMetadata({ params }: WhaleExplorerPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  // Matches `[slug]/page.tsx`'s convention — the root layout's title
  // template already appends " — Base Radar".
  return { title: project ? `${project.name} — Whale Explorer` : "Whale Explorer" };
}

/**
 * PR-084.05 — the destination behind the Key Signals "Whale Activity" tile.
 * Deliberately lightweight, same philosophy as `pools/page.tsx`/
 * `contracts/page.tsx`/`governance/page.tsx`: only `getProject` + the real
 * `getRawWhaleEvents()` call this project's main profile page already makes
 * (`app/dashboard/projects/[slug]/page.tsx`), filtered to this project the
 * exact same way — not a new fetch path, not a second detection pass.
 * No `buildProjectIntelligence`, no scoring.
 */
export default async function WhaleExplorerPage({ params, searchParams }: WhaleExplorerPageProps) {
  const { slug } = await params;
  const project = getProject(slug);

  const projectHref = `/dashboard/projects/${slug}`;
  const breadcrumb = <ProjectSubpageBreadcrumb projectName={project?.name ?? null} projectHref={projectHref} currentPageLabel="Whale Activity" />;

  if (!project) {
    return (
      <div className="flex flex-col gap-6">
        {breadcrumb}
        <EmptyState icon={Fish} title="Project not found" description="This project isn't in the Base Radar registry." />
      </div>
    );
  }

  // Same eligibility check `lib/data/aggregate.ts`'s `getRawWhaleEventsImpl`
  // uses to build its `watchedTokens` list — a project without both a real
  // Base token contract and a CoinGecko id structurally cannot produce a
  // whale event, no matter what this page does.
  const tokenContract = project.contracts.find((contract) => contract.chain === "base" && contract.type === "token");
  const coingeckoId = project.providerIds.coingeckoId;
  const isEligible = Boolean(tokenContract && coingeckoId);

  if (!isEligible) {
    return (
      <div className="flex flex-col gap-6">
        {breadcrumb}
        <h1 className={PAGE_HEADER_TITLE_CLASS}>{project.name} Whale Activity</h1>
        <EmptyState
          icon={Fish}
          title="Whale detection isn't available for this project"
          description="Whale detection needs a real token contract on Base and a CoinGecko id, both configured in the Base Radar registry. This project doesn't have both today, so this page can't run — not a fetch failure."
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-radar-light-border bg-radar-light-card px-2.5 py-1 text-[11px] font-medium text-radar-light-muted dark:border-white/10 dark:bg-white/[0.04] dark:text-radar-muted">
              Not Eligible
            </span>
          }
        />
      </div>
    );
  }

  const allEvents = await getRawWhaleEvents();
  const events: WhaleEvent[] = allEvents.filter((event) => event.projectId === project.id);

  if (events.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {breadcrumb}
        <h1 className={PAGE_HEADER_TITLE_CLASS}>{project.name} Whale Activity</h1>
        <EmptyState
          icon={Fish}
          title="No large transfers detected right now"
          description="This project is watched for whale activity, but no transfer over the $100,000 threshold was found in its most recent on-chain activity just now. This page updates automatically as new transfers occur."
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-radar-success/30 bg-radar-success/10 px-2.5 py-1 text-[11px] font-medium text-radar-success">
              Registry Status: Watched
            </span>
          }
        />
      </div>
    );
  }

  const resolvedSearchParams = await searchParams;
  const parsedState = parseWhaleQueryState(resolvedSearchParams);
  const hasWhaleAlert = events.some((event) => event.classification === "whale-alert");
  const state = { ...parsedState, category: resolvedSearchParams.category ? parsedState.category : hasWhaleAlert ? "whale-alert" : "all" } as typeof parsedState;

  const totalCount = events.length;
  const whaleAlertCount = events.filter((event) => event.classification === "whale-alert").length;
  const largeTransferCount = events.filter((event) => event.classification === "large-on-chain-transfer").length;
  const totalVolumeUsd = events.reduce((sum, event) => sum + event.usdValue, 0);

  const categoryCounts = Object.fromEntries(
    WHALE_CATEGORIES.map((category) => [category.id, getWhaleEventsForCategory(events, category.id).length])
  ) as Record<WhaleCategoryId, number>;

  let displayEvents = getWhaleEventsForCategory(events, state.category);

  if (state.search) {
    const query = state.search.toLowerCase();
    displayEvents = displayEvents.filter(
      (event) => event.fromAddress.toLowerCase().includes(query) || event.toAddress.toLowerCase().includes(query)
    );
  }

  if (state.sortExplicit) {
    const direction = state.sortOrder === "desc" ? -1 : 1;
    displayEvents = [...displayEvents].sort((a, b) => {
      if (state.sortField === "usdValue") {
        return direction * (a.usdValue - b.usdValue);
      }
      return direction * (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    });
  }

  const paginated = paginateLiveProjects(displayEvents, { page: state.page, pageSize: WHALE_PAGE_SIZE });
  const explorerUrl = CHAIN_BRANDING.base?.explorerUrl ?? null;

  return (
    <div className="flex flex-col gap-6">
      {breadcrumb}

      <div className={PAGE_HEADER_GROUP_CLASS}>
        <h1 className={PAGE_HEADER_TITLE_CLASS}>{project.name} Whale Activity</h1>
        <p className={PAGE_HEADER_SUBTITLE_CLASS}>
          Every large transfer Base Radar has detected for {project.name} — a real Blockscout ERC-20 transfer scan, not a raw explorer mirror.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricItem label="Total Transfers" value={String(totalCount)} emphasize />
        <MetricItem label="Whale Alerts" value={String(whaleAlertCount)} emphasize />
        <MetricItem label="Large Transfers" value={String(largeTransferCount)} emphasize />
        <MetricItem label="Total Volume" value={formatCompactCurrency(totalVolumeUsd)} emphasize />
      </div>

      <WhaleCategoryTabs state={state} counts={categoryCounts} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <WhaleExplorerFilterBar state={state} />
        </div>
        <WhaleExplorerSortSelect state={state} />
      </div>

      <WhaleExplorerList events={paginated.items} explorerUrl={explorerUrl} />
      <WhaleExplorerPagination
        basePath={`${projectHref}/whale`}
        state={state}
        currentPage={paginated.page}
        totalPages={paginated.totalPages}
        hasPreviousPage={paginated.hasPreviousPage}
        hasNextPage={paginated.hasNextPage}
      />
    </div>
  );
}
