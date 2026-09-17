import { describe, expect, it } from "vitest";

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
} from "@/lib/smart-collections/evaluate";
import type { IntelligenceAlert } from "@/lib/alerts/intelligence/types";
import type { BriefOpportunity, DailyBrief } from "@/lib/brief/types";
import type { LiveProject } from "@/lib/projects/types";
import type { WhaleEvent } from "@/lib/whale/types";

function makeLiveProject(overrides: Partial<LiveProject> = {}): LiveProject {
  return {
    id: "test-project",
    slug: "test-project",
    source: "registry",
    identity: {
      name: "Test Project",
      shortDescription: "A test project.",
      description: "A test project.",
      logoUrl: null,
      logoUrlFallbacks: [],
      websiteUrl: "https://test-project.example",
      socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null },
    },
    category: "dex",
    subcategories: [],
    chains: ["base"],
    status: "live",
    discoveryStatus: null,
    verification: { status: "verified", level: null, verifiedAt: null },
    confidence: { score: 50, level: "medium", source: "intelligence" },
    providerAttribution: null,
    discoveryEvidence: null,
    searchIdentifiers: { symbol: null, aliases: [], coingeckoId: null, defillamaSlug: null, github: null, contractAddresses: [] },
    market: { available: false, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: null },
    community: { verificationStatus: "verified", socialLinkCount: 0, socialLinkTotal: 10, governanceConfigured: false },
    engineering: { available: false, stars: null, forks: null, commitsLast7d: null, commitTrendPct: null, hasRecentActivity: false },
    governance: { configured: false, activeProposalCount: null, totalProposalCount: null },
    contracts: { count: 0, verifiedCount: 0 },
    health: { score: 50, label: "unknown", factors: [] },
    aiRating: "C",
    riskLevel: "moderate",
    riskContributors: [],
    lastUpdated: "2026-01-01T00:00:00.000Z",
    registryUpdatedAt: null,
    discoveryMetadata: null,
    ...overrides,
  } as LiveProject;
}

function makeWhaleEvent(overrides: Partial<WhaleEvent> = {}): WhaleEvent {
  return {
    id: "whale:1",
    projectId: "test-project",
    tokenSymbol: "TEST",
    usdValue: 500_000,
    txHash: "0xabc",
    fromAddress: "0xfrom",
    toAddress: "0xto",
    toIsContract: false,
    toContractName: null,
    timestamp: "2026-09-01T00:00:00.000Z",
    sourceProvider: "blockscout",
    confidence: 80,
    detectionMethod: "large-transfer",
    classification: "large-on-chain-transfer",
    ...overrides,
  };
}

function makeAlert(overrides: Partial<IntelligenceAlert> = {}): IntelligenceAlert {
  return {
    id: "intelligence:test-project",
    projectId: "test-project",
    projectName: "Test Project",
    severity: "info",
    confidence: 70,
    headline: "Test headline",
    summary: "Test summary",
    signals: [],
    categories: [],
    score: 50,
    relatedAlertIds: [],
    timestamp: "2026-09-01T00:00:00.000Z",
    reasoning: "Test reasoning",
    nextStep: "Test next step",
    narrative: "growth",
    ...overrides,
  };
}

function makeOpportunity(overrides: Partial<BriefOpportunity> = {}): BriefOpportunity {
  return { projectId: "test-project", projectName: "Test Project", headline: "Strong TVL growth", reason: "TVL up 18%.", score: 82, confidence: 74, narrative: "growth", timestamp: "2026-09-07T20:00:00.000Z", ...overrides };
}

const EMPTY_NARRATIVE_COUNTS = { growth: 0, decline: 0, "governance-active": 0, "security-risk": 0, accumulation: 0, "development-active": 0, stable: 0 } as const;

function makeDailyBrief(overrides: Partial<DailyBrief> = {}): DailyBrief {
  return {
    id: "brief:1",
    generatedAt: "2026-09-08T00:00:00.000Z",
    headline: "Market steady",
    summary: "A quiet day.",
    marketSummary: [],
    topOpportunities: [],
    topRisks: [],
    securityHighlights: [],
    governanceHighlights: [],
    developmentHighlights: [],
    tvlHighlights: [],
    emergingNarratives: [],
    averageConfidence: 0,
    highestScore: 0,
    projectCount: 0,
    narrativeCounts: { ...EMPTY_NARRATIVE_COUNTS },
    recommendations: [],
    ...overrides,
  };
}

