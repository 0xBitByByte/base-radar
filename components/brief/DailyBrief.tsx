"use client";

import { useMemo, useState } from "react";
import { Activity, BarChart3, Code2, ListChecks, ShieldAlert, Target, TrendingUp, Vote } from "lucide-react";

import { BriefCard } from "@/components/brief/BriefCard";
import { BriefFilters } from "@/components/brief/BriefFilters";
import { BriefSection } from "@/components/brief/BriefSection";
import {
  filterHighlights,
  filterNarrativeTrends,
  filterOpportunities,
  filterTextLines,
  sortOpportunities,
  type OpportunitySort,
  type SectionFilterValue,
} from "@/components/brief/filters";
import { NarrativeTrend } from "@/components/brief/NarrativeTrend";
import { ProjectHighlightCard } from "@/components/brief/ProjectHighlightCard";
import { ProjectOpportunityCard } from "@/components/brief/ProjectOpportunityCard";
import { RecommendationCard } from "@/components/brief/RecommendationCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePersonalizedDashboard } from "@/lib/hooks/usePersonalizedDashboard";
import type { ProjectLogoEntry } from "@/lib/branding/resolveProjectLogos";

const DEFAULT_SEARCH = "";
const DEFAULT_SECTION_FILTER: SectionFilterValue = "all";
const DEFAULT_OPPORTUNITY_SORT: OpportunitySort = "score";

/** Maps a specific section filter to the one section id it isolates; `"all"` (and Market Summary, which has no filter option of its own) fall through to "show everything with data." */
const FILTER_SECTION_ID: Partial<Record<SectionFilterValue, string>> = {
  opportunities: "top-opportunities",
  security: "security-highlights",
  governance: "governance-highlights",
  development: "development-highlights",
  tvl: "tvl-highlights",
  narratives: "emerging-narratives",
  recommendations: "recommendations",
};

const CARD_GRID_CLASS = "grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2";

/**
 * The dedicated Daily Brief experience (`app/dashboard/brief/page.tsx`).
 * Everything renders from `usePersonalizedDashboard()` — no fetching, no
 * rebuilding, no inspecting Intelligence Alerts or provider alerts
 * directly. Search and the section filter (`components/brief/filters.ts`)
 * are pure, component-local UI state; neither ever triggers a Daily Brief
 * rebuild — both narrow `brief`'s list fields, which are themselves
 * already scoped to the active watchlist (PR22 Part 2) before this
 * component ever sees them. A section is omitted entirely once filtering
 * leaves it with zero items — this component never pads a section with
 * placeholder rows. Scalar fields (`projectCount`, `averageConfidence`,
 * `highestScore`, etc.) stay read off the raw engine output.
 */
