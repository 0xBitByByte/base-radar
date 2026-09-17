import { describe, expect, it, vi } from "vitest";

import type { AIIntelligenceBrief } from "@/lib/ai-intelligence/types";
import type { DailyIntelligenceBriefing } from "@/lib/ai-intelligence/generator/briefing";
import type { BriefHighlight, BriefOpportunity, DailyBrief } from "@/lib/brief/types";

vi.mock("@/data/projects/helpers", () => ({
  getProject: (id: string) => (id === "aerodrome" ? { id: "aerodrome", name: "Aerodrome Finance", slug: "aerodrome-finance" } : undefined),
}));

const { buildWorkspaceView } = await import("@/lib/ai-workspace/compose");

function makeBrief(overrides: Partial<AIIntelligenceBrief> = {}): AIIntelligenceBrief {
  return {
    id: "brief:1",
    generatedAt: "2026-09-08T00:00:00.000Z",
    headline: "Aerodrome TVL rose 18% over 24h",
    summary: "A real, evidence-backed summary of the change.",
    confidence: { level: "high", rationale: "Derived from 3 supporting signals across 2 distinct sources.", evidenceCount: 3 },
    impact: "moderate",
    category: "defi",
    affectedProjects: ["aerodrome"],
    supportingSignals: [
      { id: "sig:1", kind: "liquidity-movement", description: "TVL rose 18% over 24h per DefiLlama", source: "defillama", occurredAt: "2026-09-07T20:00:00.000Z" },
      { id: "sig:2", kind: "provider-update", description: "Volume spiked 40% per DexScreener", source: "dexscreener", occurredAt: "2026-09-07T21:00:00.000Z", referenceUrl: "https://dexscreener.com/base/aerodrome" },
    ],
    supportingSources: [{ source: "defillama" }, { source: "dexscreener", label: "DexScreener — Aerodrome pools" }],
    tags: ["liquidity", "base"],
    ...overrides,
  };
}

function makeBriefing(briefs: AIIntelligenceBrief[], generatedAt = "2026-09-08T00:00:00.000Z"): DailyIntelligenceBriefing {
  return {
    generatedAt,
    briefingDate: generatedAt.slice(0, 10),
    version: 1,
    briefs,
    statistics: { projectsAnalyzed: briefs.length, providersScanned: 0, alertsProcessed: 0, discoveriesReviewed: 0 },
  };
}

const EMPTY_NARRATIVE_COUNTS = { growth: 0, decline: 0, "governance-active": 0, "security-risk": 0, accumulation: 0, "development-active": 0, stable: 0 } as const;

