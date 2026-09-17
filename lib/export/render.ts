/**
 * V4-FUTURE-001 — the one place any export feature in this app renders an
 * already-built `ExportSection[]` as Markdown, plain text, or a standalone
 * HTML document. Extracted from `lib/report-export/{markdown,text,html}.ts`
 * (Historical Report Export) once Monthly Portfolio Digest needed the
 * identical three renderers for its own sections — "Do NOT duplicate
 * formatting logic," per that feature's own brief. `lib/report-export/`
 * now calls these directly; it owns only the report-specific SECTION
 * BUILDING (`buildReportExportSections`), never a second copy of the
 * render loop itself.
 */

import { formatExportedAtLine, mdBullet, mdHeading } from "@/lib/export/markdown";
import type { ExportSection } from "@/lib/export/sections";

export function renderSectionsAsMarkdown(title: string, generatedAt: string, sections: ExportSection[]): string {
  const lines: string[] = [mdHeading(1, title), "", formatExportedAtLine(generatedAt), ""];

  for (const section of sections) {
    if (section.rows.length === 0) continue;
    lines.push(mdHeading(2, section.title), "");
    for (const row of section.rows) lines.push(mdBullet(row.label, row.value));
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function renderSectionsAsText(title: string, generatedAt: string, sections: ExportSection[]): string {
  const lines: string[] = [title, formatExportedAtLine(generatedAt), ""];

  for (const section of sections) {
    if (section.rows.length === 0) continue;
    lines.push(section.title.toUpperCase(), "-".repeat(section.title.length));
    for (const row of section.rows) lines.push(`${row.label}: ${row.value}`);
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderSectionsAsHtml(title: string, generatedAt: string, sections: ExportSection[]): string {
  const nonEmpty = sections.filter((s) => s.rows.length > 0);
  const body = nonEmpty
    .map((section) => `<h2>${escapeHtml(section.title)}</h2>\n<ul>\n${section.rows.map((row) => `  <li><strong>${escapeHtml(row.label)}:</strong> ${escapeHtml(row.value)}</li>`).join("\n")}\n</ul>`)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
  h1 { font-size: 1.4rem; }
  h2 { font-size: 1.1rem; margin-top: 2rem; border-bottom: 1px solid #ddd; padding-bottom: 0.25rem; }
  ul { padding-left: 1.25rem; }
  li { margin: 0.25rem 0; }
  .generated { color: #666; font-size: 0.9rem; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p class="generated">${escapeHtml(formatExportedAtLine(generatedAt))}</p>
${body}
</body>
</html>
`;
}

/**
 * PR-092.06 (Export & Sharing) — real, importable CSV: `Section,Label,Value`
 * rows, one per real `ExportRow` already built by `buildReportExportSections()`
 * (or any other feature's own section builder) — no new field, no
 * recomputed value, the exact same data the Markdown/Text/HTML renderers
 * above already format. RFC 4180 quoting: a field is wrapped in `"..."`
 * (with `"` doubled) only when it actually contains a comma, quote, or
 * newline — never unconditionally, so the common case stays readable.
 */
function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function renderSectionsAsCsv(title: string, generatedAt: string, sections: ExportSection[]): string {
  const lines: string[] = [[csvField("Section"), csvField("Label"), csvField("Value")].join(",")];
  for (const section of sections) {
    for (const row of section.rows) {
      lines.push([csvField(section.title), csvField(row.label), csvField(row.value)].join(","));
    }
  }
  // A CSV file has no natural place for a title/generated-at line without
  // breaking the fixed 3-column shape every real data row uses — recorded
  // as a leading comment row instead (a `#`-prefixed line, which every
  // mainstream spreadsheet/CSV parser either skips or renders as inert
  // text in column A), never silently dropped.
  return [`# ${title} — ${formatExportedAtLine(generatedAt)}`, ...lines].join("\r\n") + "\r\n";
}
