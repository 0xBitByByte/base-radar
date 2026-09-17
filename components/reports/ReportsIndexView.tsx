"use client";

import { FileText } from "lucide-react";

import { useExecutiveReports } from "@/lib/hooks/useExecutiveReports";
import type { DailyIntelligenceBriefing } from "@/lib/ai-intelligence/generator/briefing";
import type { SmartCollectionResult } from "@/lib/smart-collections/types";
import { ReportCard } from "@/components/reports/ReportCard";

/**
 * PR-090.05 (AI Executive Reports) — the index. `initialBriefing`/
 * `serverSmartCollections` were already awaited/evaluated once server-side
 * (`app/dashboard/reports/page.tsx`); `useExecutiveReports` composes all six
 * reports from that same canonical data, never a second fetch.
 */
export function ReportsIndexView({ initialBriefing, serverSmartCollections }: { initialBriefing: DailyIntelligenceBriefing | null; serverSmartCollections: SmartCollectionResult[] }) {
  const reports = useExecutiveReports(initialBriefing, serverSmartCollections);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <div className="flex items-center gap-2">
          <FileText className="size-5 text-radar-primary dark:text-radar-accent" aria-hidden="true" />
          <h1 className="text-2xl font-semibold text-radar-light-text dark:text-radar-white">AI Executive Reports</h1>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-radar-light-muted dark:text-radar-muted">
          Executive-level views over Base Radar&apos;s own intelligence — Daily Brief, Weekly, Monthly, Market Outlook, Ecosystem, and Opportunity reports. Every report is generated from the latest available Base Radar intelligence, not real-time
          monitoring, and not a scheduled or background job.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list" aria-label="Executive Reports">
        {reports.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>
    </div>
  );
}
