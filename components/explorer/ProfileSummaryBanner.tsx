import { BadgeCheck, Clock, Code2, Compass, Database, Gauge, TrendingUp, Wallet, Zap, type LucideIcon } from "lucide-react";

import { ChangeValue } from "@/components/explorer/ChangeValue";
import { formatCompactCurrency, formatCompactNumber, formatRelativeTime } from "@/lib/data/format";
import { buildAiVerdict, PROVIDER_DISPLAY_NAME } from "@/lib/intelligence/scorecard";
import { cn } from "@/lib/utils";
import type { Confidence, GithubIntel, Health, Metadata, Risk, Sources, Tvl } from "@/lib/intelligence/types";
import type { ProviderName } from "@/lib/providers/common/types";
import type { VerificationStatus } from "@/data/projects/enums";

type ProfileSummaryBannerProps = {
  verificationStatus: VerificationStatus;
  tvl: Tvl;
  health: Health;
  confidence: Confidence;
  github: GithubIntel;
  narrativeLabel: string | null;
  risk: Risk;
  sources: Sources;
  metadata: Metadata;
};

/** Sentiment coloring for the AI Verdict card — driven by `risk.level`, the same real, already-computed field `buildAiVerdict` itself reads first. */
const RISK_SENTIMENT_COLOR: Record<string, string> = {
  low: "text-radar-success",
  moderate: "text-radar-warning",
  high: "text-radar-danger",
};

const RISK_SENTIMENT_BORDER: Record<string, string> = {
  low: "border-l-radar-success",
  moderate: "border-l-radar-warning",
  high: "border-l-radar-danger",
};

const RISK_SENTIMENT_ICON_BG: Record<string, string> = {
  low: "from-radar-success/15 to-radar-success/5 text-radar-success",
  moderate: "from-radar-warning/15 to-radar-warning/5 text-radar-warning",
  high: "from-radar-danger/15 to-radar-danger/5 text-radar-danger",
};

/** A research-workflow label, never investment advice ("Buy"/"Sell") — directly derived from the same `risk.level` the Risk Analysis section already computed. */
const RECOMMENDATION_FOR_RISK: Record<string, string> = {
  low: "Suitable for Deeper Research",
  moderate: "Monitor Closely",
  high: "Exercise Caution",
};

const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  verified: "Verified",
  community: "Community-Reviewed",
  unverified: "Unverified",
  flagged: "Flagged",
};

const VERIFICATION_COLOR: Record<VerificationStatus, string> = {
  verified: "text-radar-success",
  community: "text-radar-accent",
  unverified: "text-radar-light-muted dark:text-radar-muted",
  flagged: "text-radar-danger",
};

/** One metric tile in the banner's top row — icon, label, colored value. */
function SummaryTile({
  icon: Icon,
  iconClassName,
  label,
  children,
}: {
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-radar-light-border bg-radar-light-card/60 px-3 py-2 transition-colors hover:bg-radar-light-card dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]">
      <Icon className={cn("size-4 shrink-0", iconClassName)} aria-hidden="true" />
      <div className="flex min-w-0 flex-col">
        <span className="text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">{label}</span>
        <span className="truncate text-sm font-bold tabular-nums text-radar-light-text dark:text-radar-white">{children}</span>
      </div>
    </div>
  );
}

/**
 * PR12.1 Req 1 (highest priority) — the plain "Verified project with
 * $13.69B TVL..." sentence is replaced with a scannable tile row (Status /
 * TVL / Developers / Trend) plus a full-width AI Verdict banner as the
 * page's true visual focal point — the page's actual focal moment,
 * enhanced in PR12.1e Req 3 with a short explanation, a confidence meter,
 * and a research-workflow recommendation chip. Health/Confidence moved out
 * of this tile row in PR12.1e (they're now `ProfileExecutiveSummary`'s
 * stacked cards immediately above this banner — showing the same two
 * numbers a third time added nothing). Every value is the exact same
 * already-computed field the old sentence quoted — this is a presentation
 * change, not a new data source. `buildAiVerdict` (pure, `lib/intelligence/
 * scorecard.ts`) buckets the same Health/Confidence/Risk into one headline
 * phrase; sentiment coloring and the recommendation chip both key off the
 * same real `risk.level`.
 */
