import { describe, expect, it } from "vitest";

import {
  buildDailyBriefReport,
  buildEcosystemReport,
  buildMarketOutlookReport,
  buildMonthlyReport,
  buildOpportunityReport,
  buildUnavailableReport,
  buildWeeklyReport,
  REPORT_GENERATION_NOTICE,
} from "@/lib/executive-reports/compose";
import type { ExecutiveReportInput } from "@/lib/executive-reports/types";
import type { DailyBrief } from "@/lib/brief/types";
import type { SmartCollectionMatch, SmartCollectionResult } from "@/lib/smart-collections/types";
import type { WorkspaceClaim, WorkspaceSection, WorkspaceView } from "@/lib/ai-workspace/types";

function makeClaim(overrides: Partial<WorkspaceClaim> = {}): WorkspaceClaim {
  return {
    id: "claim:1",
    origin: "ai-intelligence",
    category: "security",
    headline: "Headline",
    summary: "Summary",
    confidence: { kind: "level", level: "high", rationale: "rationale", evidenceCount: 1 },
    evidence: [],
    sources: [{ label: "DefiLlama" }],
    projects: [{ id: "aerodrome", name: "Aerodrome Finance", slug: "aerodrome-finance" }],
    generatedAt: "2026-09-01T00:00:00.000Z",
    limitation: null,
    ...overrides,
  };
}

function makeSection(id: "ai-intelligence" | "daily-brief", claims: WorkspaceClaim[]): WorkspaceSection {
  return { id, title: id, description: "", claims, emptyReason: `No ${id} findings yet.` };
}

function makeWorkspaceView(aiClaims: WorkspaceClaim[] = [], briefClaims: WorkspaceClaim[] = []): WorkspaceView {
  return { sections: [makeSection("ai-intelligence", aiClaims), makeSection("daily-brief", briefClaims)], generatedAt: "2026-09-01T00:00:00.000Z" };
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
    averageConfidence: 62,
    highestScore: 88,
    projectCount: 40,
    narrativeCounts: { ...EMPTY_NARRATIVE_COUNTS },
    recommendations: [],
    ...overrides,
  };
}

function makeMatch(overrides: Partial<SmartCollectionMatch> = {}): SmartCollectionMatch {
  return { projectId: "a", projectName: "A", projectSlug: "a", liveProject: null, reason: "A real reason.", evidence: [], ...overrides };
}

function makeCollectionResult(id: string, matches: SmartCollectionMatch[] = []): SmartCollectionResult {
  return { id: id as SmartCollectionResult["id"], name: id, description: "desc", status: "ready", matches, lastEvaluatedAt: "2026-09-08T00:00:00.000Z", averageConfidence: null };
}

function makeInput(overrides: Partial<ExecutiveReportInput> = {}): ExecutiveReportInput {
  return { workspaceView: makeWorkspaceView(), dailyBrief: null, smartCollections: [], ...overrides };
}

const NOW = "2026-09-08T12:00:00.000Z";

describe("shared report model — buildUnavailableReport", () => {
  it("'checking': every report type reports zero sections, never a fabricated result", () => {
    const report = buildUnavailableReport("daily-brief", "checking", NOW);
    expect(report.status).toBe("checking");
    expect(report.sections).toEqual([]);
    expect(report.averageConfidence).toBeNull();
  });

  it("'unavailable': same honest empty shape", () => {
    const report = buildUnavailableReport("weekly", "unavailable", NOW);
    expect(report.status).toBe("unavailable");
    expect(report.sections).toEqual([]);
  });

  it("always carries the generation-notice limitation, regardless of status", () => {
    const report = buildUnavailableReport("monthly", "checking", NOW);
    expect(report.limitations).toContainEqual(REPORT_GENERATION_NOTICE);
  });
});

