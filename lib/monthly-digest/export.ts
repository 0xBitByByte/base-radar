/**
 * V4-FUTURE-001 (Phase 8) — "Reuse Historical Report Export. Do NOT
 * duplicate formatting logic." Combines `buildReportExportSections(digest.report)`
 * (Historical Report Export's own section builder, reused verbatim) with
 * this digest's own extra sections, then renders through the SAME shared
 * `lib/export/render.ts` functions Historical Report Export itself uses —
 * no second Markdown/HTML/text renderer anywhere in this file.
 */

import { renderSectionsAsHtml, renderSectionsAsMarkdown, renderSectionsAsText } from "@/lib/export/render";
import { exportFilenameStamp } from "@/lib/export/markdown";
import { buildDigestOnlyExportSections } from "@/lib/monthly-digest/sections";
import type { MonthlyDigest } from "@/lib/monthly-digest/types";
import { buildReportExportSections } from "@/lib/report-export/sections";

function digestTitle(digest: MonthlyDigest): string {
  return `Base Radar — Monthly Portfolio Digest (${digest.monthLabel})`;
}

function digestSections(digest: MonthlyDigest) {
  return [...buildReportExportSections(digest.report), ...buildDigestOnlyExportSections(digest)];
}

export function buildMonthlyDigestMarkdown(digest: MonthlyDigest, generatedAt: string = new Date().toISOString()): string {
  return renderSectionsAsMarkdown(digestTitle(digest), generatedAt, digestSections(digest));
}

export function buildMonthlyDigestText(digest: MonthlyDigest, generatedAt: string = new Date().toISOString()): string {
  return renderSectionsAsText(digestTitle(digest), generatedAt, digestSections(digest));
}

export function buildMonthlyDigestHtml(digest: MonthlyDigest, generatedAt: string = new Date().toISOString()): string {
  return renderSectionsAsHtml(digestTitle(digest), generatedAt, digestSections(digest));
}

export type MonthlyDigestExportFormat = "markdown" | "text" | "html";
const EXTENSION: Record<MonthlyDigestExportFormat, string> = { markdown: "md", text: "txt", html: "html" };

export function buildMonthlyDigestFilename(digest: MonthlyDigest, format: MonthlyDigestExportFormat, generatedAt: string = new Date().toISOString()): string {
  const monthSlug = digest.monthLabel.toLowerCase().replace(/\s+/g, "-");
  return `base-radar-monthly-digest-${monthSlug}-${exportFilenameStamp(generatedAt)}.${EXTENSION[format]}`;
}
