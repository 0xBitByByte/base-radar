/**
 * The Governance provider abstraction (PR10). PR10 ships exactly one
 * implementation — `SnapshotGovernanceProvider` (`snapshot-provider.ts`),
 * which reads Snapshot.org's free public GraphQL API for whichever
 * registry projects define a real `governance.snapshotSpace`. A project
 * with no governance source configured is simply excluded — never
 * fabricated. Other governance sources (Tally, Compound Governor,
 * OpenZeppelin Governor, Aragon, Safe) are future providers behind the
 * same interface, via `index.ts`'s `getGovernanceProvider()`.
 */

export type GovernanceStatus = "active" | "passed" | "failed" | "pending";

export type GovernanceEvent = {
  projectId: string;
  provider: string;
  proposalId: string;
  title: string;
  /** Real proposal description (PR13.7 Goal 12) — `null` when Snapshot returned an empty body, never fabricated. */
  description: string | null;
  status: GovernanceStatus;
  start: string;
  end: string;
  participation: number | null;
  quorumMet: boolean | null;
  url: string;
  /** 0-100. */
  confidence: number;
};

export type GovernanceProjectRef = {
  projectId: string;
  projectName: string;
  snapshotSpace: string;
};

export type GovernanceFetchInput = {
  /** Only projects with a real, registry-configured governance source — never guessed or inferred. */
  projects: GovernanceProjectRef[];
};

export interface GovernanceProvider {
  fetchEvents(input: GovernanceFetchInput): Promise<GovernanceEvent[]>;
}
