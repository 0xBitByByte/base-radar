import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { AlertRefreshStatus } from "@/lib/alerts/service";
import type { IntelligenceAlert } from "@/lib/alerts/intelligence/types";
import type { DailyBrief } from "@/lib/brief/types";

const mockAlerts: IntelligenceAlert[] = [];
let mockDailyBrief: DailyBrief | null = null;
let mockStatus: AlertRefreshStatus = "ready";

vi.mock("@/lib/hooks/useEcosystemIntelligenceAlerts", () => ({ useEcosystemIntelligenceAlerts: () => mockAlerts }));
vi.mock("@/lib/hooks/useDailyBrief", () => ({ useDailyBrief: () => mockDailyBrief }));
vi.mock("@/lib/hooks/useAlertRefreshStatus", () => ({ useAlertRefreshStatus: () => mockStatus }));

const { ReportDetailView } = await import("@/components/reports/ReportDetailView");

describe("ReportDetailView", () => {
  it("renders the real title, subtitle, and a back link", () => {
    mockStatus = "ready";
    mockDailyBrief = null;
    render(<ReportDetailView reportType="daily-brief" initialBriefing={null} serverSmartCollections={[]} />);
    expect(screen.getByRole("heading", { name: "Daily Brief", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /All Executive Reports/ })).toHaveAttribute("href", "/dashboard/reports");
  });

  it("renders the Executive Summary and Limitations sections, with the deterministic-composition disclosure", () => {
    mockStatus = "ready";
    render(<ReportDetailView reportType="weekly" initialBriefing={null} serverSmartCollections={[]} />);
    expect(screen.getByRole("heading", { name: "Executive Summary" })).toBeInTheDocument();
    expect(screen.getByText("Composed deterministically from the sections below — not written by a language model.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Limitations" })).toBeInTheDocument();
    expect(screen.getByText("No historical intelligence persistence yet")).toBeInTheDocument();
  });

  it("'checking': a real loading region, no fabricated content", () => {
    mockStatus = "loading";
    render(<ReportDetailView reportType="monthly" initialBriefing={null} serverSmartCollections={[]} />);
    expect(screen.getByRole("status", { name: "Checking Monthly Report" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Executive Summary" })).not.toBeInTheDocument();
  });

  it("'unavailable': an honest 'can't generate right now' message — the hard stale-data gate", () => {
    mockStatus = "error";
    render(<ReportDetailView reportType="ecosystem" initialBriefing={null} serverSmartCollections={[]} />);
    expect(screen.getByText("Can't generate right now")).toBeInTheDocument();
  });

  it("real sections render through ReportSectionView with real content", () => {
    mockStatus = "ready";
    mockDailyBrief = {
      id: "b",
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
      averageConfidence: 50,
      highestScore: 70,
      projectCount: 10,
      narrativeCounts: { growth: 0, decline: 0, "governance-active": 0, "security-risk": 0, accumulation: 0, "development-active": 0, stable: 0 },
      recommendations: [],
    };
    render(<ReportDetailView reportType="daily-brief" initialBriefing={null} serverSmartCollections={[]} />);
    expect(screen.getByRole("heading", { name: "Opportunities" })).toBeInTheDocument();
  });
});