function makeDailyBrief(overrides: Partial<DailyBrief> = {}): DailyBrief {
  return {
    id: "brief:2026-09-08T00:00:00.000Z",
    generatedAt: "2026-09-08T00:00:00.000Z",
    headline: "Market steady",
    summary: "A quiet day across the ecosystem.",
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

function makeOpportunity(overrides: Partial<BriefOpportunity> = {}): BriefOpportunity {
  return { projectId: "aerodrome", projectName: "Aerodrome Finance", headline: "Strong TVL growth", reason: "TVL up 18% with real trading volume.", score: 82, confidence: 74, narrative: "growth", timestamp: "2026-09-07T20:00:00.000Z", ...overrides };
}

function makeHighlight(overrides: Partial<BriefHighlight> = {}): BriefHighlight {
  return { projectId: "aerodrome", projectName: "Aerodrome Finance", headline: "Governance vote passed", detail: "A real proposal reached quorum.", severity: "warning", ...overrides };
}

describe("buildWorkspaceView — AI Intelligence section: populated intelligence with evidence and source attribution", () => {
  it("every real supportingSignal/supportingSource is reflected verbatim, never dropped or invented", () => {
    const view = buildWorkspaceView(makeBriefing([makeBrief()]), null);
    const section = view.sections.find((s) => s.id === "ai-intelligence")!;
    expect(section.claims).toHaveLength(1);

    const claim = section.claims[0];
    expect(claim.headline).toBe("Aerodrome TVL rose 18% over 24h");
    expect(claim.evidence).toHaveLength(2);
    expect(claim.evidence[0]).toEqual({ id: "sig:1", label: "Liquidity Signal", detail: "TVL rose 18% over 24h per DefiLlama", occurredAt: "2026-09-07T20:00:00.000Z", sourceLabel: "DefiLlama", url: undefined });
    expect(claim.sources).toEqual([{ label: "DefiLlama", url: undefined }, { label: "DexScreener — Aerodrome pools", url: undefined }]);
    expect(claim.projects).toEqual([{ id: "aerodrome", name: "Aerodrome Finance", slug: "aerodrome-finance" }]);
    expect(claim.limitation).toBeNull();
  });

  it("confidence is the real IntelligenceConfidence value verbatim — never re-derived, never a fabricated score", () => {
    const view = buildWorkspaceView(makeBriefing([makeBrief()]), null);
    const claim = view.sections[0].claims[0];
    expect(claim.confidence).toEqual({ kind: "level", level: "high", rationale: "Derived from 3 supporting signals across 2 distinct sources.", evidenceCount: 3 });
  });

  it("an unresolvable project id still renders honestly (slug: null), never a broken link or fabricated name", () => {
    const view = buildWorkspaceView(makeBriefing([makeBrief({ affectedProjects: ["unknown-project"] })]), null);
    expect(view.sections[0].claims[0].projects).toEqual([{ id: "unknown-project", name: "unknown-project", slug: null }]);
  });
});

describe("buildWorkspaceView — honest empty states, never fabricated content", () => {
  it("briefing is null: an honest, specific empty reason, zero claims", () => {
    const view = buildWorkspaceView(null, null);
    const section = view.sections.find((s) => s.id === "ai-intelligence")!;
    expect(section.claims).toEqual([]);
    expect(section.emptyReason).toContain("No AI Intelligence briefs yet");
  });

  it("briefing has genuinely zero briefs (not null, just empty): still an honest empty section, not a crash", () => {
    const view = buildWorkspaceView(makeBriefing([]), null);
    expect(view.sections.find((s) => s.id === "ai-intelligence")!.claims).toEqual([]);
  });

  it("dailyBrief is null: an honest, specific empty reason for that section", () => {
    const view = buildWorkspaceView(null, null);
    const section = view.sections.find((s) => s.id === "daily-brief")!;
    expect(section.claims).toEqual([]);
    expect(section.emptyReason).toContain("No Daily Brief findings yet");
  });
});

describe("buildWorkspaceView — freshness is always a real timestamp, never fabricated staleness", () => {
  it("an AI Intelligence claim's generatedAt is the brief's own real timestamp", () => {
    const view = buildWorkspaceView(makeBriefing([makeBrief({ generatedAt: "2026-09-01T12:00:00.000Z" })]), null);
    expect(view.sections[0].claims[0].generatedAt).toBe("2026-09-01T12:00:00.000Z");
  });

  it("a Daily Brief opportunity claim's generatedAt is the opportunity's own real event timestamp, not the brief-wide stamp", () => {
    const dailyBrief = makeDailyBrief({ generatedAt: "2026-09-08T00:00:00.000Z", topOpportunities: [makeOpportunity({ timestamp: "2026-09-06T09:00:00.000Z" })] });
    const view = buildWorkspaceView(null, dailyBrief);
    const claim = view.sections.find((s) => s.id === "daily-brief")!.claims[0];
    expect(claim.generatedAt).toBe("2026-09-06T09:00:00.000Z");
  });

  it("the workspace's own top-level generatedAt is the real briefing timestamp, never Date.now()", () => {
    const view = buildWorkspaceView(makeBriefing([makeBrief()], "2026-01-01T00:00:00.000Z"), null);
    expect(view.generatedAt).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("buildWorkspaceView — Daily Brief section: correct confidence display, never a fabricated fourth type", () => {
  it("an Opportunity's real 0-100 confidence is passed through as a 'score', unchanged", () => {
    const dailyBrief = makeDailyBrief({ topOpportunities: [makeOpportunity({ confidence: 63 })] });
    const view = buildWorkspaceView(null, dailyBrief);
    const claim = view.sections.find((s) => s.id === "daily-brief")!.claims[0];
    expect(claim.confidence).toEqual({ kind: "score", value: 63 });
  });

  it("a Highlight has no real confidence field — honestly null, never a value invented from severity", () => {
    const dailyBrief = makeDailyBrief({ securityHighlights: [makeHighlight({ severity: "critical" })] });
    const view = buildWorkspaceView(null, dailyBrief);
    const claim = view.sections.find((s) => s.id === "daily-brief")!.claims[0];
    expect(claim.confidence).toBeNull();
  });

  it("every Daily Brief claim carries an honest, real limitation note — never silently implies the same evidence depth as an AI Intelligence brief", () => {
    const dailyBrief = makeDailyBrief({ topOpportunities: [makeOpportunity()] });
    const view = buildWorkspaceView(null, dailyBrief);
    expect(view.sections.find((s) => s.id === "daily-brief")!.claims[0].limitation).toContain("Alert Engine");
  });
});

describe("buildWorkspaceView — Daily Brief section: Risk claims (PR-090.02 correction — closes the topRisks composition gap)", () => {
  it("a decline-narrative risk is composed with an honest 'Risk' category, reusing its real score/confidence/timestamp/project/headline/reason verbatim", () => {
    const dailyBrief = makeDailyBrief({
      generatedAt: "2026-09-08T00:00:00.000Z",
      topRisks: [makeOpportunity({ headline: "Declining confidence on Aerodrome", reason: "Confidence fell 20% over 24h.", score: 55, confidence: 40, narrative: "decline", timestamp: "2026-09-07T18:00:00.000Z" })],
    });
    const view = buildWorkspaceView(null, dailyBrief);
    const claim = view.sections.find((s) => s.id === "daily-brief")!.claims[0];
    expect(claim.category).toBe("Risk");
    expect(claim.headline).toBe("Declining confidence on Aerodrome");
    expect(claim.summary).toBe("Confidence fell 20% over 24h.");
    expect(claim.confidence).toEqual({ kind: "score", value: 40 });
    expect(claim.generatedAt).toBe("2026-09-07T18:00:00.000Z");
    expect(claim.projects).toEqual([{ id: "aerodrome", name: "Aerodrome Finance", slug: "aerodrome-finance" }]);
    expect(claim.limitation).toContain("Alert Engine");
    expect(claim.evidence).toEqual([]);
  });

  it("a security-risk-narrative risk is composed the same honest way — Risk covers both real risk narratives, never just one", () => {
    const dailyBrief = makeDailyBrief({ topRisks: [makeOpportunity({ headline: "Contract concern on Aerodrome", narrative: "security-risk" })] });
    const view = buildWorkspaceView(null, dailyBrief);
    expect(view.sections.find((s) => s.id === "daily-brief")!.claims[0].category).toBe("Risk");
  });

  it("no Daily Brief risks recorded: Risk contributes zero claims, never a fabricated placeholder", () => {
    const dailyBrief = makeDailyBrief({ topOpportunities: [makeOpportunity()] });
    const view = buildWorkspaceView(null, dailyBrief);
    const categories = view.sections.find((s) => s.id === "daily-brief")!.claims.map((c) => c.category);
    expect(categories).not.toContain("Risk");
  });
});

describe("buildWorkspaceView — no duplicated/recomputed data path", () => {
  it("is a pure reshape: identical input objects produce a deep-equal output every call, never a re-derived value", () => {
    const briefing = makeBriefing([makeBrief()]);
    const dailyBrief = makeDailyBrief({ topOpportunities: [makeOpportunity()] });
    const first = buildWorkspaceView(briefing, dailyBrief);
    const second = buildWorkspaceView(briefing, dailyBrief);
    expect(first).toEqual(second);
  });

  it("all six Daily Brief buckets are represented, in the engine's own already-computed order — never re-sorted across categories", () => {
    const dailyBrief = makeDailyBrief({
      topOpportunities: [makeOpportunity({ headline: "Opportunity item" })],
      topRisks: [makeOpportunity({ headline: "Risk item", narrative: "decline" })],
      securityHighlights: [makeHighlight({ headline: "Security item" })],
      governanceHighlights: [makeHighlight({ headline: "Governance item" })],
      developmentHighlights: [makeHighlight({ headline: "Development item" })],
      tvlHighlights: [makeHighlight({ headline: "TVL item" })],
    });
    const view = buildWorkspaceView(null, dailyBrief);
    const claims = view.sections.find((s) => s.id === "daily-brief")!.claims;
    expect(claims.map((c) => c.category)).toEqual(["Opportunity", "Risk", "Security", "Governance", "Development", "TVL"]);
  });
});
