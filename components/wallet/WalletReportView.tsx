"use client";

import { useMemo, useState } from "react";
import { Activity, BarChart3, DollarSign, Download, Fingerprint, HeartPulse, Printer, RotateCcw, ShieldAlert, Sparkles, Star, Trophy } from "lucide-react";

import { cn, downloadTextFile } from "@/lib/utils";
import type { WalletAnalytics } from "@/lib/wallet-analytics/types";
import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";
import type { UseWalletHistoryResult } from "@/lib/hooks/useWalletHistory";
import type { PortfolioAI } from "@/lib/portfolio-ai/types";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import type { CrossFeatureIntelligence } from "@/lib/cross-feature/types";
import type { MonthlyDigest } from "@/lib/monthly-digest/types";
import type { PortfolioStory } from "@/lib/portfolio-story/types";
import type { ShareSourceData } from "@/lib/report-share/types";
import { GLASS_CARD_SURFACE } from "@/components/ui/glassStyles";
import { EmptyState } from "@/components/ui/EmptyState";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { HIGHLIGHT_PRIORITY_CLASS, HIGHLIGHT_PRIORITY_LABEL } from "@/components/wallet/walletAnalyticsMeta";
import { buildHistoricalReport, REPORT_PERIODS, REPORT_PERIOD_LABEL, type ReportMetricSummary, type ReportPeriod, type HistoricalReport } from "@/components/wallet/walletReportEngine";
import { buildHistoricalReportCsv, buildHistoricalReportFilename, buildHistoricalReportHtml, buildHistoricalReportMarkdown, buildHistoricalReportText, type ReportExportFormat } from "@/lib/report-export";
import { ReportSharePreviewButton } from "@/components/wallet/ReportSharePreview";

/**
 * V4-FUTURE-002 (Feature 7 — Smart Report Sharing) — every field this view
 * needs to build a real `ShareSourceData`, supplied by the CALLER (never a
 * hook call inside this file — this component has always been pure
 * presentation over `history`/`analytics` props, with zero wallet-
 * connection dependency, and stays that way). `null`/absent when the
 * caller hasn't wired sharing in, in which case `ReportSharePreviewButton`
 * simply renders nothing — no behavior change for any existing caller.
 */
export type ReportShareContext = {
  intelligence: PortfolioIntelligence | null;
  ai: PortfolioAI | null;
  walletHistory: UseWalletHistoryResult;
  crossFeature: CrossFeatureIntelligence;
  digest: MonthlyDigest | null;
  story: PortfolioStory | null;
};

/**
 * V4-HISTORY-005 (Phase 5) — the Historical Report page: a distinct,
 * read-only surface inside History, entirely separate from Replay (a
 * sibling toggle in `WalletHistorySections.tsx`, never rendered together
 * with `WalletReplayPanel`). Every value shown here comes straight off an
 * already-built `HistoricalReport` (`walletReportEngine.ts`) — no
 * calculation happens in this file, only period-switching and layout.
 */

const USD_FORMAT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function SectionCard({ title, icon, children, className }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 p-5", GLASS_CARD_SURFACE, className)}>
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-xs font-semibold text-radar-light-text dark:text-radar-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium text-radar-light-muted dark:text-radar-muted">{label}</span>
      <span className="text-sm font-semibold text-radar-light-text dark:text-radar-white">{value}</span>
      {sub && <span className="text-[10.5px] text-radar-light-muted dark:text-radar-muted">{sub}</span>}
    </div>
  );
}

function MetricSummaryCard({ summary, icon, format = (v: number) => String(v) }: { summary: ReportMetricSummary; icon: React.ReactNode; format?: (v: number) => string }) {
  return (
    <SectionCard title={`${summary.label} Summary`} icon={icon}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <StatTile
          label="Highest"
          value={summary.highest ? format(summary.highest.value as number) : "—"}
          sub={summary.highest && (
            <time dateTime={summary.highest.date}>
              <RelativeTime iso={summary.highest.date} />
            </time>
          )}
        />
        <StatTile
          label="Lowest"
          value={summary.lowest ? format(summary.lowest.value as number) : "—"}
          sub={summary.lowest && (
            <time dateTime={summary.lowest.date}>
              <RelativeTime iso={summary.lowest.date} />
            </time>
          )}
        />
        <StatTile label="Start of Period" value={summary.first ? format(summary.first.value) : "—"} />
        <StatTile
          label="End of Period"
          value={summary.last ? format(summary.last.value) : "—"}
          sub={summary.change !== null && <span>{summary.change >= 0 ? "+" : ""}{format(summary.change)} over period</span>}
        />
      </div>
    </SectionCard>
  );
}

