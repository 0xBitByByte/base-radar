/**
 * V4-FUTURE-002B — the one place any sharing feature turns an already-built
 * `ExportSection[]` (plus its own title/summary/description) into a full
 * `ShareProfile`. Reuses `lib/export/render.ts`'s three renderers verbatim
 * — never a fourth Markdown/Text/HTML implementation. Statistics are
 * computed here, once, from the SAME rendered text every consumer already
 * has — never recomputed per-consumer.
 */

import { renderSectionsAsHtml, renderSectionsAsMarkdown, renderSectionsAsText } from "@/lib/export/render";
import type { ExportSection } from "@/lib/export/sections";
import type { ShareProfile, ShareStats } from "@/lib/share/types";

const WORDS_PER_MINUTE = 200;

function computeShareStats(sections: ExportSection[], plainText: string): ShareStats {
  const sectionsIncluded = sections.filter((section) => section.rows.length > 0).length;
  const trimmed = plainText.trim();
  const wordCount = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
  const estimatedReadingMinutes = wordCount === 0 ? 0 : Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
  return { sectionsIncluded, wordCount, estimatedReadingMinutes };
}

export function buildShareProfile(params: { title: string; summary: string; description: string; sections: ExportSection[]; generatedAt: string }): ShareProfile {
  const { title, summary, description, sections, generatedAt } = params;
  const markdown = renderSectionsAsMarkdown(title, generatedAt, sections);
  const text = renderSectionsAsText(title, generatedAt, sections);
  const html = renderSectionsAsHtml(title, generatedAt, sections);

  return { title, summary, description, markdown, text, html, stats: computeShareStats(sections, text), generatedAt };
}
