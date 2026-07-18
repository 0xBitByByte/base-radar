/**
 * DefiLlama Alert Provider — reuses the existing DefiLlama provider layer
 * (`lib/providers/defillama/service.ts`) and the same `changePctOverDays`
 * pure helper the Project Profile's own TVL chart already uses
 * (`lib/intelligence/merge.ts`) — never a second, independent delta
 * calculation. Pure: no React, no hooks, no localStorage.
 *
 * One alert per project, tiered by real 7-day TVL change (a genuine
 * historical comparison computed from DefiLlama's own per-protocol time
 * series, not a persisted baseline this provider keeps itself) — 24h
 * change is folded into the same signal rather than reported separately,
 * so a single TVL move is never counted twice.
 */

import { getProjects } from "@/data/projects";
import type { Project } from "@/data/projects/types";
import type { AlertProvider } from "@/lib/alerts/providers/types";
import type { Alert, AlertSeverity } from "@/lib/alerts/types";
import { changePctOverDays } from "@/lib/intelligence/merge";
import * as defillama from "@/lib/providers/defillama/service";

const LARGE_CHANGE_THRESHOLD_PCT = 15;
const NOTABLE_CHANGE_THRESHOLD_PCT = 5;

function buildTvlAlert(project: Project, changePct7d: number): Alert | null {
  const magnitude = Math.abs(changePct7d);
  if (magnitude < NOTABLE_CHANGE_THRESHOLD_PCT) return null;

  const up = changePct7d >= 0;
  const rounded = magnitude.toFixed(1);
  const severity: AlertSeverity = magnitude >= LARGE_CHANGE_THRESHOLD_PCT ? (up ? "success" : "warning") : "info";

  return {
    id: `defillama:tvl:${project.id}:${Math.round(changePct7d)}`,
    projectId: project.id,
    projectName: project.name,
    title: `TVL ${up ? "Increased" : "Decreased"} ${rounded}%`,
    summary: `${project.name}'s total value locked ${up ? "grew" : "declined"} ${rounded}% over the past 7 days.`,
    category: "tvl",
    severity,
    timestamp: new Date().toISOString(),
    read: false,
    pinned: false,
    source: "DefiLlama",
    actionUrl: `/dashboard/projects/${project.slug}`,
  };
}

async function fetchAlertsForProject(project: Project): Promise<Alert[]> {
  const slug = project.providerIds.defillamaSlug;
  if (!slug) return [];

  const result = await defillama.getProtocolTvlHistory(slug);
  if (!result.ok) return [];

  const changePct7d = changePctOverDays(result.data, 7);
  if (changePct7d === null) return [];

  const alert = buildTvlAlert(project, changePct7d);
  return alert ? [alert] : [];
}

export const defillamaAlertProvider: AlertProvider = {
  async fetchAlerts(): Promise<Alert[]> {
    const projects = getProjects().filter((project) => project.providerIds.defillamaSlug);
    if (projects.length === 0) return [];

    const results = await Promise.allSettled(projects.map(fetchAlertsForProject));
    return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  },
};
