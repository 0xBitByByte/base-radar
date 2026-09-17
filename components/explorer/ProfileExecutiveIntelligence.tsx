import {
  AlertTriangle,
  ArrowRight,
  Check,
  CircleCheck,
  CircleX,
  Clock,
  Compass,
  Gauge,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { RelativeTime } from "@/components/shared/RelativeTime";
import type { IntelligenceReport } from "@/lib/intelligence/report";
import type { Freshness, Sources } from "@/lib/intelligence/types";
import type { VerificationStatus } from "@/data/projects/enums";
import { PROVIDER_NAMES } from "@/lib/providers/common/types";
import { cn } from "@/lib/utils";

type ProfileExecutiveIntelligenceProps = {
  report: IntelligenceReport;
  freshness: Freshness;
  /** Real per-provider status, already computed for the Evidence & Sources panel below — reused here (not recalculated) to explain, in plain checkmarks, why Confidence sits where it does, and (PR-085.01) to compute the relocated provider-coverage count below. */
  sources: Sources;
  verificationStatus: VerificationStatus;
  /** PR-084.06 — the real AI Intelligence Report route for this project (`/dashboard/projects/{slug}/ai`), built once in `page.tsx` from `slug`. */
  aiHref: string;
  /** PR-085.01 — relocated from the now-removed `ProfileTrustCenter`'s "Official Website" tile, the one fact from that section with no fuller home anywhere else on the page. Same real `profile.identity.websiteUrl` field, not recomputed. */
  websiteUrl: string | null;
};

type ConfidenceFactor = { label: string; met: boolean };

/** Confidence is literally "how much of this report is backed by live data" (`buildThesis`'s own `liveSourceCount`) — this reuses the exact same real signals, just as a labeled checklist instead of a single number, so "Medium Confidence" never appears without a visible reason. Never a fabricated factor: every line maps 1:1 to a real `SourceAttribution.status` or the registry's own verification field. */
function buildConfidenceFactors(sources: Sources, verificationStatus: VerificationStatus): ConfidenceFactor[] {
  return [
    { label: "Registry verified", met: verificationStatus === "verified" },
    { label: "Price feeds available", met: sources.coingecko.status === "live" },
    { label: "TVL data available", met: sources.defillama.status === "live" },
    { label: "On-chain data available", met: sources.blockscout.status === "live" },
    { label: "GitHub data available", met: sources.github.status === "live" },
  ];
}

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
 * Base Radar's "Health & Trust" section — PR-050 follow-up narrows this from
 * the old monolithic Executive Intelligence card down to just the trust/risk
 * assessment core: Overall Rating hero (pills only, no headline sentence —
 * Project Summary, now its own top-level section, is the only place the
 * report reads in prose) → Key Takeaways, grouped Bull Case (Strengths +
 * Opportunities) / Bear Case (Weaknesses + Risks) since PR-085.03 → Upcoming
 * Catalysts → Watch Closely.
 *
 * PR-085.03 ("AI Project Summary") audited this component against its own
 * 8-section spec and found ~90% already shipped here and in `ProfileSummary`
 * (Executive Summary = thesis, Bull/Bear = Key Takeaways, Key Opportunities/
 * Risks = the same buckets, Watch Next = Catalysts + Watch Closely, and the
 * footer link already fills "Link to Full AI Report"). The only two real
 * gaps closed by that pass: labeling/regrouping Key Takeaways under Bull/Bear
 * (previously four flat quadrants), and turning the provider-coverage line
 * below into a link to `ProfileSources`'s "Evidence & Sources" section so
 * "Supporting Evidence" has a compact presence here instead of none. No new
 * section was added — `lib/intelligence/executiveIntelligence.ts`'s own doc
 * comment already explains why a second visible summary would duplicate this
 * one.
 *
 * Investment Thesis, "Why This Project Stands Out," Key Metrics Explained,
 * Recent Developments, and the Sources footer all used to render here too —
 * each has been extracted into its own clearly-labeled, appropriately
 * positioned top-level section (`ProfileSummary`, `ProfileWhyItMatters`,
 * `ProfileRecentHighlights`, `ProfileSources`) per the reviewer's mandated
 * "reads like an intelligence report, not a widget dashboard" flow. Key
 * Metrics Explained specifically is gone rather than relocated — it rendered
 * the same Health/Confidence/Risk/Verification/Developer/Liquidity/
 * Governance/Community tiles `ProjectHealthScorecard` already shows, a
 * confirmed real duplication; the Scorecard is now the one place that grid
 * lives. Every remaining field still comes from `buildIntelligenceReport()`
 * (`lib/intelligence/report.ts`) — nothing here is computed twice.
 *
 * PR-085.01 — this is now this page's sole "can I trust it?" owner.
 * `ProfileTrustCenter` (a separate, redundant "Trust Center" section) and
 * `ProfileIntelligence` (a separate "AI Intelligence" section duplicating
 * the `/ai` report page's full Risk Analysis and Health/Confidence factor
 * detail) are both retired — a full audit found 6 of Trust Center's 8 facts
 * already had a fuller home elsewhere on the page (Verification/Confidence
 * → the Scorecard, GitHub/Docs/Registry-Completeness → the Community
 * section, Verified Contracts → the Network section), and `ProfileIntelligence`'s
 * only non-duplicated content (a Narrative Signal sentence) is redundant
 * with `buildThesis()`'s own "Near-term momentum reads {narrativeLabel}"
 * clause already in the Project Summary paragraph. Trust Center's two
 * genuinely unique facts (Official Website configured, live-provider
 * coverage) are relocated into the info row below rather than lost.
 */
export function ProfileExecutiveIntelligence({ report, freshness, sources, verificationStatus, aiHref, websiteUrl }: ProfileExecutiveIntelligenceProps) {
  const sentimentColor = RISK_SENTIMENT_COLOR[report.riskLevel];
  const confidenceFactors = buildConfidenceFactors(sources, verificationStatus);
  const hasBullCase = report.strengths.length > 0 || report.opportunities.length > 0;
  const hasBearCase = report.weaknesses.length > 0 || report.threats.length > 0;
  const hasKeyTakeaways = hasBullCase || hasBearCase;
  // PR-085.01 — relocated from `ProfileTrustCenter`'s "Provider Coverage"
  // tile: the exact same `sources` prop this component already receives for
  // the confidence checklist above, just counted rather than checklisted.
  const liveSourceCount = Object.values(sources).filter((source) => source.status === "live").length;

  return (
    <ProfileSectionCard
      id="overview"
      title="Health & Trust"
      icon={ShieldCheck}
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
          {/* PR-073 refinement pass — Recommendation is the single most decision-relevant piece of text on this whole page, so it now reads as a bold headline sentence next to the grade rather than a pill competing equally with Confidence/Risk; those two stay as smaller supporting pills directly beneath it. */}
          <div className="flex items-start gap-4">
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
              <p className="flex items-center gap-1.5 text-base font-bold text-radar-light-text dark:text-radar-white">
                <Compass className={cn("size-4 shrink-0", sentimentColor)} aria-hidden="true" />
                {report.recommendation}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", CONFIDENCE_PILL_CLASS[report.confidenceLabel])}>
                  <Gauge className="size-3 shrink-0" aria-hidden="true" />
                  {report.confidenceLabel} Confidence
                </span>
                <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize", sentimentColor, "border-current/30 bg-current/10")}>
                  <ShieldAlert className="size-3 shrink-0" aria-hidden="true" />
                  {report.riskLevel} Risk
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-radar-light-border/60 pt-3 dark:border-white/10">
            <span className="text-[10.5px] font-semibold tracking-wider text-radar-light-muted uppercase dark:text-radar-muted">
              Why {report.confidenceLabel} Confidence
            </span>
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {confidenceFactors.map((factor) => (
                <li
                  key={factor.label}
                  className={cn(
                    "flex items-center gap-1 text-[11px] font-medium",
                    factor.met ? "text-radar-success" : "text-radar-light-muted dark:text-radar-muted"
                  )}
                >
                  {factor.met ? <Check className="size-3 shrink-0" aria-hidden="true" /> : <X className="size-3 shrink-0" aria-hidden="true" />}
                  {factor.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-radar-light-border/60 pt-3 text-[11px] text-radar-light-muted dark:border-white/10 dark:text-radar-muted">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3 shrink-0" aria-hidden="true" />
              Data Freshness: <span className={cn("font-semibold", FRESHNESS_COLOR[freshness.overall])}>{FRESHNESS_LABEL[freshness.overall]}</span>
              {freshness.newestSourceAt && (
                <span>
                  · Updated <RelativeTime iso={freshness.newestSourceAt} />
                </span>
              )}
            </span>
            {/* PR-085.01 — the two facts relocated from `ProfileTrustCenter` (see this file's own doc comment). Same row style as Data Freshness above, not a new card. */}
            <span>
              Website: <span className="font-semibold text-radar-light-text dark:text-radar-white">{websiteUrl ? "Configured" : "Not configured"}</span>
            </span>
            {/* PR-085.03 — compact link to `ProfileSources`'s "Evidence & Sources" section (`#sources`), the one authoritative owner of the full source list and metric explanations. Counts only, reusing `liveSourceCount` (computed above) and `report.metricsExplained` (already computed by `buildIntelligenceReport()`) — nothing recalculated here. PR-085.05 — recolored to match this file's other real link ("View Full AI Intelligence Report" below): the original `text-radar-light-text` matched the plain facts around it exactly, so on touch devices (no `:hover`) it read as inert text, not a link. */}
            <Link
              href="#sources"
              className="font-medium text-radar-light-muted underline-offset-2 outline-none transition-colors hover:text-radar-primary hover:underline focus-visible:text-radar-primary focus-visible:underline dark:text-radar-muted dark:hover:text-radar-accent dark:focus-visible:text-radar-accent"
            >
              {liveSourceCount} of {PROVIDER_NAMES.length} providers live · {report.metricsExplained.length} metrics explained
            </Link>
          </div>
        </div>

        {/* Key Takeaways, grouped as Bull Case / Bear Case (PR-085.03) — same four buckets as before (Strengths/Opportunities vs. Weaknesses/Risks), just regrouped under the two labels the AI Project Summary requirement asks for instead of four flat quadrants. No new bullets, no new computation: each `ReportBucket` still reads directly from `report.strengths`/`report.weaknesses`/`report.threats`/`report.opportunities`. Each panel — and the section as a whole — is hidden entirely, not just left empty, when its buckets have nothing real to show. */}
        {hasKeyTakeaways && (
          <div className="flex flex-col gap-3 border-t border-radar-light-border pt-6 dark:border-white/10">
            <span className="text-[10.5px] font-semibold tracking-wider text-radar-light-muted uppercase dark:text-radar-muted">Key Takeaways</span>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {hasBullCase && (
                <div className="flex flex-col gap-4 border-l-2 border-l-radar-success/40 pl-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-radar-success">
                    <TrendingUp className="size-3.5 shrink-0" aria-hidden="true" />
                    Bull Case
                  </p>
                  <ReportBucket icon={CircleCheck} label="Strengths" tone="text-radar-success" items={report.strengths} />
                  <ReportBucket icon={Rocket} label="Opportunities" tone="text-radar-primary dark:text-radar-accent" items={report.opportunities} />
                </div>
              )}
              {hasBearCase && (
                <div className="flex flex-col gap-4 border-l-2 border-l-radar-danger/40 pl-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-radar-danger">
                    <TrendingDown className="size-3.5 shrink-0" aria-hidden="true" />
                    Bear Case
                  </p>
                  <ReportBucket icon={CircleX} label="Weaknesses" tone="text-radar-danger" items={report.weaknesses} />
                  <ReportBucket icon={ShieldAlert} label="Risks" tone="text-radar-danger" items={report.threats} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upcoming Catalysts (hidden entirely when none are real) */}
        {report.upcomingCatalysts.length > 0 && (
          <div className="border-t border-radar-light-border pt-6 dark:border-white/10">
            <ReportBucket icon={Clock} label="Upcoming Catalysts" tone="text-radar-primary dark:text-radar-accent" items={report.upcomingCatalysts} />
          </div>
        )}

        {/* Watch Closely */}
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

        {/* PR-084.06 — the full-depth destination: every Scorecard tile
            (including the four never shown elsewhere), the complete Risk
            Analysis, and a cross-domain summary linking to the Pool/
            Contract/Governance/Whale Explorers. */}
        <Link
          href={aiHref}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-radar-light-border py-2 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:border-radar-primary/40 hover:text-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-muted dark:hover:border-radar-accent/40 dark:hover:text-radar-accent"
        >
          View Full AI Intelligence Report
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </ProfileSectionCard>
  );
}
