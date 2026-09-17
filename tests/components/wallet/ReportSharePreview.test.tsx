import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ReportSharePreviewButton } from "@/components/wallet/ReportSharePreview";
import { buildCrossFeatureIndexes } from "@/lib/cross-feature/indexes";
import type { HistoricalReport } from "@/components/wallet/walletReportEngine";
import type { WalletAnalytics, PersonalBests, PortfolioMilestones } from "@/lib/wallet-analytics/types";
import type { ShareSourceData } from "@/lib/report-share/types";

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
const EMPTY_PERSONAL_BESTS: PersonalBests = { bestHealth: null, bestConfidence: null, lowestRisk: null, largestPortfolioValue: null, bestDiversification: null, longestStablePortfolio: null };
const EMPTY_METRIC_SUMMARY = { metric: "healthScore", label: "Health", highest: null, lowest: null, first: null, last: null, change: null };

function makeReport(overrides: Partial<HistoricalReport> = {}): HistoricalReport {
  return {
    period: "30d",
    overview: { period: "30d", periodLabel: "Last 30 Days", snapshotCount: 3, firstSnapshotDate: "2026-08-01T00:00:00.000Z", lastSnapshotDate: "2026-09-01T00:00:00.000Z", startValue: 8000, endValue: 12000, netValueChange: 4000 },
    health: { ...EMPTY_METRIC_SUMMARY },
    confidence: { ...EMPTY_METRIC_SUMMARY, metric: "confidenceScore", label: "Confidence" },
    risk: { ...EMPTY_METRIC_SUMMARY, metric: "riskScore", label: "Risk" },
    value: { ...EMPTY_METRIC_SUMMARY, metric: "totalValue", label: "Portfolio Value" },
    fingerprintChanges: [],
    majorRecoveries: [],
    personalBests: EMPTY_PERSONAL_BESTS,
    milestones: EMPTY_MILESTONES,
    highlights: [],
    statistics: { highestValue: null, lowestRisk: null, highestConfidence: null, bestHealth: null, largestImprovement: null, largestDecline: null, recoveryCount: 0, milestoneCount: 0, snapshotCount: 3 },
    ...overrides,
  };
}

function makeAnalytics(): WalletAnalytics {
  return {
    window: "all",
    snapshotCount: 0,
    trends: [],
    evolution: { largestImprovement: null, largestDeterioration: null, biggestAllocationShift: null, mostStableAsset: null, mostVolatileAllocation: null, longestUnchangedRecommendation: null, mostRepeatedWarning: null },
    biggestChange: null,
    allocation: { topChanges: [], newAssets: [], removedAssets: [], growingPositions: [], shrinkingPositions: [], protocolExposureChange: { from: null, to: null, changed: false }, nativeVsStablecoinChange: { ethPctFrom: 0, ethPctTo: 0, stablecoinPctFrom: 0, stablecoinPctTo: 0 } },
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
  };
}

function makeData(overrides: Partial<ShareSourceData> = {}): ShareSourceData {
  return {
    report: makeReport(),
    ai: null,
    intelligence: null,
    analytics: makeAnalytics(),
    history: { snapshotCount: 3, oldestSnapshot: null, newestSnapshot: null },
    crossFeature: { events: [], recommendations: [], timeline: [], latestStory: null, indexes: buildCrossFeatureIndexes([], []) },
    digest: null,
    story: null,
    ...overrides,
  };
}

