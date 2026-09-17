"use client";

import { BookOpen, Calendar, CheckCircle2, Download, HeartPulse, ListChecks, RotateCcw, Sparkles, Star, Target, TrendingDown, TrendingUp, Trophy as TrophyIcon } from "lucide-react";

import { cn, downloadTextFile } from "@/lib/utils";
import type { MonthlyDigest } from "@/lib/monthly-digest/types";
import { buildMonthlyDigestFilename, buildMonthlyDigestHtml, buildMonthlyDigestMarkdown, buildMonthlyDigestText, type MonthlyDigestExportFormat } from "@/lib/monthly-digest";
import { GLASS_CARD_SURFACE } from "@/components/ui/glassStyles";
import { EmptyState } from "@/components/ui/EmptyState";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { HIGHLIGHT_PRIORITY_CLASS, HIGHLIGHT_PRIORITY_LABEL } from "@/components/wallet/walletAnalyticsMeta";

/**
 * V4-FUTURE-001 (Monthly Portfolio Digest) — a read-only curated view over
 * an already-built `MonthlyDigest`. Every value here is a direct read of
 * `digest`'s own fields — no calculation happens in this file, matching
 * this feature's own "pure presentation" scope. Reuses the same
 * `SectionCard`/badge/export-button conventions `WalletReportView.tsx`/
 * `WalletAIChatPanel.tsx` already established.
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

const EXPORT_FORMATS: { format: MonthlyDigestExportFormat; label: string; mimeType: string; build: (digest: MonthlyDigest, generatedAt: string) => string }[] = [
  { format: "markdown", label: "Markdown", mimeType: "text/markdown", build: buildMonthlyDigestMarkdown },
  { format: "text", label: "Text", mimeType: "text/plain", build: buildMonthlyDigestText },
  { format: "html", label: "HTML", mimeType: "text/html", build: buildMonthlyDigestHtml },
];

function ExportDigestButtons({ digest }: { digest: MonthlyDigest }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Export digest">
      <span className="flex items-center gap-1 text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">
        <Download className="size-3 shrink-0" aria-hidden="true" />
        Export Digest
      </span>
      {EXPORT_FORMATS.map(({ format, label, mimeType, build }) => (
        <button
          key={format}
          type="button"
          onClick={() => {
            const generatedAt = new Date().toISOString();
            downloadTextFile(buildMonthlyDigestFilename(digest, format, generatedAt), build(digest, generatedAt), mimeType);
          }}
          className="rounded-full border border-radar-light-border px-2.5 py-1 text-[11px] font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function WalletMonthlyDigestView({ digest, className }: { digest: MonthlyDigest | null; className?: string }) {
  if (!digest) {
    return (
      <SectionCard title="Monthly Digest" icon={<Calendar className="size-4 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />} className={className}>
        <EmptyState icon={Calendar} title="No digest yet." description="A monthly digest builds up once real portfolio history accumulates." />
      </SectionCard>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <SectionCard title={`${digest.monthLabel} Digest`} icon={<Calendar className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />}>
        <p className="text-xs text-radar-light-muted dark:text-radar-muted">
          {digest.report.overview.snapshotCount} snapshot{digest.report.overview.snapshotCount === 1 ? "" : "s"}
          {digest.report.overview.netValueChange !== null && (
            <>
              {" · "}
              {digest.report.overview.netValueChange >= 0 ? "+" : ""}
              {USD_FORMAT.format(digest.report.overview.netValueChange)} net change
            </>
          )}
        </p>
        <ExportDigestButtons digest={digest} />
      </SectionCard>

      <SectionCard title="Health Summary" icon={<HeartPulse className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4 text-xs">
          <span>
            First: <strong className="text-radar-light-text dark:text-radar-white">{digest.healthSummary.first?.value ?? "—"}</strong>
          </span>
          <span>
            Last: <strong className="text-radar-light-text dark:text-radar-white">{digest.healthSummary.last?.value ?? "—"}</strong>
          </span>
          <span>
            Highest: <strong className="text-radar-light-text dark:text-radar-white">{digest.healthSummary.highest?.value ?? "—"}</strong>
          </span>
          <span>
            Lowest: <strong className="text-radar-light-text dark:text-radar-white">{digest.healthSummary.lowest?.value ?? "—"}</strong>
          </span>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SectionCard title="Largest Improvement" icon={<TrendingUp className="size-4 text-radar-success" aria-hidden="true" />}>
          {digest.largestImprovement ? (
            <p className="text-xs text-radar-light-text dark:text-radar-white">
              {digest.largestImprovement.label} {digest.largestImprovement.summary}
            </p>
          ) : (
            <p className="text-xs text-radar-light-muted dark:text-radar-muted">No improvement recorded this period.</p>
          )}
        </SectionCard>
        <SectionCard title="Largest Decline" icon={<TrendingDown className="size-4 text-radar-danger" aria-hidden="true" />}>
          {digest.largestDecline ? (
            <p className="text-xs text-radar-light-text dark:text-radar-white">
              {digest.largestDecline.label} {digest.largestDecline.summary}
            </p>
          ) : (
            <p className="text-xs text-radar-light-muted dark:text-radar-muted">No decline recorded this period.</p>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Recoveries" icon={<RotateCcw className="size-4 text-radar-success" aria-hidden="true" />}>
        {digest.recoveries.length === 0 ? (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">No recoveries this period.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-xs">
            {digest.recoveries.map((r, i) => (
              <li key={`${r.category}-${r.recoveryDate}-${i}`} className="flex justify-between gap-2">
                <span className="text-radar-light-text dark:text-radar-white">
                  {r.label}: {r.before.value} → {r.after.value}
                </span>
                <time dateTime={r.recoveryDate} className="text-radar-light-muted dark:text-radar-muted">
                  <RelativeTime iso={r.recoveryDate} />
                </time>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="New Personal Bests" icon={<Star className="size-4 text-radar-warning" aria-hidden="true" />}>
        {digest.newPersonalBests.length === 0 ? (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">No new personal bests this period.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-xs">
            {digest.newPersonalBests.map((h) => (
              <li key={h.dedupeKey} className="text-radar-light-text dark:text-radar-white">
                {h.title}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Milestones" icon={<TrophyIcon className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />}>
        {digest.milestones.length === 0 ? (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">No milestones this period.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-xs">
            {digest.milestones.map((h) => (
              <li key={h.dedupeKey} className="text-radar-light-text dark:text-radar-white">
                {h.title}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Important Highlights" icon={<Sparkles className="size-4 text-radar-purple" aria-hidden="true" />}>
        {digest.importantHighlights.length === 0 ? (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">No highlights yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {digest.importantHighlights.map((h) => (
              <li key={h.dedupeKey} className="flex flex-col gap-0.5 border-b border-radar-light-border pb-2 text-xs last:border-0 last:pb-0 dark:border-white/10">
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-[10.5px] font-medium", HIGHLIGHT_PRIORITY_CLASS[h.priority])}>{HIGHLIGHT_PRIORITY_LABEL[h.priority]}</span>
                  <span className="font-medium text-radar-light-text dark:text-radar-white">{h.title}</span>
                </div>
                <p className="text-radar-light-muted dark:text-radar-muted">{h.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Portfolio Story" icon={<BookOpen className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />}>
        {digest.story.length === 0 ? (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">Nothing to tell yet this period.</p>
        ) : (
          <ol className="flex flex-col gap-2 border-l border-radar-light-border pl-3 dark:border-white/10">
            {digest.story.map((entry, i) => (
              <li key={`${entry.timestamp}-${i}`} className="flex flex-col gap-0.5 text-xs">
                <time dateTime={entry.timestamp} className="text-[10.5px] text-radar-light-muted dark:text-radar-muted">
                  <RelativeTime iso={entry.timestamp} />
                </time>
                <span className="text-radar-light-text dark:text-radar-white">{entry.headline}</span>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>

      <SectionCard title="Recommendations" icon={<ListChecks className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />}>
        <div className="flex flex-col gap-3">
          <div>
            <span className="text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">Top Priorities</span>
            {digest.recommendations.topPriorities.length === 0 ? (
              <p className="mt-1 text-xs text-radar-light-muted dark:text-radar-muted">Nothing urgent right now.</p>
            ) : (
              <ul className="mt-1 flex flex-col gap-1 text-xs">
                {digest.recommendations.topPriorities.map((a) => (
                  <li key={a.id} className="text-radar-light-text dark:text-radar-white">
                    {a.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <span className="flex items-center gap-1 text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
              <CheckCircle2 className="size-3 shrink-0" aria-hidden="true" />
              Completed Improvements
            </span>
            {digest.recommendations.completedImprovements.length === 0 ? (
              <p className="mt-1 text-xs text-radar-light-muted dark:text-radar-muted">None completed this period.</p>
            ) : (
              <ul className="mt-1 flex flex-col gap-1 text-xs">
                {digest.recommendations.completedImprovements.map((r, i) => (
                  <li key={`${r.category}-${i}`} className="text-radar-light-text dark:text-radar-white">
                    {r.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <span className="text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">Still Outstanding</span>
            {digest.recommendations.stillOutstanding.length === 0 ? (
              <p className="mt-1 text-xs text-radar-light-muted dark:text-radar-muted">Nothing outstanding.</p>
            ) : (
              <ul className="mt-1 flex flex-col gap-1 text-xs">
                {digest.recommendations.stillOutstanding.map((r) => (
                  <li key={r.id} className="text-radar-light-text dark:text-radar-white">
                    {r.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Next Month Focus" icon={<Target className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />}>
        {digest.nextMonthFocus ? (
          <div className="flex flex-col gap-0.5 text-xs">
            <span className="font-medium text-radar-light-text dark:text-radar-white">{digest.nextMonthFocus.action}</span>
            {digest.nextMonthFocus.reason && <span className="text-radar-light-muted dark:text-radar-muted">{digest.nextMonthFocus.reason}</span>}
          </div>
        ) : (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">No focus area identified yet.</p>
        )}
      </SectionCard>
    </div>
  );
}