describe("evaluateAiPicks", () => {
  it("matches A+ and A rated projects", () => {
    const aPlus = makeLiveProject({ id: "a", aiRating: "A+" });
    const a = makeLiveProject({ id: "b", aiRating: "A" });
    const bPlus = makeLiveProject({ id: "c", aiRating: "B+" });
    const matches = evaluateAiPicks([aPlus, a, bPlus]);
    expect(matches.map((m) => m.projectId).sort()).toEqual(["a", "b"]);
  });

  it("excludes a project with null aiRating (discovery-only), never fabricates a grade", () => {
    const discoveryOnly = makeLiveProject({ id: "d", aiRating: null });
    expect(evaluateAiPicks([discoveryOnly])).toEqual([]);
  });

  it("cites the real AI Grade, confidence, and health as evidence", () => {
    const project = makeLiveProject({ id: "a", aiRating: "A+", confidence: { score: 92, level: "high", source: "intelligence" }, health: { score: 88, label: "excellent", factors: [] } });
    const [match] = evaluateAiPicks([project]);
    expect(match.evidence).toContainEqual({ label: "AI Grade", value: "A+" });
    expect(match.evidence).toContainEqual({ label: "Confidence", value: "92/100 (high)" });
    expect(match.evidence).toContainEqual({ label: "Health", value: "88/100 (excellent)" });
  });

  it("empty registry: no matches, never fabricated", () => {
    expect(evaluateAiPicks([])).toEqual([]);
  });
});

describe("evaluateWhaleAccumulation", () => {
  it("matches a project with a real detected whale event", () => {
    const project = makeLiveProject({ id: "a" });
    const event = makeWhaleEvent({ projectId: "a" });
    const matches = evaluateWhaleAccumulation([project], [event]);
    expect(matches).toHaveLength(1);
    expect(matches[0].evidence).toContainEqual({ label: "Detected Transfers", value: "1" });
  });

  it("excludes a project with zero real whale events", () => {
    const project = makeLiveProject({ id: "a" });
    expect(evaluateWhaleAccumulation([project], [])).toEqual([]);
  });

  it("orders by total real USD value, highest first, stable tiebreak by id", () => {
    const small = makeLiveProject({ id: "small" });
    const large = makeLiveProject({ id: "large" });
    const events = [makeWhaleEvent({ projectId: "small", usdValue: 100_000 }), makeWhaleEvent({ projectId: "large", usdValue: 900_000 })];
    const matches = evaluateWhaleAccumulation([small, large], events);
    expect(matches.map((m) => m.projectId)).toEqual(["large", "small"]);
  });

  it("aggregates multiple real events for the same project", () => {
    const project = makeLiveProject({ id: "a" });
    const events = [makeWhaleEvent({ id: "w1", projectId: "a", usdValue: 100 }), makeWhaleEvent({ id: "w2", projectId: "a", usdValue: 200 })];
    const [match] = evaluateWhaleAccumulation([project], events);
    expect(match.evidence).toContainEqual({ label: "Detected Transfers", value: "2" });
    expect(match.evidence).toContainEqual({ label: "Total Value", value: "$300" });
  });
});

describe("evaluateDeveloperMomentum", () => {
  it("matches a project with real stars above the minimum threshold", () => {
    const project = makeLiveProject({ id: "a", engineering: { available: true, stars: 500, forks: 50, commitsLast7d: null, commitTrendPct: null, hasRecentActivity: false } });
    expect(evaluateDeveloperMomentum([project])).toHaveLength(1);
  });

  it("excludes a project with no linked repository, never fabricates stars", () => {
    const project = makeLiveProject({ id: "a", engineering: { available: false, stars: null, forks: null, commitsLast7d: null, commitTrendPct: null, hasRecentActivity: false } });
    expect(evaluateDeveloperMomentum([project])).toEqual([]);
  });

  it("never relies on commitsLast7d/hasRecentActivity — always null/false at catalog scale per the documented Fast Growing precedent", () => {
    const project = makeLiveProject({ id: "a", engineering: { available: true, stars: 500, forks: 10, commitsLast7d: null, commitTrendPct: null, hasRecentActivity: false } });
    expect(evaluateDeveloperMomentum([project])).toHaveLength(1);
  });

  it("orders by real stars descending", () => {
    const low = makeLiveProject({ id: "low", engineering: { available: true, stars: 20, forks: 0, commitsLast7d: null, commitTrendPct: null, hasRecentActivity: false } });
    const high = makeLiveProject({ id: "high", engineering: { available: true, stars: 2000, forks: 0, commitsLast7d: null, commitTrendPct: null, hasRecentActivity: false } });
    const matches = evaluateDeveloperMomentum([low, high]);
    expect(matches.map((m) => m.projectId)).toEqual(["high", "low"]);
  });
});

