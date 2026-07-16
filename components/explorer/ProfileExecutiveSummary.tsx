import {
  BadgeCheck,
  Brain,
  Circle,
  CircleAlert,
  CircleCheck,
  Clock,
  Code2,
  Compass,
  Fish,
  HeartPulse,
  Landmark,
  ShieldAlert,
  TrendingUp,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { formatRelativeTime } from "@/lib/data/format";
import { cn } from "@/lib/utils";
import type { ExecutiveSummaryBullet, ExecutiveSummaryBulletKind } from "@/lib/intelligence/scorecard";
import type { Confidence, Freshness, Health, Risk } from "@/lib/intelligence/types";

type ProfileExecutiveSummaryProps = {
  bullets: ExecutiveSummaryBullet[];
  verdict: string;
  health: Health;
  confidence: Confidence;
  risk: Risk;
  freshness: Freshness;
};

/** Same research-workflow phrasing `ProfileSummaryBanner`'s AI Verdict card uses — never investment advice ("Buy"/"Sell"), directly derived from the same real `risk.level`. */
const RECOMMENDATION_FOR_RISK: Record<string, string> = {
  low: "Suitable for Deeper Research",
  moderate: "Monitor Closely",
  high: "Exercise Caution",
};

const FRESHNESS_COLOR: Record<Freshness["overall"], string> = {
  fresh: "text-radar-success",
  mixed: "text-radar-warning",
  stale: "text-radar-danger",
  unknown: "text-radar-light-muted dark:text-radar-muted",
};

const FRESHNESS_LABEL: Record<Freshness["overall"], string> = {
  fresh: "Fresh",
  mixed: "Mixed",
  stale: "Stale",
  unknown: "Unknown",
};

const HEALTH_COLOR: Record<string, string> = {
  excellent: "text-radar-success",
  good: "text-radar-accent",
  fair: "text-radar-warning",
  poor: "text-radar-danger",
  unknown: "text-radar-light-muted dark:text-radar-muted",
};

const HEALTH_BAR: Record<string, string> = {
  excellent: "bg-radar-success",
  good: "bg-radar-accent",
  fair: "bg-radar-warning",
  poor: "bg-radar-danger",
  unknown: "bg-radar-light-muted/40 dark:bg-radar-muted/40",
};

const CONFIDENCE_COLOR: Record<string, string> = {
  high: "text-radar-success",
  medium: "text-radar-warning",
  low: "text-radar-danger",
};

const CONFIDENCE_BAR: Record<string, string> = {
  high: "bg-radar-success",
  medium: "bg-radar-warning",
  low: "bg-radar-danger",
};

const RISK_COLOR: Record<string, string> = {
  low: "text-radar-success",
  moderate: "text-radar-warning",
  high: "text-radar-danger",
};

const RISK_ICON_BG: Record<string, string> = {
  low: "bg-radar-success/10",
  moderate: "bg-radar-warning/10",
  high: "bg-radar-danger/10",
};

/**
 * One stacked "icon + label + value(+ progress)" card in the Executive
 * Summary's right-hand rail (PR12.1e Req 2) — larger and more prominent
 * than a horizontal chip, matching the "premium metric card" brief. The
 * progress bar (when `progress` is passed) is a direct read of the same
 * real 0-100 score already shown as text, never an independent estimate.
 */
function StackedMetricCard({
  icon: Icon,
  label,
  value,
  valueClassName,
  iconBgClassName,
  progress,
  progressBarClassName,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  valueClassName: string;
  iconBgClassName: string;
  progress?: number;
  progressBarClassName?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-2.5 dark:border-white/10 dark:bg-white/[0.02]">
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", iconBgClassName)}>
        <Icon className={cn("size-4 shrink-0", valueClassName)} aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">{label}</span>
        <span className={cn("truncate text-sm font-bold capitalize", valueClassName)}>{value}</span>
        {progress !== undefined && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-radar-light-border dark:bg-white/10">
            <div className={cn("h-full rounded-full", progressBarClassName)} style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

const TONE_ICON: Record<ExecutiveSummaryBullet["tone"], LucideIcon> = {
  positive: CircleCheck,
  negative: CircleAlert,
  neutral: Circle,
};

/** PR12.1c Req 5.2 — one distinct icon per bullet's underlying real signal, instead of every bullet sharing the same tone icon. Tone still drives color; `kind` drives which icon. */
const KIND_ICON: Record<ExecutiveSummaryBulletKind, LucideIcon> = {
  verification: BadgeCheck,
  confidence: CircleAlert,
  tvl: Wallet,
  price: TrendingUp,
  developer: Code2,
  whale: Fish,
  governance: Landmark,
  outlook: TrendingUp,
};

const TONE_CLASS: Record<ExecutiveSummaryBullet["tone"], string> = {
  positive: "text-radar-success",
  negative: "text-radar-danger",
  neutral: "text-radar-light-muted dark:text-radar-muted",
};

/**
 * PR12.1 Req 1.6, restructured into a responsive 2-column layout in
 * PR12.1e Req 2 — reasons on the left, stacked Verdict/Confidence/Health/
 * Risk cards on the right, so the section reads as complete on its own
 * instead of a lone column of text beside empty space. Every bullet is one
 * of `buildExecutiveSummaryBullets()`'s pure derivations from
 * already-computed `ProjectIntelligence` fields — no new provider call,
 * nothing invented.
 */
export function ProfileExecutiveSummary({ bullets, verdict, health, confidence, risk, freshness }: ProfileExecutiveSummaryProps) {
  const positives = bullets.filter((b) => b.tone === "positive").length;
  const negatives = bullets.filter((b) => b.tone === "negative").length;
  const overallTone: ExecutiveSummaryBullet["tone"] = negatives > positives ? "negative" : positives > 0 ? "positive" : "neutral";
  const OverallIcon = TONE_ICON[overallTone];

  return (
    <ProfileSectionCard>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <OverallIcon className={cn("size-4 shrink-0", TONE_CLASS[overallTone])} aria-hidden="true" />
            <h2 className="text-xs font-semibold tracking-wider text-radar-light-muted uppercase dark:text-radar-muted">
              Executive Summary
            </h2>
          </div>
          <ul className="flex flex-col gap-1.5">
            {bullets.map((bullet, index) => {
              const Icon = KIND_ICON[bullet.kind];
              return (
                <li key={index} className="flex items-start gap-2 text-sm text-radar-light-text dark:text-radar-white">
                  <Icon className={cn("mt-0.5 size-3.5 shrink-0", TONE_CLASS[bullet.tone])} aria-hidden="true" />
                  <span>{bullet.text}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <StackedMetricCard
            icon={Zap}
            label="Verdict"
            value={verdict}
            valueClassName="text-radar-primary dark:text-radar-accent normal-case"
            iconBgClassName="bg-radar-primary/10 dark:bg-radar-accent/10"
          />
          <StackedMetricCard
            icon={ShieldAlert}
            label="Risk"
            value={`${risk.level} risk`}
            valueClassName={RISK_COLOR[risk.level]}
            iconBgClassName={RISK_ICON_BG[risk.level]}
          />
          <StackedMetricCard
            icon={HeartPulse}
            label="Health"
            value={`${health.score}/100`}
            valueClassName={HEALTH_COLOR[health.label]}
            iconBgClassName="bg-radar-success/10"
            progress={health.score}
            progressBarClassName={HEALTH_BAR[health.label]}
          />
          <StackedMetricCard
            icon={Brain}
            label="Confidence"
            value={`${confidence.score}/100`}
            valueClassName={CONFIDENCE_COLOR[confidence.level]}
            iconBgClassName="bg-radar-primary/10 dark:bg-radar-accent/10"
            progress={confidence.score}
            progressBarClassName={CONFIDENCE_BAR[confidence.level]}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-radar-light-border pt-3 dark:border-white/10">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-radar-light-border bg-radar-light-surface px-3 py-1 text-xs font-semibold text-radar-light-text dark:border-white/10 dark:bg-white/[0.02] dark:text-radar-white">
          <Compass className={cn("size-3.5 shrink-0", RISK_COLOR[risk.level])} aria-hidden="true" />
          {RECOMMENDATION_FOR_RISK[risk.level]}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-radar-light-muted dark:text-radar-muted">
          <Clock className="size-3.5 shrink-0" aria-hidden="true" />
          Data Freshness:
          <span className={cn("font-semibold", FRESHNESS_COLOR[freshness.overall])}>{FRESHNESS_LABEL[freshness.overall]}</span>
          {freshness.newestSourceAt && <span>· Updated {formatRelativeTime(freshness.newestSourceAt)}</span>}
        </span>
      </div>
    </ProfileSectionCard>
  );
}
