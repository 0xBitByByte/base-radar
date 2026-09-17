/**
 * PR-092.04 — pure evaluation functions. Both read only real, already-fetched
 * data (`HeldProjectLink[]` from `lib/portfolio-intelligence/projectLinks.ts`,
 * real `WhaleEvent[]`) — no provider call, no new detection logic.
 */

import type { HeldProjectLink } from "@/lib/portfolio-intelligence/projectLinks";
import type { WhaleEvent } from "@/lib/whale/types";
import type { PortfolioAlertKind, PortfolioMonitoringAlert } from "@/lib/portfolio-monitoring/types";

export type PendingAlert = {
  kind: PortfolioAlertKind;
  dedupeKey: string;
  projectId: string;
  projectName: string;
  projectSlug: string | null;
  headline: string;
  detail: string;
};

/** `WhaleEvent.id` is already a real, stable identifier — dedup keys directly off it, never a computed/derived key. */
export function findWhaleAlerts(links: HeldProjectLink[], whaleEvents: WhaleEvent[]): PendingAlert[] {
  const heldProjectIds = new Set(links.map((link) => link.project.id));
  const alerts: PendingAlert[] = [];
  for (const event of whaleEvents) {
    if (!heldProjectIds.has(event.projectId)) continue;
    const link = links.find((l) => l.project.id === event.projectId);
    if (!link) continue;
    alerts.push({
      kind: "whale",
      dedupeKey: event.id,
      projectId: link.project.id,
      projectName: link.project.identity.name,
      projectSlug: link.project.slug,
      headline: `Large ${event.tokenSymbol} transfer detected for ${link.project.identity.name}`,
      detail: `A real $${event.usdValue.toLocaleString()} transfer was detected for ${link.project.identity.name}, a project you hold.`,
    });
  }
  return alerts;
}

/**
 * A governance alert fires only when the real active-proposal count for a
 * held project INCREASED since the count last recorded for that project —
 * never merely "governance is active" every visit (that's what Smart
 * Collections' own "Governance Active" already shows). `previousCounts` is
 * this device's own last-seen record, keyed by project id.
 */
export function findGovernanceAlerts(links: HeldProjectLink[], previousCounts: Record<string, number>): PendingAlert[] {
  const alerts: PendingAlert[] = [];
  for (const link of links) {
    const current = link.project.governance.activeProposalCount ?? 0;
    const previous = previousCounts[link.project.id];
    if (previous === undefined) continue; // First-ever observation — nothing to compare against yet, never treated as "new."
    if (current > previous) {
      alerts.push({
        kind: "governance",
        dedupeKey: `${link.project.id}:${current}`,
        projectId: link.project.id,
        projectName: link.project.identity.name,
        projectSlug: link.project.slug,
        headline: `New governance proposal for ${link.project.identity.name}`,
        detail: `${link.project.identity.name}, a project you hold, now has ${current} active proposal${current === 1 ? "" : "s"} (up from ${previous}).`,
      });
    }
  }
  return alerts;
}

/** Real current counts, for the caller to persist as next visit's baseline — never computed here, just read straight off each held project's real field. */
export function currentGovernanceCounts(links: HeldProjectLink[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const link of links) counts[link.project.id] = link.project.governance.activeProposalCount ?? 0;
  return counts;
}

export function toAlert(pending: PendingAlert, firstSeenAt: string): PortfolioMonitoringAlert {
  return {
    id: `portfolio-watch:${pending.kind}:${pending.dedupeKey}`,
    kind: pending.kind,
    firstSeenAt,
    isRead: false,
    readAt: null,
    projectId: pending.projectId,
    projectName: pending.projectName,
    projectSlug: pending.projectSlug,
    headline: pending.headline,
    detail: pending.detail,
  };
}
