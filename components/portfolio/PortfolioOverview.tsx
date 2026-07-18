"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, Code2, Gauge, ListChecks, ShieldAlert, Target, Vote } from "lucide-react";

import { NarrativeBadge } from "@/components/alerts/NarrativeBadge";
import { SeverityBadge } from "@/components/alerts/SeverityBadge";
import { ProjectLogo } from "@/components/branding/ProjectLogo";
import {
  filterHighlights,
  filterNarrativeTrends,
  filterPerformers,
  filterTextLines,
  sortPerformers,
  type PerformerSort,
  type SectionFilterValue,
} from "@/components/portfolio/filters";
import { NarrativeDistribution } from "@/components/portfolio/NarrativeDistribution";
import { PortfolioCard } from "@/components/portfolio/PortfolioCard";
import { PortfolioFilters } from "@/components/portfolio/PortfolioFilters";
import { PORTFOLIO_HEALTH_DESCRIPTION, PortfolioHealthBadge } from "@/components/portfolio/PortfolioHealthBadge";
import { PortfolioSection } from "@/components/portfolio/PortfolioSection";
import { RecommendationCard } from "@/components/portfolio/RecommendationCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getProject } from "@/data/projects/helpers";
import { usePortfolioIntelligence } from "@/lib/hooks/usePortfolioIntelligence";
import type { BriefHighlight, BriefOpportunity } from "@/lib/brief/types";

const DEFAULT_SEARCH = "";
const DEFAULT_SECTION_FILTER: SectionFilterValue = "all";
const DEFAULT_PERFORMER_SORT: PerformerSort = "score";

/** Maps a specific section filter to the one section id it isolates; `"all"` (and Portfolio Health, which has no filter option of its own) fall through to "show everything with data." */
const FILTER_SECTION_ID: Partial<Record<SectionFilterValue, string>> = {
  performers: "top-performers",
  attention: "projects-needing-attention",
  security: "security-risks",
  governance: "governance-watch",
  development: "development-momentum",
  narratives: "dominant-narratives",
  recommendations: "recommendations",
};

