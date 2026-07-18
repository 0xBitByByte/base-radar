/**
 * CoinGecko Alert Provider — reuses the existing CoinGecko provider layer
 * (`lib/providers/coingecko/service.ts`), specifically the same bulk
 * `getBaseEcosystemMarkets()` call Explorer/Dashboard already use — ONE
 * network request covers every registry project's price data, not one
 * call per project. Pure: no React, no hooks, no localStorage.
 *
 * Price-change severity is tiered off CoinGecko's own real 24h percentage
 * (never a computed/guessed delta), and ATH/ATL alerts use CoinGecko's own
 * `athDate`/`atlDate` recency — both single-snapshot facts, no persisted
 * history needed. "Price Change" and "Large Market Move" are deliberately
 * ONE alert per project, not two, so the same underlying number is never
 * reported twice; "Market Cap" is folded into the same signal for the
 * same reason (it moves with price, not independently, at this data
 * granularity).
 *
 * Deliberately NOT implemented: Volume Spike (would need a second,
 * per-project `getMarketChart` call to establish a real average-volume
 * baseline — out of scope for this pass, to keep this provider to its one
 * bulk request), Trending (CoinGecko's `/search/trending` is a global
 * list, not yet an integrated endpoint), Token Listed (requires the
 * `/coins/{id}/tickers` endpoint, also not yet integrated). None of these
 * are guessed — they're left out entirely rather than faked.
 */

import { getProjects } from "@/data/projects";
import type { Project } from "@/data/projects/types";
import { isWithinDays } from "@/lib/alerts/providers/shared";
import type { AlertProvider } from "@/lib/alerts/providers/types";
import type { Alert, AlertSeverity } from "@/lib/alerts/types";
import * as coingecko from "@/lib/providers/coingecko/service";
import type { CoinMarket } from "@/lib/providers/coingecko/service";

const MARKETS_PER_PAGE = 50;
const ATH_ATL_WINDOW_DAYS = 14;
const LARGE_MOVE_THRESHOLD_PCT = 20;
const NOTABLE_MOVE_THRESHOLD_PCT = 8;
const MINOR_MOVE_THRESHOLD_PCT = 3;

function buildPriceMoveAlert(project: Project, market: CoinMarket): Alert | null {
  const change = market.changePct24h;
  if (change === null) return null;

  const magnitude = Math.abs(change);
  if (magnitude < MINOR_MOVE_THRESHOLD_PCT) return null;

  const direction = change >= 0 ? "up" : "down";
  const rounded = magnitude.toFixed(1);

  let title: string;
  let severity: AlertSeverity;
  if (magnitude >= LARGE_MOVE_THRESHOLD_PCT) {
    title = `Large Market Move: ${direction === "up" ? "+" : "-"}${rounded}%`;
    severity = "critical";
  } else if (magnitude >= NOTABLE_MOVE_THRESHOLD_PCT) {
    title = `Price ${direction === "up" ? "Up" : "Down"} ${rounded}%`;
    severity = direction === "up" ? "success" : "warning";
  } else {
    title = `Price ${direction === "up" ? "Up" : "Down"} ${rounded}%`;
    severity = "info";
  }

  return {
    id: `coingecko:price-move:${project.id}:${Math.round(change)}`,
    projectId: project.id,
    projectName: project.name,
    title,
    summary: `${project.name} moved ${direction} ${rounded}% over the past 24 hours to $${market.priceUsd.toLocaleString()}.`,
    category: "price",
    severity,
    timestamp: new Date().toISOString(),
    read: false,
    pinned: false,
    source: "CoinGecko",
    actionUrl: `/dashboard/projects/${project.slug}`,
  };
}

function buildAthAlert(project: Project, market: CoinMarket): Alert | null {
  if (market.athUsd === null || !isWithinDays(market.athDate, ATH_ATL_WINDOW_DAYS)) return null;
  return {
    id: `coingecko:ath:${project.id}:${market.athDate}`,
    projectId: project.id,
    projectName: project.name,
    title: "New All-Time High",
    summary: `${project.name} reached a new all-time high of $${market.athUsd.toLocaleString()}.`,
    category: "price",
    severity: "success",
    timestamp: market.athDate!,
    read: false,
    pinned: false,
    source: "CoinGecko",
    actionUrl: `/dashboard/projects/${project.slug}`,
  };
}

function buildAtlAlert(project: Project, market: CoinMarket): Alert | null {
  if (market.atlUsd === null || !isWithinDays(market.atlDate, ATH_ATL_WINDOW_DAYS)) return null;
  return {
    id: `coingecko:atl:${project.id}:${market.atlDate}`,
    projectId: project.id,
    projectName: project.name,
    title: "New All-Time Low",
    summary: `${project.name} fell to a new all-time low of $${market.atlUsd.toLocaleString()}.`,
    category: "price",
    severity: "warning",
    timestamp: market.atlDate!,
    read: false,
    pinned: false,
    source: "CoinGecko",
    actionUrl: `/dashboard/projects/${project.slug}`,
  };
}

export const coingeckoAlertProvider: AlertProvider = {
  async fetchAlerts(): Promise<Alert[]> {
    const projects = getProjects().filter((project) => project.providerIds.coingeckoId);
    if (projects.length === 0) return [];

    const result = await coingecko.getBaseEcosystemMarkets(MARKETS_PER_PAGE);
    if (!result.ok) return [];

    const marketById = new Map(result.data.map((market) => [market.id, market]));
    const alerts: Alert[] = [];

    for (const project of projects) {
      const market = marketById.get(project.providerIds.coingeckoId!);
      if (!market) continue;

      const priceAlert = buildPriceMoveAlert(project, market);
      if (priceAlert) alerts.push(priceAlert);

      const athAlert = buildAthAlert(project, market);
      if (athAlert) alerts.push(athAlert);

      const atlAlert = buildAtlAlert(project, market);
      if (atlAlert) alerts.push(atlAlert);
    }

    return alerts;
  },
};
