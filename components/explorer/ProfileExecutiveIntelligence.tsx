import { Suspense } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  CircleCheck,
  CircleX,
  Clock,
  Compass,
  Database,
  Gauge,
  HelpCircle,
  Lightbulb,
  Rocket,
  ShieldAlert,
  Sparkles,
  Tag,
  TrendingUp,
  Vote,
  Waves,
  type LucideIcon,
} from "lucide-react";

import { MetricExplanationCard } from "@/components/explorer/MetricExplanationCard";
import { ProfileMetricsExplainedDeveloperAsync } from "@/components/explorer/ProfileMetricsExplainedDeveloperAsync";
import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { formatRelativeTime } from "@/lib/data/format";
import type { DevelopmentCategory, IntelligenceReport } from "@/lib/intelligence/report";
import type { ScorecardTile } from "@/lib/intelligence/scorecard";
import type { Freshness } from "@/lib/intelligence/types";
import type { CommitActivity, ContributorCount, ReleaseSummary } from "@/lib/providers/github/service";
import type { ProviderResult } from "@/lib/providers/common/types";
import { cn } from "@/lib/utils";

type ProfileExecutiveIntelligenceProps = {
  report: IntelligenceReport;
  freshness: Freshness;
  /** The Scorecard's own fast-path Developer tile — the fallback `ProfileMetricsExplainedDeveloperAsync` renders until the same extended GitHub calls the Scorecard already streams resolve. */
  developerFallbackTile: ScorecardTile;
  commitActivityPromise: Promise<ProviderResult<CommitActivity> | null>;
  contributorCountPromise: Promise<ProviderResult<ContributorCount> | null>;
  releasesPromise: Promise<ProviderResult<ReleaseSummary[]> | null>;
};

const RISK_SENTIMENT_COLOR: Record<string, string> = {
  low: "text-radar-success",
  moderate: "text-radar-warning",
  elevated: "text-radar-warning",
  high: "text-radar-danger",
};

const RISK_SENTIMENT_BORDER: Record<string, string> = {
  low: "border-l-radar-success",
  moderate: "border-l-radar-warning",
  elevated: "border-l-radar-warning",
  high: "border-l-radar-danger",
};

const CONFIDENCE_PILL_CLASS: Record<IntelligenceReport["confidenceLabel"], string> = {
  High: "border-radar-success/30 bg-radar-success/10 text-radar-success",
  Medium: "border-radar-warning/30 bg-radar-warning/10 text-radar-warning",
  Low: "border-radar-danger/30 bg-radar-danger/10 text-radar-danger",
};

const GRADE_RING: Record<string, string> = {
  "A+": "from-radar-success/25 to-radar-success/5 ring-radar-success/30",
  A: "from-radar-success/25 to-radar-success/5 ring-radar-success/30",
  "B+": "from-radar-warning/25 to-radar-warning/5 ring-radar-warning/30",
  B: "from-radar-warning/25 to-radar-warning/5 ring-radar-warning/30",
  C: "from-radar-warning/25 to-radar-warning/5 ring-radar-warning/30",
  D: "from-radar-danger/25 to-radar-danger/5 ring-radar-danger/30",
};

const FRESHNESS_LABEL: Record<Freshness["overall"], string> = {
  fresh: "Fresh",
  mixed: "Mixed",
  stale: "Stale",
  unknown: "Not Assessed",
};

const FRESHNESS_COLOR: Record<Freshness["overall"], string> = {
  fresh: "text-radar-success",
  mixed: "text-radar-warning",
  stale: "text-radar-danger",
  unknown: "text-radar-light-muted dark:text-radar-muted",
};

/** Recent Developments' category icon — a scan aid, never the sole conveyor of meaning (each row's visible headline/detail text carries the real information; a screen-reader-only category label backs the icon). */
const DEVELOPMENT_CATEGORY_ICON: Record<DevelopmentCategory, LucideIcon> = {
  release: Tag,
  governance: Vote,
  tvl: TrendingUp,
  whale: Waves,
};

const DEVELOPMENT_CATEGORY_LABEL: Record<DevelopmentCategory, string> = {
  release: "Release",
  governance: "Governance",
  tvl: "TVL",
  whale: "Whale Activity",
};

