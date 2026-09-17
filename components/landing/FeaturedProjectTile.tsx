"use client";

import { TrendingDown, TrendingUp } from "lucide-react";

import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { RiskBadge } from "@/components/projects/RiskBadge";
import { VerificationBadge } from "@/components/explorer/VerificationBadge";
import { formatCompactCurrency, formatPercent } from "@/lib/data/format";
import { formatLabel } from "@/components/explorer/format";
import { resolveLogoUrl } from "@/lib/projects/build";
import { RADAR_SCORE_LABEL, RADAR_SCORE_PREVIEW_DESCRIPTION, formatRadarScoreTooltip, type RadarScoreResult } from "@/lib/intelligence/radarScore";
import { formatFreshnessLabel, type SignalFreshness } from "@/lib/intelligence/freshnessPolicy";
import type { ProjectIntelligence } from "@/lib/intelligence/types";

type FeaturedProjectTileProps = {
  project: ProjectIntelligence;
  onActivate: () => void;
  /**
   * PR-098.07 — real per-signal freshness for this tile's TVL/Token 24H
   * cells, keyed the same way `FeaturedIntelligenceSnapshot` produces them
   * (`lib/data/featuredIntelligenceSnapshot.ts`). Optional and additive:
   * `undefined`/omitted (the illustrative-only fallback case, or any
   * caller that doesn't have a live snapshot) simply shows no freshness
   * tooltip — never a fabricated "Updated Xm ago" for illustrative data.
   */
  freshness?: { tvl: SignalFreshness | null; tokenChange: SignalFreshness | null };
  /**
   * PR-099 — the real, live `RadarScoreResult` for this project, when the
   * live methodology cleared its own minimum-evidence bar (PR-098.04).
   * `null`/omitted means the number shown under "Radar Score" is still
   * the illustrative fixture value — the tile falls back to the honest
   * `RADAR_SCORE_PREVIEW_DESCRIPTION` tooltip in that case, never
   * presenting illustrative data as if it were this real, computed result.
   */
  radarScore?: RadarScoreResult | null;
};

const HEALTH_COLOR: Record<string, string> = {
  excellent: "text-radar-success",
  good: "text-radar-accent",
  fair: "text-radar-warning",
  poor: "text-radar-danger",
  unknown: "text-radar-light-muted dark:text-radar-muted",
};

/**
 * One marquee item (PR9.3) — a taller, richer card than the original
 * logo/name/badge strip: logo, name, category, verification, then a
 * three-up stat row (Radar Score / TVL / Token 24H) so the marquee reads as real
 * intelligence, not just a logo wall. Every field is real project data
 * (`identity`/`community`/`health`/`tvl`/`market`), the same shape
 * `ProjectCard` and the Project Profile page consume — nothing here is a
 * one-off lookalike computation.
 */