describe("evaluateHighConviction", () => {
  it("matches high confidence + health 70+ + low/moderate risk", () => {
    const project = makeLiveProject({ id: "a", confidence: { score: 90, level: "high", source: "intelligence" }, health: { score: 75, label: "good", factors: [] }, riskLevel: "low" });
    expect(evaluateHighConviction([project])).toHaveLength(1);
  });

  it("excludes a project with high risk even if confidence/health qualify", () => {
    const project = makeLiveProject({ id: "a", confidence: { score: 90, level: "high", source: "intelligence" }, health: { score: 75, label: "good", factors: [] }, riskLevel: "high" });
    expect(evaluateHighConviction([project])).toEqual([]);
  });

  it("excludes a project with health below 70", () => {
    const project = makeLiveProject({ id: "a", confidence: { score: 90, level: "high", source: "intelligence" }, health: { score: 60, label: "fair", factors: [] }, riskLevel: "low" });
    expect(evaluateHighConviction([project])).toEqual([]);
  });

  it("excludes a project with medium confidence", () => {
    const project = makeLiveProject({ id: "a", confidence: { score: 90, level: "medium", source: "intelligence" }, health: { score: 75, label: "good", factors: [] }, riskLevel: "low" });
    expect(evaluateHighConviction([project])).toEqual([]);
  });

  it("excludes a project with null health, never a fabricated blend", () => {
    const project = makeLiveProject({ id: "a", confidence: { score: 90, level: "high", source: "intelligence" }, health: null, riskLevel: "low" });
    expect(evaluateHighConviction([project])).toEqual([]);
  });
});

describe("evaluateLowRisk", () => {
  it("matches only riskLevel 'low'", () => {
    const low = makeLiveProject({ id: "low", riskLevel: "low" });
    const moderate = makeLiveProject({ id: "moderate", riskLevel: "moderate" });
    expect(evaluateLowRisk([low, moderate]).map((m) => m.projectId)).toEqual(["low"]);
  });

  it("cites real riskContributors as evidence", () => {
    const project = makeLiveProject({ id: "a", riskLevel: "low", riskContributors: [{ label: "Liquidity Risk", detail: "Deep, stable liquidity.", severity: "low" }] });
    const [match] = evaluateLowRisk([project]);
    expect(match.evidence).toContainEqual({ label: "Liquidity Risk", value: "Deep, stable liquidity." });
  });
});

describe("evaluateGovernanceActive", () => {
  it("matches a configured project with a real active proposal", () => {
    const project = makeLiveProject({ id: "a", governance: { configured: true, activeProposalCount: 2, totalProposalCount: 10 } });
    expect(evaluateGovernanceActive([project])).toHaveLength(1);
  });

  it("excludes a configured project with zero active proposals", () => {
    const project = makeLiveProject({ id: "a", governance: { configured: true, activeProposalCount: 0, totalProposalCount: 10 } });
    expect(evaluateGovernanceActive([project])).toEqual([]);
  });

  it("excludes an unconfigured project even with a non-null count", () => {
    const project = makeLiveProject({ id: "a", governance: { configured: false, activeProposalCount: 1, totalProposalCount: 1 } });
    expect(evaluateGovernanceActive([project])).toEqual([]);
  });

  it("orders by real active proposal count descending", () => {
    const fewer = makeLiveProject({ id: "fewer", governance: { configured: true, activeProposalCount: 1, totalProposalCount: 5 } });
    const more = makeLiveProject({ id: "more", governance: { configured: true, activeProposalCount: 5, totalProposalCount: 5 } });
    expect(evaluateGovernanceActive([fewer, more]).map((m) => m.projectId)).toEqual(["more", "fewer"]);
  });
});