export function DailyBrief({ logoMap }: { logoMap: Record<string, ProjectLogoEntry> }) {
  const { dailyBrief: brief, isPersonalized, activeWatchlist } = usePersonalizedDashboard();

  const [search, setSearch] = useState(DEFAULT_SEARCH);
  const [sectionFilter, setSectionFilter] = useState<SectionFilterValue>(DEFAULT_SECTION_FILTER);
  const [opportunitySort, setOpportunitySort] = useState<OpportunitySort>(DEFAULT_OPPORTUNITY_SORT);

  const normalizedQuery = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!brief) return null;
    return {
      marketSummary: filterTextLines(brief.marketSummary, normalizedQuery),
      topOpportunities: sortOpportunities(filterOpportunities(brief.topOpportunities, normalizedQuery), opportunitySort),
      securityHighlights: filterHighlights(brief.securityHighlights, normalizedQuery),
      governanceHighlights: filterHighlights(brief.governanceHighlights, normalizedQuery),
      developmentHighlights: filterHighlights(brief.developmentHighlights, normalizedQuery),
      tvlHighlights: filterHighlights(brief.tvlHighlights, normalizedQuery),
      emergingNarratives: filterNarrativeTrends(brief.emergingNarratives, normalizedQuery),
      recommendations: filterTextLines(brief.recommendations, normalizedQuery),
    };
  }, [brief, normalizedQuery, opportunitySort]);

  if (!brief || brief.projectCount === 0) {
    return <EmptyState icon={ListChecks} title="No Daily Brief available." className="py-16" />;
  }

  const hasAnyPersonalizedContent =
    brief.topOpportunities.length > 0 ||
    brief.securityHighlights.length > 0 ||
    brief.governanceHighlights.length > 0 ||
    brief.developmentHighlights.length > 0 ||
    brief.tvlHighlights.length > 0;

  if (isPersonalized && !hasAnyPersonalizedContent) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No Daily Brief content for this watchlist."
        description={`None of the projects in "${activeWatchlist?.name}" have Daily Brief content yet.`}
        className="py-16"
      />
    );
  }

  // `filtered` is only null when `brief` is null, already handled above.
  const sections = filtered!;

  function showSection(id: string): boolean {
    const isolatedId = FILTER_SECTION_ID[sectionFilter];
    return isolatedId === undefined ? true : isolatedId === id;
  }

  const visibility = {
    marketSummary: showSection("market-summary") && sections.marketSummary.length > 0,
    topOpportunities: showSection("top-opportunities") && sections.topOpportunities.length > 0,
    securityHighlights: showSection("security-highlights") && sections.securityHighlights.length > 0,
    governanceHighlights: showSection("governance-highlights") && sections.governanceHighlights.length > 0,
    developmentHighlights: showSection("development-highlights") && sections.developmentHighlights.length > 0,
    tvlHighlights: showSection("tvl-highlights") && sections.tvlHighlights.length > 0,
    emergingNarratives: showSection("emerging-narratives") && sections.emergingNarratives.length > 0,
    recommendations: showSection("recommendations") && sections.recommendations.length > 0,
  };

  const hasAnyVisibleContent = Object.values(visibility).some(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <BriefCard brief={brief} />

      <BriefFilters
        search={search}
        onSearchChange={setSearch}
        sectionFilter={sectionFilter}
        onSectionFilterChange={setSectionFilter}
        opportunitySort={opportunitySort}
        onOpportunitySortChange={setOpportunitySort}
        showOpportunitySort={showSection("top-opportunities")}
      />

      {!hasAnyVisibleContent ? (
        <EmptyState
          icon={ListChecks}
          title={normalizedQuery !== "" ? "No results match your search." : "No content matches the selected filter."}
          className="py-16"
        />
      ) : (
        <>
          {visibility.marketSummary && (
            <BriefSection id="market-summary" title="Market Summary" icon={BarChart3}>
              <ul className="flex flex-col gap-1.5">
                {sections.marketSummary.map((line) => (
                  <li key={line} className="text-sm text-radar-light-text dark:text-radar-white">
                    • {line}
                  </li>
                ))}
              </ul>
            </BriefSection>
          )}

          {visibility.topOpportunities && (
            <BriefSection id="top-opportunities" title="Top Opportunities" icon={Target}>
              <ul className={CARD_GRID_CLASS}>
                {sections.topOpportunities.map((opportunity) => (
                  <ProjectOpportunityCard key={opportunity.projectId} opportunity={opportunity} logoMap={logoMap} />
                ))}
              </ul>
            </BriefSection>
          )}

          {visibility.securityHighlights && (
            <BriefSection id="security-highlights" title="Security Highlights" icon={ShieldAlert}>
              <ul className={CARD_GRID_CLASS}>
                {sections.securityHighlights.map((highlight) => (
                  <ProjectHighlightCard key={highlight.projectId} highlight={highlight} logoMap={logoMap} />
                ))}
              </ul>
            </BriefSection>
          )}

          {visibility.governanceHighlights && (
            <BriefSection id="governance-highlights" title="Governance Highlights" icon={Vote}>
              <ul className={CARD_GRID_CLASS}>
                {sections.governanceHighlights.map((highlight) => (
                  <ProjectHighlightCard key={highlight.projectId} highlight={highlight} logoMap={logoMap} />
                ))}
              </ul>
            </BriefSection>
          )}

          {visibility.developmentHighlights && (
            <BriefSection id="development-highlights" title="Development Highlights" icon={Code2}>
              <ul className={CARD_GRID_CLASS}>
                {sections.developmentHighlights.map((highlight) => (
                  <ProjectHighlightCard key={highlight.projectId} highlight={highlight} logoMap={logoMap} />
                ))}
              </ul>
            </BriefSection>
          )}

          {visibility.tvlHighlights && (
            <BriefSection id="tvl-highlights" title="TVL Highlights" icon={TrendingUp}>
              <ul className={CARD_GRID_CLASS}>
                {sections.tvlHighlights.map((highlight) => (
                  <ProjectHighlightCard key={highlight.projectId} highlight={highlight} logoMap={logoMap} />
                ))}
              </ul>
            </BriefSection>
          )}

          {visibility.emergingNarratives && (
            <BriefSection id="emerging-narratives" title="Emerging Narratives" icon={Activity}>
              <ul className="flex flex-col gap-2">
                {sections.emergingNarratives.map((trend) => (
                  <NarrativeTrend key={trend.narrative} trend={trend} totalProjectCount={brief.projectCount} />
                ))}
              </ul>
            </BriefSection>
          )}

          {visibility.recommendations && (
            <BriefSection id="recommendations" title="Recommendations" icon={ListChecks}>
              <ul className="flex flex-col gap-2">
                {sections.recommendations.map((recommendation) => (
                  <RecommendationCard key={recommendation} recommendation={recommendation} />
                ))}
              </ul>
            </BriefSection>
          )}
        </>
      )}
    </div>
  );
}
