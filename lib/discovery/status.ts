/**
 * PR-053 — Discovery Status (Task 5). A project-lifecycle read distinct
 * from `DiscoveryQueueStatus` (`queue.ts`'s "new/needs-review/accepted/
 * rejected/duplicate" — a human-review WORKFLOW state) — this is an
 * evidence-based read of what KIND of project this is, for the future
 * Projects page's filter buckets (Task 8): Verified / Tracked /
 * Discovered / New / Recently Updated / Upcoming / Announced / Deprecated
 * / Inactive / Needs Review / Unknown.
 *
 * Every rule below cites the exact evidence it used in its `reason` — no
 * status is ever assigned without a concrete signal backing it. Two
 * statuses (`Upcoming`/`Announced`) are real, evidence-gated rules that
 * cannot currently fire against any of today's three real discovery
 * sources (`coingecko`/`defillama`/`blockscout` all only ever surface
 * already-live, already-trading projects) — see this file's own comment
 * on `computeDiscoveryStatus` and docs/PR-053_LIVE_DISCOVERY_ENGINE.md
 * "Remaining Limitations" for why that's honest, not a bug.
 */

import type { EnrichmentEvidence } from "@/lib/discovery/enrich";
import type { RegistryMatch } from "@/lib/discovery/registryMatch";
import type { CandidateProject } from "@/lib/discovery/types";

export const DISCOVERY_STATUSES = [
  "verified",
  "tracked",
  "discovered",
  "new",
  "recently-updated",
  "upcoming",
  "announced",
  "deprecated",
  "inactive",
  "needs-review",
  "unknown",
] as const;
export type DiscoveryStatus = (typeof DISCOVERY_STATUSES)[number];

export type DiscoveryStatusResult = {
  status: DiscoveryStatus;
  reason: string;
};

/** Real corroborating evidence that this candidate refers to an actually-active project — a contract on record, or enrichment confirming live market/TVL data. */
function hasCorroboratingActivityEvidence(candidate: CandidateProject, evidence: EnrichmentEvidence): boolean {
  if (candidate.contracts.length > 0) return true;
  if (evidence.hasLiveMarketData || evidence.hasLiveTvlData) return true;
  return false;
}

export function computeDiscoveryStatus(
  candidate: CandidateProject,
  registryMatch: RegistryMatch,
  evidence: EnrichmentEvidence
): DiscoveryStatusResult {
  const project = registryMatch.project;

  if (project?.status === "deprecated" || project?.status === "sunset") {
    return { status: "deprecated", reason: `Matched registry project "${project.name}" has status "${project.status}".` };
  }

  if (project?.lifecycle?.state === "inactive") {
    return { status: "inactive", reason: `Matched registry project "${project.name}" has lifecycle.state "inactive".` };
  }

  if (registryMatch.type === "duplicate") {
    if (project?.verification.status === "verified") {
      return { status: "verified", reason: `Matches registry project "${project.name}", editorially verified.` };
    }
    return { status: "tracked", reason: `Matches an already-tracked registry project ("${project?.name}"), not yet editorially verified.` };
  }

  if (registryMatch.type === "updated") {
    return { status: "recently-updated", reason: registryMatch.reason };
  }

  if (registryMatch.type === "renamed" || registryMatch.type === "alias" || registryMatch.type === "needs-review") {
    return { status: "needs-review", reason: registryMatch.reason };
  }

  // registryMatch.type === "new" from here — no existing registry entry.
  // `community` is the one discovery source explicitly reserved for
  // pre-launch pitches (see docs/DISCOVERY_ENGINE.md) — inert today since
  // that provider returns zero candidates, but the rule is real and ready.
  if (candidate.source === "community") {
    return { status: "announced", reason: "Surfaced via the community submission source — treated as a pre-launch announcement pending on-chain/market confirmation." };
  }

  // `base-ecosystem` is the other source documented as capable of listing
  // an officially-recognized-but-not-yet-live project once it has a real
  // integration — also inert today (returns zero candidates).
  if (candidate.source === "base-ecosystem" && candidate.contracts.length === 0 && !evidence.hasLiveMarketData && !evidence.hasLiveTvlData) {
    return { status: "upcoming", reason: "Listed by the Base ecosystem source with no contract or live market/TVL data yet — likely pre-launch." };
  }

  if (hasCorroboratingActivityEvidence(candidate, evidence)) {
    return { status: "new", reason: "No existing registry match, and real evidence (a contract on record or live market/TVL data) confirms this is an active project." };
  }

  return { status: "discovered", reason: "No existing registry match and no corroborating activity evidence yet — a bare, unconfirmed discovery." };
}
