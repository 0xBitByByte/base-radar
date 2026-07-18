/**
 * PR17 Part 3 — the Portfolio page's search/filter/sort layer. The actual
 * query logic is re-exported from `components/brief/filters.ts` rather
 * than reimplemented: Portfolio Intelligence's Top Performers/Security
 * Risks/Governance Watch/Development Momentum/Dominant Narratives sections
 * are typed as the exact same `BriefOpportunity[]`/`BriefHighlight[]`/
 * `BriefNarrativeTrend[]` shapes Daily Brief already has a filter/sort
 * layer for — writing a second, identical implementation here would be
 * pure duplication. Only the section-filter vocabulary below (names
 * specific to the Portfolio page) is new.
 */

export {
  filterHighlights,
  filterNarrativeTrends,
  filterOpportunities as filterPerformers,
  filterTextLines,
  sortOpportunities as sortPerformers,
  OPPORTUNITY_SORTS as PERFORMER_SORTS,
  OPPORTUNITY_SORT_LABEL as PERFORMER_SORT_LABEL,
} from "@/components/brief/filters";
export type { OpportunitySort as PerformerSort } from "@/components/brief/filters";

export const SECTION_FILTERS = [
  "all",
  "performers",
  "attention",
  "security",
  "governance",
  "development",
  "narratives",
  "recommendations",
] as const;
export type SectionFilterValue = (typeof SECTION_FILTERS)[number];

export const SECTION_FILTER_LABEL: Record<SectionFilterValue, string> = {
  all: "All",
  performers: "Top Performers",
  attention: "Projects Needing Attention",
  security: "Security Risks",
  governance: "Governance",
  development: "Development",
  narratives: "Narratives",
  recommendations: "Recommendations",
};