describe("evaluateUndervalued", () => {
  it("matches a quality-tier project below the real peer median market cap", () => {
    const cheap = makeLiveProject({ id: "cheap", aiRating: "A", confidence: { score: 80, level: "high", source: "intelligence" }, market: { ...makeLiveProject().market, marketCapUsd: 1_000_000 } });
    const expensive = makeLiveProject({ id: "expensive", aiRating: "A", confidence: { score: 80, level: "high", source: "intelligence" }, market: { ...makeLiveProject().market, marketCapUsd: 100_000_000 } });
    const matches = evaluateUndervalued([cheap, expensive]);
    expect(matches.map((m) => m.projectId)).toEqual(["cheap"]);
  });

  it("excludes a project below aiRating B+", () => {
    const project = makeLiveProject({ id: "a", aiRating: "C", confidence: { score: 80, level: "high", source: "intelligence" }, market: { ...makeLiveProject().market, marketCapUsd: 1 } });
    expect(evaluateUndervalued([project])).toEqual([]);
  });

  it("excludes a low-confidence project even with a strong AI Grade", () => {
    const project = makeLiveProject({ id: "a", aiRating: "A+", confidence: { score: 30, level: "low", source: "intelligence" }, market: { ...makeLiveProject().market, marketCapUsd: 1 } });
    expect(evaluateUndervalued([project])).toEqual([]);
  });

  it("no quality-tier projects with a real market cap: never fabricates a median", () => {
    expect(evaluateUndervalued([makeLiveProject({ aiRating: "C" })])).toEqual([]);
  });
});

describe("evaluateTrendingNarratives (client-evaluated)", () => {
  it("matches alerts carrying the ecosystem's single most common real narrative", () => {
    const alerts = [makeAlert({ id: "1", projectId: "a", narrative: "growth" }), makeAlert({ id: "2", projectId: "b", narrative: "growth" }), makeAlert({ id: "3", projectId: "c", narrative: "accumulation" })];
    const matches = evaluateTrendingNarratives(alerts);
    expect(matches.map((m) => m.projectId).sort()).toEqual(["a", "b"]);
  });

  it("excludes decline/security-risk narratives — never framed as 'trending' discovery", () => {
    const alerts = [makeAlert({ id: "1", projectId: "a", narrative: "decline" }), makeAlert({ id: "2", projectId: "b", narrative: "security-risk" })];
    expect(evaluateTrendingNarratives(alerts)).toEqual([]);
  });

  it("no real alerts: an honest empty result", () => {
    expect(evaluateTrendingNarratives([])).toEqual([]);
  });
});

describe("evaluateStableProjects (client-evaluated)", () => {
  it("matches real alerts with narrative 'stable'", () => {
    const alerts = [makeAlert({ id: "1", projectId: "a", narrative: "stable" }), makeAlert({ id: "2", projectId: "b", narrative: "growth" })];
    expect(evaluateStableProjects(alerts).map((m) => m.projectId)).toEqual(["a"]);
  });
});

describe("evaluateYieldOpportunities (client-evaluated)", () => {
  it("reuses the real Daily Brief topOpportunities verbatim", () => {
    const brief = makeDailyBrief({ topOpportunities: [makeOpportunity({ projectId: "a" })] });
    const matches = evaluateYieldOpportunities(brief);
    expect(matches).toHaveLength(1);
    expect(matches[0].projectId).toBe("a");
  });

  it("null Daily Brief (not yet hydrated): an honest empty result, never fabricated", () => {
    expect(evaluateYieldOpportunities(null)).toEqual([]);
  });
});

describe("cross-cutting: entering/leaving, multiple matches, no duplicates, stable ordering", () => {
  it("a project entering the collection (crossing the real threshold) is matched", () => {
    const before = makeLiveProject({ id: "a", riskLevel: "moderate" });
    expect(evaluateLowRisk([before])).toEqual([]);
    const after = makeLiveProject({ id: "a", riskLevel: "low" });
    expect(evaluateLowRisk([after])).toHaveLength(1);
  });

  it("a project leaving the collection (no longer meeting criteria) is excluded", () => {
    const inCollection = makeLiveProject({ id: "a", aiRating: "A+" });
    expect(evaluateAiPicks([inCollection])).toHaveLength(1);
    const leftCollection = makeLiveProject({ id: "a", aiRating: "B" });
    expect(evaluateAiPicks([leftCollection])).toEqual([]);
  });

  it("multiple simultaneous matches are all returned, none dropped", () => {
    const projects = ["a", "b", "c"].map((id) => makeLiveProject({ id, aiRating: "A+" }));
    expect(evaluateAiPicks(projects)).toHaveLength(3);
  });

  it("never produces a duplicate project id within one collection's results", () => {
    const project = makeLiveProject({ id: "a", aiRating: "A+" });
    const matches = evaluateAiPicks([project]);
    const ids = matches.map((m) => m.projectId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("stable, deterministic ordering: re-evaluating the identical input produces byte-identical output", () => {
    const projects = [makeLiveProject({ id: "b", aiRating: "A" }), makeLiveProject({ id: "a", aiRating: "A" })];
    const first = evaluateAiPicks(projects);
    const second = evaluateAiPicks(projects);
    expect(first).toEqual(second);
  });
});
