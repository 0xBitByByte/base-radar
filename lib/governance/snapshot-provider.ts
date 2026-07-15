import * as snapshotService from "@/lib/providers/snapshot/service";
import type {
  GovernanceEvent,
  GovernanceFetchInput,
  GovernanceProjectRef,
  GovernanceProvider,
} from "@/lib/governance/types";

/** Snapshot data is a direct, real read of the space's own proposals — not a heuristic guess — so it starts from a high baseline confidence. */
const BASE_CONFIDENCE = 80;

export class SnapshotGovernanceProvider implements GovernanceProvider {
  async fetchEvents(input: GovernanceFetchInput): Promise<GovernanceEvent[]> {
    const results = await Promise.allSettled(input.projects.map((project) => this.fetchForProject(project)));
    return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  }

  private async fetchForProject(project: GovernanceProjectRef): Promise<GovernanceEvent[]> {
    const result = await snapshotService.getProposals(project.snapshotSpace);
    if (!result.ok) return [];

    return result.data.map((proposal) => ({
      projectId: project.projectId,
      provider: "snapshot",
      proposalId: proposal.id,
      title: proposal.title,
      status: proposal.status,
      start: proposal.start,
      end: proposal.end,
      participation: proposal.participation,
      quorumMet: proposal.quorumMet,
      url: proposal.url,
      confidence: BASE_CONFIDENCE,
    }));
  }
}