describe("buildDailyBriefReport — integrates the existing Daily Brief/AI Workspace claims, never a second engine", () => {
  it("groups the real WorkspaceView claims into Key Findings / Risks / Opportunities", () => {
    const risk = makeClaim({ id: "r1", category: "security" });
    const opportunity = makeClaim({ id: "o1", origin: "daily-brief", category: "Opportunity" });
    const input = makeInput({ workspaceView: makeWorkspaceView([risk], [opportunity]) });
    const report = buildDailyBriefReport(input, NOW);

    const risks = report.sections.find((s) => s.id === "risks")!;
    const opportunities = report.sections.find((s) => s.id === "opportunities")!;
    expect(risks.claims).toEqual([risk]);
    expect(opportunities.claims).toEqual([opportunity]);
  });

  it("cites the exact same claim objects — never re-derived or cloned", () => {
    const claim = makeClaim({ id: "a" });
    const input = makeInput({ workspaceView: makeWorkspaceView([claim], []) });
    const report = buildDailyBriefReport(input, NOW);
    const keyFindings = report.sections.find((s) => s.id === "key-findings")!;
    expect(keyFindings.claims[0]).toBe(claim);
  });

  it("empty WorkspaceView: every section honestly empty, never fabricated", () => {
    const report = buildDailyBriefReport(makeInput(), NOW);
    expect(report.sections.every((s) => s.claims.length === 0 && s.collectionMatches.length === 0)).toBe(true);
    expect(report.executiveSummary).toContain("no real Daily Brief or AI Intelligence findings");
  });

  it("status is always 'ready' — the caller (useExecutiveReports) is responsible for the stale-data gate before calling this", () => {
    expect(buildDailyBriefReport(makeInput(), NOW).status).toBe("ready");
  });
});

describe("buildWeeklyReport / buildMonthlyReport — honest current-intelligence snapshot, never a fabricated historical comparison", () => {
  it("both explicitly disclose the no-history limitation", () => {
    const weekly = buildWeeklyReport(makeInput(), NOW);
    const monthly = buildMonthlyReport(makeInput(), NOW);
    expect(weekly.limitations.some((l) => l.label === "No historical intelligence persistence yet")).toBe(true);
    expect(monthly.limitations.some((l) => l.label === "No historical intelligence persistence yet")).toBe(true);
  });

  it("the 'gaining or losing intelligence quality' section is honestly empty with a real, specific reason — never invented history", () => {
    const claim = makeClaim({ id: "a" });
    const input = makeInput({ workspaceView: makeWorkspaceView([claim], []) });
    const weekly = buildWeeklyReport(input, NOW);
    const qualityChanges = weekly.sections.find((s) => s.id === "quality-changes")!;
    expect(qualityChanges.claims).toEqual([]);
    expect(qualityChanges.collectionMatches).toEqual([]);
    expect(qualityChanges.emptyReason).toContain("doesn't yet persist historical");
  });

  it("Whale Activity reuses Smart Collections' own Whale Accumulation matches verbatim", () => {
    const whaleMatch = makeMatch({ projectId: "whale-project" });
    const input = makeInput({ smartCollections: [makeCollectionResult("whale-accumulation", [whaleMatch])] });
    const weekly = buildWeeklyReport(input, NOW);
    const whaleSection = weekly.sections.find((s) => s.id === "whale-activity")!;
    expect(whaleSection.collectionMatches).toEqual([whaleMatch]);
  });

  it("Ecosystem Narratives reuses the real Daily Brief emergingNarratives verbatim, as metrics", () => {
    const input = makeInput({ dailyBrief: makeDailyBrief({ emergingNarratives: [{ narrative: "growth", count: 5, averageScore: 70 }] }) });
    const monthly = buildMonthlyReport(input, NOW);
    const narratives = monthly.sections.find((s) => s.id === "narratives")!;
    expect(narratives.metrics).toContainEqual({ label: "growth", value: "5 projects, avg. score 70" });
  });

  it("Governance/Developer sections use the real category classification, never a fabricated bucket", () => {
    const governanceClaim = makeClaim({ id: "g1", origin: "daily-brief", category: "Governance" });
    const developerClaim = makeClaim({ id: "d1", origin: "ai-intelligence", category: "developer" });
    const input = makeInput({ workspaceView: makeWorkspaceView([developerClaim], [governanceClaim]) });
    const weekly = buildWeeklyReport(input, NOW);
    expect(weekly.sections.find((s) => s.id === "governance-activity")!.claims).toEqual([governanceClaim]);
    expect(weekly.sections.find((s) => s.id === "developer-activity")!.claims).toEqual([developerClaim]);
  });
});

