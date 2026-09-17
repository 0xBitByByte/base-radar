import { describe, expect, it } from "vitest";

import { buildHistoricalReportFilename, buildHistoricalReportHtml, buildHistoricalReportMarkdown, buildHistoricalReportText } from "@/lib/report-export";
import type { HistoricalReport } from "@/components/wallet/walletReportEngine";
import type { PersonalBests, PortfolioMilestones, RecoveryEvent, AnalyticsHighlight } from "@/lib/wallet-analytics/types";

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

const EMPTY_METRIC_SUMMARY = { metric: "healthScore", label: "Health", highest: null, lowest: null, first: null, last: null, change: null };

function makeReport(overrides: Partial<HistoricalReport> = {}): HistoricalReport {
  return {
    period: "7d",
    overview: { period: "7d", periodLabel: "Last 7 Days", snapshotCount: 0, firstSnapshotDate: null, lastSnapshotDate: null, startValue: null, endValue: null, netValueChange: null },
    health: { ...EMPTY_METRIC_SUMMARY },
    confidence: { ...EMPTY_METRIC_SUMMARY, metric: "confidenceScore", label: "Confidence" },
    risk: { ...EMPTY_METRIC_SUMMARY, metric: "riskScore", label: "Risk" },
    value: { ...EMPTY_METRIC_SUMMARY, metric: "totalValue", label: "Portfolio Value" },
    fingerprintChanges: [],
    majorRecoveries: [],
    personalBests: EMPTY_PERSONAL_BESTS,
    milestones: EMPTY_MILESTONES,
    highlights: [],
    statistics: { highestValue: null, lowestRisk: null, highestConfidence: null, bestHealth: null, largestImprovement: null, largestDecline: null, recoveryCount: 0, milestoneCount: 0, snapshotCount: 0 },
    ...overrides,
  };
}

const GENERATED_AT = "2026-09-06T21:00:00.000Z";

describe("report-export — EMPTY REPORT", () => {
  const report = makeReport();

  it("markdown honestly reports the real zero-state — no snapshots, no fabricated content — never crashes", () => {
    const md = buildHistoricalReportMarkdown(report, GENERATED_AT);
    expect(md).toContain("**Snapshots:** 0");
    expect(md).toContain("**Recoveries:** 0");
    expect(md).toContain("**Milestones:** 0");
    // No section with genuinely zero real rows (Health/Confidence/Risk/Value/Fingerprint Changes/etc.) is rendered at all
    expect(md).not.toContain("Health Summary");
    expect(md).not.toContain("Fingerprint Changes");
  });

  it("text honestly reports the same real zero-state", () => {
    const text = buildHistoricalReportText(report, GENERATED_AT);
    expect(text).toContain("Snapshots: 0");
    expect(text).not.toContain("HEALTH SUMMARY");
  });

  it("html honestly reports the same real zero-state", () => {
    const html = buildHistoricalReportHtml(report, GENERATED_AT);
    expect(html).toContain("<li><strong>Snapshots:</strong> 0</li>");
    expect(html).not.toContain("<h2>Health Summary</h2>");
  });
});

describe("report-export — SINGLE SNAPSHOT", () => {
  const report = makeReport({
    overview: { period: "7d", periodLabel: "Last 7 Days", snapshotCount: 1, firstSnapshotDate: "2026-09-05T00:00:00.000Z", lastSnapshotDate: "2026-09-05T00:00:00.000Z", startValue: 12000, endValue: 12000, netValueChange: 0 },
    health: { metric: "healthScore", label: "Health", highest: { label: "Highest Health", value: 70, date: "2026-09-05T00:00:00.000Z", snapshot: {} as never }, lowest: { label: "Lowest Health", value: 70, date: "2026-09-05T00:00:00.000Z", snapshot: {} as never }, first: { value: 70, date: "2026-09-05T00:00:00.000Z" }, last: { value: 70, date: "2026-09-05T00:00:00.000Z" }, change: 0 },
  });

  it("markdown renders the real, single-point overview correctly", () => {
    const md = buildHistoricalReportMarkdown(report, GENERATED_AT);
    expect(md).toContain("**Snapshots:** 1");
    expect(md).toContain("**Start Value:** $12,000");
    expect(md).toContain("**End Value:** $12,000");
  });

  it("health summary reflects the same real value for highest/lowest/first/last", () => {
    const md = buildHistoricalReportMarkdown(report, GENERATED_AT);
    expect(md).toContain("**Highest:** 70");
    expect(md).toContain("**Lowest:** 70");
  });
});

