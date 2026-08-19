import type { Metadata } from "next";
import { AlertTriangle, ArrowLeft, ChevronRight, FileSearch } from "lucide-react";
import Link from "next/link";

import { getProject } from "@/data/projects/helpers";
import { getRawWhaleEvents } from "@/lib/data/aggregate";
import { buildProjectIntelligence } from "@/lib/intelligence/engine";
import { buildHealthScorecard, type ScorecardSeverity, type ScorecardTile } from "@/lib/intelligence/scorecard";
import { buildIntelligenceReport } from "@/lib/intelligence/report";
import { filterLiveProjects } from "@/lib/projects/filter";
import { getLiveProjects } from "@/lib/projects/service";
import { sortLiveProjects } from "@/lib/projects/sort";
import {
  getAllScorecardTiles,
  summarizeContracts,
  summarizeGovernance,
  summarizePools,
  summarizeWhale,
} from "@/components/explorer/aiIntelligenceHelpers";
import { GlowBadge, type GlowBadgeColor } from "@/components/ui/GlowBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { formatCompactCurrency, formatDate } from "@/lib/data/format";
import { PROVIDER_DISPLAY_NAME } from "@/lib/intelligence/scorecard";
import type { ProviderName } from "@/lib/providers/common/types";

type AIIntelligenceReportPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: AIIntelligenceReportPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  return { title: project ? `${project.name} — AI Intelligence Report` : "AI Intelligence Report" };
}

const SEVERITY_COLOR: Record<ScorecardSeverity, GlowBadgeColor> = {
  excellent: "success",
  strong: "success",
  moderate: "warning",
  weak: "danger",
  unknown: "muted",
};

const TOC = [
  { id: "rating", label: "Rating Breakdown" },
  { id: "scorecard", label: "Complete Scorecard" },
  { id: "risk", label: "Full Risk Analysis" },
  { id: "takeaways", label: "Key Takeaways" },
  { id: "developments", label: "Recent Developments" },
  { id: "domains", label: "Cross-Domain Summary" },
  { id: "provenance", label: "Data Provenance" },
] as const;

function SectionHeading({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="scroll-mt-24 text-lg font-bold text-radar-light-text dark:text-radar-white">
      {children}
    </h2>
  );
}

/**
 * PR-084.06 — the "capstone" report: a single long-form document consolidating
 * intelligence that's currently either (a) shown only in compact/truncated
 * form on the Profile page, or (b) computed every render but never actually
 * rendered anywhere (`security`/`momentum`/`whale`/`aiRating` scorecard
 * tiles — confirmed via a full read of `ProjectHealthScorecard.tsx` before
 * writing this page). No category tabs, no filter bar, no sort select — this
 * is deliberately not another Explorer; a reader scrolls it top to bottom
 * once, like a research report. Calls the exact same `buildProjectIntelligence`
 * call the main Profile page makes, plus the same 5s/4s race-with-honest-
 * fallback treatment already established there for `getRawWhaleEvents()`/
 * `getLiveProjects()` — no new provider call, no new scoring, nothing
 * computed twice. `lib/intelligence/scorecard.ts` and `report.ts` are not
 * modified at all.
 */
