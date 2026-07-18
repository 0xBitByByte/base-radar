/**
 * Blockscout Alert Provider — reuses two existing systems rather than
 * reimplementing either:
 *
 * 1. Whale/large-transfer detection: `lib/whale` (PR10)'s
 *    `getWhaleProvider().detect()`, the exact same real ERC-20-transfer
 *    scan + confidence scoring `lib/data/aggregate.ts`'s
 *    `getRawWhaleEvents()` already uses — this file only re-assembles the
 *    same `WatchedToken[]` input (registry contract + a live CoinGecko
 *    price), never a second whale-detection implementation. Same
 *    `$100,000` USD threshold, for consistency with the rest of the app.
 * 2. Contract verification: `lib/providers/blockscout/service.ts`'s
 *    `getContractDetail()`, the same per-address verification lookup the
 *    Project Profile's Contracts section already uses.
 *
 * Pure: no React, no hooks, no localStorage.
 */

import { getProjects } from "@/data/projects";
import type { AlertProvider } from "@/lib/alerts/providers/types";
import type { Alert, AlertSeverity } from "@/lib/alerts/types";
import * as blockscout from "@/lib/providers/blockscout/service";
import * as coingecko from "@/lib/providers/coingecko/service";
import { getWhaleProvider, type WatchedToken } from "@/lib/whale";

const WHALE_USD_THRESHOLD = 100_000;
const MARKETS_PER_PAGE = 50;

function whaleAlertsToAlerts(projectNameById: Map<string, string>, projectSlugById: Map<string, string>) {
  return async function buildWhaleAlerts(watchedTokens: WatchedToken[]): Promise<Alert[]> {
    if (watchedTokens.length === 0) return [];
    const events = await getWhaleProvider().detect({ watchedTokens, usdThreshold: WHALE_USD_THRESHOLD });

    return events.map((event): Alert => {
      const projectName = projectNameById.get(event.projectId) ?? event.projectId;
      const projectSlug = projectSlugById.get(event.projectId) ?? event.projectId;
      const isWhaleAlert = event.classification === "whale-alert";
      return {
        id: `blockscout:whale:${event.id}`,
        projectId: event.projectId,
        projectName,
        title: isWhaleAlert ? "Whale Alert" : "Large Transfer",
        summary: `$${Math.round(event.usdValue).toLocaleString()} of ${event.tokenSymbol} moved from ${event.fromAddress.slice(0, 6)}…${event.fromAddress.slice(-4)}.`,
        category: "whale",
        severity: isWhaleAlert ? "warning" : "info",
        timestamp: event.timestamp,
        read: false,
        pinned: false,
        source: "Blockscout",
        actionUrl: `/dashboard/projects/${projectSlug}`,
      };
    });
  };
}

async function buildVerifiedContractAlerts(): Promise<Alert[]> {
  const projects = getProjects().filter((project) => project.contracts.some((contract) => contract.chain === "base"));
  if (projects.length === 0) return [];

  const alerts: Alert[] = [];
  await Promise.allSettled(
    projects.map(async (project) => {
      const baseContract = project.contracts.find((contract) => contract.chain === "base");
      if (!baseContract) return;

      const result = await blockscout.getContractDetail(baseContract.address);
      if (!result.ok || !result.data.verified) return;

      const severity: AlertSeverity = "success";
      alerts.push({
        id: `blockscout:verified:${project.id}:${baseContract.address}`,
        projectId: project.id,
        projectName: project.name,
        title: "Contract Verified",
        summary: `${baseContract.label ?? "A registered contract"} for ${project.name} is verified on Blockscout${result.data.compilerVersion ? ` (compiled with ${result.data.compilerVersion})` : ""}.`,
        category: "security",
        severity,
        // Blockscout's contract-detail endpoint doesn't expose a real
        // "verified at" timestamp (confirmed absent, see
        // `blockscout/mapper.ts`) — this is "verified as of this check,"
        // never a fabricated verification date.
        timestamp: new Date().toISOString(),
        read: false,
        pinned: false,
        source: "Blockscout",
        actionUrl: `/dashboard/projects/${project.slug}`,
      });
    })
  );

  return alerts;
}

export const blockscoutAlertProvider: AlertProvider = {
  async fetchAlerts(): Promise<Alert[]> {
    const projects = getProjects();
    const marketsResult = await coingecko.getBaseEcosystemMarkets(MARKETS_PER_PAGE);
    const marketById = marketsResult.ok ? new Map(marketsResult.data.map((market) => [market.id, market])) : null;

    const watchedTokens: WatchedToken[] = [];
    const projectNameById = new Map<string, string>();
    const projectSlugById = new Map<string, string>();

    for (const project of projects) {
      projectNameById.set(project.id, project.name);
      projectSlugById.set(project.id, project.slug);

      const tokenContract = project.contracts.find((contract) => contract.chain === "base" && contract.type === "token");
      const coingeckoId = project.providerIds.coingeckoId;
      if (!tokenContract || !coingeckoId || !marketById) continue;

      const market = marketById.get(coingeckoId);
      if (!market) continue;

      watchedTokens.push({
        projectId: project.id,
        projectName: project.name,
        tokenSymbol: market.symbol,
        contractAddress: tokenContract.address,
        priceUsd: market.priceUsd,
        hasCorroboratingSignal: Math.abs(market.changePct24h ?? 0) > 10,
      });
    }

    const [whaleAlerts, verifiedAlerts] = await Promise.all([
      whaleAlertsToAlerts(projectNameById, projectSlugById)(watchedTokens),
      buildVerifiedContractAlerts(),
    ]);

    return [...whaleAlerts, ...verifiedAlerts];
  },
};
