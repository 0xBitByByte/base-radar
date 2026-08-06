/**
 * The Intelligence Engine's provider abstraction (PR10). Every "generated
 * intelligence" surface in the product — the Base Radar Brief, Explorer's
 * per-project summary, narrative momentum, and risk analysis — goes through
 * one `IntelligenceProvider` interface instead of being hand-written inline
 * in a component or aggregation function.
 *
 * PR10 ships exactly one implementation, `RuleBasedIntelligenceProvider`
 * (`rule-based-provider.ts`) — deterministic logic over real, already-fetched
 * provider data, no LLM, no API key, no cost. `index.ts`'s `getIntelligenceProvider()`
 * is the single seam a future `OpenAIIntelligenceProvider`/
 * `ClaudeIntelligenceProvider` plugs into later: same interface, same
 * inputs, different generation strategy. Callers (the aggregation layer,
 * the Project Intelligence Engine, the landing page) never know or care
 * which one is active.
 */

import type { IntelligenceBriefPoint, Kpi, MarketOverview, Signal } from "@/lib/data/types";

// ---------------------------------------------------------------------------
// generateBrief
// ---------------------------------------------------------------------------

export type BriefWhaleInput = {
  tokenSymbol: string;
  usdValue: number;
  classification: "large-on-chain-transfer" | "whale-alert";
  detail: string | null;
};

export type BriefGovernanceInput = {
  projectName: string;
  title: string;
  status: "active" | "passed" | "failed" | "pending";
};

export type BriefDeveloperActivityInput = {
  commitsLast7d: number | null;
  repoLabel: string;
};

export type BriefInput = {
  kpis: Kpi[];
  market: MarketOverview;
  narrative: NarrativeSignal | null;
  whaleEvents: BriefWhaleInput[];
  governanceEvents: BriefGovernanceInput[];
  topSignal: Signal | null;
  developerActivity: BriefDeveloperActivityInput | null;
};

export type BriefOutput = {
  points: IntelligenceBriefPoint[];
  generatedAt: string;
};

// ---------------------------------------------------------------------------
// generateProjectSummary
// ---------------------------------------------------------------------------

export type ProjectSummaryInput = {
  name: string;
  healthScore: number;
  healthLabel: string;
  confidenceScore: number;
  confidenceLevel: string;
  verificationStatus: string;
  changePct24h: number | null;
  tvlUsd: number | null;
  tvlChangePct24h: number | null;
  githubStars: number | null;
};

export type ProjectSummaryOutput = {
  summary: string;
};

// ---------------------------------------------------------------------------
// generateNarrative
// ---------------------------------------------------------------------------

export type NarrativeCategorySample = {
  category: string;
  changePct24h: number;
  volumeUsd: number;
};

export type NarrativeInput = {
  samples: NarrativeCategorySample[];
};

export type NarrativeSignal = {
  category: string;
  label: string;
  changePct24h: number;
  /** 0-100 — how strong this narrative's momentum reads relative to the other sampled categories. */
  strength: number;
};

export type NarrativeOutput = {
  signals: NarrativeSignal[];
};

// ---------------------------------------------------------------------------
// generateRiskAnalysis
// ---------------------------------------------------------------------------

export type RiskLevel = "low" | "moderate" | "elevated" | "high";

export type RiskContributorSeverity = "low" | "moderate" | "high" | "unknown";

export type RiskContributor = {
  label: string;
  detail: string;
  severity: RiskContributorSeverity;
};

export type RiskAnalysisInput = {
  healthScore: number;
  confidenceScore: number;
  verificationStatus: string;
  freshness: string;
  hasRecentWhaleActivity: boolean;
  /**
   * Share (0-100) of this project's registered contracts *confirmed*
   * verified. `null` both when the project has no contracts on record AND
   * when it has contracts but none were confirmed — see
   * `hasRegisteredContracts` to tell those two apart. This is deliberately
   * never a confident "0%": the underlying registry-merge match
   * (`matchVerifiedContract`, `lib/intelligence/sources.ts`) only checks
   * whether a contract happens to be Blockscout's single "most-recently-
   * verified contract on Base" — a near-lottery match that misses real,
   * verified contracts constantly (confirmed live: a contract shown
   * "Verified" with real compiler detail elsewhere on the same page still
   * came back unmatched here). A `true`/matched contract is a real, trusted
   * positive; an unmatched one tells us nothing, so it must not be
   * presented as a measured "X% verified."
   */
  verifiedContractPct: number | null;
  /** Whether this project has any registered contracts at all — lets `verifiedContractPct === null` read "no contracts" vs. "contracts exist, verification just isn't confirmable this way" instead of conflating the two. */
  hasRegisteredContracts: boolean;
  /** Real DexScreener-aggregated liquidity in USD. `null` when no trading data is available. */
  liquidityUsd: number | null;
  /** Real 7-day TVL change, derived from DefiLlama's per-protocol history. `null` when unavailable or the project has no TVL. */
  tvlChangePct7d: number | null;
  /** Real weekly commit count from GitHub. `null` when unavailable. */
  githubCommitsLast7d: number | null;
  /**
   * PR-074 REVIEW #10 — real, always-available fallback evidence for
   * "Developer Health" when `githubCommitsLast7d` is `null` (this
   * codebase's fast/batch path never populates it, and GitHub's shared
   * rate limit can additionally block the extended commit-activity call).
   * All three come from the same single `fetchRepo()` response that
   * determines `githubAvailable` — zero extra GitHub calls.
   */
  githubAvailable: boolean;
  githubStars: number | null;
  githubPushedAt: string | null;
  githubLatestReleasePublishedAt: string | null;
  /** Count of currently-active Snapshot proposals. `null` when this project has no governance configured (never fabricated as zero). */
  governanceActiveCount: number | null;
  /** PR-075 — `"on-chain"`/`"forum"`/`"none"` mean `governanceActiveCount === null` is a real, confirmed governance mechanism, not a registry gap. See `data/projects/types.ts`'s `ProjectGovernance.governanceType`. */
  governanceType: "snapshot" | "on-chain" | "forum" | "none" | null;
};

export type RiskAnalysisOutput = {
  level: RiskLevel;
  explanation: string;
  contributors: RiskContributor[];
};

// ---------------------------------------------------------------------------
// The interface itself
// ---------------------------------------------------------------------------

export interface IntelligenceProvider {
  generateBrief(input: BriefInput): Promise<BriefOutput>;
  generateProjectSummary(input: ProjectSummaryInput): Promise<ProjectSummaryOutput>;
  generateNarrative(input: NarrativeInput): Promise<NarrativeOutput>;
  generateRiskAnalysis(input: RiskAnalysisInput): Promise<RiskAnalysisOutput>;
}
