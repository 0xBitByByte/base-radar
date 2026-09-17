import { describe, expect, it } from "vitest";

import { buildHistoricalReportCsv } from "@/lib/report-export/csv";
import { renderSectionsAsCsv } from "@/lib/export/render";
import type { HistoricalReport } from "@/components/wallet/walletReportEngine";
import type { PersonalBests, PortfolioMilestones } from "@/lib/wallet-analytics/types";

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
    period: "7d",
    overview: { period: "7d", periodLabel: "Last 7 Days", snapshotCount: 1, firstSnapshotDate: "2026-09-05T00:00:00.000Z", lastSnapshotDate: "2026-09-05T00:00:00.000Z", startValue: 12000, endValue: 12000, netValueChange: 0 },
    health: { ...EMPTY_METRIC_SUMMARY },
    confidence: { ...EMPTY_METRIC_SUMMARY, metric: "confidenceScore", label: "Confidence" },
    risk: { ...EMPTY_METRIC_SUMMARY, metric: "riskScore", label: "Risk" },
    value: { ...EMPTY_METRIC_SUMMARY, metric: "totalValue", label: "Portfolio Value" },
    fingerprintChanges: [],
    majorRecoveries: [],
    personalBests: EMPTY_PERSONAL_BESTS,
    milestones: EMPTY_MILESTONES,
    highlights: [],
    statistics: { highestValue: null, lowestRisk: null, highestConfidence: null, bestHealth: null, largestImprovement: null, largestDecline: null, recoveryCount: 0, milestoneCount: 0, snapshotCount: 1 },
    ...overrides,
  };
}

const GENERATED_AT = "2026-09-06T21:00:00.000Z";

describe("renderSectionsAsCsv", () => {
  it("real Section/Label/Value rows, real header, no fabricated column", () => {
    const csv = renderSectionsAsCsv("Test Report", GENERATED_AT, [{ title: "Overview", rows: [{ label: "Snapshots", value: "3" }] }]);
    const lines = csv.trim().split("\r\n");
    expect(lines[1]).toBe("Section,Label,Value");
    expect(lines[2]).toBe("Overview,Snapshots,3");
  });

  it("quotes a field only when it genuinely contains a comma, quote, or newline (RFC 4180)", () => {
    const csv = renderSectionsAsCsv("T", GENERATED_AT, [{ title: "S", rows: [{ label: "Note", value: 'Contains, a comma and a "quote"' }] }]);
    expect(csv).toContain('"Contains, a comma and a ""quote"""');
  });

  it("never quotes a plain value unnecessarily", () => {
    const csv = renderSectionsAsCsv("T", GENERATED_AT, [{ title: "S", rows: [{ label: "Plain", value: "12000" }] }]);
    expect(csv).toContain("S,Plain,12000");
    expect(csv).not.toContain('"12000"');
  });

  it("an empty section contributes zero data rows, never a blank placeholder row", () => {
    const csv = renderSectionsAsCsv("T", GENERATED_AT, [{ title: "Empty", rows: [] }]);
    const lines = csv.trim().split("\r\n");
    expect(lines).toHaveLength(2); // comment line + header only
  });
});

describe("buildHistoricalReportCsv", () => {
  it("the real report's own real overview values appear in the CSV, unmodified (a value containing a comma, like a formatted USD amount, is correctly quoted)", () => {
    const csv = buildHistoricalReportCsv(makeReport(), GENERATED_AT);
    expect(csv).toContain("Overview,Snapshots,1");
    expect(csv).toContain('Overview,Start Value,"$12,000"');
  });

  it("a genuinely empty report (0 snapshots) produces an honest, near-empty CSV — never a fabricated row", () => {
    const emptyReport = makeReport({ overview: { period: "7d", periodLabel: "Last 7 Days", snapshotCount: 0, firstSnapshotDate: null, lastSnapshotDate: null, startValue: null, endValue: null, netValueChange: null } });
    const csv = buildHistoricalReportCsv(emptyReport, GENERATED_AT);
    expect(csv).toContain("Overview,Snapshots,0");
    expect(csv).not.toContain("Health Summary");
  });

  it("determinism: identical inputs produce an identical CSV", () => {
    const report = makeReport();
    expect(buildHistoricalReportCsv(report, GENERATED_AT)).toBe(buildHistoricalReportCsv(report, GENERATED_AT));
  });
});
