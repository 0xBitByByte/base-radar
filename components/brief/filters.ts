/**
 * PR16 Part 3 — the Brief page's search/filter/sort layer. Every function
 * here is pure and operates only on an already-built `DailyBrief`'s own
 * arrays; none of them call `getDailyBrief()`, `buildDailyBrief()`, or any
 * `lib/brief` function — this is presentation-layer query logic, not a
 * second copy of the Daily Brief engine's business logic. Colocated here
 * (not under `lib/brief/`) specifically so it's never mistaken for part of
 * the engine those files' own doc comments describe.
 */

import { NARRATIVE_LABEL } from "@/components/alerts/meta";
import type { BriefHighlight, BriefNarrativeTrend, BriefOpportunity } from "@/lib/brief/types";

export const SECTION_FILTERS = [
  "all",
  "opportunities",
  "security",
  "governance",
  "development",
  "tvl",
  "narratives",
  "recommendations",
] as const;
export type SectionFilterValue = (typeof SECTION_FILTERS)[number];

export const SECTION_FILTER_LABEL: Record<SectionFilterValue, string> = {
  all: "All",
  opportunities: "Top Opportunities",
  security: "Security",
  governance: "Governance",
  development: "Development",
  tvl: "TVL",
  narratives: "Narratives",
  recommendations: "Recommendations",
};

export const OPPORTUNITY_SORTS = ["score", "confidence", "alphabetical", "newest"] as const;
export type OpportunitySort = (typeof OPPORTUNITY_SORTS)[number];

export const OPPORTUNITY_SORT_LABEL: Record<OpportunitySort, string> = {
  score: "Highest Score",
  confidence: "Highest Confidence",
  alphabetical: "Alphabetical",
  newest: "Newest",
};

function matchesQuery(text: string, normalizedQuery: string): boolean {
  return normalizedQuery === "" || text.toLowerCase().includes(normalizedQuery);
}

export function filterOpportunities(opportunities: BriefOpportunity[], normalizedQuery: string): BriefOpportunity[] {
  if (normalizedQuery === "") return opportunities;
  return opportunities.filter(
    (opportunity) =>
      matchesQuery(opportunity.projectName, normalizedQuery) ||
      matchesQuery(opportunity.headline, normalizedQuery) ||
      matchesQuery(opportunity.reason, normalizedQuery) ||
      matchesQuery(NARRATIVE_LABEL[opportunity.narrative], normalizedQuery)
  );
}

/** Pure — never re-sorts the underlying `DailyBrief.topOpportunities` array in place, and never calls back into `lib/brief`. */
export function sortOpportunities(opportunities: BriefOpportunity[], order: OpportunitySort): BriefOpportunity[] {
  const sorted = [...opportunities];
  switch (order) {
    case "confidence":
      return sorted.sort((a, b) => b.confidence - a.confidence);
    case "alphabetical":
      return sorted.sort((a, b) => a.projectName.localeCompare(b.projectName));
    case "newest":
      return sorted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    case "score":
    default:
      return sorted.sort((a, b) => b.score - a.score);
  }
}

export function filterHighlights(highlights: BriefHighlight[], normalizedQuery: string): BriefHighlight[] {
  if (normalizedQuery === "") return highlights;
  return highlights.filter(
    (highlight) =>
      matchesQuery(highlight.projectName, normalizedQuery) ||
      matchesQuery(highlight.headline, normalizedQuery) ||
      matchesQuery(highlight.detail, normalizedQuery)
  );
}

export function filterTextLines(lines: string[], normalizedQuery: string): string[] {
  if (normalizedQuery === "") return lines;
  return lines.filter((line) => matchesQuery(line, normalizedQuery));
}

export function filterNarrativeTrends(trends: BriefNarrativeTrend[], normalizedQuery: string): BriefNarrativeTrend[] {
  if (normalizedQuery === "") return trends;
  return trends.filter((trend) => matchesQuery(NARRATIVE_LABEL[trend.narrative], normalizedQuery));
}