describe("ReportSharePreviewButton", () => {
  it("renders nothing when data is null — never a share button with nothing to share", () => {
    const { container } = render(<ReportSharePreviewButton data={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("opening it shows the real title/summary/description and a preview containing real report facts", async () => {
    const user = userEvent.setup();
    render(<ReportSharePreviewButton data={makeData()} />);
    await user.click(screen.getByRole("button", { name: /Share/ }));

    expect(screen.getByText("Base Radar — Portfolio Report (Last 30 Days)")).toBeInTheDocument();
    expect(screen.getByText("3 snapshots, +$4,000 net change")).toBeInTheDocument();
    expect((screen.getByRole("textbox", { name: "Share preview" }) as HTMLTextAreaElement).value).toContain("Last 30 Days");
  });

  it("Digest/Story toggles are disabled when their real source is unavailable — never offer to include nothing", async () => {
    const user = userEvent.setup();
    render(<ReportSharePreviewButton data={makeData()} />);
    await user.click(screen.getByRole("button", { name: /Share/ }));

    const group = screen.getByRole("group", { name: "Include in share" });
    expect(within(group).getByLabelText("Digest")).toBeDisabled();
    expect(within(group).getByLabelText("Story")).toBeDisabled();
    expect(within(group).getByLabelText("History")).not.toBeDisabled();
  });

  it("checking History adds the real Snapshot History section to the live preview", async () => {
    const user = userEvent.setup();
    render(<ReportSharePreviewButton data={makeData({ history: { snapshotCount: 7, oldestSnapshot: null, newestSnapshot: null } })} />);
    await user.click(screen.getByRole("button", { name: /Share/ }));

    const textarea = screen.getByRole("textbox", { name: "Share preview" }) as HTMLTextAreaElement;
    expect(textarea.value).not.toContain("Snapshot History");

    await user.click(screen.getByLabelText("History"));
    expect(textarea.value).toContain("Snapshot History");
    expect(textarea.value).toContain("7");
  });

  it("switching format tabs shows the real HTML/Text rendering, not a second copy of Markdown", async () => {
    const user = userEvent.setup();
    render(<ReportSharePreviewButton data={makeData()} />);
    await user.click(screen.getByRole("button", { name: /Share/ }));

    const textarea = screen.getByRole("textbox", { name: "Share preview" }) as HTMLTextAreaElement;
    expect(textarea.value).toContain("##");

    await user.click(screen.getByRole("button", { name: "HTML" }));
    expect(textarea.value).toContain("<h1>");
  });

  it("Copy to Clipboard copies the real, currently-shown preview text", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

    render(<ReportSharePreviewButton data={makeData()} />);
    await user.click(screen.getByRole("button", { name: /Share/ }));
    await user.click(screen.getByRole("button", { name: "Copy to Clipboard" }));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain("Last 30 Days");
  });

  it("Download triggers a real download of the exact currently-shown preview text", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn((blob: Blob) => `blob:mock:${blob.type}`);
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<ReportSharePreviewButton data={makeData()} />);
    await user.click(screen.getByRole("button", { name: /Share/ }));
    await user.click(screen.getByRole("button", { name: "Download" }));

    expect(createObjectURL).toHaveReturnedWith("blob:mock:text/markdown");

    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("presets only toggle existing sections — Full Portfolio enables every checkbox that has real data behind it", async () => {
    const user = userEvent.setup();
    render(<ReportSharePreviewButton data={makeData({ digest: null, story: null })} />);
    await user.click(screen.getByRole("button", { name: /Share/ }));

    await user.click(screen.getByRole("button", { name: "Full Portfolio" }));

    const group = screen.getByRole("group", { name: "Include in share" });
    expect(within(group).getByLabelText("History")).toBeChecked();
    expect(within(group).getByLabelText("Timeline")).toBeChecked();
    expect(within(group).getByLabelText("Recommendations")).toBeChecked();
    expect(within(group).getByLabelText("Highlights")).toBeChecked();
  });

  it("Executive Summary preset enables only Recommendations, never History/Timeline/Highlights", async () => {
    const user = userEvent.setup();
    render(<ReportSharePreviewButton data={makeData()} />);
    await user.click(screen.getByRole("button", { name: /Share/ }));

    await user.click(screen.getByRole("button", { name: "Executive Summary" }));

    const group = screen.getByRole("group", { name: "Include in share" });
    expect(within(group).getByLabelText("Recommendations")).toBeChecked();
    expect(within(group).getByLabelText("History")).not.toBeChecked();
    expect(within(group).getByLabelText("Timeline")).not.toBeChecked();
    expect(within(group).getByLabelText("Highlights")).not.toBeChecked();
  });

  it("shows real, non-fabricated share statistics — sections/words/reading time", async () => {
    const user = userEvent.setup();
    render(<ReportSharePreviewButton data={makeData()} />);
    await user.click(screen.getByRole("button", { name: /Share/ }));

    expect(screen.getByText(/section.*word.*min read/)).toBeInTheDocument();
  });
});
