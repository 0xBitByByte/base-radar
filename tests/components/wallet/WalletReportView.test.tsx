import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WalletReportView } from "@/components/wallet/WalletReportView";
import type { WalletAnalytics, PersonalBests, PortfolioMilestones } from "@/lib/wallet-analytics/types";
import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";

function snap(overrides: Partial<AnalyticsSnapshot> & { timestamp: string }): AnalyticsSnapshot {
  return {
    analyticsVersion: 1,
    overallScore: 60,
    healthScore: 65,
    riskScore: 30,
    confidenceScore: 80,
    confidenceLevel: "moderate",
    fingerprint: "Mixed",
    largestHoldingSymbol: "ETH",
    largestProtocolName: null,
    primaryRecommendationId: null,
    topWarningId: null,
    totalValue: 10000,
    stablecoinExposure: 20,
    ethPct: 50,
    diversificationScore: 70,
    pricingCoverage: 100,
    unknownAssetCount: 0,
    warningIds: [],
    topHoldings: [],
    ...overrides,
  };
}

const EMPTY_MILESTONES: PortfolioMilestones = {
  highestPortfolioValue: null,
  highestHealthScore: null,
  highestConfidence: null,
  lowestRisk: null,
  bestDiversification: null,
  largestStablecoinAllocation: null,
  largestEthAllocation: null,
  firstWalletConnection: null,
  mostRecentFingerprint: null,
};

const EMPTY_PERSONAL_BESTS: PersonalBests = {
  bestHealth: null,
  bestConfidence: null,
  lowestRisk: null,
  largestPortfolioValue: null,
  bestDiversification: null,
  longestStablePortfolio: null,
};

function makeAnalytics(overrides: Partial<WalletAnalytics> = {}): WalletAnalytics {
  return {
    window: "all",
    snapshotCount: 0,
    trends: [],
    evolution: {
      largestImprovement: null,
      largestDeterioration: null,
      biggestAllocationShift: null,
      mostStableAsset: null,
      mostVolatileAllocation: null,
      longestUnchangedRecommendation: null,
      mostRepeatedWarning: null,
    },
    biggestChange: null,
    allocation: {
      topChanges: [],
      newAssets: [],
      removedAssets: [],
      growingPositions: [],
      shrinkingPositions: [],
      protocolExposureChange: { from: null, to: null, changed: false },
      nativeVsStablecoinChange: { ethPctFrom: 0, ethPctTo: 0, stablecoinPctFrom: 0, stablecoinPctTo: 0 },
    },
    timeline: [],
    executiveSummary: "",
    correlation: null,
    stability: null,
    milestones: EMPTY_MILESTONES,
    personalBests: EMPTY_PERSONAL_BESTS,
    recoveries: [],
    changeFrequency: null,
    exportSnapshot: { generatedAt: "2026-09-01T00:00:00.000Z", window: "all", rows: [] },
    highlights: [],
    ...overrides,
  };
}

