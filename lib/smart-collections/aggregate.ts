/**
 * PR-090.04 (Smart Collections) — combines the per-collection evaluators
 * (`evaluate.ts`) into real `SmartCollectionResult`s. This is presentation
 * assembly only: no scoring, no ranking beyond what each evaluator already
 * did, no second data derivation. `averageConfidence` is a plain mean over
 * whatever real confidence facts a collection's own matches carry — not a
 * new confidence model, just a descriptive statistic over real numbers.
 */

import {
  evaluateAiPicks,
  evaluateDeveloperMomentum,
  evaluateGovernanceActive,
  evaluateHighConviction,
  evaluateLowRisk,
  evaluateStableProjects,
  evaluateTrendingNarratives,
  evaluateUndervalued,
  evaluateWhaleAccumulation,
  evaluateYieldOpportunities,
  SMART_COLLECTION_META,
} from "@/lib/smart-collections/evaluate";
import type { SmartCollectionId, SmartCollectionMatch, SmartCollectionResult, SmartCollectionStatus } from "@/lib/smart-collections/types";
import type { IntelligenceAlert } from "@/lib/alerts/intelligence/types";
import type { DailyBrief } from "@/lib/brief/types";
import type { LiveProject } from "@/lib/projects/types";
import type { WhaleEvent } from "@/lib/whale/types";

function averageConfidence(matches: SmartCollectionMatch[]): number | null {
  const scores: number[] = [];
  for (const match of matches) {
    if (match.liveProject) {
      scores.push(match.liveProject.confidence.score);
      continue;
    }
    const confidenceFact = match.evidence.find((e) => e.label === "Confidence");
    const parsed = confidenceFact ? Number.parseInt(confidenceFact.value, 10) : NaN;
    if (!Number.isNaN(parsed)) scores.push(parsed);
  }
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
}

function buildResult(id: SmartCollectionId, matches: SmartCollectionMatch[], status: SmartCollectionStatus, evaluatedAt: string): SmartCollectionResult {
  const meta = SMART_COLLECTION_META[id];
  return { id, name: meta.name, description: meta.description, status, matches, lastEvaluatedAt: evaluatedAt, averageConfidence: averageConfidence(matches) };
}

/** The 7 collections evaluable entirely from server-fetched data — always `"ready"`, since the data they need was already awaited before this runs. */
export function evaluateServerCollections(liveProjects: LiveProject[], whaleEvents: WhaleEvent[], evaluatedAt: string): SmartCollectionResult[] {
  return [
    buildResult("ai-picks", evaluateAiPicks(liveProjects), "ready", evaluatedAt),
    buildResult("whale-accumulation", evaluateWhaleAccumulation(liveProjects, whaleEvents), "ready", evaluatedAt),
    buildResult("developer-momentum", evaluateDeveloperMomentum(liveProjects), "ready", evaluatedAt),
    buildResult("high-conviction", evaluateHighConviction(liveProjects), "ready", evaluatedAt),
    buildResult("low-risk", evaluateLowRisk(liveProjects), "ready", evaluatedAt),
    buildResult("governance-active", evaluateGovernanceActive(liveProjects), "ready", evaluatedAt),
    buildResult("undervalued", evaluateUndervalued(liveProjects), "ready", evaluatedAt),
  ];
}

/**
 * The 3 collections that need the client-only Alert Engine/Daily Brief.
 * `status` is the caller's own real, already-derived freshness state (from
 * `useAlertRefreshStatus()`) — this function never evaluates when it isn't
 * `"ready"`, returning an honest empty result instead (see
 * `lib/hooks/useSmartCollections.ts`, which owns that gate).
 */
export function evaluateClientCollections(alerts: IntelligenceAlert[], dailyBrief: DailyBrief | null, status: SmartCollectionStatus, evaluatedAt: string): SmartCollectionResult[] {
  const ids: SmartCollectionId[] = ["trending-narratives", "stable-projects", "yield-opportunities"];
  if (status !== "ready") {
    return ids.map((id) => buildResult(id, [], status, evaluatedAt));
  }
  return [
    buildResult("trending-narratives", evaluateTrendingNarratives(alerts), "ready", evaluatedAt),
    buildResult("stable-projects", evaluateStableProjects(alerts), "ready", evaluatedAt),
    buildResult("yield-opportunities", evaluateYieldOpportunities(dailyBrief), "ready", evaluatedAt),
  ];
}
