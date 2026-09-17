"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, FileText, Info } from "lucide-react";

import { useExecutiveReports } from "@/lib/hooks/useExecutiveReports";
import type { DailyIntelligenceBriefing } from "@/lib/ai-intelligence/generator/briefing";
import type { ReportType } from "@/lib/executive-reports/types";
import type { SmartCollectionResult } from "@/lib/smart-collections/types";
import { ReportSectionView } from "@/components/reports/ReportSectionView";
import { GLASS_CARD_SURFACE } from "@/components/ui/glassStyles";
import { EmptyState } from "@/components/ui/EmptyState";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { cn } from "@/lib/utils";

/** PR-090.05 (AI Executive Reports) — one expanded report. `reportType` is already validated by the route (`app/dashboard/reports/[type]/page.tsx` calls `notFound()` for anything outside `REPORT_TYPES`). */
export function ReportDetailView({ reportType, initialBriefing, serverSmartCollections }: { reportType: ReportType; initialBriefing: DailyIntelligenceBriefing | null; serverSmartCollections: SmartCollectionResult[] }) {
  const reports = useExecutiveReports(initialBriefing, serverSmartCollections);
  const report = reports.find((r) => r.id === reportType);
  if (!report) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/dashboard/reports"
          className="flex w-fit items-center gap-1.5 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:text-radar-white"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          All Executive Reports
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-radar-primary/10 text-radar-primary dark:bg-radar-accent/10 dark:text-radar-accent">
            <FileText className="size-5" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="text-2xl font-semibold tracking-tight text-radar-light-text dark:text-radar-white">{report.title}</h1>
            <p className="text-sm text-radar-light-muted dark:text-radar-muted">{report.subtitle}</p>
          </div>
        </div>

        {report.status === "ready" && (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">
            Generated <RelativeTime iso={report.generatedAt} />
            {report.averageConfidence !== null && ` · ${report.averageConfidence}% average confidence`}
          </p>
        )}
      </div>

      {report.status === "checking" && (
        <div className={cn("flex flex-col gap-2 p-6", GLASS_CARD_SURFACE)} role="status" aria-label={`Checking ${report.title}`}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-radar-light-surface dark:bg-white/5" />
          ))}
        </div>
      )}

      {report.status === "unavailable" && (
        <div className={cn("p-6", GLASS_CARD_SURFACE)}>
          <EmptyState
            icon={AlertTriangle}
            title="Can't generate right now"
            description="This report needs the Alert Engine's real intelligence, which didn't load this visit. Try again on your next visit — Base Radar never shows outdated intelligence as current."
          />
        </div>
      )}

      {report.status === "ready" && (
        <>
          <section className={cn("flex flex-col gap-2 p-6", GLASS_CARD_SURFACE)} aria-labelledby="executive-summary-heading">
            <h2 id="executive-summary-heading" className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
              Executive Summary
            </h2>
            <p className="text-sm leading-relaxed text-radar-light-text dark:text-radar-white">{report.executiveSummary}</p>
            <p className="text-[10.5px] text-radar-light-muted dark:text-radar-muted">Composed deterministically from the sections below — not written by a language model.</p>
          </section>

          {report.sections.map((section) => (
            <div key={section.id} className={cn("p-6", GLASS_CARD_SURFACE)}>
              <ReportSectionView section={section} />
            </div>
          ))}

          {report.limitations.length > 0 && (
            <section className={cn("flex flex-col gap-3 p-6", GLASS_CARD_SURFACE)} aria-labelledby="limitations-heading">
              <h2 id="limitations-heading" className="flex items-center gap-1.5 text-sm font-semibold text-radar-light-text dark:text-radar-white">
                <Info className="size-4 shrink-0" aria-hidden="true" />
                Limitations
              </h2>
              <ul className="flex flex-col gap-2">
                {report.limitations.map((limitation) => (
                  <li key={limitation.label} className="flex flex-col gap-0.5 text-xs">
                    <span className="font-medium text-radar-light-text dark:text-radar-white">{limitation.label}</span>
                    <span className="text-radar-light-muted dark:text-radar-muted">{limitation.detail}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