function PerformerRow({ performer }: { performer: BriefOpportunity }) {
  const project = getProject(performer.projectId);

  return (
    <li className="group relative flex h-full flex-col gap-2 rounded-xl border border-radar-light-border bg-radar-light-card p-4 transition-colors hover:bg-radar-light-surface dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]">
      {project && (
        <Link
          href={`/dashboard/projects/${project.slug}`}
          aria-label={`${performer.headline}. View ${performer.projectName}'s Project Profile.`}
          className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50"
        />
      )}

      <div className="relative z-[1] flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="flex max-w-[160px] items-center gap-1.5 rounded-full border border-radar-light-border bg-radar-light-surface px-2 py-0.5 text-[10.5px] font-medium text-radar-light-text dark:border-white/10 dark:bg-white/[0.03] dark:text-radar-white">
            <ProjectLogo logoUrl={project?.logoUrl} name={performer.projectName} size={14} />
            <span className="truncate">{performer.projectName}</span>
          </span>
          <NarrativeBadge narrative={performer.narrative} />
        </div>
        <span className="shrink-0 text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">
          {performer.confidence}% confidence
        </span>
      </div>

      <div className="relative z-[1] flex flex-1 flex-col gap-1">
        <p className="line-clamp-1 text-sm font-semibold text-radar-light-text dark:text-radar-white">
          {performer.headline}
        </p>
        <p className="line-clamp-2 text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
          {performer.reason}
        </p>
      </div>

      <div className="relative z-[1] flex items-center justify-end gap-1.5 text-[10.5px] text-radar-light-muted dark:text-radar-muted">
        Score <span className="font-semibold text-radar-light-text dark:text-radar-white">{performer.score}</span>
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
 * The dedicated Portfolio Intelligence experience
 * (`app/dashboard/portfolio/page.tsx`). Everything renders from
 * `usePortfolioIntelligence()` — no fetching, no rebuilding, never reading
 * providers directly. Search and the section filter
 * (`components/portfolio/filters.ts`) are pure, component-local UI state;
 * neither ever triggers a Portfolio Intelligence rebuild. A section is
 * omitted entirely once filtering leaves it with zero items.
 */
export function PortfolioOverview() {
  const portfolio = usePortfolioIntelligence();

  const [search, setSearch] = useState(DEFAULT_SEARCH);
  const [sectionFilter, setSectionFilter] = useState<SectionFilterValue>(DEFAULT_SECTION_FILTER);
  const [performerSort, setPerformerSort] = useState<PerformerSort>(DEFAULT_PERFORMER_SORT);

  const normalizedQuery = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!portfolio) return null;
    return {
      topPerformers: sortPerformers(filterPerformers(portfolio.topPerformers, normalizedQuery), performerSort),
      projectsNeedingAttention: filterHighlights(portfolio.projectsNeedingAttention, normalizedQuery),
      securityRisks: filterHighlights(portfolio.securityRisks, normalizedQuery),
      governanceWatch: filterHighlights(portfolio.governanceWatch, normalizedQuery),
      developmentMomentum: filterHighlights(portfolio.developmentMomentum, normalizedQuery),
      dominantNarratives: filterNarrativeTrends(portfolio.dominantNarratives, normalizedQuery),
      recommendations: filterTextLines(portfolio.recommendations, normalizedQuery),
    };
  }, [portfolio, normalizedQuery, performerSort]);

  if (!portfolio || portfolio.projectCount === 0) {
    return <EmptyState icon={ListChecks} title="No Portfolio Intelligence available." className="py-16" />;
  }

  // `filtered` is only null when `portfolio` is null, already handled above.
  const sections = filtered!;

  function showSection(id: string): boolean {
    const isolatedId = FILTER_SECTION_ID[sectionFilter];
    return isolatedId === undefined ? true : isolatedId === id;
  }

  const visibility = {
    topPerformers: showSection("top-performers") && sections.topPerformers.length > 0,
    projectsNeedingAttention: showSection("projects-needing-attention") && sections.projectsNeedingAttention.length > 0,
    securityRisks: showSection("security-risks") && sections.securityRisks.length > 0,
    governanceWatch: showSection("governance-watch") && sections.governanceWatch.length > 0,
    developmentMomentum: showSection("development-momentum") && sections.developmentMomentum.length > 0,
    dominantNarratives: showSection("dominant-narratives") && sections.dominantNarratives.length > 0,
    recommendations: showSection("recommendations") && sections.recommendations.length > 0,
  };

  const hasAnyVisibleContent = Object.values(visibility).some(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <PortfolioCard portfolio={portfolio} />

      {showSection("portfolio-health") && (
        <PortfolioSection id="portfolio-health" title="Portfolio Health" icon={Gauge}>
          <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-radar-light-border bg-radar-light-card p-4 dark:border-white/10 dark:bg-white/[0.02]">
            <PortfolioHealthBadge health={portfolio.overallHealth} />
            <p className="text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
              {PORTFOLIO_HEALTH_DESCRIPTION[portfolio.overallHealth]}
            </p>
          </div>
        </PortfolioSection>
      )}

      <PortfolioFilters
        search={search}
        onSearchChange={setSearch}
        sectionFilter={sectionFilter}
        onSectionFilterChange={setSectionFilter}
        performerSort={performerSort}
        onPerformerSortChange={setPerformerSort}
        showPerformerSort={showSection("top-performers")}
      />

      {!hasAnyVisibleContent ? (
        <EmptyState
          icon={ListChecks}
          title={normalizedQuery !== "" ? "No results match your search." : "No content matches the selected filter."}
          className="py-16"
        />
      ) : (
        <>
          {visibility.topPerformers && (
            <PortfolioSection id="top-performers" title="Top Performers" icon={Target}>
              <ul className={CARD_GRID_CLASS}>
                {sections.topPerformers.map((performer) => (
                  <PerformerRow key={performer.projectId} performer={performer} />
                ))}
              </ul>
            </PortfolioSection>
          )}

          {visibility.projectsNeedingAttention && (
            <PortfolioSection id="projects-needing-attention" title="Projects Needing Attention" icon={AlertTriangle}>
              <ul className={CARD_GRID_CLASS}>
                {sections.projectsNeedingAttention.map((highlight) => (
                  <HighlightRow key={highlight.projectId} highlight={highlight} />
                ))}
              </ul>
            </PortfolioSection>
          )}

          {visibility.securityRisks && (
            <PortfolioSection id="security-risks" title="Security Risks" icon={ShieldAlert}>
              <ul className={CARD_GRID_CLASS}>
                {sections.securityRisks.map((highlight) => (
                  <HighlightRow key={highlight.projectId} highlight={highlight} />
                ))}
              </ul>
            </PortfolioSection>
          )}

          {visibility.governanceWatch && (
            <PortfolioSection id="governance-watch" title="Governance Watch" icon={Vote}>
              <ul className={CARD_GRID_CLASS}>
                {sections.governanceWatch.map((highlight) => (
                  <HighlightRow key={highlight.projectId} highlight={highlight} />
                ))}
              </ul>
            </PortfolioSection>
          )}

          {visibility.developmentMomentum && (
            <PortfolioSection id="development-momentum" title="Development Momentum" icon={Code2}>
              <ul className={CARD_GRID_CLASS}>
                {sections.developmentMomentum.map((highlight) => (
                  <HighlightRow key={highlight.projectId} highlight={highlight} />
                ))}
              </ul>
            </PortfolioSection>
          )}

          {visibility.dominantNarratives && (
            <PortfolioSection id="dominant-narratives" title="Dominant Narratives" icon={Activity}>
              <ul className="flex flex-col gap-2">
                {sections.dominantNarratives.map((trend) => (
                  <NarrativeDistribution key={trend.narrative} trend={trend} totalProjectCount={portfolio.projectCount} />
                ))}
              </ul>
            </PortfolioSection>
          )}

          {visibility.recommendations && (
            <PortfolioSection id="recommendations" title="Recommendations" icon={ListChecks}>
              <ul className="flex flex-col gap-2">
                {sections.recommendations.map((recommendation) => (
                  <RecommendationCard key={recommendation} recommendation={recommendation} />
                ))}
              </ul>
            </PortfolioSection>
          )}
        </>
      )}
    </div>
  );
}
