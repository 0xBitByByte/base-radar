import { describe, expect, it } from "vitest";

import { evaluateClientCollections, evaluateServerCollections } from "@/lib/smart-collections/aggregate";
import type { IntelligenceAlert } from "@/lib/alerts/intelligence/types";
import type { LiveProject } from "@/lib/projects/types";

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

describe("evaluateServerCollections", () => {
  it("returns all 7 server-evaluated collections, always 'ready'", () => {
    const results = evaluateServerCollections([], [], "2026-09-08T00:00:00.000Z");
    expect(results).toHaveLength(7);
    expect(results.every((r) => r.status === "ready")).toBe(true);
    expect(results.every((r) => r.lastEvaluatedAt === "2026-09-08T00:00:00.000Z")).toBe(true);
  });

  it("computes a real averageConfidence from matches that carry one", () => {
    const projects = [makeLiveProject({ id: "a", aiRating: "A+", confidence: { score: 80, level: "high", source: "intelligence" } }), makeLiveProject({ id: "b", aiRating: "A", confidence: { score: 90, level: "high", source: "intelligence" } })];
    const results = evaluateServerCollections(projects, [], "2026-09-08T00:00:00.000Z");
    const aiPicks = results.find((r) => r.id === "ai-picks")!;
    expect(aiPicks.averageConfidence).toBe(85);
  });

  it("averageConfidence is null for an empty collection, never a fabricated 0", () => {
    const results = evaluateServerCollections([], [], "2026-09-08T00:00:00.000Z");
    const aiPicks = results.find((r) => r.id === "ai-picks")!;
    expect(aiPicks.averageConfidence).toBeNull();
  });
});

describe("evaluateClientCollections", () => {
  it("status 'checking': returns all 3 client collections with zero matches, never evaluates", () => {
    const alerts = [makeAlert({ narrative: "stable" })];
    const results = evaluateClientCollections(alerts, null, "checking", "2026-09-08T00:00:00.000Z");
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.status === "checking")).toBe(true);
    expect(results.every((r) => r.matches.length === 0)).toBe(true);
  });

  it("status 'unavailable': returns all 3 client collections with zero matches, never a fabricated result", () => {
    const alerts = [makeAlert({ narrative: "stable" })];
    const results = evaluateClientCollections(alerts, null, "unavailable", "2026-09-08T00:00:00.000Z");
    expect(results.every((r) => r.status === "unavailable")).toBe(true);
    expect(results.every((r) => r.matches.length === 0)).toBe(true);
  });

  it("status 'ready': evaluates real alerts/daily brief data", () => {
    const alerts = [makeAlert({ projectId: "a", narrative: "stable" })];
    const results = evaluateClientCollections(alerts, null, "ready", "2026-09-08T00:00:00.000Z");
    const stable = results.find((r) => r.id === "stable-projects")!;
    expect(stable.status).toBe("ready");
    expect(stable.matches).toHaveLength(1);
  });
});
