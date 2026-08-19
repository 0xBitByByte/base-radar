import type { Metadata } from "next";
import { Blocks, ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { getProject } from "@/data/projects/helpers";
import { normalizeName } from "@/lib/intelligence/helpers";
import * as blockscout from "@/lib/providers/blockscout/service";
import { ContractCategoryTabs } from "@/components/explorer/ContractCategoryTabs";
import { ContractExplorerFilterBar } from "@/components/explorer/ContractExplorerFilterBar";
import { ContractExplorerList } from "@/components/explorer/ContractExplorerList";
import { ContractExplorerSortSelect } from "@/components/explorer/ContractExplorerSortSelect";
import { formatLabel } from "@/components/explorer/format";
import {
  buildContractCard,
  CONTRACT_CATEGORIES,
  getContractsForCategory,
  getContractVerificationStatus,
  isUpgradeable,
  needsAttention,
  type ContractCard,
  type ContractCategoryId,
} from "@/components/explorer/contractIntelligenceHelpers";
import { MetricItem } from "@/components/explorer/MetricItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { parseContractsQueryState, type RawSearchParams } from "@/lib/contracts/queryState";

type ContractExplorerPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
};

export async function generateMetadata({ params }: ContractExplorerPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  // Matches `[slug]/page.tsx`'s convention — the root layout's title
  // template already appends " — Base Radar".
  return { title: project ? `${project.name} — Contract Explorer` : "Contract Explorer" };
}

/**
 * PR-084.03 — the destination behind the main project page's "View All
 * Contracts (N)" link. Deliberately lightweight, same philosophy as
 * `pools/page.tsx`: only `getProject` (registry lookup) + the existing
 * `blockscout.getContractDetail` per registered address, no
 * `buildProjectIntelligence`, no scoring — this page needs real contracts
 * and their real Blockscout detail, nothing else.
 */
export default async function ContractExplorerPage({ params, searchParams }: ContractExplorerPageProps) {
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
            Contracts
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
        <EmptyState icon={Blocks} title="Project not found" description="This project isn't in the Base Radar registry." />
      </div>
    );
  }

  if (project.contracts.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {breadcrumb}
        <h1 className="text-xl font-bold text-radar-light-text dark:text-radar-white">{project.name} Contracts</h1>
        <EmptyState
          icon={Blocks}
          title="No registered contracts"
          description={`No contracts are currently registered for ${project.name} in the Base Radar registry.`}
        />
      </div>
    );
  }

  // Same candidate-address dedup logic already used by the main project
  // page (`page.tsx`'s `blockscoutCandidateAddresses`) — real, per-address
  // Blockscout lookups for every registered contract, plain-awaited
  // (Blockscout isn't one of this codebase's flagged-slow providers).
  const candidateAddresses = [
    ...(project.providerIds.blockscoutAddress ? [project.providerIds.blockscoutAddress] : []),
    ...project.contracts.map((contract) => contract.address),
  ].filter((address, index, all) => all.findIndex((other) => normalizeName(other) === normalizeName(address)) === index);

  const detailsResults = await Promise.all(
    candidateAddresses.map((address) => blockscout.getContractDetail(address).then((result) => ({ address, result })))
  );
  const detailsByAddress = blockscout.contractDetailsByAddress(detailsResults);

  const cards: ContractCard[] = project.contracts.map((contract) =>
    buildContractCard(
      { chain: contract.chain, address: contract.address, type: contract.type, label: contract.label ?? null, verified: null },
      detailsByAddress[contract.address] ?? null
    )
  );

  const resolvedSearchParams = await searchParams;
  const state = parseContractsQueryState(resolvedSearchParams);

  // Headline stats always reflect the full card set, regardless of the
  // active category/search/filter.
  const verifiedCount = cards.filter((card) => getContractVerificationStatus(card).label === "Verified").length;
  const upgradeableCount = cards.filter(isUpgradeable).length;
  const attentionCount = cards.filter(needsAttention).length;

  const categoryCounts = Object.fromEntries(
    CONTRACT_CATEGORIES.map((category) => [category.id, getContractsForCategory(cards, category.id).length])
  ) as Record<ContractCategoryId, number>;

  const availableChains = [...new Set(cards.map((card) => card.chain))].sort((a, b) => formatLabel(a).localeCompare(formatLabel(b)));

  // Resolution pipeline: category → search → chain filter → sort.
  let displayCards = getContractsForCategory(cards, state.category);

  if (state.search) {
    const query = state.search.toLowerCase();
    displayCards = displayCards.filter(
      (card) =>
        (card.label ?? "").toLowerCase().includes(query) ||
        card.address.toLowerCase().includes(query) ||
        formatLabel(card.type).toLowerCase().includes(query)
    );
  }

  if (state.chain.length > 0) {
    displayCards = displayCards.filter((card) => state.chain.includes(card.chain));
  }

  if (state.sortExplicit) {
    const direction = state.sortOrder === "desc" ? -1 : 1;
    displayCards = [...displayCards].sort((a, b) => {
      if (state.sortField === "verified") {
        const aVal = getContractVerificationStatus(a).label === "Verified" ? 1 : 0;
        const bVal = getContractVerificationStatus(b).label === "Verified" ? 1 : 0;
        return direction * (aVal - bVal);
      }
      const aStr = state.sortField === "type" ? formatLabel(a.type) : a.address;
      const bStr = state.sortField === "type" ? formatLabel(b.type) : b.address;
      return direction * aStr.localeCompare(bStr);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {breadcrumb}

      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-radar-light-text dark:text-radar-white">{project.name} Contracts</h1>
        <p className="text-sm text-radar-light-muted dark:text-radar-muted">
          Every contract Base Radar has registered for {project.name}, with real Blockscout verification detail — not a raw explorer mirror.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricItem label="Total Contracts" value={String(cards.length)} emphasize />
        <MetricItem label="Verified" value={`${verifiedCount} / ${cards.length}`} emphasize />
        <MetricItem label="Upgradeable" value={String(upgradeableCount)} emphasize />
        <MetricItem
          label="Attention Required"
          value={String(attentionCount)}
          infoTooltip="Base Radar Intelligence: not verified, or registered as a proxy without a confirmed implementation."
          emphasize
        />
      </div>

      <ContractCategoryTabs state={state} counts={categoryCounts} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <ContractExplorerFilterBar state={state} availableChains={availableChains} />
        </div>
        <ContractExplorerSortSelect state={state} />
      </div>

      <ContractExplorerList cards={displayCards} />
    </div>
  );
}
