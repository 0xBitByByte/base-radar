import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { AlertRefreshStatus } from "@/lib/alerts/service";
import type { IntelligenceAlert } from "@/lib/alerts/intelligence/types";
import type { DailyBrief } from "@/lib/brief/types";
import type { SmartCollectionResult } from "@/lib/smart-collections/types";

const mockAlerts: IntelligenceAlert[] = [];
let mockDailyBrief: DailyBrief | null = null;
let mockStatus: AlertRefreshStatus = "ready";

vi.mock("@/lib/hooks/useEcosystemIntelligenceAlerts", () => ({ useEcosystemIntelligenceAlerts: () => mockAlerts }));
vi.mock("@/lib/hooks/useDailyBrief", () => ({ useDailyBrief: () => mockDailyBrief }));
vi.mock("@/lib/hooks/useAlertRefreshStatus", () => ({ useAlertRefreshStatus: () => mockStatus }));

const { SmartCollectionDetailView } = await import("@/components/collections/SmartCollectionDetailView");

function makeServerResult(overrides: Partial<SmartCollectionResult> = {}): SmartCollectionResult {
  return { id: "ai-picks", name: "AI Picks", description: "Real description.", status: "ready", matches: [], lastEvaluatedAt: "2026-09-08T00:00:00.000Z", averageConfidence: null, ...overrides };
}

describe("SmartCollectionDetailView — server-evaluated collection (always real data, always 'ready')", () => {
  it("renders the real name, description, and a back link", () => {
    mockStatus = "ready";
    render(<SmartCollectionDetailView collectionId="ai-picks" serverResults={[makeServerResult()]} />);
    expect(screen.getByRole("heading", { name: "AI Picks", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Real description.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /All Smart Collections/ })).toHaveAttribute("href", "/dashboard/collections");
  });

  it("a real match renders through SmartCollectionMatchRow", () => {
    mockStatus = "ready";
    const result = makeServerResult({ matches: [{ projectId: "a", projectName: "Aerodrome Finance", projectSlug: "aerodrome-finance", liveProject: null, reason: "A real reason.", evidence: [] }] });
    render(<SmartCollectionDetailView collectionId="ai-picks" serverResults={[result]} />);
    expect(screen.getByText("Aerodrome Finance")).toBeInTheDocument();
    expect(screen.getByText("A real reason.")).toBeInTheDocument();
  });

  it("zero matches: an honest empty state, never fabricated", () => {
    mockStatus = "ready";
    render(<SmartCollectionDetailView collectionId="ai-picks" serverResults={[makeServerResult({ matches: [] })]} />);
    expect(screen.getByText("No projects match right now")).toBeInTheDocument();
  });
});

describe("SmartCollectionDetailView — client-evaluated collection, honest freshness states", () => {
  it("'checking': a real loading region, no fabricated matches", () => {
    mockStatus = "loading";
    render(<SmartCollectionDetailView collectionId="stable-projects" serverResults={[]} />);
    expect(screen.getByRole("status", { name: "Checking Stable Projects" })).toBeInTheDocument();
  });

  it("'unavailable': an honest 'can't evaluate right now' message — the hard stale-data gate", () => {
    mockStatus = "error";
    render(<SmartCollectionDetailView collectionId="trending-narratives" serverResults={[]} />);
    expect(screen.getByText("Can't evaluate right now")).toBeInTheDocument();
  });

  it("'ready' with a real Daily Brief opportunity: renders the real match", () => {
    mockStatus = "ready";
    mockDailyBrief = {
      id: "brief:1",
      generatedAt: "2026-09-08T00:00:00.000Z",
      headline: "h",
      summary: "s",
      marketSummary: [],
      topOpportunities: [{ projectId: "a", projectName: "Aave", headline: "h", reason: "Real yield reason.", score: 80, confidence: 70, narrative: "growth", timestamp: "2026-09-08T00:00:00.000Z" }],
      topRisks: [],
      securityHighlights: [],
      governanceHighlights: [],
      developmentHighlights: [],
      tvlHighlights: [],
      emergingNarratives: [],
      averageConfidence: 0,
      highestScore: 0,
      projectCount: 0,
      narrativeCounts: { growth: 0, decline: 0, "governance-active": 0, "security-risk": 0, accumulation: 0, "development-active": 0, stable: 0 },
      recommendations: [],
    };
    render(<SmartCollectionDetailView collectionId="yield-opportunities" serverResults={[]} />);
    expect(screen.getByText("Real yield reason.")).toBeInTheDocument();
  });
});
