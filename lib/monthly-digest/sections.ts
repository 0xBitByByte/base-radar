/**
 * V4-FUTURE-001 (Phase 8) — the digest's OWN extra export sections (Story,
 * Recommendations, Next Month Focus) — the fields `HistoricalReport` itself
 * doesn't carry. `buildReportExportSections()` (Historical Report Export)
 * already covers everything else (`digest.report`); this file adds only
 * what's genuinely new to the digest, never re-building what that function
 * already does.
 */

import type { ExportSection } from "@/lib/export/sections";
import type { MonthlyDigest } from "@/lib/monthly-digest/types";

export function buildDigestOnlyExportSections(digest: MonthlyDigest): ExportSection[] {
  return [
    { title: "Portfolio Story", rows: digest.story.map((entry) => ({ label: entry.timestamp, value: entry.headline })) },
    {
      title: "Recommendations — Top Priorities",
      rows: digest.recommendations.topPriorities.map((a) => ({ label: a.title, value: `${a.description} (${a.priority} priority, ${a.estimatedImpact} impact)` })),
    },
    {
      title: "Recommendations — Completed Improvements",
      rows: digest.recommendations.completedImprovements.map((r) => ({ label: r.label, value: `${r.before.value} → ${r.after.value} (${r.recoveryDate})` })),
    },
    { title: "Recommendations — Still Outstanding", rows: digest.recommendations.stillOutstanding.map((r) => ({ label: r.title, value: r.reason })) },
    ...(digest.nextMonthFocus ? [{ title: "Next Month Focus", rows: [{ label: digest.nextMonthFocus.action, value: digest.nextMonthFocus.reason ?? "" }] }] : []),
  ];
}
