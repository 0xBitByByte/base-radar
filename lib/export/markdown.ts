/**
 * V4-FUTURE-001 — the one place any text-export feature in this app builds
 * a Markdown document from. Extracted from `lib/ai-chat/export.ts` (Chat
 * Export, the first export feature this session built) once Historical
 * Report Export needed the identical primitives — "Exported {date}" line,
 * a heading, a labeled bullet — rather than a second, slightly-different
 * copy of the same three lines of string formatting.
 */

export const EXPORT_DATE_FORMAT = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

export function formatExportedAtLine(generatedAt: string): string {
  return `Exported ${EXPORT_DATE_FORMAT.format(new Date(generatedAt))}`;
}

export function mdHeading(level: 1 | 2 | 3, text: string): string {
  return `${"#".repeat(level)} ${text}`;
}

export function mdBullet(label: string, value: string): string {
  return `- **${label}:** ${value}`;
}

export function mdItalic(text: string): string {
  return `_${text}_`;
}

/** A real, deterministic export filename base (down to the minute, never a random suffix) — shared by every export feature so filenames stay consistent across the app. */
export function exportFilenameStamp(generatedAt: string): string {
  return generatedAt.slice(0, 16).replace(/[:T]/g, "-");
}