describe("report-export — LARGE REPORT (every section populated)", () => {
  const recovery: RecoveryEvent = { category: "highRisk", label: "High Risk", recoveryDate: "2026-09-01T00:00:00.000Z", before: { value: 80, timestamp: "2026-08-25T00:00:00.000Z" }, after: { value: 30, timestamp: "2026-09-01T00:00:00.000Z" }, improvement: 50, durationDays: 7 };
  const highlight: AnalyticsHighlight = { type: "recovery", priority: "important", stars: 4, title: "Recovered from High Risk", reason: "Risk improved from 80 to 30.", supportingMetric: null, topic: "risk", dedupeKey: "recovery:risk:2026-09-01" };
  const report = makeReport({
    overview: { period: "30d", periodLabel: "Last 30 Days", snapshotCount: 4, firstSnapshotDate: "2026-08-08T00:00:00.000Z", lastSnapshotDate: "2026-09-06T00:00:00.000Z", startValue: 8000, endValue: 14200, netValueChange: 6200 },
    fingerprintChanges: [{ from: "Cautious Holder", to: "Growth Seeker", date: "2026-09-01T00:00:00.000Z" }],
    majorRecoveries: [recovery],
    highlights: [highlight],
    milestones: { ...EMPTY_MILESTONES, highestPortfolioValue: { label: "Highest Portfolio Value", value: 14200, date: "2026-09-06T00:00:00.000Z", snapshot: {} as never } },
    personalBests: { ...EMPTY_PERSONAL_BESTS, bestHealth: { label: "Best Health", value: 88, date: "2026-09-06T00:00:00.000Z", snapshot: {} as never } },
    statistics: { highestValue: { label: "Highest Value", value: 14200, date: "2026-09-06T00:00:00.000Z", snapshot: {} as never }, lowestRisk: null, highestConfidence: null, bestHealth: null, largestImprovement: null, largestDecline: null, recoveryCount: 1, milestoneCount: 1, snapshotCount: 4 },
  });

  it("markdown renders every real populated section", () => {
    const md = buildHistoricalReportMarkdown(report, GENERATED_AT);
    expect(md).toContain("Fingerprint Changes");
    expect(md).toContain("Cautious Holder → Growth Seeker");
    expect(md).toContain("Major Recoveries");
    expect(md).toContain("High Risk");
    expect(md).toContain("Milestones");
    expect(md).toContain("Highest Portfolio Value");
    expect(md).toContain("Personal Bests");
    expect(md).toContain("Highlights");
    expect(md).toContain("Recovered from High Risk");
    expect(md).toContain("Risk improved from 80 to 30.");
    expect(md).not.toContain("No data in this period.");
  });

  it("html renders the same real facts, HTML-escaped where needed", () => {
    const html = buildHistoricalReportHtml(report, GENERATED_AT);
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Cautious Holder → Growth Seeker");
    expect(html).toContain("<strong>Recovered from High Risk:</strong>");
    expect(html).not.toContain("No data in this period.");
  });

  it("text renders the same real facts with no markup", () => {
    const text = buildHistoricalReportText(report, GENERATED_AT);
    expect(text).toContain("MAJOR RECOVERIES");
    expect(text).toContain("High Risk: 80 → 30 (2026-09-01T00:00:00.000Z)");
    expect(text).not.toContain("**");
    expect(text).not.toContain("<");
  });

  it("DETERMINISM: identical report and timestamp produce byte-identical output across all three formats", () => {
    expect(buildHistoricalReportMarkdown(report, GENERATED_AT)).toBe(buildHistoricalReportMarkdown(report, GENERATED_AT));
    expect(buildHistoricalReportHtml(report, GENERATED_AT)).toBe(buildHistoricalReportHtml(report, GENERATED_AT));
    expect(buildHistoricalReportText(report, GENERATED_AT)).toBe(buildHistoricalReportText(report, GENERATED_AT));
  });
});

describe("report-export — HTML escaping", () => {
  it("escapes real report values that happen to contain HTML-significant characters", () => {
    const report = makeReport({ fingerprintChanges: [{ from: "A & B", to: "<script>", date: "2026-09-01T00:00:00.000Z" }] });
    const html = buildHistoricalReportHtml(report, GENERATED_AT);
    expect(html).toContain("A &amp; B");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});

describe("report-export — FILENAME GENERATION", () => {
  it("is deterministic for the same real report period and timestamp", () => {
    const report = makeReport({ period: "30d" });
    expect(buildHistoricalReportFilename(report, "markdown", GENERATED_AT)).toBe(buildHistoricalReportFilename(report, "markdown", GENERATED_AT));
  });

  it("uses the real report period and the correct extension per format", () => {
    const report = makeReport({ period: "90d" });
    expect(buildHistoricalReportFilename(report, "markdown", GENERATED_AT)).toMatch(/^base-radar-wallet-report-90d-.*\.md$/);
    expect(buildHistoricalReportFilename(report, "html", GENERATED_AT)).toMatch(/\.html$/);
    expect(buildHistoricalReportFilename(report, "text", GENERATED_AT)).toMatch(/\.txt$/);
  });

  it("different periods produce different real filenames", () => {
    expect(buildHistoricalReportFilename(makeReport({ period: "7d" }), "markdown", GENERATED_AT)).not.toBe(buildHistoricalReportFilename(makeReport({ period: "30d" }), "markdown", GENERATED_AT));
  });
});
