/**
 * Snapshot Alert Provider — reuses the existing Governance provider layer
 * (`lib/governance`, PR10) exactly as the Project Profile already does;
 * never calls Snapshot's GraphQL API directly. Pure: no React, no hooks,
 * no localStorage.
 *
 * One alert per proposal, chosen by its real, current `status` (never
 * fabricated) — an if/else-if chain so a single proposal is never counted
 * under two different alert types at once. `end`-recency decides "Ending
 * Soon" vs. a plain "Voting Started" for an otherwise-active proposal.
 *
 * Deliberately NOT implemented: Quorum Reached, Execution Ready. Snapshot
 * is off-chain signaling only — there is no real on-chain execution
 * timestamp or exposed quorum-progress figure to report (confirmed during
 * PR13.7's governance audit); fabricating one would violate this
 * codebase's core "never fabricate" rule. "Governance Activity" as a
 * separate rollup alert is also omitted — it would just restate the same
 * per-proposal signal already covered below, one fact shown twice.
 */

import { getProjects } from "@/data/projects";
import type { AlertProvider } from "@/lib/alerts/providers/types";
import type { Alert, AlertSeverity } from "@/lib/alerts/types";
import { getGovernanceProvider } from "@/lib/governance";
import type { GovernanceEvent, GovernanceProjectRef } from "@/lib/governance";

const ENDING_SOON_WINDOW_DAYS = 3;

/** `true` when `iso` is a real, still-upcoming timestamp within the next `days` days — the opposite direction from a recency check, used only for "is voting about to close." */
function isEndingWithinDays(iso: string, days: number): boolean {
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return false;
  const diffMs = end - Date.now();
  return diffMs >= 0 && diffMs <= days * 86_400_000;
}

function buildAlert(
  event: GovernanceEvent,
  projectName: string,
  projectSlug: string,
  title: string,
  severity: AlertSeverity,
  timestamp: string
): Alert {
  return {
    id: `snapshot:${event.proposalId}:${title}`,
    projectId: event.projectId,
    projectName,
    title,
    summary: event.description ? truncate(cleanDescriptionText(event.description), 160) : `"${event.title}" — ${event.status}.`,
    category: "governance",
    severity,
    timestamp,
    read: false,
    pinned: false,
    source: "Snapshot",
    actionUrl: event.url || `/dashboard/projects/${projectSlug}`,
  };
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 3)}...` : trimmed;
}

/** Strips a Snapshot proposal description down to plain prose — same cleaning `lib/intelligence/report.ts`'s Executive Intelligence report already applies to this exact data, reused here rather than reimplemented: leading Markdown heading markers, a redundant leading "Summary"-style label, link/bold/italic/code syntax, and collapsed whitespace. */
function cleanDescriptionText(text: string): string {
  return text
    .replace(/^#{1,6}\s*/, "")
    .replace(/^(Summary|Overview|Background|Abstract)\s*[:.]?\s+/i, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_{1,2}(.*?)_{1,2}/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function eventToAlert(event: GovernanceEvent, projectName: string, projectSlug: string): Alert | null {
  if (event.status === "pending") {
    return buildAlert(event, projectName, projectSlug, "Proposal Created", "info", event.start);
  }

  if (event.status === "active") {
    if (isEndingWithinDays(event.end, ENDING_SOON_WINDOW_DAYS)) {
      return buildAlert(event, projectName, projectSlug, "Proposal Ending Soon", "warning", event.end);
    }
    return buildAlert(event, projectName, projectSlug, "Voting Started", "info", event.start);
  }

  if (event.status === "passed") {
    return buildAlert(event, projectName, projectSlug, "Proposal Passed", "success", event.end);
  }

  if (event.status === "failed") {
    return buildAlert(event, projectName, projectSlug, "Proposal Failed", "warning", event.end);
  }

  return null;
}

export const snapshotAlertProvider: AlertProvider = {
  async fetchAlerts(): Promise<Alert[]> {
    const projects = getProjects().filter((project) => project.governance?.snapshotSpace);
    if (projects.length === 0) return [];

    const projectRefs: GovernanceProjectRef[] = projects.map((project) => ({
      projectId: project.id,
      projectName: project.name,
      snapshotSpace: project.governance!.snapshotSpace!,
    }));

    const events = await getGovernanceProvider().fetchEvents({ projects: projectRefs });
    const projectById = new Map(projects.map((project) => [project.id, project]));

    return events.flatMap((event) => {
      const project = projectById.get(event.projectId);
      if (!project) return [];
      const alert = eventToAlert(event, project.name, project.slug);
      return alert ? [alert] : [];
    });
  },
};