/**
 * V4-FUTURE-001 (Phase 4) / PR-092.06 — "Export Report": Markdown/Text/HTML/
 * CSV. Every format is built from the SAME already-real `report` object
 * this component already renders — `lib/report-export/` never rerenders,
 * recomputes, or re-fetches anything. Reuses the app's one established
 * download pattern (`downloadTextFile`, `lib/utils.ts`). PDF is deliberately
 * NOT a format here — see `PrintReportButton` below, a real, separate
 * "Print / Save as PDF" action (the browser's own print-to-PDF, no new
 * dependency) rather than a same-shaped file download, since it produces a
 * print dialog rather than an instant file.
 */
const EXPORT_FORMATS: { format: ReportExportFormat; label: string; mimeType: string; build: (report: HistoricalReport, generatedAt: string) => string }[] = [
  { format: "markdown", label: "Markdown", mimeType: "text/markdown", build: buildHistoricalReportMarkdown },
  { format: "text", label: "Text", mimeType: "text/plain", build: buildHistoricalReportText },
  { format: "html", label: "HTML", mimeType: "text/html", build: buildHistoricalReportHtml },
  { format: "csv", label: "CSV", mimeType: "text/csv", build: buildHistoricalReportCsv },
];

/**
 * PR-092.06 (Export & Sharing) — "PDF" without adding a PDF-generation
 * dependency: `buildHistoricalReportHtml()` already produces a complete,
 * clean, self-contained `<!doctype html>` document (no dependency on this
 * page's own DOM/CSS). Opening it in a fresh window and calling the
 * browser's own `print()` gives the user a real "Save as PDF" destination
 * in their OS/browser print dialog — the standard, dependency-free way a
 * web app offers a PDF without a backend. Honestly labeled "Print / Save
 * as PDF," never "Download PDF" — this opens a print dialog, it doesn't
 * hand back a `.pdf` file the way the Markdown/Text/HTML/CSV buttons above
 * hand back their own file.
 */
function printHistoricalReport(report: HistoricalReport, generatedAt: string): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return; // A popup blocker refused the window — the honest, silent no-op; no fallback fabricates a download the browser didn't actually allow.
  printWindow.document.write(buildHistoricalReportHtml(report, generatedAt));
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function PrintReportButton({ report }: { report: HistoricalReport }) {
  return (
    <button
      type="button"
      onClick={() => printHistoricalReport(report, new Date().toISOString())}
      className="flex items-center gap-1 rounded-full border border-radar-light-border px-2.5 py-1 text-[11px] font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
    >
      <Printer className="size-3 shrink-0" aria-hidden="true" />
      Print / Save as PDF
    </button>
  );
}

function ExportReportButtons({ report }: { report: HistoricalReport }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Export report">
      <span className="flex items-center gap-1 text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">
        <Download className="size-3 shrink-0" aria-hidden="true" />
        Export Report
      </span>
      {EXPORT_FORMATS.map(({ format, label, mimeType, build }) => (
        <button
          key={format}
          type="button"
          onClick={() => {
            const generatedAt = new Date().toISOString();
            downloadTextFile(buildHistoricalReportFilename(report, format, generatedAt), build(report, generatedAt), mimeType);
          }}
          className="rounded-full border border-radar-light-border px-2.5 py-1 text-[11px] font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
        >
          {label}
        </button>
      ))}
      <PrintReportButton report={report} />
    </div>
  );
}