export function ProfileSummaryBanner({ verificationStatus, tvl, health, confidence, github, narrativeLabel, risk, sources, metadata }: ProfileSummaryBannerProps) {
  const verdict = buildAiVerdict(health, confidence, risk);
  const trendLabel = narrativeLabel ? narrativeLabel[0].toUpperCase() + narrativeLabel.slice(1) : "Neutral";
  const sentimentColor = RISK_SENTIMENT_COLOR[risk.level];
  const explanation = `Backed by ${health.label} health and ${confidence.level} confidence data, with ${risk.level} risk.`;
  const recommendation = RECOMMENDATION_FOR_RISK[risk.level];
  const liveProviders = (Object.keys(sources) as ProviderName[])
    .filter((provider) => sources[provider].status === "live")
    .map((provider) => PROVIDER_DISPLAY_NAME[provider]);

  return (
    <section id="overview" className="scroll-mt-28 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryTile icon={BadgeCheck} iconClassName={VERIFICATION_COLOR[verificationStatus]} label="Status">
          {VERIFICATION_LABEL[verificationStatus]}
        </SummaryTile>
        <SummaryTile icon={Wallet} iconClassName="text-radar-primary dark:text-radar-accent" label="TVL">
          {tvl.available && tvl.tvlUsd !== null ? (
            <span className="flex items-center gap-1.5">
              {formatCompactCurrency(tvl.tvlUsd)}
              {tvl.changePct24h !== null && <ChangeValue value={tvl.changePct24h} className="text-xs" />}
            </span>
          ) : (
            <span className="text-radar-light-muted dark:text-radar-muted">Unavailable</span>
          )}
        </SummaryTile>
        <SummaryTile icon={Code2} iconClassName="text-radar-primary dark:text-radar-accent" label="Developers">
          {github.available && github.stars !== null ? `${formatCompactNumber(github.stars)} Stars` : "Unavailable"}
        </SummaryTile>
        <SummaryTile icon={TrendingUp} iconClassName="text-radar-primary dark:text-radar-accent" label="Trend">
          {trendLabel}
        </SummaryTile>
      </div>

      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border border-l-4 bg-gradient-to-r from-radar-primary/[0.06] to-transparent p-4 shadow-[0_0_40px_-20px_rgba(var(--color-radar-primary-rgb),0.5)] dark:from-radar-accent/[0.08] sm:p-5",
          "border-radar-light-border dark:border-white/10",
          RISK_SENTIMENT_BORDER[risk.level]
        )}
      >
        <div className="flex items-start gap-3">
          <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br", RISK_SENTIMENT_ICON_BG[risk.level])}>
            <Zap className="size-5" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-xs font-semibold tracking-wider text-radar-light-muted uppercase dark:text-radar-muted">AI Verdict</p>
            <p className={cn("text-2xl leading-tight font-bold", sentimentColor)}>{verdict}</p>
            <p className="text-sm text-radar-light-muted dark:text-radar-muted">{explanation}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-radar-light-border/60 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 dark:border-white/10">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-radar-light-border bg-radar-light-card px-3 py-1 text-xs font-semibold text-radar-light-text dark:border-white/10 dark:bg-white/[0.04] dark:text-radar-white">
            <Compass className={cn("size-3.5 shrink-0", sentimentColor)} aria-hidden="true" />
            {recommendation}
          </span>
          <div className="flex min-w-0 items-center gap-2 sm:flex-1">
            <Gauge className="size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
            <span className="shrink-0 text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
              Confidence
            </span>
            <div className="h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-radar-light-border sm:max-w-32 sm:flex-none sm:w-full dark:bg-white/10">
              <div
                className={cn("h-full rounded-full", confidence.level === "high" ? "bg-radar-success" : confidence.level === "medium" ? "bg-radar-warning" : "bg-radar-danger")}
                style={{ width: `${confidence.score}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-radar-light-text dark:text-radar-white">{confidence.score}%</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-radar-light-muted dark:text-radar-muted">
          <span className="flex items-center gap-1.5">
            <Clock className="size-3 shrink-0" aria-hidden="true" />
            Last updated {formatRelativeTime(metadata.generatedAt)}
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <Database className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">
              Sources: {liveProviders.length > 0 ? liveProviders.join(", ") : "No live sources"}
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
