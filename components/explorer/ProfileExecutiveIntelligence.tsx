import {
  AlertTriangle,
  Check,
  CircleCheck,
  CircleX,
  Clock,
  Compass,
  Gauge,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";

import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { RelativeTime } from "@/components/shared/RelativeTime";
import type { IntelligenceReport } from "@/lib/intelligence/report";
import type { Freshness, Sources } from "@/lib/intelligence/types";
import type { VerificationStatus } from "@/data/projects/enums";
import { cn } from "@/lib/utils";

type ProfileExecutiveIntelligenceProps = {
  report: IntelligenceReport;
  freshness: Freshness;
  /** Real per-provider status, already computed for the Evidence & Sources panel below — reused here (not recalculated) to explain, in plain checkmarks, why Confidence sits where it does. */
  sources: Sources;
  verificationStatus: VerificationStatus;
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
 * report reads in prose) → Key Takeaways (Strengths/Weaknesses/Risks/
 * Opportunities) → Upcoming Catalysts → Watch Closely.
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
 */
export function ProfileExecutiveIntelligence({ report, freshness, sources, verificationStatus }: ProfileExecutiveIntelligenceProps) {
  const sentimentColor = RISK_SENTIMENT_COLOR[report.riskLevel];
  const confidenceFactors = buildConfidenceFactors(sources, verificationStatus);
  const hasKeyTakeaways =
    report.strengths.length > 0 || report.weaknesses.length > 0 || report.threats.length > 0 || report.opportunities.length > 0;

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
          </div>
        </div>

        {/* Key Takeaways (Strengths / Weaknesses / Risks / Opportunities) — hidden entirely, not just an empty grid, when every bucket is empty */}
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
      </div>
    </ProfileSectionCard>
  );
}
