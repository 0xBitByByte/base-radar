/**
 * V4-FUTURE-002 (Feature 5) — "Export support... reuse Historical Report
 * Export. Do not duplicate formatting logic." Combines
 * `buildReportExportSections(story.report)` (Historical Report Export's own
 * section builder, reused verbatim) with this story's own extra narrative
 * sections, then renders through the SAME shared `lib/export/render.ts`
 * functions Historical Report Export and Monthly Digest Export both use —
 * no second Markdown/HTML/text renderer anywhere in this file.
 */

import { renderSectionsAsHtml, renderSectionsAsMarkdown, renderSectionsAsText } from "@/lib/export/render";
import { exportFilenameStamp } from "@/lib/export/markdown";
import { buildStoryOnlyExportSections } from "@/lib/portfolio-story/sections";
import type { PortfolioStory } from "@/lib/portfolio-story/types";
import { buildReportExportSections } from "@/lib/report-export/sections";

const STORY_TITLE = "Base Radar — Portfolio Story";

function storySections(story: PortfolioStory) {
  return [...buildReportExportSections(story.report), ...buildStoryOnlyExportSections(story)];
}

export function buildPortfolioStoryMarkdown(story: PortfolioStory, generatedAt: string = new Date().toISOString()): string {
  return renderSectionsAsMarkdown(STORY_TITLE, generatedAt, storySections(story));
}

export function buildPortfolioStoryText(story: PortfolioStory, generatedAt: string = new Date().toISOString()): string {
  return renderSectionsAsText(STORY_TITLE, generatedAt, storySections(story));
}

export function buildPortfolioStoryHtml(story: PortfolioStory, generatedAt: string = new Date().toISOString()): string {
  return renderSectionsAsHtml(STORY_TITLE, generatedAt, storySections(story));
}

export type PortfolioStoryExportFormat = "markdown" | "text" | "html";
const EXTENSION: Record<PortfolioStoryExportFormat, string> = { markdown: "md", text: "txt", html: "html" };

export function buildPortfolioStoryFilename(format: PortfolioStoryExportFormat, generatedAt: string = new Date().toISOString()): string {
  return `base-radar-portfolio-story-${exportFilenameStamp(generatedAt)}.${EXTENSION[format]}`;
}
