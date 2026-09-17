/**
 * PR-092.06 (Export & Sharing) — renders `buildReportExportSections()`'s
 * already-built structure as CSV via the shared `lib/export/render.ts`
 * renderer, exactly like `markdown.ts`/`text.ts`/`html.ts` already do —
 * the same real report data, a fourth format, never a second section
 * builder.
 */

import { renderSectionsAsCsv } from "@/lib/export/render";
import { buildReportExportSections } from "@/lib/report-export/sections";
import type { HistoricalReport } from "@/components/wallet/walletReportEngine";
import { REPORT_PERIOD_LABEL } from "@/components/wallet/walletReportEngine";

export function buildHistoricalReportCsv(report: HistoricalReport, generatedAt: string = new Date().toISOString()): string {
  return renderSectionsAsCsv(`Base Radar — Historical Report (${REPORT_PERIOD_LABEL[report.period]})`, generatedAt, buildReportExportSections(report));
}
