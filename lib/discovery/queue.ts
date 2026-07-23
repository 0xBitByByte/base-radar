import type { DuplicateMatch } from "@/lib/discovery/duplicates";
import { DISCOVERY_QUEUE_STATUSES, type CandidateProject, type DiscoveryQueueStatus } from "@/lib/discovery/types";

export { DISCOVERY_QUEUE_STATUSES };
export type { DiscoveryQueueStatus };

/**
 * One candidate under review. This is a model only — no persistence layer
 * exists yet (no storage/database write), matching this PR's "no UI
 * required" / "queue exists for future moderation" scope. A future PR
 * chooses where these entries actually live (likely a real database, given
 * this is meant to grow unbounded and be queried/paginated — unlike
 * `data/projects/`'s small, hand-curated seed set).
 */
export type DiscoveryQueueEntry = {
  /** `${source}:${externalId}` — stable across repeat discovery runs so the same candidate doesn't create duplicate queue entries. */
  id: string;
  candidate: CandidateProject;
  status: DiscoveryQueueStatus;
  /** Computed once, at intake — see `createQueueEntry`. Re-running duplicate detection after the registry changes is a future concern, not handled here. */
  duplicateMatches: DuplicateMatch[];
  reviewedAt?: string;
  /** Free-text identifier for whoever/whatever reviewed this — a person, or a future automated policy. */
  reviewedBy?: string;
  notes?: string;
};

/** `${source}:${externalId}` is stable for a given candidate across repeat syncs — used as the queue entry's own id and safe to use as a de-dupe key when merging a new discovery run into an existing queue. */
export function candidateQueueId(candidate: CandidateProject): string {
  return `${candidate.source}:${candidate.externalId}`;
}

/**
 * Builds a new queue entry for a freshly-discovered candidate. Status
 * starts at `"duplicate"` only when a strong match (confidence ≥ 70) was
 * found; otherwise `"needs-review"` if any match exists at all (a reviewer
 * should see the candidates before accepting), or `"new"` if nothing
 * matched. This threshold is a starting heuristic, not a hard rule enforced
 * anywhere else — a future reviewer UI can always override it.
 */
export function createQueueEntry(candidate: CandidateProject, duplicateMatches: DuplicateMatch[]): DiscoveryQueueEntry {
  const strongestMatch = duplicateMatches[0];
  const status: DiscoveryQueueStatus =
    strongestMatch && strongestMatch.confidence >= 70
      ? "duplicate"
      : duplicateMatches.length > 0
        ? "needs-review"
        : "new";

  return {
    id: candidateQueueId(candidate),
    candidate,
    status,
    duplicateMatches,
  };
}

function transition(entry: DiscoveryQueueEntry, status: DiscoveryQueueStatus, reviewedBy?: string, notes?: string): DiscoveryQueueEntry {
  return {
    ...entry,
    status,
    reviewedAt: new Date().toISOString(),
    reviewedBy,
    notes: notes ?? entry.notes,
  };
}

/** Marks a candidate accepted — this does NOT create a `Project` record. Converting an accepted entry into a real registry entry is deliberately left to a future PR (see docs/DISCOVERY_ENGINE.md "Future Ingestion Flow"), so a real person reviews the mapping before anything is written to `data/projects/`. */
export function acceptCandidate(entry: DiscoveryQueueEntry, reviewedBy?: string, notes?: string): DiscoveryQueueEntry {
  return transition(entry, "accepted", reviewedBy, notes);
}

export function rejectCandidate(entry: DiscoveryQueueEntry, reviewedBy?: string, notes?: string): DiscoveryQueueEntry {
  return transition(entry, "rejected", reviewedBy, notes);
}

export function markAsDuplicate(entry: DiscoveryQueueEntry, reviewedBy?: string, notes?: string): DiscoveryQueueEntry {
  return transition(entry, "duplicate", reviewedBy, notes);
}
