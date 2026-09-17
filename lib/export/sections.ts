/**
 * V4-FUTURE-001 — the one shared `{title, rows}[]` shape any export feature
 * in this app builds its formatted output from. Moved here from
 * `lib/report-export/sections.ts` once Monthly Portfolio Digest needed the
 * identical shape for its own extra sections (Story, Recommendations, Next
 * Month Focus) — a second export feature needing the same type is exactly
 * the signal that it belongs in the shared `lib/export/` module, not
 * duplicated as a second, slightly-different type per feature.
 */

export type ExportRow = { label: string; value: string };
export type ExportSection = { title: string; rows: ExportRow[] };
