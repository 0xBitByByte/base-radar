import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import type { AlertRefreshStatus } from "@/lib/alerts/service";
import type { IntelligenceAlert } from "@/lib/alerts/intelligence/types";
import type { DailyBrief } from "@/lib/brief/types";
import { REPORT_TYPES } from "@/lib/executive-reports/types";
import type { DailyIntelligenceBriefing } from "@/lib/ai-intelligence/generator/briefing";

const mockAlerts: IntelligenceAlert[] = [];
let mockDailyBrief: DailyBrief | null = null;
let mockStatus: AlertRefreshStatus = "ready";

vi.mock("@/lib/hooks/useEcosystemIntelligenceAlerts", () => ({ useEcosystemIntelligenceAlerts: () => mockAlerts }));
vi.mock("@/lib/hooks/useDailyBrief", () => ({ useDailyBrief: () => mockDailyBrief }));
vi.mock("@/lib/hooks/useAlertRefreshStatus", () => ({ useAlertRefreshStatus: () => mockStatus }));

const { useExecutiveReports } = await import("@/lib/hooks/useExecutiveReports");

function makeBriefing(overrides: Partial<DailyIntelligenceBriefing> = {}): DailyIntelligenceBriefing {
  return { generatedAt: "2026-09-08T00:00:00.000Z", briefingDate: "2026-09-08", version: 1, briefs: [], statistics: { projectsAnalyzed: 0, providersScanned: 0, alertsProcessed: 0, discoveriesReviewed: 0 }, ...overrides };
}

describe("useExecutiveReports", () => {
  it("returns all 6 report types, in the fixed REPORT_TYPES order", () => {
    mockStatus = "ready";
    const { result } = renderHook(() => useExecutiveReports(makeBriefing(), []));
    expect(result.current.map((r) => r.id)).toEqual(REPORT_TYPES);
  });

  it("'checking': every report reports zero sections, never evaluates", () => {
    mockStatus = "loading";
    const { result } = renderHook(() => useExecutiveReports(makeBriefing(), []));
    expect(result.current.every((r) => r.status === "checking")).toBe(true);
    expect(result.current.every((r) => r.sections.length === 0)).toBe(true);
  });

  it("'unavailable' on a real Alert Engine failure — the hard stale-data gate, applied uniformly to every report", () => {
    mockStatus = "error";
    const { result } = renderHook(() => useExecutiveReports(makeBriefing(), []));
    expect(result.current.every((r) => r.status === "unavailable")).toBe(true);
  });

  it("'ready': builds real reports from the real briefing/daily brief/smart collections inputs", () => {
    mockStatus = "ready";
    mockDailyBrief = { id: "b", generatedAt: "2026-09-08T00:00:00.000Z", headline: "h", summary: "s", marketSummary: [], topOpportunities: [], topRisks: [], securityHighlights: [], governanceHighlights: [], developmentHighlights: [], tvlHighlights: [], emergingNarratives: [], averageConfidence: 50, highestScore: 70, projectCount: 10, narrativeCounts: { growth: 0, decline: 0, "governance-active": 0, "security-risk": 0, accumulation: 0, "development-active": 0, stable: 0 }, recommendations: [] };
    const { result } = renderHook(() => useExecutiveReports(makeBriefing(), []));
    const marketOutlook = result.current.find((r) => r.id === "market-outlook")!;
    expect(marketOutlook.status).toBe("ready");
    expect(marketOutlook.sections.find((s) => s.id === "market-conditions")!.metrics).toContainEqual({ label: "Average Confidence", value: "50%" });
  });
});
