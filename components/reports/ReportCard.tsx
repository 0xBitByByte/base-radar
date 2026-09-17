import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ExecutiveReport } from "@/lib/executive-reports/types";
import { GLASS_CARD_SURFACE } from "@/components/ui/glassStyles";
import { RelativeTime } from "@/components/shared/RelativeTime";

/** PR-090.05 (AI Executive Reports) — one summary card for the report index. Every number shown is real; "Generated," never "Live," since nothing here runs without this page open. */
export function ReportCard({ report }: { report: ExecutiveReport }) {
  const isUnavailable = report.status === "unavailable";
  const isChecking = report.status === "checking";
  const sectionCount = report.sections.filter((s) => s.claims.length > 0 || s.collectionMatches.length > 0 || s.metrics.length > 0).length;

  return (
    <Link
      href={`/dashboard/reports/${report.id}`}
      className={cn("group flex flex-col gap-3 p-5 outline-none transition-colors hover:border-radar-primary/30 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:hover:border-radar-accent/30", GLASS_CARD_SURFACE)}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-radar-light-text dark:text-radar-white">{report.title}</h3>
        <ArrowRight className="size-4 shrink-0 text-radar-light-muted transition-transform group-hover:translate-x-0.5 dark:text-radar-muted" aria-hidden="true" />
      </div>

      <p className="line-clamp-2 text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">{report.executiveSummary}</p>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-radar-light-muted dark:text-radar-muted">
        {isUnavailable ? (
          <span className="flex items-center gap-1 font-medium text-radar-danger">
            <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
            Can&apos;t generate right now
          </span>
        ) : isChecking ? (
          <span className="font-medium">Checking…</span>
        ) : (
          <>
            <span className="font-medium text-radar-light-text dark:text-radar-white">
              {sectionCount} populated section{sectionCount === 1 ? "" : "s"}
            </span>
            {report.averageConfidence !== null && <span>· {report.averageConfidence}% avg. confidence</span>}
            <span>
              · Generated <RelativeTime iso={report.generatedAt} />
            </span>
          </>
        )}
      </div>
    </Link>
  );
}
