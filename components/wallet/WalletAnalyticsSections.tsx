import type { ReactNode } from "react";
import { Activity, Award, BarChart3, Clock, HeartPulse, History, Sparkles, Star, Target, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AnalyticsWindow, WalletAnalytics } from "@/lib/wallet-analytics/types";
import { ANALYTICS_WINDOWS, ANALYTICS_WINDOW_LABEL } from "@/lib/wallet-analytics/window";
import { GLASS_CARD_SURFACE } from "@/components/ui/glassStyles";
import { EmptyState } from "@/components/ui/EmptyState";
import { RelativeTime } from "@/components/shared/RelativeTime";
import {
  HIGHLIGHT_PRIORITY_CLASS,
  HIGHLIGHT_PRIORITY_LABEL,
  STABILITY_LEVEL_CLASS,
  STABILITY_LEVEL_ICON,
  TREND_CONFIDENCE_CLASS,
  TREND_CONFIDENCE_LABEL,
  TREND_DIRECTION_CLASS,
  TREND_DIRECTION_ICON,
  TREND_DIRECTION_LABEL,
} from "@/components/wallet/walletAnalyticsMeta";

/**
 * V4-ANALYTICS-001 (Phase 9) — the Wallet page's Analytics sections. Every
 * section reads `WalletAnalytics` (already fully computed by
 * `useWalletAnalytics()` — nothing here recomputes a trend/finding) and
 * shows an honest "not enough history yet" state whenever
 * `analytics.snapshotCount < 2`, since a single point in time genuinely has
 * no trajectory — this is the REAL, common case for most sessions (there is
 * no cross-session persistence yet; see `lib/hooks/useWalletAnalytics.ts`'s
 * own doc comment).
 */

function SectionCard({ title, icon, children, className }: { title: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 p-6", GLASS_CARD_SURFACE, className)}>
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold text-radar-light-text dark:text-radar-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function PriorityStars({ stars }: { stars: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn("size-3", i < stars ? "fill-current" : "text-radar-light-border dark:text-white/15")} />
      ))}
    </span>
  );
}

/**
 * V4-ANALYTICS-001B (Phase 6/7) — the Executive Analytics Card: the single
 * highest-priority entry from `analytics.highlights` (already fully ranked
 * and deduplicated by `buildAnalyticsHighlights()` — nothing here re-sorts
 * or recomputes). Deliberately shows only the ONE top highlight, never a
 * full list — every highlight's underlying detail already has its own
 * dedicated section below (Biggest Change, Recovery Analysis, etc.), so a
 * list here would duplicate that content; this card's job is purely "what's
 * the single most important thing to know before you scroll."
 */
