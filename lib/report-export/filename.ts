/**
 * V4-FUTURE-001 (Phase 2) — a real, deterministic export filename: same
 * report + format in, same name out (down to the minute), never a random
 * suffix. Uses the same `exportFilenameStamp()` Chat Export's own filename
 * builder uses.
 */

import { exportFilenameStamp } from "@/lib/export/markdown";
import type { HistoricalReport } from "@/components/wallet/walletReportEngine";

export type ReportExportFormat = "markdown" | "html" | "text" | "csv";

const EXTENSION: Record<ReportExportFormat, string> = { markdown: "md", html: "html", text: "txt", csv: "csv" };

export function buildHistoricalReportFilename(report: HistoricalReport, format: ReportExportFormat, generatedAt: string = new Date().toISOString()): string {
  return `base-radar-wallet-report-${report.period}-${exportFilenameStamp(generatedAt)}.${EXTENSION[format]}`;
}