describe("buildMarketOutlookReport — real, already-computed ecosystem stats, no new forecasting engine", () => {
  it("reuses DailyBrief's own averageConfidence/highestScore/projectCount verbatim, never recomputed", () => {
    const input = makeInput({ dailyBrief: makeDailyBrief({ averageConfidence: 77, highestScore: 91, projectCount: 55 }) });
    const report = buildMarketOutlookReport(input, NOW);
    const conditions = report.sections.find((s) => s.id === "market-conditions")!;
    expect(conditions.metrics).toContainEqual({ label: "Average Confidence", value: "77%" });
    expect(conditions.metrics).toContainEqual({ label: "Highest Score", value: "91" });
    expect(conditions.metrics).toContainEqual({ label: "Projects Analyzed", value: "55" });
  });

  it("null DailyBrief: an honest empty market-conditions section, never a fabricated stat", () => {
    const report = buildMarketOutlookReport(makeInput({ dailyBrief: null }), NOW);
    const conditions = report.sections.find((s) => s.id === "market-conditions")!;
    expect(conditions.metrics).toEqual([]);
  });

  it("Important Projects reuses Smart Collections' own High Conviction matches verbatim", () => {
    const match = makeMatch({ projectId: "hc" });
    const input = makeInput({ smartCollections: [makeCollectionResult("high-conviction", [match])] });
    const report = buildMarketOutlookReport(input, NOW);
    expect(report.sections.find((s) => s.id === "important-projects")!.collectionMatches).toEqual([match]);
  });
});

describe("buildEcosystemReport — reuses Smart Collections' own criteria, never a re-derivation", () => {
  it("Notable Projects / Governance / Developer Activity / Whale Activity each cite the exact real Smart Collection matches", () => {
    const aiPicksMatch = makeMatch({ projectId: "ai" });
    const govMatch = makeMatch({ projectId: "gov" });
    const devMatch = makeMatch({ projectId: "dev" });
    const whaleMatch = makeMatch({ projectId: "whale" });
    const input = makeInput({
      smartCollections: [makeCollectionResult("ai-picks", [aiPicksMatch]), makeCollectionResult("governance-active", [govMatch]), makeCollectionResult("developer-momentum", [devMatch]), makeCollectionResult("whale-accumulation", [whaleMatch])],
    });
    const report = buildEcosystemReport(input, NOW);
    expect(report.sections.find((s) => s.id === "notable-projects")!.collectionMatches).toEqual([aiPicksMatch]);
    expect(report.sections.find((s) => s.id === "governance")!.collectionMatches).toEqual([govMatch]);
    expect(report.sections.find((s) => s.id === "developer-activity")!.collectionMatches).toEqual([devMatch]);
    expect(report.sections.find((s) => s.id === "whale-activity")!.collectionMatches).toEqual([whaleMatch]);
  });

  it("a Smart Collection with zero matches produces an honest empty section", () => {
    const input = makeInput({ smartCollections: [makeCollectionResult("governance-active", [])] });
    const report = buildEcosystemReport(input, NOW);
    const governance = report.sections.find((s) => s.id === "governance")!;
    expect(governance.collectionMatches).toEqual([]);
    expect(governance.emptyReason).toContain("Governance Active");
  });

  it("no Smart Collections data at all: every collection-derived section is honestly empty, never fabricated", () => {
    const report = buildEcosystemReport(makeInput(), NOW);
    expect(report.sections.find((s) => s.id === "notable-projects")!.collectionMatches).toEqual([]);
  });
});