describe("WalletReportView", () => {
  it("EMPTY HISTORY: shows an honest empty state, no crash", () => {
    render(<WalletReportView history={[]} analytics={makeAnalytics()} />);
    expect(screen.getByText("No snapshots in this period.")).toBeInTheDocument();
  });

  it("defaults to the 'Last 7 Days' period, pressed pill reflects that", () => {
    const history = [snap({ timestamp: new Date().toISOString() })];
    render(<WalletReportView history={history} analytics={makeAnalytics()} />);
    expect(screen.getByRole("button", { name: "Last 7 Days" })).toHaveAttribute("aria-pressed", "true");
  });

  it("switching to 'All History' regenerates the report for that real period", async () => {
    const user = userEvent.setup();
    const history = [
      snap({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 40, totalValue: 5000 }),
      snap({ timestamp: new Date().toISOString(), healthScore: 90, totalValue: 15000 }),
    ];
    render(<WalletReportView history={history} analytics={makeAnalytics()} />);

    // "Last 7 Days" only sees the recent snapshot — a single snapshot, so Overview shows 1
    expect(screen.getByText("1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "All History" }));

    expect(screen.getByRole("button", { name: "All History" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("2")).toBeInTheDocument(); // both real snapshots now in scope
  });

  it("renders real Fingerprint Changes for the selected period", async () => {
    const user = userEvent.setup();
    const history = [
      snap({ timestamp: "2026-01-01T00:00:00.000Z", fingerprint: "Cautious Holder" }),
      snap({ timestamp: "2026-01-15T00:00:00.000Z", fingerprint: "Growth Seeker" }),
    ];
    render(<WalletReportView history={history} analytics={makeAnalytics()} />);
    await user.click(screen.getByRole("button", { name: "All History" }));

    expect(screen.getByText("Cautious Holder → Growth Seeker")).toBeInTheDocument();
  });

  it("Highlights section renders real, already-computed highlights verbatim — never recomputed", async () => {
    const user = userEvent.setup();
    const history = [snap({ timestamp: "2026-01-01T00:00:00.000Z" }), snap({ timestamp: "2026-01-15T00:00:00.000Z" })];
    const analytics = makeAnalytics({
      highlights: [{ type: "recovery", priority: "important", stars: 4, title: "Recovered from High Risk", reason: "Risk improved from 80 to 30.", supportingMetric: "80 → 30", topic: "risk", dedupeKey: "recovery:risk:2026-01-15" }],
    });
    render(<WalletReportView history={history} analytics={analytics} />);
    await user.click(screen.getByRole("button", { name: "All History" }));

    expect(screen.getByText("Recovered from High Risk")).toBeInTheDocument();
    expect(screen.getByText("Risk improved from 80 to 30.")).toBeInTheDocument();
  });

  it("Major Recoveries shows an honest 'no recoveries' message when there are none", () => {
    const history = [snap({ timestamp: new Date().toISOString() })];
    render(<WalletReportView history={history} analytics={makeAnalytics()} />);
    expect(screen.getByText("No recoveries in this period.")).toBeInTheDocument();
  });

  describe("V4-FUTURE-001 Export Report", () => {
    it("no Export Report controls when there's no real report to export", () => {
      render(<WalletReportView history={[]} analytics={makeAnalytics()} />);
      expect(screen.queryByText("Export Report")).not.toBeInTheDocument();
    });

    it("offers Markdown, Text, HTML, and CSV as real file downloads, plus a separate Print/Save-as-PDF action (PR-092.06) — never a same-shaped 'PDF' file-download button", () => {
      const history = [snap({ timestamp: new Date().toISOString() })];
      render(<WalletReportView history={history} analytics={makeAnalytics()} />);
      expect(screen.getByRole("button", { name: "Markdown" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Text" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "HTML" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "CSV" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Print / Save as PDF" })).toBeInTheDocument();
    });

    it("clicking 'CSV' downloads with the real text/csv MIME type", async () => {
      const user = userEvent.setup();
      const createObjectURL = vi.fn((blob: Blob) => `blob:mock:${blob.type}`);
      vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

      const history = [snap({ timestamp: new Date().toISOString() })];
      render(<WalletReportView history={history} analytics={makeAnalytics()} />);
      await user.click(screen.getByRole("button", { name: "CSV" }));

      expect(createObjectURL).toHaveReturnedWith("blob:mock:text/csv");

      clickSpy.mockRestore();
      vi.unstubAllGlobals();
    });

    it("clicking 'Print / Save as PDF' opens a real print window with the real report's own HTML — never claims a direct file download", async () => {
      const user = userEvent.setup();
      const mockPrintWindow = { document: { write: vi.fn(), close: vi.fn() }, focus: vi.fn(), print: vi.fn() };
      const openSpy = vi.spyOn(window, "open").mockReturnValue(mockPrintWindow as unknown as Window);

      const history = [snap({ timestamp: new Date().toISOString() })];
      render(<WalletReportView history={history} analytics={makeAnalytics()} />);
      await user.click(screen.getByRole("button", { name: "Print / Save as PDF" }));

      expect(openSpy).toHaveBeenCalledWith("", "_blank");
      expect(mockPrintWindow.document.write).toHaveBeenCalledTimes(1);
      expect(mockPrintWindow.document.write.mock.calls[0][0]).toContain("<!doctype html>");
      expect(mockPrintWindow.print).toHaveBeenCalledTimes(1);

      openSpy.mockRestore();
    });

    it("a blocked popup is a silent, honest no-op — never a crash, never a fabricated success", async () => {
      const user = userEvent.setup();
      const openSpy = vi.spyOn(window, "open").mockReturnValue(null);

      const history = [snap({ timestamp: new Date().toISOString() })];
      render(<WalletReportView history={history} analytics={makeAnalytics()} />);
      await expect(user.click(screen.getByRole("button", { name: "Print / Save as PDF" }))).resolves.not.toThrow();

      openSpy.mockRestore();
    });

    it("clicking 'Markdown' triggers a real download of the real, currently-selected report — never a second report computation", async () => {
      const user = userEvent.setup();
      const createObjectURL = vi.fn((blob: Blob) => `blob:mock:${blob.type}`);
      const revokeObjectURL = vi.fn();
      vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

      const history = [snap({ timestamp: new Date().toISOString(), healthScore: 77 })];
      render(<WalletReportView history={history} analytics={makeAnalytics()} />);

      await user.click(screen.getByRole("button", { name: "Markdown" }));

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(createObjectURL).toHaveReturnedWith("blob:mock:text/markdown");
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalled();

      clickSpy.mockRestore();
      vi.unstubAllGlobals();
    });

    it("clicking 'HTML' downloads with the real text/html MIME type", async () => {
      const user = userEvent.setup();
      const createObjectURL = vi.fn((blob: Blob) => `blob:mock:${blob.type}`);
      vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

      const history = [snap({ timestamp: new Date().toISOString() })];
      render(<WalletReportView history={history} analytics={makeAnalytics()} />);
      await user.click(screen.getByRole("button", { name: "HTML" }));

      expect(createObjectURL).toHaveReturnedWith("blob:mock:text/html");

      clickSpy.mockRestore();
      vi.unstubAllGlobals();
    });
  });
});
