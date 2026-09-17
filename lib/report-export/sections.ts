/**
 * V4-FUTURE-001 (Historical Report Export) — the ONE place this feature
 * walks an already-built `HistoricalReport` and reshapes it into a flat,
 * neutral `{title, rows}[]` structure. `markdown.ts`/`html.ts`/`text.ts`
 * each format this SAME structure differently — this file exists
 * specifically so the report isn't walked three separate times with three
 * slightly-different copies of the same field list (per this feature's own
 * "avoid duplicated markdown builders" instruction). No field here is
 * computed — every value is read straight off `HistoricalReport`, the same
 * object `WalletReportView.tsx` already renders.
 */

import type { HistoricalReport, ReportMetricSummary } from "@/components/wallet/walletReportEngine";
import { REPORT_PERIOD_LABEL } from "@/components/wallet/walletReportEngine";
import type { ExportRow, ExportSection } from "@/lib/export/sections";

export type { ExportRow, ExportSection };

const USD_FORMAT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function metricSummaryRows(summary: ReportMetricSummary, format: (value: number) => string): ExportRow[] {
  const rows: ExportRow[] = [];
  if (summary.highest) rows.push({ label: "Highest", value: `${format(summary.highest.value as number)} (${summary.highest.date})` });
  if (summary.lowest) rows.push({ label: "Lowest", value: `${format(summary.lowest.value as number)} (${summary.lowest.date})` });
  if (summary.first) rows.push({ label: "Start of Period", value: format(summary.first.value) });
  if (summary.last) rows.push({ label: "End of Period", value: format(summary.last.value) });
  if (summary.change !== null) rows.push({ label: "Change Over Period", value: `${summary.change >= 0 ? "+" : ""}${format(summary.change)}` });
  return rows;
}

export function buildReportExportSections(report: HistoricalReport): ExportSection[] {
  const sections: ExportSection[] = [
    {
      title: "Overview",
      rows: [
        { label: "Period", value: REPORT_PERIOD_LABEL[report.period] },
        { label: "Snapshots", value: String(report.overview.snapshotCount) },
        ...(report.overview.firstSnapshotDate ? [{ label: "Period Start", value: report.overview.firstSnapshotDate }] : []),
        ...(report.overview.lastSnapshotDate ? [{ label: "Period End", value: report.overview.lastSnapshotDate }] : []),
        ...(report.overview.startValue !== null ? [{ label: "Start Value", value: USD_FORMAT.format(report.overview.startValue) }] : []),
        ...(report.overview.endValue !== null ? [{ label: "End Value", value: USD_FORMAT.format(report.overview.endValue) }] : []),
        ...(report.overview.netValueChange !== null ? [{ label: "Net Value Change", value: `${report.overview.netValueChange >= 0 ? "+" : ""}${USD_FORMAT.format(report.overview.netValueChange)}` }] : []),
      ],
    },
    { title: "Health Summary", rows: metricSummaryRows(report.health, (v) => String(v)) },
    { title: "Confidence Summary", rows: metricSummaryRows(report.confidence, (v) => `${v}%`) },
    { title: "Risk Summary", rows: metricSummaryRows(report.risk, (v) => String(v)) },
    { title: "Portfolio Value Summary", rows: metricSummaryRows(report.value, (v) => USD_FORMAT.format(v)) },
    {
      title: "Statistics",
      rows: [
        ...(report.statistics.highestValue ? [{ label: "Highest Value", value: USD_FORMAT.format(report.statistics.highestValue.value as number) }] : []),
        ...(report.statistics.lowestRisk ? [{ label: "Lowest Risk", value: String(report.statistics.lowestRisk.value) }] : []),
        ...(report.statistics.highestConfidence ? [{ label: "Highest Confidence", value: `${report.statistics.highestConfidence.value}%` }] : []),
        ...(report.statistics.bestHealth ? [{ label: "Best Health", value: String(report.statistics.bestHealth.value) }] : []),
        ...(report.statistics.largestImprovement ? [{ label: "Largest Improvement", value: `${report.statistics.largestImprovement.label} ${report.statistics.largestImprovement.summary}` }] : []),
        ...(report.statistics.largestDecline ? [{ label: "Largest Decline", value: `${report.statistics.largestDecline.label} ${report.statistics.largestDecline.summary}` }] : []),
        { label: "Recoveries", value: String(report.statistics.recoveryCount) },
        { label: "Milestones", value: String(report.statistics.milestoneCount) },
      ],
    },
    { title: "Fingerprint Changes", rows: report.fingerprintChanges.map((c) => ({ label: `${c.from} → ${c.to}`, value: c.date })) },
    { title: "Major Recoveries", rows: report.majorRecoveries.map((r) => ({ label: r.label, value: `${r.before.value} → ${r.after.value} (${r.recoveryDate})` })) },
    {
      title: "Personal Bests",
      rows: [
        ...(report.personalBests.bestHealth ? [{ label: "Best Health", value: String(report.personalBests.bestHealth.value) }] : []),
        ...(report.personalBests.bestConfidence ? [{ label: "Best Confidence", value: String(report.personalBests.bestConfidence.value) }] : []),
        ...(report.personalBests.lowestRisk ? [{ label: "Lowest Risk", value: String(report.personalBests.lowestRisk.value) }] : []),
        ...(report.personalBests.largestPortfolioValue ? [{ label: "Largest Portfolio Value", value: String(report.personalBests.largestPortfolioValue.value) }] : []),
        ...(report.personalBests.bestDiversification ? [{ label: "Best Diversification", value: String(report.personalBests.bestDiversification.value) }] : []),
        ...(report.personalBests.longestStablePortfolio
          ? [{ label: "Longest Stable Portfolio", value: `${report.personalBests.longestStablePortfolio.snapshotCount} snapshots (${report.personalBests.longestStablePortfolio.fingerprint})` }]
          : []),
      ],
    },
    {
      title: "Milestones",
      rows: Object.values(report.milestones)
        .filter((m): m is NonNullable<typeof m> => m !== null)
        .map((m) => ({ label: m.label, value: `${m.value} (${m.date})` })),
    },
    { title: "Highlights", rows: report.highlights.map((h) => ({ label: h.title, value: h.reason })) },
  ];

  return sections;
}
