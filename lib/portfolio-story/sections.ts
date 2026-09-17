/**
 * V4-FUTURE-002 (Feature 5) — the story's OWN extra export sections
 * (Introduction, Where You Started, Key Turning Points, Current Position,
 * Next Recommended Action) — the narrative framing `HistoricalReport`
 * itself doesn't carry. `buildReportExportSections()` (Historical Report
 * Export, reused verbatim) already covers Overview/Statistics/Recoveries/
 * Milestones/Highlights from `story.report`; this file adds only what's
 * genuinely new to the story.
 */

import type { ExportSection } from "@/lib/export/sections";
import type { PortfolioStory } from "@/lib/portfolio-story/types";

const USD_FORMAT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function formatSnapshot(snapshot: { date: string; value: number | null; health: number | null }): string {
  const parts: string[] = [];
  if (snapshot.value !== null) parts.push(USD_FORMAT.format(snapshot.value));
  if (snapshot.health !== null) parts.push(`health ${snapshot.health}`);
  parts.push(`(${snapshot.date})`);
  return parts.join(" ");
}

export function buildStoryOnlyExportSections(story: PortfolioStory): ExportSection[] {
  return [
    { title: "Introduction", rows: story.introduction ? [{ label: "Executive Summary", value: story.introduction }] : [] },
    { title: "Where You Started", rows: story.whereYouStarted ? [{ label: "First Snapshot", value: formatSnapshot(story.whereYouStarted) }] : [] },
    { title: "Key Turning Points", rows: story.keyTurningPoints.map((moment) => ({ label: moment.timestamp, value: moment.headline })) },
    { title: "Current Position", rows: story.currentPosition ? [{ label: "Latest Snapshot", value: formatSnapshot(story.currentPosition) }] : [] },
    ...(story.nextRecommendedAction
      ? [{ title: "Next Recommended Action", rows: [{ label: story.nextRecommendedAction.action, value: story.nextRecommendedAction.reason ?? "" }] }]
      : []),
  ];
}