export function FeaturedProjectTile({ project, onActivate, freshness, radarScore }: FeaturedProjectTileProps) {
  const { identity, community, health, tvl, market, github, risk } = project;
  const category = identity.categories[0];
  // PR-098.02 — this is THE PROJECT'S OWN TOKEN USD price change over the
  // last 24 hours (`market.changePct24h`, sourced exclusively from
  // CoinGecko — see `lib/intelligence/merge.ts`'s `mergeMarket`), never
  // TVL/volume/liquidity/market-cap change or another project's token.
  // `market.available` is `false` whenever this project has no verified
  // token mapping (see `resolveTokenChangePct24h` in `featuredProjects.ts`)
  // — `tokenChangePct24h` stays `null` rather than falling back to any
  // other metric, and the UI below shows "—", never a substituted value.
  const tokenChangePct24h = market.available && Number.isFinite(market.changePct24h) ? market.changePct24h : null;
  const isUp = tokenChangePct24h !== null && tokenChangePct24h >= 0;
  // PR-072 / Token Logo System — the same registry → CoinGecko → DefiLlama
  // → GitHub avatar priority every other logo consumer uses, via the one
  // canonical `resolveLogoUrl()` (`lib/projects/build.ts`) rather than a
  // second inline copy of the same 4-line list. All four candidates are
  // already part of this same `ProjectIntelligence` object — no new fetch.
  const { logoUrl, logoUrlFallbacks } = resolveLogoUrl([
    identity.logoUrl,
    market.available ? market.imageUrl : null,
    tvl.available ? tvl.imageUrl : null,
    github.available ? github.avatarUrl : null,
  ]);
  // Data-honesty fix — a live `radarScore` object exists for every project
  // with a registry mapping (`computeRadarScore()` always returns a full
  // result, even when evidence is insufficient — only a totally-unmapped
  // project gets `radarScore: null` at the snapshot-entry level), so the
  // previous `radarScore ? ... : ...` truthy-object check was true even
  // when `radarScore.score` itself was `null` (insufficient evidence,
  // e.g. Oku after the Ecosystem Traction/Developer Activity hardening
  // pass) — silently falling through to `health.score`, which is still
  // the illustrative fixture number in that case, displayed with no visual
  // distinction from a real one. `typeof ... === "number"` (not a truthy
  // check) is deliberate: a genuine live score of 0 must still display as
  // "0", never be mistaken for "no score" the way `!radarScore.score`
  // would treat it.
  const hasLiveRadarScore = typeof radarScore?.score === "number";

  return (
    <button
      type="button"
      onClick={onActivate}
      className="flex w-[22rem] shrink-0 flex-col gap-3.5 rounded-2xl border border-radar-light-border bg-radar-light-card p-5 text-left outline-none transition-all duration-200 hover:scale-[1.03] hover:border-radar-primary/30 hover:shadow-[0_16px_40px_-20px_rgba(var(--color-radar-primary-rgb),0.35)] focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-radar-card dark:hover:border-radar-border-hover"
    >
      {/* Name gets its own full-width row — `VerificationBadge` always
          renders all four status pills (one active, three dimmed), which
          alone is ~124px wide even in `compact` mode; sharing a row with
          it left as little as 90px for the name, clipping real project
          names like "Aerodrome Finance" (130px). Giving the name the full
          row instead fixes that without touching the shared badge
          component's own design. Widened further (320px→352px, PR9.3.2 §7)
          purely for breathing room — the fix itself no longer depends on
          the extra width. */}
      <div className="flex items-center gap-3">
        <ProjectLogo logoUrl={logoUrl} fallbackUrls={logoUrlFallbacks} name={identity.name} size={44} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-radar-light-text dark:text-radar-white">
          {identity.name}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        {category ? (
          <span className="truncate text-xs text-radar-light-muted dark:text-radar-muted">{formatLabel(category)}</span>
        ) : (
          <span />
        )}
        <div className="flex shrink-0 items-center gap-1.5">
          <RiskBadge riskLevel={risk.level} compact />
          <VerificationBadge status={community.verificationStatus} compact />
        </div>
      </div>

      {/*
        Visual refinement pass — the stat row read as flat/plain text at
        even weight with the label above it; this reads as a secondary
        footnote, not the "critical values" a project's own card should
        lead with. Each stat now sits in its own subtly-tinted cell with a
        bigger, bolder number — same three real values (Radar Score, TVL,
        Token 24H), just given more visual weight. Real risk level (added above)
        is the other "critical value" that was missing entirely — never a
        fabricated "New"/"Trending" tag, since the registry has no real
        added-date field to back that claim honestly.
      */}
      <div className="grid grid-cols-3 gap-1.5 border-t border-radar-light-border pt-3 dark:border-white/10">
        <div
          className="flex flex-col gap-0.5 rounded-lg bg-radar-light-text/[0.02] px-2 py-1.5 dark:bg-white/[0.03]"
          // PR-098.03 — "AI Score" → "Radar Score": this is a deterministic,
          // evidence-based score (rule-based health/confidence factors),
          // never an LLM-generated number — "AI Score" implied generative
          // involvement that doesn't exist.
          // PR-099 — when `radarScore.score` is a real number (the live
          // methodology cleared its own minimum-evidence bar), the tooltip
          // reflects real, live coverage/confidence numbers and the number
          // below is the real score. Otherwise (no live evidence at all,
          // OR a live result that didn't clear the minimum-evidence bar —
          // both covered by `hasLiveRadarScore`) falls back to the honest
          // PREVIEW description and an honest "—", never presenting
          // illustrative data as if it were a real, computed result
          // (PR-098.09's own explicit rule, now also covering the
          // insufficient-evidence case, not just the no-snapshot-yet one).
          title={hasLiveRadarScore ? formatRadarScoreTooltip(radarScore!) : RADAR_SCORE_PREVIEW_DESCRIPTION}
        >
          <span className="text-[10px] text-radar-light-muted dark:text-radar-muted">{RADAR_SCORE_LABEL}</span>
          <span
            className={
              hasLiveRadarScore
                ? `text-base font-bold tabular-nums ${HEALTH_COLOR[health.label] ?? HEALTH_COLOR.unknown}`
                : "text-base font-bold text-radar-light-muted dark:text-radar-muted"
            }
          >
            {hasLiveRadarScore ? health.score : "—"}
          </span>
        </div>
        <div
          className="flex flex-col gap-0.5 rounded-lg bg-radar-light-text/[0.02] px-2 py-1.5 dark:bg-white/[0.03]"
          // PR-098.07 — real freshness metadata, when available (never for
          // the illustrative-only fallback) — "Updated Xm ago", the task's
          // own suggested copy, plain product language only.
          title={freshness?.tvl ? formatFreshnessLabel(freshness.tvl) : undefined}
        >
          <span className="text-[10px] text-radar-light-muted dark:text-radar-muted">TVL</span>
          <span className="text-base font-bold tabular-nums text-radar-light-text dark:text-radar-white">
            {tvl.available && tvl.tvlUsd != null ? formatCompactCurrency(tvl.tvlUsd) : "—"}
          </span>
        </div>
        <div
          className="flex flex-col gap-0.5 rounded-lg bg-radar-light-text/[0.02] px-2 py-1.5 dark:bg-white/[0.03]"
          title={freshness?.tokenChange ? formatFreshnessLabel(freshness.tokenChange) : undefined}
        >
          {/* PR-098.02 — was a bare "24H", ambiguous next to "TVL" in the
              same row (which also has its own, structurally different, 24h
              change). "Token 24H" makes explicit this is the project's own
              token's price change, never TVL/volume/liquidity. */}
          <span className="text-[10px] text-radar-light-muted dark:text-radar-muted">Token 24H</span>
          {tokenChangePct24h !== null ? (
            <span
              className={`flex items-center gap-0.5 text-base font-bold tabular-nums ${isUp ? "text-radar-success" : "text-radar-danger"}`}
            >
              {isUp ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {formatPercent(tokenChangePct24h, { showSign: false })}
            </span>
          ) : (
            <span className="text-base font-bold text-radar-light-muted dark:text-radar-muted">—</span>
          )}
        </div>
      </div>
    </button>
  );
}