/** One labeled bullet list — the shared recipe for Highlights / Key Takeaways quadrants / Upcoming Catalysts / Things We Couldn't Verify. Omitted entirely by the caller when its list is empty, never rendered as an empty heading. */
function ReportBucket({ icon: Icon, label, tone, items }: { icon: LucideIcon; label: string; tone: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("size-3.5 shrink-0", tone)} aria-hidden="true" />
        <span className="text-[10.5px] font-semibold tracking-wider text-radar-light-muted uppercase dark:text-radar-muted">{label}</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {items.map((item, index) => (
          <li key={index} className="text-sm leading-relaxed text-radar-light-text dark:text-radar-white">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Base Radar's flagship section: a single flowing analyst report
 * (Bloomberg/Messari/Arkham-style) instead of a grid-of-widgets layout.
 * Reading order: Overall Rating hero (pills only, no headline sentence —
 * the same "grade" never appears as prose text anywhere else on the page)
 * → Investment Thesis (one paragraph) → Why This Project Stands Out → Key
 * Takeaways (Strengths/Weaknesses/Risks/Opportunities) → Key Metrics
 * Explained → Recent Developments (category icon/Headline/Detail/Relative
 * time) → Upcoming Catalysts → Watch Closely → Things We Couldn't Verify →
 * Sources Used (real, clickable links + Last Updated). Every field comes
 * from `buildIntelligenceReport()` (`lib/intelligence/report.ts`) — one
 * pass over already-computed `ProjectIntelligence`/Scorecard fields, each
 * fact assigned to exactly one section, so nothing here is ever computed or
 * shown twice. `id="overview"` is the `ProfileSectionNav` scroll target
 * this section owns.
 *
 * PR14.0 — presentation-only polish, no logic/data changes: renamed
 * "Why Base Radar Highlights This Project" to the more user-focused "Why
 * This Project Stands Out"; Recent Developments rows now show a category
 * icon chip; Key Takeaways is hidden entirely (not just an empty grid)
 * when every one of its four buckets is empty; Sources footer restructured
 * into a labeled section with a checkmark per live source plus a Last
 * Updated line beneath, instead of a flat comma-separated line.
 */
export function ProfileExecutiveIntelligence({
  report,
  freshness,
  developerFallbackTile,
  commitActivityPromise,
  contributorCountPromise,
  releasesPromise,
}: ProfileExecutiveIntelligenceProps) {
  const sentimentColor = RISK_SENTIMENT_COLOR[report.riskLevel];
  const nonDeveloperMetrics = report.metricsExplained.filter((m) => m.id !== "developer");
  const hasDeveloperMetric = report.metricsExplained.some((m) => m.id === "developer");
  const hasKeyTakeaways =
    report.strengths.length > 0 || report.weaknesses.length > 0 || report.threats.length > 0 || report.opportunities.length > 0;

  return (
    <ProfileSectionCard
      id="overview"
      title="Executive Intelligence"
      icon={Sparkles}
      className="bg-gradient-to-br from-radar-primary/[0.03] via-transparent to-transparent dark:from-radar-accent/[0.04]"
    >
      <div className="flex flex-col gap-6">
        {/* Section 1 — Overall Rating: Grade / Recommendation / Confidence / Risk. No headline sentence here — Investment Thesis (below) is the only place the report reads in prose, so nothing is ever said twice. */}
        <div
          className={cn(
            "flex flex-col gap-4 rounded-2xl border border-l-4 bg-gradient-to-br from-radar-primary/[0.07] via-transparent to-transparent p-5 shadow-[0_0_40px_-20px_rgba(var(--color-radar-primary-rgb),0.5)] dark:from-radar-accent/[0.09]",
            "border-radar-light-border dark:border-white/10",
            RISK_SENTIMENT_BORDER[report.riskLevel]
          )}
        >
          <div className="flex items-center gap-4">
            <span
              className={cn(
                "flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl font-extrabold ring-1",
                GRADE_RING[report.grade] ?? GRADE_RING.C,
                sentimentColor
              )}
            >
              {report.grade}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <p className="text-[10.5px] font-semibold tracking-wider text-radar-light-muted uppercase dark:text-radar-muted">Overall Rating</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-radar-light-border bg-radar-light-card px-3 py-1 text-xs font-semibold text-radar-light-text dark:border-white/10 dark:bg-white/[0.04] dark:text-radar-white">
                  <Compass className={cn("size-3.5 shrink-0", sentimentColor)} aria-hidden="true" />
                  {report.recommendation}
                </span>
                <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold", CONFIDENCE_PILL_CLASS[report.confidenceLabel])}>
                  <Gauge className="size-3.5 shrink-0" aria-hidden="true" />
                  {report.confidenceLabel} Confidence
                </span>
                <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold capitalize", sentimentColor, "border-current/30 bg-current/10")}>
                  <ShieldAlert className="size-3.5 shrink-0" aria-hidden="true" />
                  {report.riskLevel} Risk
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-radar-light-border/60 pt-3 text-[11px] text-radar-light-muted dark:border-white/10 dark:text-radar-muted">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3 shrink-0" aria-hidden="true" />
              Data Freshness: <span className={cn("font-semibold", FRESHNESS_COLOR[freshness.overall])}>{FRESHNESS_LABEL[freshness.overall]}</span>
              {freshness.newestSourceAt && <span>· Updated {formatRelativeTime(freshness.newestSourceAt)}</span>}
            </span>
          </div>
        </div>

        {/* Section 2 — Investment Thesis */}
        <div className="flex flex-col gap-2 border-t border-radar-light-border pt-6 dark:border-white/10">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="size-3.5 shrink-0 text-radar-primary dark:text-radar-accent" aria-hidden="true" />
            <span className="text-[10.5px] font-semibold tracking-wider text-radar-light-muted uppercase dark:text-radar-muted">Investment Thesis</span>
          </div>
          <p className="text-sm leading-relaxed text-radar-light-text dark:text-radar-white">{report.thesis}</p>
        </div>

        {/* Section 3 — Why This Project Stands Out */}
        {report.highlights.length > 0 && (
          <div className="border-t border-radar-light-border pt-6 dark:border-white/10">
            <ReportBucket icon={BadgeCheck} label="Why This Project Stands Out" tone="text-radar-primary dark:text-radar-accent" items={report.highlights} />
          </div>
        )}

        {/* Section 4 — Key Takeaways (Strengths / Weaknesses / Risks / Opportunities) — hidden entirely, not just an empty grid, when every bucket is empty */}
        {hasKeyTakeaways && (
          <div className="flex flex-col gap-3 border-t border-radar-light-border pt-6 dark:border-white/10">
            <span className="text-[10.5px] font-semibold tracking-wider text-radar-light-muted uppercase dark:text-radar-muted">Key Takeaways</span>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ReportBucket icon={CircleCheck} label="Strengths" tone="text-radar-success" items={report.strengths} />
              <ReportBucket icon={CircleX} label="Weaknesses" tone="text-radar-danger" items={report.weaknesses} />
              <ReportBucket icon={ShieldAlert} label="Risks" tone="text-radar-danger" items={report.threats} />
              <ReportBucket icon={Rocket} label="Opportunities" tone="text-radar-primary dark:text-radar-accent" items={report.opportunities} />
            </div>
          </div>
        )}

        {/* Section 5 — Key Metrics Explained */}
        {report.metricsExplained.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-radar-light-border pt-6 dark:border-white/10">
            <span className="text-[10.5px] font-semibold tracking-wider text-radar-light-muted uppercase dark:text-radar-muted">Key Metrics Explained</span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {nonDeveloperMetrics.map((metric) => (
                <MetricExplanationCard key={metric.id} explanation={metric} />
              ))}
              {hasDeveloperMetric && (
                <Suspense fallback={<MetricExplanationCard explanation={report.metricsExplained.find((m) => m.id === "developer")!} />}>
                  <ProfileMetricsExplainedDeveloperAsync
                    commitActivityPromise={commitActivityPromise}
                    contributorCountPromise={contributorCountPromise}
                    releasesPromise={releasesPromise}
                    fallbackTile={developerFallbackTile}
                  />
                </Suspense>
              )}
            </div>
          </div>
        )}

        {/* Section 6 — Recent Developments: category icon / Headline / Supporting detail / relative time */}
        {report.recentDevelopments.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-radar-light-border pt-6 dark:border-white/10">
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
              <span className="text-[10.5px] font-semibold tracking-wider text-radar-light-muted uppercase dark:text-radar-muted">Recent Developments</span>
            </div>
            <ul className="flex flex-col gap-3">
              {report.recentDevelopments.map((entry, index) => {
                const CategoryIcon = DEVELOPMENT_CATEGORY_ICON[entry.category];
                return (
                  <li key={index} className="flex items-start gap-3">
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-radar-light-border bg-radar-light-surface text-radar-light-muted dark:border-white/10 dark:bg-white/[0.03] dark:text-radar-muted"
                      aria-hidden="true"
                    >
                      <CategoryIcon className="size-3.5 shrink-0" />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <span className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
                          <span className="sr-only">{DEVELOPMENT_CATEGORY_LABEL[entry.category]}: </span>
                          {entry.headline}
                        </span>
                        <span className="shrink-0 text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">{entry.date}</span>
                      </div>
                      <span className="text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">{entry.detail}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Section 7 — Upcoming Catalysts (hidden entirely when none are real) */}
        {report.upcomingCatalysts.length > 0 && (
          <div className="border-t border-radar-light-border pt-6 dark:border-white/10">
            <ReportBucket icon={Clock} label="Upcoming Catalysts" tone="text-radar-primary dark:text-radar-accent" items={report.upcomingCatalysts} />
          </div>
        )}

        {/* Section 8 — Watch Closely */}
        <div className="flex flex-col gap-2 rounded-xl border border-radar-warning/25 bg-radar-warning/5 p-3 dark:border-radar-warning/20 dark:bg-radar-warning/10">
          <p className="flex items-center gap-1.5 text-[10.5px] font-semibold tracking-wider text-radar-warning uppercase">
            <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
            Watch Closely
          </p>
          <ul className="flex flex-col gap-2">
            {report.watchClosely.map((line, index) => (
              <li key={index} className="text-sm leading-relaxed text-radar-light-text dark:text-radar-white">
                {line}
              </li>
            ))}
          </ul>
        </div>

        {/* Section 9 — Things We Couldn't Verify (hidden entirely when nothing applies to this project) */}
        {report.thingsWeCouldntVerify.length > 0 && (
          <div className="border-t border-radar-light-border pt-6 dark:border-white/10">
            <ReportBucket
              icon={HelpCircle}
              label="Things We Couldn't Verify"
              tone="text-radar-light-muted dark:text-radar-muted"
              items={report.thingsWeCouldntVerify}
            />
          </div>
        )}

        {/* Section 10 — Sources: a checkmark per live source (Registry is always consulted for identity/verification, so it's always listed), Last Updated on its own line beneath */}
        <div className="flex flex-col gap-2 border-t border-radar-light-border pt-6 dark:border-white/10">
          <div className="flex items-center gap-1.5">
            <Database className="size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
            <span className="text-[10.5px] font-semibold tracking-wider text-radar-light-muted uppercase dark:text-radar-muted">Sources</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {report.sourcesUsed.map((source) => (
              <a
                key={source.name}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-radar-light-text underline-offset-2 hover:underline dark:text-radar-white"
              >
                <Check className="size-3.5 shrink-0 text-radar-success" aria-hidden="true" />
                {source.name}
              </a>
            ))}
            <span className="flex items-center gap-1.5 text-xs text-radar-light-text dark:text-radar-white">
              <Check className="size-3.5 shrink-0 text-radar-success" aria-hidden="true" />
              Registry
            </span>
            {report.sourcesUsed.length === 0 && (
              <span className="text-xs text-radar-light-muted dark:text-radar-muted">No other live sources</span>
            )}
          </div>
          {freshness.newestSourceAt && (
            <span className="flex items-center gap-1.5 text-[11px] text-radar-light-muted dark:text-radar-muted">
              <Clock className="size-3 shrink-0" aria-hidden="true" />
              Last Updated {formatRelativeTime(freshness.newestSourceAt)}
            </span>
          )}
        </div>
      </div>
    </ProfileSectionCard>
  );
}