export function WalletReportView({
  history,
  analytics,
  shareContext = null,
  className,
}: {
  history: AnalyticsSnapshot[];
  analytics: WalletAnalytics;
  shareContext?: ReportShareContext | null;
  className?: string;
}) {
  const [period, setPeriod] = useState<ReportPeriod>("7d");
  const report = useMemo(() => buildHistoricalReport(history, analytics, period), [history, analytics, period]);

  const shareData = useMemo<ShareSourceData | null>(() => {
    if (!report || !shareContext) return null;
    return {
      report,
      ai: shareContext.ai,
      intelligence: shareContext.intelligence,
      analytics,
      history: { snapshotCount: shareContext.walletHistory.snapshotCount, oldestSnapshot: shareContext.walletHistory.oldestSnapshot, newestSnapshot: shareContext.walletHistory.newestSnapshot },
      crossFeature: shareContext.crossFeature,
      digest: shareContext.digest,
      story: shareContext.story,
    };
  }, [report, shareContext, analytics]);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Report period">
        {REPORT_PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            aria-pressed={period === p}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50",
              period === p
                ? "border-radar-primary bg-radar-primary/10 text-radar-primary dark:border-radar-accent dark:bg-radar-accent/10 dark:text-radar-accent"
                : "border-radar-light-border text-radar-light-muted hover:bg-radar-light-surface dark:border-white/10 dark:text-radar-muted dark:hover:bg-white/5"
            )}
          >
            {REPORT_PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      {!report ? (
        <SectionCard title="Report" icon={<BarChart3 className="size-4 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />}>
          <EmptyState icon={BarChart3} title="No snapshots in this period." description="Try a wider period, or check back once more history accumulates." />
        </SectionCard>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <ExportReportButtons report={report} />
            <ReportSharePreviewButton data={shareData} />
          </div>

          <SectionCard title="Overview" icon={<BarChart3 className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              <StatTile label="Snapshots" value={report.overview.snapshotCount} />
              <StatTile
                label="Period Start"
                value={report.overview.firstSnapshotDate ? <RelativeTime iso={report.overview.firstSnapshotDate} /> : "—"}
              />
              <StatTile label="Start Value" value={report.overview.startValue !== null ? USD_FORMAT.format(report.overview.startValue) : "—"} />
              <StatTile
                label="Net Change"
                value={report.overview.netValueChange !== null ? `${report.overview.netValueChange >= 0 ? "+" : ""}${USD_FORMAT.format(report.overview.netValueChange)}` : "—"}
              />
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MetricSummaryCard summary={report.health} icon={<HeartPulse className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />} />
            <MetricSummaryCard summary={report.confidence} icon={<Activity className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />} />
            <MetricSummaryCard summary={report.risk} icon={<ShieldAlert className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />} />
            <MetricSummaryCard summary={report.value} icon={<DollarSign className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />} format={(v) => USD_FORMAT.format(v)} />
          </div>

          <SectionCard title="Statistics" icon={<Trophy className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              <StatTile label="Highest Value" value={report.statistics.highestValue ? USD_FORMAT.format(report.statistics.highestValue.value as number) : "—"} />
              <StatTile label="Lowest Risk" value={report.statistics.lowestRisk?.value ?? "—"} />
              <StatTile label="Highest Confidence" value={report.statistics.highestConfidence ? `${report.statistics.highestConfidence.value}%` : "—"} />
              <StatTile label="Best Health" value={report.statistics.bestHealth?.value ?? "—"} />
              <StatTile label="Largest Improvement" value={report.statistics.largestImprovement ? `${report.statistics.largestImprovement.label} ${report.statistics.largestImprovement.summary}` : "None"} />
              <StatTile label="Largest Decline" value={report.statistics.largestDecline ? `${report.statistics.largestDecline.label} ${report.statistics.largestDecline.summary}` : "None"} />
              <StatTile label="Recoveries" value={report.statistics.recoveryCount} />
              <StatTile label="Milestones" value={report.statistics.milestoneCount} />
            </div>
          </SectionCard>

          <SectionCard title="Fingerprint Changes" icon={<Fingerprint className="size-4 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />}>
            {report.fingerprintChanges.length === 0 ? (
              <p className="text-xs text-radar-light-muted dark:text-radar-muted">No fingerprint changes in this period.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {report.fingerprintChanges.map((change, i) => (
                  <li key={`${change.date}-${i}`} className="flex items-center justify-between text-xs">
                    <span className="text-radar-light-text dark:text-radar-white">
                      {change.from} → {change.to}
                    </span>
                    <time dateTime={change.date} className="text-radar-light-muted dark:text-radar-muted">
                      <RelativeTime iso={change.date} />
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Major Recoveries" icon={<RotateCcw className="size-4 text-radar-success" aria-hidden="true" />}>
            {report.majorRecoveries.length === 0 ? (
              <p className="text-xs text-radar-light-muted dark:text-radar-muted">No recoveries in this period.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {report.majorRecoveries.map((recovery, i) => (
                  <li key={`${recovery.category}-${recovery.recoveryDate}-${i}`} className="flex items-center justify-between text-xs">
                    <span className="text-radar-light-text dark:text-radar-white">
                      {recovery.label}: {recovery.before.value} → {recovery.after.value}
                    </span>
                    <time dateTime={recovery.recoveryDate} className="text-radar-light-muted dark:text-radar-muted">
                      <RelativeTime iso={recovery.recoveryDate} />
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Personal Bests" icon={<Star className="size-4 text-radar-warning" aria-hidden="true" />}>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              {(
                [
                  ["Best Health", report.personalBests.bestHealth],
                  ["Best Confidence", report.personalBests.bestConfidence],
                  ["Lowest Risk", report.personalBests.lowestRisk],
                  ["Largest Portfolio Value", report.personalBests.largestPortfolioValue],
                  ["Best Diversification", report.personalBests.bestDiversification],
                ] as const
              ).map(([label, milestone]) => (
                <li key={label} className="flex flex-col gap-0.5">
                  <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">{label}</span>
                  <span className="text-sm font-medium text-radar-light-text dark:text-radar-white">{milestone?.value ?? "—"}</span>
                </li>
              ))}
              {report.personalBests.longestStablePortfolio && (
                <li className="flex flex-col gap-0.5">
                  <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">Longest Stable Portfolio</span>
                  <span className="text-sm font-medium text-radar-light-text dark:text-radar-white">
                    {report.personalBests.longestStablePortfolio.snapshotCount} snapshots ({report.personalBests.longestStablePortfolio.fingerprint})
                  </span>
                </li>
              )}
            </ul>
          </SectionCard>

          <SectionCard title="Milestones" icon={<Trophy className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />}>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              {Object.values(report.milestones)
                .filter((m): m is Exclude<typeof m, null> => m !== null)
                .map((milestone) => (
                  <li key={milestone.label} className="flex flex-col gap-0.5">
                    <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">{milestone.label}</span>
                    <span className="text-sm font-medium text-radar-light-text dark:text-radar-white">{milestone.value}</span>
                    <time dateTime={milestone.date} className="text-[10.5px] text-radar-light-muted dark:text-radar-muted">
                      <RelativeTime iso={milestone.date} />
                    </time>
                  </li>
                ))}
            </ul>
          </SectionCard>

          <SectionCard title="Highlights" icon={<Sparkles className="size-4 text-radar-purple" aria-hidden="true" />}>
            {report.highlights.length === 0 ? (
              <p className="text-xs text-radar-light-muted dark:text-radar-muted">No highlights yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {report.highlights.map((highlight) => (
                  <li key={highlight.dedupeKey} className="flex flex-col gap-0.5 border-b border-radar-light-border pb-2 text-xs last:border-0 last:pb-0 dark:border-white/10">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("text-[10.5px] font-medium", HIGHLIGHT_PRIORITY_CLASS[highlight.priority])}>{HIGHLIGHT_PRIORITY_LABEL[highlight.priority]}</span>
                      <span className="font-medium text-radar-light-text dark:text-radar-white">{highlight.title}</span>
                    </div>
                    <p className="text-radar-light-muted dark:text-radar-muted">{highlight.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
