import * as snapshotService from "@/lib/providers/snapshot/service";
import type { GovernanceEvent, GovernanceFetchInput, GovernanceProvider } from "@/lib/governance/types";

/** Snapshot data is a direct, real read of the space's own proposals — not a heuristic guess — so it starts from a high baseline confidence. */
const BASE_CONFIDENCE = 80;

export class SnapshotGovernanceProvider implements GovernanceProvider {
  /**
   * PR-106 (API Calls, Limits & Capacity Audit) — was `Promise.allSettled`
   * over one `getProposals(space)` GraphQL request PER project (confirmed:
   * every registry-wide caller of this — `getLiveProjects()`/
   * `getAllProjectIntelligence()`, hit from `/dashboard`, `/dashboard/
   * projects`, `/dashboard/compare`, `/dashboard/watchlists`, and the
   * Alerts Snapshot provider — passed all 9 currently governance-configured
   * projects at once, making 9 separate upstream Snapshot calls where one
   * would do). `getProposalsForSpaces()` (`lib/providers/snapshot/
   * service.ts`) already exists and is already proven for exactly this —
   * the earlier "MASTER HARDENING PASS — Concern 1" fixed the identical
   * N+1 for the Featured Intelligence snapshot path, but never propagated
   * to this shared governance provider, so every OTHER multi-project
   * surface kept paying it. One batched request for every project's space
   * here now, same as that precedent — see `getProposalsForSpaces`'s own
   * doc comment for the one accepted tradeoff this carries forward
   * unchanged: a batch-level failure degrades every requested space
   * together (via the same `withStaleFallback`, never blanked, never
   * fabricated) rather than only the one space that failed. Output shape
   * (`GovernanceEvent[]`, tagged per project) is unchanged.
   */
  async fetchEvents(input: GovernanceFetchInput): Promise<GovernanceEvent[]> {
    if (input.projects.length === 0) return [];

    const spaces = input.projects.map((project) => project.snapshotSpace);
    const result = await snapshotService.getProposalsForSpaces(spaces);
    if (!result.ok) return [];

    return input.projects.flatMap((project) => {
      const proposals = result.data[project.snapshotSpace] ?? [];
      return proposals.map((proposal) => ({
        projectId: project.projectId,
        provider: "snapshot",
        proposalId: proposal.id,
        title: proposal.title,
        description: proposal.description,
        status: proposal.status,
        start: proposal.start,
        end: proposal.end,
        participation: proposal.participation,
        quorumMet: proposal.quorumMet,
        url: proposal.url,
        voterCount: proposal.voterCount,
        discussionUrl: proposal.discussionUrl,
        proposerAddress: proposal.proposerAddress,
        confidence: BASE_CONFIDENCE,
      }));
    });
  }
}