export default async function AIIntelligenceReportPage({ params }: AIIntelligenceReportPageProps) {
  const { slug } = await params;
  const registryProject = getProject(slug);

  const projectHref = `/dashboard/projects/${slug}`;
  const breadcrumb = (
    <div className="flex flex-col gap-2">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-radar-light-muted dark:text-radar-muted">
          <li>
            <Link href="/dashboard" className="rounded-md font-medium outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:hover:text-radar-white">
              Dashboard
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li>
            <Link href="/dashboard/projects" className="rounded-md font-medium outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:hover:text-radar-white">
              Projects
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li>
            <Link href={projectHref} className="rounded-md font-medium outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:hover:text-radar-white">
              {registryProject?.name ?? "Project"}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li aria-current="page" className="truncate font-semibold text-radar-light-text dark:text-radar-white">
            AI Intelligence Report
          </li>
        </ol>
      </nav>
      <Link
        href={projectHref}
        className="group inline-flex w-fit items-center gap-1.5 rounded-lg text-xs font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:text-radar-white"
      >
        <ArrowLeft className="size-3.5 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true" />
        Back to {registryProject?.name ?? "Project"}
      </Link>
    </div>
  );

  if (!registryProject) {
    return (
      <div className="flex flex-col gap-6">
        {breadcrumb}
        <EmptyState icon={FileSearch} title="Project not found" description="This project isn't in the Base Radar registry." />
      </div>
    );
  }

  // Same 5s race-with-honest-fallback already established in the main
  // Profile page (`app/dashboard/projects/[slug]/page.tsx`) for the exact
  // same call — one slow watched token must not hold up this page either.
  // PR-084.07 — started here, *before* `buildProjectIntelligence`, and
  // `.catch()`-ed immediately so it's a "hot" promise racing its own 5s
  // timer concurrently with the profile build (matching the main Profile
  // page's actual `Promise.allSettled` batch shape). The whale fetch itself
  // doesn't need `profile` until the `.filter()` below, so awaiting it
  // sequentially after `buildProjectIntelligence` (the previous shape here)
  // only added latency on top instead of overlapping with it.
  const whalePromise = Promise.race([
    getRawWhaleEvents(),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Whale detection timed out")), 5_000)),
  ]).catch(() => []);

  const profile = await buildProjectIntelligence(registryProject, undefined, { extended: false });
  const allWhaleEvents = await whalePromise;
  const whaleEvents = allWhaleEvents.filter((event) => event.projectId === profile.identity.id);

  const narrativeLabel = profile.narrative?.label ?? null;

  const communityLinkFields = [
    profile.community.socials.twitter,
    profile.community.socials.discord,
    profile.community.socials.telegram,
    profile.community.socials.farcaster,
    profile.community.governanceUrl,
    profile.community.socials.docs,
    profile.community.socials.blog,
    profile.community.socials.forum,
    profile.community.socials.medium,
    profile.community.socials.mirror,
    profile.community.socials.linkedin,
  ];
  const communityLinkCount = communityLinkFields.filter(Boolean).length;
  const communityLinkTotal = communityLinkFields.length;

  // Same 4s race-with-honest-fallback already established in the main
  // Profile page for the exact same category-rank comparison.
  let categoryTvlLeadership: { rank: number; totalInCategory: number } | null = null;
  const primaryCategory = profile.identity.categories[0];
  if (primaryCategory && profile.tvl.available && profile.tvl.tvlUsd !== null) {
    try {
      const liveProjects = await Promise.race([
        getLiveProjects(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Category rank comparison timed out")), 4_000)),
      ]);
      const categoryPeers = sortLiveProjects(filterLiveProjects(liveProjects, { category: primaryCategory, hasTvl: true }), "tvl", "desc");
      const rankIndex = categoryPeers.findIndex((project) => project.id === registryProject.id);
      if (rankIndex !== -1) categoryTvlLeadership = { rank: rankIndex + 1, totalInCategory: categoryPeers.length };
    } catch {
      categoryTvlLeadership = null;
    }
  }

  const scorecardTiles = buildHealthScorecard({
    health: profile.health,
    confidence: profile.confidence,
    risk: profile.risk,
    market: profile.market,
    tvl: profile.tvl,
    trading: profile.trading,
    github: profile.github,
    governance: profile.governance,
    governanceType: profile.community.governanceType,
    whaleEvents,
    narrativeLabel,
    communityLinkCount,
    communityLinkTotal,
  });

  const report = buildIntelligenceReport({
    identity: profile.identity,
    health: profile.health,
    confidence: profile.confidence,
    risk: profile.risk,
    tvl: profile.tvl,
    market: profile.market,
    github: profile.github,
    chain: profile.chain,
    verificationStatus: profile.community.verificationStatus,
    governance: profile.governance,
    whaleEvents,
    sources: profile.sources,
    narrativeLabel,
    scorecardTiles,
    tradingPoolCount: profile.trading.pools.length,
    coingeckoId: registryProject.providerIds.coingeckoId ?? null,
    defillamaSlug: registryProject.providerIds.defillamaSlug ?? null,
    contracts: profile.contracts,
    community: profile.community,
    categoryTvlLeadership,
  });

  const metricsById = new Map(report.metricsExplained.map((metric) => [metric.id, metric]));
  const allTiles = getAllScorecardTiles(scorecardTiles);
  const hasTakeaways = report.strengths.length > 0 || report.weaknesses.length > 0 || report.threats.length > 0 || report.opportunities.length > 0;

  const domainSummaries = [
    { label: "Trading & Pools", ...summarizePools(profile.trading.pools, profile.trading.largestPool, slug) },
    { label: "Contracts", ...summarizeContracts(profile.contracts, slug) },
    { label: "Governance", ...summarizeGovernance(profile.governance, profile.community.governanceType, slug) },
    { label: "Whale Activity", ...summarizeWhale(whaleEvents, slug) },
  ];

  const liveSources = (Object.keys(profile.sources) as ProviderName[]).map((provider) => profile.sources[provider]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 pb-16">
      {breadcrumb}

      {/* Masthead */}
      <div className="flex flex-col gap-4 rounded-2xl border border-radar-light-border bg-radar-light-surface p-6 dark:border-white/10 dark:bg-white/[0.02]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-3xl font-extrabold text-radar-light-text dark:text-radar-white">{report.grade}</span>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-widest text-radar-light-muted uppercase dark:text-radar-muted">
              AI Intelligence Report
            </span>
            <h1 className="text-xl font-bold text-radar-light-text dark:text-radar-white">{registryProject.name}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <GlowBadge color="primary">{report.recommendation}</GlowBadge>
          <GlowBadge color={report.confidenceLabel === "High" ? "success" : report.confidenceLabel === "Medium" ? "warning" : "danger"}>
            {report.confidenceLabel} Confidence
          </GlowBadge>
          <GlowBadge color={report.riskLevel === "low" ? "success" : report.riskLevel === "high" ? "danger" : "warning"} className="capitalize">
            {report.riskLevel} Risk
          </GlowBadge>
        </div>
        <p className="text-sm leading-relaxed text-radar-light-text dark:text-radar-white">{report.thesis}</p>
      </div>

      {/* Table of contents */}
      <nav aria-label="Report sections" className="flex flex-wrap gap-x-4 gap-y-1.5 border-y border-radar-light-border py-3 text-xs dark:border-white/10">
        {TOC.map((entry) => (
          <a
            key={entry.id}
            href={`#${entry.id}`}
            className="font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-light-text focus-visible:text-radar-light-text dark:text-radar-muted dark:hover:text-radar-white"
          >
            {entry.label}
          </a>
        ))}
      </nav>

      {/* Rating Breakdown */}
      <section className="flex flex-col gap-4">
        <SectionHeading id="rating">Rating Breakdown</SectionHeading>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-4 dark:border-white/10 dark:bg-white/[0.02]">
            <span className="text-xs font-semibold text-radar-light-text dark:text-radar-white">Health — {profile.health.score}/100 ({profile.health.label})</span>
            <p className="text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">{metricsById.get("health")?.meaning}</p>
            <p className="text-xs leading-relaxed text-radar-light-text dark:text-radar-white">
              {profile.health.factors.length > 0 ? profile.health.factors.join(" · ") : "No contributing signals recorded yet."}
            </p>
          </div>
          <div className="flex flex-col gap-1.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-4 dark:border-white/10 dark:bg-white/[0.02]">
            <span className="text-xs font-semibold text-radar-light-text dark:text-radar-white">Confidence — {profile.confidence.score}/100 ({profile.confidence.level})</span>
            <p className="text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">{metricsById.get("confidence")?.meaning}</p>
            <p className="text-xs leading-relaxed text-radar-light-text dark:text-radar-white">
              {profile.confidence.factors.length > 0 ? profile.confidence.factors.join(" · ") : "Few live sources contributed to this analysis."}
            </p>
          </div>
        </div>
      </section>

      {/* Complete Scorecard — all 8 tiles, including 4 never shown on the Profile page */}
      <section className="flex flex-col gap-4">
        <SectionHeading id="scorecard">Complete Scorecard</SectionHeading>
        <p className="text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
          All eight Base Radar Scorecard tiles, in full — four of these (Security, Market Momentum, Whale Activity, AI Rating) are
          computed on every report but not shown anywhere else on this site today.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {allTiles.map((tile: ScorecardTile) => (
            <div key={tile.id} className="flex flex-col gap-1.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-4 dark:border-white/10 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-radar-light-text dark:text-radar-white">{tile.label}</span>
                <GlowBadge color={SEVERITY_COLOR[tile.severity]}>{tile.scoreLabel}</GlowBadge>
              </div>
              <span className="text-[11px] font-medium text-radar-light-muted dark:text-radar-muted">{tile.statusLabel}</span>
              <p className="text-xs leading-relaxed text-radar-light-text dark:text-radar-white">{tile.detail}</p>
              {metricsById.get(tile.id)?.meaning && (
                <p className="text-[11px] leading-relaxed text-radar-light-muted italic dark:text-radar-muted">{metricsById.get(tile.id)?.meaning}</p>
              )}
              <span className="text-[10.5px] text-radar-light-muted/70 dark:text-radar-muted/60">Source: {tile.source}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Full Risk Analysis — every contributor, not grouped/trimmed */}
      <section className="flex flex-col gap-4">
        <SectionHeading id="risk">Full Risk Analysis</SectionHeading>
        <p className="text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">{profile.risk.explanation}</p>
        <ul className="flex flex-col gap-2">
          {profile.risk.contributors.map((contributor) => (
            <li key={contributor.label} className="flex flex-col gap-1 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-radar-light-text dark:text-radar-white">{contributor.label}</span>
                <GlowBadge
                  color={contributor.severity === "low" ? "success" : contributor.severity === "high" ? "danger" : contributor.severity === "moderate" ? "warning" : "muted"}
                  className="capitalize"
                >
                  {contributor.severity}
                </GlowBadge>
              </div>
              <p className="text-xs leading-relaxed text-radar-light-text dark:text-radar-white">{contributor.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Key Takeaways — consolidated SWOT + Catalysts + Watch Closely + Verification gaps, one continuous pass */}
      <section id="takeaways" className="flex flex-col gap-5">
        <SectionHeading id="takeaways-heading">Key Takeaways</SectionHeading>
        {hasTakeaways && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {report.strengths.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10.5px] font-semibold tracking-wider text-radar-success uppercase">Strengths</span>
                <ul className="flex flex-col gap-1 text-xs text-radar-light-text dark:text-radar-white">
                  {report.strengths.map((line, i) => <li key={i}>{line}</li>)}
                </ul>
              </div>
            )}
            {report.weaknesses.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10.5px] font-semibold tracking-wider text-radar-danger uppercase">Weaknesses</span>
                <ul className="flex flex-col gap-1 text-xs text-radar-light-text dark:text-radar-white">
                  {report.weaknesses.map((line, i) => <li key={i}>{line}</li>)}
                </ul>
              </div>
            )}
            {report.threats.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10.5px] font-semibold tracking-wider text-radar-danger uppercase">Risks</span>
                <ul className="flex flex-col gap-1 text-xs text-radar-light-text dark:text-radar-white">
                  {report.threats.map((line, i) => <li key={i}>{line}</li>)}
                </ul>
              </div>
            )}
            {report.opportunities.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10.5px] font-semibold tracking-wider text-radar-primary uppercase dark:text-radar-accent">Opportunities</span>
                <ul className="flex flex-col gap-1 text-xs text-radar-light-text dark:text-radar-white">
                  {report.opportunities.map((line, i) => <li key={i}>{line}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {report.upcomingCatalysts.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-semibold tracking-wider text-radar-primary uppercase dark:text-radar-accent">Upcoming Catalysts</span>
            <ul className="flex flex-col gap-1 text-xs text-radar-light-text dark:text-radar-white">
              {report.upcomingCatalysts.map((line, i) => <li key={i}>{line}</li>)}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-1.5 rounded-xl border border-radar-warning/25 bg-radar-warning/5 p-3 dark:border-radar-warning/20 dark:bg-radar-warning/10">
          <span className="flex items-center gap-1.5 text-[10.5px] font-semibold tracking-wider text-radar-warning uppercase">
            <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
            Watch Closely
          </span>
          <ul className="flex flex-col gap-1 text-xs text-radar-light-text dark:text-radar-white">
            {report.watchClosely.map((line, i) => <li key={i}>{line}</li>)}
          </ul>
        </div>

        {report.thingsWeCouldntVerify.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-semibold tracking-wider text-radar-light-muted uppercase dark:text-radar-muted">Things We Couldn&apos;t Verify</span>
            <ul className="flex flex-col gap-1 text-xs text-radar-light-muted dark:text-radar-muted">
              {report.thingsWeCouldntVerify.map((line, i) => <li key={i}>{line}</li>)}
            </ul>
          </div>
        )}
      </section>

      {/* Recent Developments */}
      <section className="flex flex-col gap-3">
        <SectionHeading id="developments">Recent Developments</SectionHeading>
        {report.recentDevelopments.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {report.recentDevelopments.map((entry, i) => (
              <li key={i} className="flex flex-col gap-0.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-radar-light-text dark:text-radar-white">{entry.headline}</span>
                  <span className="text-[10.5px] text-radar-light-muted dark:text-radar-muted">{entry.date}</span>
                </div>
                <span className="text-xs text-radar-light-muted dark:text-radar-muted">{entry.detail}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">No recent project activity has been detected.</p>
        )}
      </section>

      {/* Cross-Domain Summary — links out to the four domain Explorers, never re-lists their items */}
      <section className="flex flex-col gap-3">
        <SectionHeading id="domains">Cross-Domain Summary</SectionHeading>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {domainSummaries.map((domain) => (
            <Link
              key={domain.label}
              href={domain.href}
              className="flex flex-col gap-1 rounded-xl border border-radar-light-border bg-radar-light-surface p-4 outline-none transition-colors hover:border-radar-primary/40 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-radar-accent/40"
            >
              <span className="text-[10.5px] font-semibold tracking-wider text-radar-light-muted uppercase dark:text-radar-muted">{domain.label}</span>
              <span className="text-sm font-semibold text-radar-light-text dark:text-radar-white">{domain.headline}</span>
              <span className="text-xs text-radar-light-muted dark:text-radar-muted">{domain.detail}</span>
              <span className="mt-1 text-[11px] font-medium text-radar-primary dark:text-radar-accent">View {domain.label} Explorer →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Data Provenance */}
      <section className="flex flex-col gap-3">
        <SectionHeading id="provenance">Data Provenance</SectionHeading>
        <ul className="flex flex-col gap-1.5">
          {liveSources.map((source) => (
            <li key={source.provider} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-radar-light-border px-3 py-2 text-xs dark:border-white/10">
              <span className="font-medium text-radar-light-text dark:text-radar-white">{PROVIDER_DISPLAY_NAME[source.provider]}</span>
              <span className={source.status === "live" ? "text-radar-success" : "text-radar-light-muted dark:text-radar-muted"}>
                {source.status === "live" ? (
                  <>
                    Live{source.fetchedAt && (
                      <>
                        {" "}· <RelativeTime iso={source.fetchedAt} />
                      </>
                    )}
                  </>
                ) : (
                  (source.detail ?? "Unavailable")
                )}
              </span>
            </li>
          ))}
        </ul>
        {report.sourcesUsed.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {report.sourcesUsed.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-light-text focus-visible:text-radar-light-text dark:text-radar-muted dark:hover:text-radar-white"
              >
                {source.name} ↗
              </a>
            ))}
          </div>
        )}
      </section>

      <p className="border-t border-radar-light-border pt-4 text-[10.5px] text-radar-light-muted/70 dark:border-white/10 dark:text-radar-muted/60">
        Report generated {formatDate(profile.metadata.generatedAt)} · Base Radar Intelligence Engine v{profile.metadata.engineVersion}
        {profile.tvl.available && profile.tvl.tvlUsd !== null && <> · TVL {formatCompactCurrency(profile.tvl.tvlUsd)}</>}
      </p>
    </div>
  );
}
