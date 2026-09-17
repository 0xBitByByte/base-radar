import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, FileText, HelpCircle, Sparkles, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PortfolioAI } from "@/lib/portfolio-ai/types";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import { GLASS_CARD_SURFACE } from "@/components/ui/glassStyles";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  CONFIDENCE_LEVEL_BADGE_CLASS,
  DIVERSIFICATION_RATING_BADGE_CLASS,
  INSIGHT_TONE_BADGE_CLASS,
  INSIGHT_TONE_ICON,
  RECOMMENDATION_PRIORITY_BADGE_CLASS,
  RECOMMENDATION_PRIORITY_LABEL,
  RISK_LEVEL_BADGE_CLASS,
  RISK_LEVEL_ICON,
  RISK_LEVEL_LABEL,
} from "@/components/wallet/portfolioIntelligenceMeta";

const USD_FORMAT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

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

function scoreColorClass(value: number, invert = false): string {
  const good = invert ? value <= 33 : value >= 67;
  const bad = invert ? value >= 67 : value <= 33;
  if (good) return "bg-radar-success";
  if (bad) return "bg-radar-danger";
  return "bg-radar-warning";
}

/** V3-WALLET-003 — the top-line score readout: overall score plus its three real inputs, each a `ProgressBar` row (this codebase has no gauge/donut primitive — see the Architecture Assessment). */
export function PortfolioHealthSection({ intelligence, className }: { intelligence: PortfolioIntelligence; className?: string }) {
  return (
    <SectionCard title="Portfolio Health" className={className}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-end gap-3">
          <span className="text-4xl font-semibold text-radar-light-text dark:text-radar-white">{intelligence.overallScore}</span>
          <span className="mb-1 text-xs text-radar-light-muted dark:text-radar-muted">/ 100 overall</span>
        </div>
        {/*
          V4-INTELLIGENCE-002 — Confidence is deliberately NOT another health
          score: it's "how much of this analysis is Base Radar itself sure
          of," from `intelligence.confidenceScore`/`confidenceLevel`
          (`confidence.ts`), placed beside the headline number since it
          qualifies every score on this card, not just health.
        */}
        <span
          title="How confident Base Radar is in this analysis, based on pricing/verification/classification coverage — not portfolio value."
          className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold whitespace-nowrap", CONFIDENCE_LEVEL_BADGE_CLASS[intelligence.confidenceLevel])}
        >
          {intelligence.confidenceLevel} confidence · {intelligence.confidenceScore}%
        </span>
      </div>
      <div className="flex flex-col gap-3">
        <ProgressBar value={intelligence.healthScore} label="Health" colorClassName={scoreColorClass(intelligence.healthScore)} />
        <ProgressBar value={intelligence.diversificationScore} label="Diversification" colorClassName={scoreColorClass(intelligence.diversificationScore)} />
        <ProgressBar value={intelligence.riskScore} label="Risk" colorClassName={scoreColorClass(intelligence.riskScore, true)} />
      </div>

      {/* V4-INTELLIGENCE-001 — "why is my Health Score X?" answered directly: every contribution `intelligence.healthBreakdown` names sums to `healthScore` above (clipped 0-100), so this list is never out of sync with the number it explains. */}
      <div className="flex flex-col gap-1.5 border-t border-radar-light-border pt-3 dark:border-white/10">
        <span className="text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted/70">
          Health Score Breakdown
        </span>
        <ul className="flex flex-col gap-2">
          {intelligence.healthBreakdown.map((contribution) => (
            <li key={contribution.id} className="flex items-start justify-between gap-3 text-xs">
              <span className="flex flex-col gap-0.5">
                <span className="font-medium text-radar-light-text dark:text-radar-white">{contribution.label}</span>
                <span className="text-radar-light-muted dark:text-radar-muted">{contribution.explanation}</span>
              </span>
              <span
                className={cn(
                  "shrink-0 font-mono font-medium tabular-nums",
                  contribution.direction === "positive" ? "text-radar-success" : "text-radar-danger"
                )}
              >
                {contribution.direction === "positive" ? "+" : "−"}
                {contribution.points}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </SectionCard>
  );
}

/** V3-WALLET-003 — one deterministic, template-built paragraph. Never an LLM call — see `lib/portfolio-intelligence/summary.ts`. */
/**
 * V4-INTELLIGENCE-003 (Phase 5/6) — replaced the old single dense paragraph
 * (`intelligence.summary`) with `ai.summaryLines`
 * (`lib/portfolio-ai/summary.ts`), the same richer, line-by-line digest
 * Phase 5's own brief asks for — one real fact per line (health, largest
 * holding, diversification, confidence, main concern, next action), built
 * from the same shared `PortfolioAI` object the Dashboard widget and
 * Executive Summary card below both read, so none of the three ever
 * formats this narrative independently.
 */
export function AISummarySection({ ai, className }: { ai: PortfolioAI; className?: string }) {
  return (
    <SectionCard title="AI Summary" icon={<Sparkles className="size-4 text-radar-purple" aria-hidden="true" />} className={className}>
      <ul className="flex flex-col gap-1.5">
        {ai.summaryLines.map((line, i) => (
          <li key={i} className="text-sm leading-relaxed text-radar-light-text dark:text-radar-white">
            {line}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function RiskAnalysisSection({ intelligence, className }: { intelligence: PortfolioIntelligence; className?: string }) {
  const { concentrationRisk, warnings } = intelligence;
  const RiskIcon = RISK_LEVEL_ICON[concentrationRisk.level];

  return (
    <SectionCard title="Risk Analysis" className={className}>
      <div className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-xs", RISK_LEVEL_BADGE_CLASS[concentrationRisk.level])}>
        <RiskIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <div>
          <span className="font-medium">{RISK_LEVEL_LABEL[concentrationRisk.level]} concentration risk. </span>
          {concentrationRisk.description}
        </div>
      </div>

      {warnings.length === 0 ? (
        <p className="text-xs text-radar-light-muted dark:text-radar-muted">No other risk flags detected in your known holdings.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {warnings.map((warning) => {
            const level = warning.severity;
            const Icon = RISK_LEVEL_ICON[level];
            return (
              <li key={warning.id} className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-xs", RISK_LEVEL_BADGE_CLASS[level])}>
                <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <div>
                  <span className="font-medium">{warning.title}. </span>
                  {warning.description}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

export function OpportunitiesSection({ intelligence, className }: { intelligence: PortfolioIntelligence; className?: string }) {
  if (intelligence.opportunities.length === 0) return null;

  return (
    <SectionCard title="Opportunities" className={className}>
      <ul className="flex flex-col gap-2">
        {intelligence.opportunities.map((insight) => {
          const Icon = INSIGHT_TONE_ICON[insight.tone];
          return (
            <li key={insight.id} className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-xs", INSIGHT_TONE_BADGE_CLASS[insight.tone])}>
              <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <div>
                <span className="font-medium">{insight.title}. </span>
                {insight.description}
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

/**
 * V4-INTELLIGENCE-001 — `intelligence.recommendations` is already sorted
 * high-priority-first (`recommendations.ts`'s own `PRIORITY_RANK` sort), so
 * this component renders in list order rather than re-sorting. Each item
 * now shows its `explanation` (what to do) with `reason` (the real number
 * that caused it) directly underneath — answering "what caused this
 * recommendation?" without the reader having to infer it from prose.
 */
export function RecommendationsSection({ intelligence, className }: { intelligence: PortfolioIntelligence; className?: string }) {
  if (intelligence.recommendations.length === 0) return null;

  return (
    <SectionCard title="Recommendations" className={className}>
      <ul className="flex flex-col gap-3">
        {intelligence.recommendations.map((recommendation) => (
          <li key={recommendation.id} className="flex flex-col gap-1 border-b border-radar-light-border pb-3 last:border-0 last:pb-0 dark:border-white/10">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-radar-light-text dark:text-radar-white">{recommendation.title}</span>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-1.5 py-0.5 text-[9.5px] font-semibold whitespace-nowrap uppercase",
                  RECOMMENDATION_PRIORITY_BADGE_CLASS[recommendation.priority]
                )}
              >
                {RECOMMENDATION_PRIORITY_LABEL[recommendation.priority]}
              </span>
            </div>
            <p className="text-xs text-radar-light-text dark:text-radar-white">{recommendation.explanation}</p>
            <p className="text-[11px] text-radar-light-muted dark:text-radar-muted">{recommendation.reason}</p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function AllocationMetric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">{label}</span>
      <span className="text-lg font-semibold text-radar-light-text dark:text-radar-white">{value}</span>
      {sub && <span className="text-xs text-radar-light-muted dark:text-radar-muted">{sub}</span>}
    </div>
  );
}

/**
 * V4-INTELLIGENCE-001 — expanded with `intelligence.allocationBreakdown`:
 * ETH/Unknown exposure alongside the existing Stablecoin/Other split, a
 * Top 5 Holdings list, and Protocol Concentration next to the existing
 * Largest Protocol metric. Every added number was already computed once in
 * `engine.ts` via `buildAllocationBreakdown` — nothing here re-derives
 * anything from raw `assets`.
 */
export function AllocationAnalysisSection({ intelligence, className }: { intelligence: PortfolioIntelligence; className?: string }) {
  const { largestHolding, largestProtocol, stablecoinExposure, defiExposure, allocationBreakdown } = intelligence;
  const { topHoldings, ethPct, unknownAssetPct, protocolConcentrationPct, largestProtocolName } = allocationBreakdown;

  return (
    <SectionCard title="Allocation Analysis" className={className}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <AllocationMetric
          label="Largest Holding"
          value={largestHolding ? largestHolding.symbol : "—"}
          sub={largestHolding ? `${largestHolding.allocationPct.toFixed(1)}% · ${USD_FORMAT.format(largestHolding.usdValue)}` : "No priced holdings yet"}
        />
        <AllocationMetric
          label="Largest Protocol"
          value={largestProtocol ? largestProtocol.name : "None recognized"}
          sub={largestProtocol ? `${largestProtocol.allocationPct.toFixed(1)}%` : undefined}
        />
        <AllocationMetric label="Stablecoin %" value={`${stablecoinExposure.toFixed(1)}%`} />
        <AllocationMetric label="ETH %" value={`${ethPct.toFixed(1)}%`} />
        <AllocationMetric label="Other %" value={`${defiExposure.toFixed(1)}%`} />
        <AllocationMetric label="Unknown %" value={`${unknownAssetPct.toFixed(1)}%`} sub="Of asset count — unpriced" />
        <AllocationMetric
          label="Protocol Concentration"
          value={`${protocolConcentrationPct.toFixed(1)}%`}
          sub={largestProtocolName ?? undefined}
        />
      </div>

      {topHoldings.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-radar-light-border pt-3 dark:border-white/10">
          <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">Top {topHoldings.length} Holdings</span>
          <ul className="flex flex-col gap-1.5">
            {topHoldings.map((holding) => (
              <li key={`${holding.symbol}:${holding.address ?? "native"}`} className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-radar-light-text dark:text-radar-white">{holding.symbol}</span>
                <span className="text-radar-light-muted dark:text-radar-muted">
                  {holding.allocationPct.toFixed(1)}% · {USD_FORMAT.format(holding.usdValue)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}

/**
 * V4-INTELLIGENCE-001 (item 3) — a dedicated quality read, distinct from
 * Portfolio Health: verification breakdown, protocols detected, and the
 * diversification rating with its own real reason — all sourced from
 * `intelligence.quality` (`lib/portfolio-intelligence/quality.ts`), never
 * re-derived here.
 */
export function PortfolioQualitySection({ intelligence, className }: { intelligence: PortfolioIntelligence; className?: string }) {
  const { verifiedAssetCount, unverifiedAssetCount, notCheckedAssetCount, protocolsDetected, diversificationRating, diversificationRatingReason } =
    intelligence.quality;

  return (
    <SectionCard title="Portfolio Quality" className={className}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <AllocationMetric label="Verified Assets" value={String(verifiedAssetCount)} />
        <AllocationMetric label="Unverified Assets" value={String(unverifiedAssetCount)} />
        <AllocationMetric label="Not Checked" value={String(notCheckedAssetCount)} />
        <AllocationMetric label="Protocols Detected" value={String(protocolsDetected)} />
      </div>

      <div className="flex items-start gap-2 border-t border-radar-light-border pt-3 dark:border-white/10">
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap",
            DIVERSIFICATION_RATING_BADGE_CLASS[diversificationRating]
          )}
        >
          {diversificationRating} diversification
        </span>
        <p className="text-xs text-radar-light-muted dark:text-radar-muted">{diversificationRatingReason}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-radar-light-muted dark:text-radar-muted">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="size-3 shrink-0 text-radar-success" aria-hidden="true" />
          Verified — Blockscout confirmed this contract
        </span>
        <span className="flex items-center gap-1">
          <XCircle className="size-3 shrink-0 text-radar-danger" aria-hidden="true" />
          Unverified — Blockscout flagged this contract
        </span>
        <span className="flex items-center gap-1">
          <HelpCircle className="size-3 shrink-0" aria-hidden="true" />
          Not checked — never looked up
        </span>
      </div>
    </SectionCard>
  );
}

/**
 * V4-INTELLIGENCE-002 — "why is this my score?" as one scannable list, split
 * into what's helping vs. what's holding it back. Sourced entirely from
 * `intelligence.positiveContributors`/`negativeContributors`
 * (`contributors.ts`), which already dedupe against `healthBreakdown` so a
 * fact never appears both here and, say, in Risk Analysis under two
 * different titles for the same reason.
 */
export function ScoreContributorsSection({ intelligence, className }: { intelligence: PortfolioIntelligence; className?: string }) {
  const { positiveContributors, negativeContributors } = intelligence;
  if (positiveContributors.length === 0 && negativeContributors.length === 0) return null;

  return (
    <SectionCard title="Score Contributors" className={className}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-[10.5px] font-semibold tracking-wide text-radar-success uppercase">Helping your score</span>
          {positiveContributors.length === 0 ? (
            <p className="text-xs text-radar-light-muted dark:text-radar-muted">Nothing stands out yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {positiveContributors.map((c) => (
                <li key={c.id} className="flex items-start gap-1.5 text-xs">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-radar-success" aria-hidden="true" />
                  <span className="text-radar-light-text dark:text-radar-white">{c.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[10.5px] font-semibold tracking-wide text-radar-warning uppercase">Holding it back</span>
          {negativeContributors.length === 0 ? (
            <p className="text-xs text-radar-light-muted dark:text-radar-muted">Nothing flagged right now.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {negativeContributors.map((c) => (
                <li key={c.id} className="flex items-start gap-1.5 text-xs">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-radar-warning" aria-hidden="true" />
                  <span className="text-radar-light-text dark:text-radar-white">{c.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

/**
 * V4-INTELLIGENCE-002 — `intelligence.executiveSummary`
 * (`executiveSummary.ts`): Health + Largest Holding + Diversification +
 * Main Risk + Primary Recommendation in one paragraph, distinct from the
 * existing "AI Summary" card's own narrative paragraph (`summary.ts`) —
 * kept as a separate card rather than replacing it, since the two answer
 * different questions (a readable narrative vs. a structured five-fact
 * digest) from two independently-built, independently-testable functions.
 */
/**
 * V4-INTELLIGENCE-003 (Phase 3/6) — now the advisor's single top-line read
 * (`ai.overview`): headline (the AI layer's own highest-priority finding),
 * the same `executiveSummary` paragraph as before (`ai.overview.
 * explanation` — unchanged text, still V4-INTELLIGENCE-002's own field,
 * just read via the shared `PortfolioAI` object now), and — new — the
 * advisor's next best action, when one exists.
 */
export function ExecutiveSummarySection({ ai, className }: { ai: PortfolioAI; className?: string }) {
  return (
    <SectionCard title="Executive Summary" icon={<FileText className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />} className={className}>
      <p className="text-sm font-medium text-radar-light-text dark:text-radar-white">{ai.overview.headline}</p>
      <p className="text-sm leading-relaxed text-radar-light-muted dark:text-radar-muted">{ai.overview.explanation}</p>
      {ai.overview.nextAction && (
        <div className="flex flex-col gap-0.5 border-t border-radar-light-border pt-3 dark:border-white/10">
          <span className="text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted/70">Next Action</span>
          <p className="text-sm text-radar-light-text dark:text-radar-white">{ai.overview.nextAction}</p>
          {ai.overview.actionReason && <p className="text-xs text-radar-light-muted dark:text-radar-muted">{ai.overview.actionReason}</p>}
        </div>
      )}
    </SectionCard>
  );
}