export function AnalyticsHighlightsCard({ analytics, className }: { analytics: WalletAnalytics; className?: string }) {
  const top = analytics.highlights[0];

  if (!top) {
    return (
      <SectionCard title="Analytics Highlights" icon={<Sparkles className="size-4 text-radar-purple" aria-hidden="true" />} className={className}>
        <p className="text-xs text-radar-light-muted dark:text-radar-muted">Nothing stands out yet — check back after a few more real changes.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Analytics Highlights" icon={<Sparkles className="size-4 text-radar-purple" aria-hidden="true" />} className={className}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-base font-semibold text-radar-light-text dark:text-radar-white">{top.title}</span>
          <span className="text-sm text-radar-light-muted dark:text-radar-muted">{top.reason}</span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <PriorityStars stars={top.stars} />
          <span className={cn("text-[10.5px] font-medium", HIGHLIGHT_PRIORITY_CLASS[top.priority])}>{HIGHLIGHT_PRIORITY_LABEL[top.priority]}</span>
        </div>
      </div>
      {top.supportingMetric && (
        <p className="text-xs text-radar-light-muted/80 dark:text-radar-muted/80">
          <span className="font-medium text-radar-light-text dark:text-radar-white">{top.supportingMetric}</span>
        </p>
      )}
      {analytics.highlights.length > 1 && (
        <p className="text-[10.5px] text-radar-light-muted/70 dark:text-radar-muted/70">+{analytics.highlights.length - 1} more in the sections below.</p>
      )}
    </SectionCard>
  );
}

/**
 * V4-ANALYTICS-001A (Phase 2/11) — lets the Wallet page pick which
 * `AnalyticsWindow` the window-scoped sections below (Trends, Biggest
 * Change, Evolution, Allocation Changes, Historical Summary, Timeline,
 * Trend Correlation, Stability) are computed over. Purely a selector —
 * `useWalletAnalytics(window)` is the only place the actual filtering
 * happens.
 */
export function AnalyticsWindowSelector({ window, onChange, className }: { window: AnalyticsWindow; onChange: (window: AnalyticsWindow) => void; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} role="group" aria-label="Analytics time window">
      {ANALYTICS_WINDOWS.map((w) => (
        <button
          key={w}
          type="button"
          onClick={() => onChange(w)}
          aria-pressed={w === window}
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50",
            w === window
              ? "border-radar-primary bg-radar-primary/10 text-radar-primary dark:border-radar-accent dark:bg-radar-accent/10 dark:text-radar-accent"
              : "border-radar-light-border text-radar-light-muted hover:bg-radar-light-surface dark:border-white/10 dark:text-radar-muted dark:hover:bg-white/5"
          )}
        >
          {ANALYTICS_WINDOW_LABEL[w]}
        </button>
      ))}
    </div>
  );
}

function InsufficientHistoryNotice({ snapshotCount }: { snapshotCount: number }) {
  return (
    <EmptyState
      icon={History}
      title="Not enough history yet"
      description={
        snapshotCount === 0
          ? "Analytics need at least 2 real refreshes with a genuine change to compute a trend — nothing has been captured this session yet."
          : "One snapshot captured so far — refresh again after something real changes to see trends."
      }
    />
  );
}

