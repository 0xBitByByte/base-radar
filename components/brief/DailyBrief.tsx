"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, BarChart3, Code2, ListChecks, ShieldAlert, Target, TrendingUp, Vote } from "lucide-react";

import { NarrativeBadge } from "@/components/alerts/NarrativeBadge";
import { SeverityBadge } from "@/components/alerts/SeverityBadge";
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
import { RecommendationCard } from "@/components/brief/RecommendationCard";
import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { EmptyState } from "@/components/ui/EmptyState";
import { getProject } from "@/data/projects/helpers";
import { useDailyBrief } from "@/lib/hooks/useDailyBrief";
import type { BriefHighlight, BriefOpportunity } from "@/lib/brief/types";

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

function OpportunityRow({ opportunity }: { opportunity: BriefOpportunity }) {
  const project = getProject(opportunity.projectId);

  return (
    <li className="group relative flex h-full flex-col gap-2 rounded-xl border border-radar-light-border bg-radar-light-card p-4 transition-colors hover:bg-radar-light-surface dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]">
      {project && (
        <Link
          href={`/dashboard/projects/${project.slug}`}
          aria-label={`${opportunity.headline}. View ${opportunity.projectName}'s Project Profile.`}
          className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50"
        />
      )}

      <div className="relative z-[1] flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="flex max-w-[160px] items-center gap-1.5 rounded-full border border-radar-light-border bg-radar-light-surface px-2 py-0.5 text-[10.5px] font-medium text-radar-light-text dark:border-white/10 dark:bg-white/[0.03] dark:text-radar-white">
            <ProjectLogo logoUrl={project?.logoUrl} name={opportunity.projectName} size={14} />
            <span className="truncate">{opportunity.projectName}</span>
          </span>
          <NarrativeBadge narrative={opportunity.narrative} />
        </div>
        <span className="shrink-0 text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">
          {opportunity.confidence}% confidence
        </span>
      </div>

      <div className="relative z-[1] flex flex-1 flex-col gap-1">
        <p className="line-clamp-1 text-sm font-semibold text-radar-light-text dark:text-radar-white">
          {opportunity.headline}
        </p>
        <p className="line-clamp-2 text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
          {opportunity.reason}
        </p>
      </div>

      <div className="relative z-[1] flex items-center justify-end gap-1.5 text-[10.5px] text-radar-light-muted dark:text-radar-muted">
        Score <span className="font-semibold text-radar-light-text dark:text-radar-white">{opportunity.score}</span>
      </div>
    </li>
  );
}

function HighlightRow({ highlight }: { highlight: BriefHighlight }) {
  const project = getProject(highlight.projectId);

  return (
    <li className="group relative flex h-full flex-col gap-1.5 rounded-xl border border-radar-light-border bg-radar-light-card p-4 transition-colors hover:bg-radar-light-surface dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]">
      {project && (
        <Link
          href={`/dashboard/projects/${project.slug}`}
          aria-label={`${highlight.headline}. View ${highlight.projectName}'s Project Profile.`}
          className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50"
        />
      )}

      <div className="relative z-[1] flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="flex max-w-[160px] items-center gap-1.5 rounded-full border border-radar-light-border bg-radar-light-surface px-2 py-0.5 text-[10.5px] font-medium text-radar-light-text dark:border-white/10 dark:bg-white/[0.03] dark:text-radar-white">
          <ProjectLogo logoUrl={project?.logoUrl} name={highlight.projectName} size={14} />
          <span className="truncate">{highlight.projectName}</span>
        </span>
        <SeverityBadge severity={highlight.severity} />
      </div>

      <p className="line-clamp-1 text-sm font-semibold text-radar-light-text dark:text-radar-white">
        {highlight.headline}
      </p>
      <p className="line-clamp-2 flex-1 text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
        {highlight.detail}
      </p>
    </li>
  );
}

const CARD_GRID_CLASS = "grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2";

/**
 * The dedicated Daily Brief experience (`app/dashboard/brief/page.tsx`).
 * Everything renders from `useDailyBrief()` — no fetching, no rebuilding,
 * no inspecting Intelligence Alerts or provider alerts directly. Search
 * and the section filter (`components/brief/filters.ts`) are pure,
 * component-local UI state; neither ever triggers a Daily Brief rebuild.
 * A section is omitted entirely once filtering leaves it with zero items —
 * this component never pads a section with placeholder rows.
 */
export function DailyBrief() {
  const brief = useDailyBrief();

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
                  <OpportunityRow key={opportunity.projectId} opportunity={opportunity} />
                ))}
              </ul>
            </BriefSection>
          )}

          {visibility.securityHighlights && (
            <BriefSection id="security-highlights" title="Security Highlights" icon={ShieldAlert}>
              <ul className={CARD_GRID_CLASS}>
                {sections.securityHighlights.map((highlight) => (
                  <HighlightRow key={highlight.projectId} highlight={highlight} />
                ))}
              </ul>
            </BriefSection>
          )}

          {visibility.governanceHighlights && (
            <BriefSection id="governance-highlights" title="Governance Highlights" icon={Vote}>
              <ul className={CARD_GRID_CLASS}>
                {sections.governanceHighlights.map((highlight) => (
                  <HighlightRow key={highlight.projectId} highlight={highlight} />
                ))}
              </ul>
            </BriefSection>
          )}

          {visibility.developmentHighlights && (
            <BriefSection id="development-highlights" title="Development Highlights" icon={Code2}>
              <ul className={CARD_GRID_CLASS}>
                {sections.developmentHighlights.map((highlight) => (
                  <HighlightRow key={highlight.projectId} highlight={highlight} />
                ))}
              </ul>
            </BriefSection>
          )}

          {visibility.tvlHighlights && (
            <BriefSection id="tvl-highlights" title="TVL Highlights" icon={TrendingUp}>
              <ul className={CARD_GRID_CLASS}>
                {sections.tvlHighlights.map((highlight) => (
                  <HighlightRow key={highlight.projectId} highlight={highlight} />
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
