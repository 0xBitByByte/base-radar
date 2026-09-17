/**
 * V4-ANALYTICS-001A (Phase 6) — Personal Bests. Per the brief: "Do not
 * duplicate milestone calculations. Reuse them." Every field except
 * `longestStablePortfolio` is a direct alias of the matching
 * `PortfolioMilestones` entry `milestones.ts` already computed —
 * `buildPersonalBests` takes the already-built `PortfolioMilestones` object
 * as input rather than re-scanning `history` itself. `longestStablePortfolio`
 * is the one genuinely new calculation, and it reuses `comparison.ts`'s own
 * `longestConsecutiveRun` helper (the exact algorithm
 * `longestUnchangedRecommendation` already uses) applied to `fingerprint`
 * instead of re-implementing a run-finder.
 */

import { longestConsecutiveRun } from "@/lib/wallet-analytics/comparison";
import type { LongestStablePortfolio, PersonalBests, PortfolioMilestones } from "@/lib/wallet-analytics/types";
import type { AutomationSnapshot } from "@/lib/wallet-automation/types";

function longestStablePortfolio(history: AutomationSnapshot[]): LongestStablePortfolio {
  const run = longestConsecutiveRun(history, (s) => s.fingerprint);
  if (!run) return null;
  const start = history[run.startIndex];
  const end = history[run.endIndex];
  return { snapshotCount: run.runLength, fingerprint: run.value, from: start.timestamp, to: end.timestamp };
}

export function buildPersonalBests(milestones: PortfolioMilestones, history: AutomationSnapshot[]): PersonalBests {
  return {
    bestHealth: milestones.highestHealthScore,
    bestConfidence: milestones.highestConfidence,
    lowestRisk: milestones.lowestRisk,
    largestPortfolioValue: milestones.highestPortfolioValue,
    bestDiversification: milestones.bestDiversification,
    longestStablePortfolio: longestStablePortfolio(history),
  };
}
