/**
 * V4-FUTURE-001 (Phase 2) — renders `buildReportExportSections()`'s already-
 * built structure as Markdown via the shared `lib/export/render.ts`
 * renderer — the same one Monthly Portfolio Digest's own export uses, per
 * that feature's "Do NOT duplicate formatting logic" instruction.
 */

import { renderSectionsAsMarkdown } from "@/lib/export/render";
import { buildReportExportSections } from "@/lib/report-export/sections";
import type { HistoricalReport } from "@/components/wallet/walletReportEngine";
import { REPORT_PERIOD_LABEL } from "@/components/wallet/walletReportEngine";

export function buildHistoricalReportMarkdown(report: HistoricalReport, generatedAt: string = new Date().toISOString()): string {
  return renderSectionsAsMarkdown(`Base Radar — Historical Report (${REPORT_PERIOD_LABEL[report.period]})`, generatedAt, buildReportExportSections(report));
}