describe("buildOpportunityReport — reuses Smart Collections' opportunity-shaped criteria, never a second scoring pass", () => {
  it("cites the exact real matches from High Conviction, Undervalued, Yield Opportunities, Trending Narratives, Whale Accumulation", () => {
    const hc = makeMatch({ projectId: "hc" });
    const uv = makeMatch({ projectId: "uv" });
    const yo = makeMatch({ projectId: "yo" });
    const tn = makeMatch({ projectId: "tn" });
    const wa = makeMatch({ projectId: "wa" });
    const input = makeInput({
      smartCollections: [
        makeCollectionResult("high-conviction", [hc]),
        makeCollectionResult("undervalued", [uv]),
        makeCollectionResult("yield-opportunities", [yo]),
        makeCollectionResult("trending-narratives", [tn]),
        makeCollectionResult("whale-accumulation", [wa]),
      ],
    });
    const report = buildOpportunityReport(input, NOW);
    expect(report.sections.find((s) => s.id === "highest-conviction")!.collectionMatches).toEqual([hc]);
    expect(report.sections.find((s) => s.id === "undervalued")!.collectionMatches).toEqual([uv]);
    expect(report.sections.find((s) => s.id === "yield-opportunities")!.collectionMatches).toEqual([yo]);
    expect(report.sections.find((s) => s.id === "emerging-momentum")!.collectionMatches).toEqual([tn]);
    expect(report.sections.find((s) => s.id === "whale-activity")!.collectionMatches).toEqual([wa]);
  });

  it("Risk Caveats cites real risk claims — the honest flip side of the opportunities", () => {
    const risk = makeClaim({ id: "r1", category: "security" });
    const input = makeInput({ workspaceView: makeWorkspaceView([risk], []) });
    const report = buildOpportunityReport(input, NOW);
    expect(report.sections.find((s) => s.id === "risk-caveats")!.claims).toEqual([risk]);
  });

  it("Positive Intelligence Changes is honestly empty with the no-history limitation — never fabricated", () => {
    const report = buildOpportunityReport(makeInput(), NOW);
    const positiveChanges = report.sections.find((s) => s.id === "positive-changes")!;
    expect(positiveChanges.claims).toEqual([]);
    expect(positiveChanges.collectionMatches).toEqual([]);
    expect(report.limitations.some((l) => l.label === "No historical intelligence persistence yet")).toBe(true);
  });
});

describe("confidence propagation", () => {
  it("averages real confidence scores from claims across sections", () => {
    const a = makeClaim({ id: "a", confidence: { kind: "score", value: 80 } });
    const b = makeClaim({ id: "b", origin: "daily-brief", category: "Opportunity", confidence: { kind: "score", value: 60 } });
    const input = makeInput({ workspaceView: makeWorkspaceView([], [b]) });
    // Put `a` into a claim classified as a risk claim too, to spread across two sections.
    const withRisk = makeInput({ workspaceView: makeWorkspaceView([a], [b]) });
    const report = buildDailyBriefReport(withRisk, NOW);
    expect(report.averageConfidence).toBe(70);
    void input;
  });

  it("null when no real confidence value exists anywhere in the report", () => {
    const report = buildDailyBriefReport(makeInput(), NOW);
    expect(report.averageConfidence).toBeNull();
  });

  it("includes real confidence from Smart Collection matches with a resolved LiveProject", () => {
    const liveProjectStub = { confidence: { score: 90, level: "high", source: "intelligence" } } as unknown as SmartCollectionMatch["liveProject"];
    const match = makeMatch({ liveProject: liveProjectStub });
    const input = makeInput({ smartCollections: [makeCollectionResult("high-conviction", [match])] });
    const report = buildMarketOutlookReport(input, NOW);
    expect(report.averageConfidence).toBe(90);
  });
});

describe("deterministic ordering", () => {
  it("re-running the same builder on identical input produces a deep-equal report", () => {
    const input = makeInput({ workspaceView: makeWorkspaceView([makeClaim({ id: "a" })], []) });
    const first = buildDailyBriefReport(input, NOW);
    const second = buildDailyBriefReport(input, NOW);
    expect(first).toEqual(second);
  });

  it("section order is fixed and identical across calls", () => {
    const report = buildEcosystemReport(makeInput(), NOW);
    const ids = report.sections.map((s) => s.id);
    const secondIds = buildEcosystemReport(makeInput(), NOW).sections.map((s) => s.id);
    expect(ids).toEqual(secondIds);
  });
});