export function PortfolioTrendsSection({ analytics, className }: { analytics: WalletAnalytics; className?: string }) {
  if (analytics.snapshotCount < 2) {
    return (
      <SectionCard title="Portfolio Trends" icon={<BarChart3 className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />} className={className}>
        <InsufficientHistoryNotice snapshotCount={analytics.snapshotCount} />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Portfolio Trends" icon={<BarChart3 className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />} className={className}>
      <ul className="flex flex-col divide-y divide-radar-light-border dark:divide-white/10">
        {analytics.trends.map((trend) => {
          const Icon = TREND_DIRECTION_ICON[trend.direction];
          return (
            <li key={trend.metric} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium text-radar-light-text dark:text-radar-white">{trend.label}</span>
                <span className="text-xs text-radar-light-muted dark:text-radar-muted">{trend.reason}</span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span className={cn("flex items-center gap-1 text-xs font-medium", TREND_DIRECTION_CLASS[trend.direction])}>
                  <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                  {TREND_DIRECTION_LABEL[trend.direction]}
                </span>
                {/* V4-ANALYTICS-002 — confidence in the TREND ITSELF, not Portfolio AI's confidence score; see `walletAnalyticsMeta.ts`'s own doc comment. */}
                <span className={cn("text-[10px]", TREND_CONFIDENCE_CLASS[trend.confidence])}>{TREND_CONFIDENCE_LABEL[trend.confidence]}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

const AFFECTED_SCORE_LABELS: { key: "health" | "confidence" | "risk" | "recommendation"; label: string }[] = [
  { key: "health", label: "Health" },
  { key: "confidence", label: "Confidence" },
  { key: "risk", label: "Risk" },
  { key: "recommendation", label: "Recommendation" },
];

/**
 * V4-ANALYTICS-002 (Portfolio Evolution Enhancements) — the single most
 * significant real change, from `analytics.biggestChange` (already fully
 * computed by `buildBiggestChange()` — nothing here recomputes a magnitude
 * or invents a cause). `primaryCause` is always the winning trend's own
 * `reason` verbatim, never a separate generated narrative.
 */
export function BiggestChangeSection({ analytics, className }: { analytics: WalletAnalytics; className?: string }) {
  const { biggestChange } = analytics;

  if (analytics.snapshotCount < 2 || !biggestChange) {
    return (
      <SectionCard title="Biggest Change" icon={<Target className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />} className={className}>
        {analytics.snapshotCount < 2 ? (
          <InsufficientHistoryNotice snapshotCount={analytics.snapshotCount} />
        ) : (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">Nothing has changed enough yet to call out a single biggest change.</p>
        )}
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Biggest Change" icon={<Target className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />} className={className}>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-radar-light-muted dark:text-radar-muted">{biggestChange.category}</span>
        <p className="text-sm text-radar-light-text dark:text-radar-white">{biggestChange.primaryCause}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-radar-light-muted dark:text-radar-muted">
        <span>
          <span className="font-medium text-radar-light-text dark:text-radar-white">Magnitude: </span>
          {biggestChange.magnitude.toLocaleString()}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">Also moved:</span>
        {AFFECTED_SCORE_LABELS.filter(({ key }) => biggestChange.affectedScores[key]).length === 0 ? (
          <span className="text-[10.5px] text-radar-light-muted/70 dark:text-radar-muted/70">Nothing else moved alongside it.</span>
        ) : (
          AFFECTED_SCORE_LABELS.filter(({ key }) => biggestChange.affectedScores[key]).map(({ key, label }) => (
            <span
              key={key}
              className="rounded-full border border-radar-light-border bg-radar-light-surface px-2 py-0.5 text-[10.5px] font-medium text-radar-light-text dark:border-white/10 dark:bg-white/5 dark:text-radar-white"
            >
              {label}
            </span>
          ))
        )}
      </div>
    </SectionCard>
  );
}

export function PortfolioEvolutionSection({ analytics, className }: { analytics: WalletAnalytics; className?: string }) {
  const findings = [
    { label: "Largest Improvement", finding: analytics.evolution.largestImprovement },
    { label: "Largest Deterioration", finding: analytics.evolution.largestDeterioration },
    { label: "Biggest Allocation Shift", finding: analytics.evolution.biggestAllocationShift },
    { label: "Most Stable Asset", finding: analytics.evolution.mostStableAsset },
    { label: "Longest-Held Recommendation", finding: analytics.evolution.longestUnchangedRecommendation },
    { label: "Most Repeated Warning", finding: analytics.evolution.mostRepeatedWarning },
  ].filter((f) => f.finding !== null);

  if (analytics.snapshotCount < 2 || findings.length === 0) {
    return (
      <SectionCard title="Portfolio Evolution" icon={<History className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />} className={className}>
        {analytics.snapshotCount < 2 ? (
          <InsufficientHistoryNotice snapshotCount={analytics.snapshotCount} />
        ) : (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">Nothing notable stands out yet across your captured history.</p>
        )}
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Portfolio Evolution" icon={<History className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />} className={className}>
      <ul className="flex flex-col gap-2.5">
        {findings.map(({ label, finding }) => (
          <li key={label} className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-radar-light-muted dark:text-radar-muted">{label}</span>
            <span className="text-sm text-radar-light-text dark:text-radar-white">{finding!.detail}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function AllocationChangesSection({ analytics, className }: { analytics: WalletAnalytics; className?: string }) {
  const { allocation } = analytics;
  const hasAnyChange = allocation.newAssets.length > 0 || allocation.removedAssets.length > 0 || allocation.topChanges.length > 0;

  if (analytics.snapshotCount < 2 || !hasAnyChange) {
    return (
      <SectionCard title="Allocation Changes" icon={<BarChart3 className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />} className={className}>
        {analytics.snapshotCount < 2 ? (
          <InsufficientHistoryNotice snapshotCount={analytics.snapshotCount} />
        ) : (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">Your top holdings haven&apos;t changed across your captured history.</p>
        )}
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Allocation Changes" icon={<BarChart3 className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />} className={className}>
      {allocation.topChanges.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {allocation.topChanges.map((change) => (
            <li key={change.symbol} className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-radar-light-text dark:text-radar-white">{change.symbol}</span>
              <span className={cn("font-mono tabular-nums", (change.deltaPct ?? 0) >= 0 ? "text-radar-success" : "text-radar-danger")}>
                {change.fromPct !== null ? `${change.fromPct.toFixed(1)}%` : "—"} → {change.toPct !== null ? `${change.toPct.toFixed(1)}%` : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
      {(allocation.newAssets.length > 0 || allocation.removedAssets.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-radar-light-border pt-3 text-xs text-radar-light-muted dark:border-white/10 dark:text-radar-muted">
          {allocation.newAssets.length > 0 && (
            <span>
              <span className="font-medium text-radar-success">New: </span>
              {allocation.newAssets.join(", ")}
            </span>
          )}
          {allocation.removedAssets.length > 0 && (
            <span>
              <span className="font-medium text-radar-danger">Removed: </span>
              {allocation.removedAssets.join(", ")}
            </span>
          )}
        </div>
      )}
    </SectionCard>
  );
}

export function AnalyticsSummarySection({ analytics, className }: { analytics: WalletAnalytics; className?: string }) {
  return (
    <SectionCard title="Historical Summary" icon={<Sparkles className="size-4 text-radar-purple" aria-hidden="true" />} className={className}>
      <p className="text-sm leading-relaxed text-radar-light-text dark:text-radar-white">{analytics.executiveSummary}</p>
    </SectionCard>
  );
}

export function AnalyticsTimelineSection({ analytics, className }: { analytics: WalletAnalytics; className?: string }) {
  if (analytics.timeline.length === 0) {
    return (
      <SectionCard title="Analytics Timeline" icon={<Clock className="size-4 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />} className={className}>
        <EmptyState icon={Clock} title="No history captured yet." description="Real changes to your portfolio will appear here, grouped by day." />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Analytics Timeline" icon={<Clock className="size-4 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />} className={className}>
      <ul className="flex flex-col divide-y divide-radar-light-border dark:divide-white/10">
        {analytics.timeline.map((entry) => (
          <li key={entry.id} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
            <span
              className={cn(
                "mt-1.5 size-1.5 shrink-0 rounded-full",
                entry.tone === "positive" ? "bg-radar-success" : entry.tone === "attention" ? "bg-radar-warning" : "bg-radar-light-muted dark:bg-radar-muted"
              )}
              aria-hidden="true"
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">{entry.dayLabel}</span>
              <span className="text-xs font-medium text-radar-light-text dark:text-radar-white">{entry.headline}</span>
            </div>
            <time dateTime={entry.timestamp} className="shrink-0 text-[10.5px] text-radar-light-muted dark:text-radar-muted">
              <RelativeTime iso={entry.timestamp} />
            </time>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

/**
 * V4-ANALYTICS-001A (Phase 5/6/11) — Milestones and Personal Bests are
 * ALWAYS full-history/all-time facts (see `types.ts`'s own doc comment on
 * `PortfolioMilestones`), independent of whichever window the sections
 * above are filtered to — so this gates on whether ANY real snapshot has
 * ever been recorded (`milestones.firstWalletConnection`), never on the
 * windowed `analytics.snapshotCount`.
 */
function NoLifetimeHistoryNotice() {
  return (
    <EmptyState
      icon={History}
      title="No history captured yet"
      description="Milestones and personal bests build up from real refreshes over time — nothing has been captured this session yet."
    />
  );
}

const MILESTONE_ROWS: { key: keyof WalletAnalytics["milestones"] }[] = [
  { key: "highestPortfolioValue" },
  { key: "highestHealthScore" },
  { key: "highestConfidence" },
  { key: "lowestRisk" },
  { key: "bestDiversification" },
  { key: "largestStablecoinAllocation" },
  { key: "largestEthAllocation" },
  { key: "firstWalletConnection" },
  { key: "mostRecentFingerprint" },
];

export function PortfolioMilestonesSection({ analytics, className }: { analytics: WalletAnalytics; className?: string }) {
  const { milestones } = analytics;
  if (!milestones.firstWalletConnection) {
    return (
      <SectionCard title="Portfolio Milestones" icon={<Trophy className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />} className={className}>
        <NoLifetimeHistoryNotice />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Portfolio Milestones" icon={<Trophy className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />} className={className}>
      <ul className="flex flex-col divide-y divide-radar-light-border dark:divide-white/10">
        {MILESTONE_ROWS.filter(({ key }) => milestones[key] !== null).map(({ key }) => {
          const milestone = milestones[key]!;
          return (
            <li key={key} className="flex items-center justify-between gap-3 py-2 text-xs first:pt-0 last:pb-0">
              <span className="text-radar-light-muted dark:text-radar-muted">{milestone.label}</span>
              <span className="flex flex-col items-end">
                <span className="font-medium text-radar-light-text dark:text-radar-white">{milestone.value}</span>
                <time dateTime={milestone.date} className="text-[10px] text-radar-light-muted/70 dark:text-radar-muted/70">
                  <RelativeTime iso={milestone.date} />
                </time>
              </span>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

export function PersonalBestsSection({ analytics, className }: { analytics: WalletAnalytics; className?: string }) {
  const { personalBests } = analytics;
  if (!analytics.milestones.firstWalletConnection) {
    return (
      <SectionCard title="Personal Bests" icon={<Award className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />} className={className}>
        <NoLifetimeHistoryNotice />
      </SectionCard>
    );
  }

  const rows = [
    { label: "Best Health", milestone: personalBests.bestHealth },
    { label: "Best Confidence", milestone: personalBests.bestConfidence },
    { label: "Lowest Risk", milestone: personalBests.lowestRisk },
    { label: "Largest Portfolio Value", milestone: personalBests.largestPortfolioValue },
    { label: "Best Diversification", milestone: personalBests.bestDiversification },
  ].filter((r) => r.milestone !== null);

  return (
    <SectionCard title="Personal Bests" icon={<Award className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />} className={className}>
      <ul className="flex flex-col divide-y divide-radar-light-border dark:divide-white/10">
        {rows.map(({ label, milestone }) => (
          <li key={label} className="flex items-center justify-between gap-3 py-2 text-xs first:pt-0 last:pb-0">
            <span className="text-radar-light-muted dark:text-radar-muted">{label}</span>
            <span className="font-medium text-radar-light-text dark:text-radar-white">{milestone!.value}</span>
          </li>
        ))}
      </ul>
      {personalBests.longestStablePortfolio && (
        <div className="border-t border-radar-light-border pt-2.5 text-xs dark:border-white/10">
          <span className="text-radar-light-muted dark:text-radar-muted">Longest Stable Portfolio: </span>
          <span className="font-medium text-radar-light-text dark:text-radar-white">
            {personalBests.longestStablePortfolio.snapshotCount} snapshots as &quot;{personalBests.longestStablePortfolio.fingerprint}&quot;
          </span>
        </div>
      )}
    </SectionCard>
  );
}

export function RecoveryAnalysisSection({ analytics, className }: { analytics: WalletAnalytics; className?: string }) {
  if (!analytics.milestones.firstWalletConnection) {
    return (
      <SectionCard title="Recovery Analysis" icon={<HeartPulse className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />} className={className}>
        <NoLifetimeHistoryNotice />
      </SectionCard>
    );
  }

  if (analytics.recoveries.length === 0) {
    return (
      <SectionCard title="Recovery Analysis" icon={<HeartPulse className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />} className={className}>
        <p className="text-xs text-radar-light-muted dark:text-radar-muted">No poor-state recoveries detected yet — either nothing dipped, or nothing has recovered yet.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Recovery Analysis" icon={<HeartPulse className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />} className={className}>
      <ul className="flex flex-col divide-y divide-radar-light-border dark:divide-white/10">
        {analytics.recoveries.map((recovery, i) => (
          <li key={`${recovery.category}-${recovery.recoveryDate}-${i}`} className="flex flex-col gap-0.5 py-2 text-xs first:pt-0 last:pb-0">
            <span className="font-medium text-radar-light-text dark:text-radar-white">Recovered from {recovery.label}</span>
            <span className="text-radar-light-muted dark:text-radar-muted">
              {recovery.before.value} → {recovery.after.value} over {recovery.durationDays} day{recovery.durationDays === 1 ? "" : "s"}
            </span>
            <time dateTime={recovery.recoveryDate} className="text-[10px] text-radar-light-muted/70 dark:text-radar-muted/70">
              <RelativeTime iso={recovery.recoveryDate} />
            </time>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

/**
 * V4-ANALYTICS-001A (Phase 8) — window-scoped, unlike the three sections
 * above: `analytics.correlation` is built from the SAME windowed `trends`
 * `PortfolioTrendsSection` already renders.
 */
export function TrendCorrelationSection({ analytics, className }: { analytics: WalletAnalytics; className?: string }) {
  const { correlation } = analytics;

  if (analytics.snapshotCount < 2 || !correlation) {
    return (
      <SectionCard title="Trend Correlation" icon={<Sparkles className="size-4 text-radar-purple" aria-hidden="true" />} className={className}>
        {analytics.snapshotCount < 2 ? (
          <InsufficientHistoryNotice snapshotCount={analytics.snapshotCount} />
        ) : (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">Nothing moved enough this window to correlate.</p>
        )}
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Trend Correlation" icon={<Sparkles className="size-4 text-radar-purple" aria-hidden="true" />} className={className}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-radar-light-text dark:text-radar-white">
          {correlation.outcomeLabel}
          {correlation.primaryDriver ? (
            <>
              {" moved alongside "}
              <span className="font-medium">{correlation.primaryDriver.label}</span>
              {correlation.secondaryDriver && (
                <>
                  {" and "}
                  <span className="font-medium">{correlation.secondaryDriver.label}</span>
                </>
              )}
              {"."}
            </>
          ) : (
            " moved with no other real driver this window."
          )}
        </p>
        {/* V4-ANALYTICS-001A (Phase 8) — confidence in the CORRELATION itself (how much real co-movement backs it), not a causal claim — see `correlation.ts`'s own doc comment. */}
        <span className={cn("shrink-0 text-[10px] whitespace-nowrap", TREND_CONFIDENCE_CLASS[correlation.confidence])}>{TREND_CONFIDENCE_LABEL[correlation.confidence]}</span>
      </div>
      {correlation.affectedMetrics.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {correlation.affectedMetrics.map((metric) => (
            <span
              key={metric}
              className="rounded-full border border-radar-light-border bg-radar-light-surface px-2 py-0.5 text-[10.5px] font-medium text-radar-light-text dark:border-white/10 dark:bg-white/5 dark:text-radar-white"
            >
              {metric}
            </span>
          ))}
        </div>
      )}
      <p className="text-[10.5px] text-radar-light-muted/80 dark:text-radar-muted/80">{correlation.note}</p>
    </SectionCard>
  );
}

export function PortfolioStabilitySection({ analytics, className }: { analytics: WalletAnalytics; className?: string }) {
  const { stability } = analytics;

  if (analytics.snapshotCount < 2 || !stability) {
    return (
      <SectionCard title="Portfolio Stability" icon={<Activity className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />} className={className}>
        <InsufficientHistoryNotice snapshotCount={analytics.snapshotCount} />
      </SectionCard>
    );
  }

  const Icon = STABILITY_LEVEL_ICON[stability.level];

  return (
    <SectionCard title="Portfolio Stability" icon={<Activity className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />} className={className}>
      <div className={cn("flex items-center gap-2 text-lg font-semibold", STABILITY_LEVEL_CLASS[stability.level])}>
        <Icon className="size-5 shrink-0" aria-hidden="true" />
        {stability.label}
      </div>
      <p className="text-xs text-radar-light-muted dark:text-radar-muted">{stability.reason}</p>
      <p className="text-[10.5px] text-radar-light-muted/70 dark:text-radar-muted/70">Measures how often your portfolio changes — not its quality or health.</p>
    </SectionCard>
  );
}
