/**
 * V4-ANALYTICS-001A (Phase 5) — Portfolio Milestones: real "best/first/most-
 * recent" facts scanned directly from `AutomationSnapshot[]`, always over
 * the FULL, unfiltered history (an all-time record is inherently not a
 * single-window concept) — never a new score, never a recalculation of
 * anything Portfolio Intelligence already computed.
 */

import type { PortfolioMilestone, PortfolioMilestones } from "@/lib/wallet-analytics/types";
import type { AutomationSnapshot } from "@/lib/wallet-automation/types";

/**
 * V4-HISTORY-005 — exported so `components/wallet/walletReportEngine.ts`
 * can compute the SAME real "highest/lowest value over a set of snapshots"
 * fact for a period-scoped Report statistic, without a second reduce
 * implementation. Still the exact algorithm this file has always used for
 * all-time Milestones — only the CALLER'S input array differs (a
 * period-filtered slice vs. the full history).
 */
export function extremeMilestone(history: AutomationSnapshot[], label: string, read: (snapshot: AutomationSnapshot) => number, mode: "max" | "min"): PortfolioMilestone {
  if (history.length === 0) return null;
  const best = history.reduce((acc, snapshot) => {
    const value = read(snapshot);
    const accValue = read(acc);
    return mode === "max" ? (value > accValue ? snapshot : acc) : value < accValue ? snapshot : acc;
  });
  return { label, value: read(best), date: best.timestamp, snapshot: best };
}

export function buildPortfolioMilestones(history: AutomationSnapshot[]): PortfolioMilestones {
  const first = history[0] ?? null;
  const last = history[history.length - 1] ?? null;

  return {
    highestPortfolioValue: extremeMilestone(history, "Highest Portfolio Value", (s) => s.totalValue, "max"),
    highestHealthScore: extremeMilestone(history, "Highest Health Score", (s) => s.healthScore, "max"),
    highestConfidence: extremeMilestone(history, "Highest Confidence", (s) => s.confidenceScore, "max"),
    lowestRisk: extremeMilestone(history, "Lowest Risk", (s) => s.riskScore, "min"),
    bestDiversification: extremeMilestone(history, "Best Diversification", (s) => s.diversificationScore, "max"),
    largestStablecoinAllocation: extremeMilestone(history, "Largest Stablecoin Allocation", (s) => s.stablecoinExposure, "max"),
    largestEthAllocation: extremeMilestone(history, "Largest ETH Allocation", (s) => s.ethPct, "max"),
    firstWalletConnection: first ? { label: "First Wallet Connection", value: first.overallScore, date: first.timestamp, snapshot: first } : null,
    mostRecentFingerprint: last ? { label: "Most Recent Fingerprint", value: last.fingerprint, date: last.timestamp, snapshot: last } : null,
  };
}
