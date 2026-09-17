/**
 * V4-FUTURE-001 (Phase 2) — renders `buildReportExportSections()`'s already-
 * built structure as plain text via the shared `lib/export/render.ts`
 * renderer.
 */

import { renderSectionsAsText } from "@/lib/export/render";
import { buildReportExportSections } from "@/lib/report-export/sections";
import type { HistoricalReport } from "@/components/wallet/walletReportEngine";
import { REPORT_PERIOD_LABEL } from "@/components/wallet/walletReportEngine";

export function buildHistoricalReportText(report: HistoricalReport, generatedAt: string = new Date().toISOString()): string {
  return renderSectionsAsText(`Base Radar — Historical Report (${REPORT_PERIOD_LABEL[report.period]})`, generatedAt, buildReportExportSections(report));
}
