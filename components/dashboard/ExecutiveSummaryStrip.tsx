import { CircleCheck, Coins, Fish, Landmark, ShieldCheck, TrendingDown, TrendingUp, Minus, GitPullRequestArrow } from "lucide-react";

import {
  buildEcosystemHealthLines,
  buildExecutiveHighlights,
  buildExecutiveSummary,
  computeMarketSentiment,
  type ExecutiveHighlightCategory,
  type MarketSentiment,
} from "@/lib/dashboard/executiveSummary";
import type { ExecutiveSnapshot } from "@/lib/data/aggregate";
import type { Kpi, NarrativeHeatRow } from "@/lib/data/types";
import { cn } from "@/lib/utils";

type ExecutiveSummaryStripProps = {
  kpis: Kpi[];
  snapshot: ExecutiveSnapshot;
  heatmap: NarrativeHeatRow[];
};

const SENTIMENT_ICON: Record<MarketSentiment, typeof TrendingUp> = {
  Bullish: TrendingUp,
  Bearish: TrendingDown,
  Neutral: Minus,
};

const SENTIMENT_COLOR: Record<MarketSentiment, string> = {
  Bullish: "text-radar-success",
  Bearish: "text-radar-danger",
  Neutral: "text-radar-light-muted dark:text-radar-muted",
};

/** V1-FIX-006 — one icon per real highlight category, reusing icons already established elsewhere in this app for the same category (`Fish` for whale — `WhaleActivityWidget`; `Landmark` for governance — this file's own prior chip; `CircleCheck` for a verified-contract event — matches `VerificationBadge`'s "verified" semantics; `GitPullRequestArrow` for developer activity — `ActivityFeed.tsx`'s own `github-release` icon). V1-FIX-006A adds `Coins` for TVL — the same icon `IntelligenceBrief.tsx` already uses for TVL-related text. */
const HIGHLIGHT_ICON: Record<ExecutiveHighlightCategory, typeof Fish> = {
  tvl: Coins,
  whale: Fish,
  governance: Landmark,
  security: CircleCheck,
  developerActivity: GitPullRequestArrow,
};

/**
 * PR-085.02 — the Executive Dashboard's top-of-page summary: a plain-English
 * rollup of numbers `app/dashboard/page.tsx` already fetches (`getKpis()`,
 * `getExecutiveSnapshot()`, `getNarrativeHeatmap()`), not a new data source.
 * A Server Component like every other pure-presentation piece on this page
 * — nothing here depends on client-only state, so it renders with the rest
 * of the page's first paint rather than waiting on a client-side store the
 * way the ecosystem Opportunities/Risks widgets below it must.
 *
 * V1-FIX-006 — the "{N} active proposals"/"{N} whale transfers" bare-count
 * chips (and the matching bare-count clauses `buildExecutiveSummary`'s
 * second sentence used to append — a real duplicate of the same two
 * numbers) are gone, replaced by "Today's Highlights": real, specific,
 * per-event facts from `buildExecutiveHighlights()` — same already-fetched
 * `snapshot` fields, no new provider call. Sentiment/Ecosystem Health stay
 * exactly as they were; both are real, self-contained aggregate reads, not
 * the "requires further reading" bare counts this pass targets.
 *
 * V1-FIX-006A — visual priority inverted: `buildExecutiveSummary`'s output
 * is now a compact stat line (`text-xs`, muted — reusing this file's own
 * existing secondary typography, not a new size) instead of a `text-sm`
 * prose paragraph, and `buildExecutiveHighlights` gained a TVL tier
 * (`snapshot.topTvlMover`), so "what changed today" now reliably fills more
 * of the widget than "how many projects exist." No layout/size/spacing
 * change to the widget itself — same wrapper, same sections, same tokens,
 * just less space claimed by static stats and more by real highlights.
 */
export function ExecutiveSummaryStrip({ kpis, snapshot, heatmap }: ExecutiveSummaryStripProps) {
  const sentiment = computeMarketSentiment(heatmap);
  const summary = buildExecutiveSummary(kpis);
  const healthLines = buildEcosystemHealthLines(snapshot.verifiedCount, snapshot.registryMetrics.discovered);
  const highlights = buildExecutiveHighlights(snapshot);
  const SentimentIcon = sentiment ? SENTIMENT_ICON[sentiment.sentiment] : null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-radar-primary/20 bg-gradient-to-br from-radar-light-card/45 via-radar-light-surface/25 to-radar-primary/[0.1] p-5 shadow-[0_8px_32px_-12px_rgba(16,34,58,0.18),inset_0_1px_0_0_rgba(255,255,255,0.65)] backdrop-blur-2xl dark:border-white/10 dark:from-radar-elevated/40 dark:via-radar-card/25 dark:to-radar-accent/[0.12] dark:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
      <div>
        <h2 className="text-sm font-semibold text-radar-light-text dark:text-radar-white">Executive Summary</h2>
        {summary && <p className="mt-1 text-xs text-radar-light-muted dark:text-radar-muted">{summary}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-radar-light-border/60 pt-3 text-xs dark:border-white/10">
        {sentiment && SentimentIcon && (
          <span className="flex items-center gap-1.5 font-medium">
            <SentimentIcon className={cn("size-3.5 shrink-0", SENTIMENT_COLOR[sentiment.sentiment])} aria-hidden="true" />
            <span className={SENTIMENT_COLOR[sentiment.sentiment]}>Market Sentiment: {sentiment.sentiment}</span>
            <span className="text-radar-light-muted dark:text-radar-muted">({sentiment.justification})</span>
          </span>
        )}

        {healthLines.length > 0 && (
          <span className="flex items-center gap-1.5 font-medium text-radar-light-text dark:text-radar-white">
            <ShieldCheck className="size-3.5 shrink-0 text-radar-primary dark:text-radar-accent" aria-hidden="true" />
            Ecosystem Health: {healthLines.join(" · ")}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-radar-light-border/60 pt-3 dark:border-white/10">
        <p className="text-[11px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">Today&apos;s Highlights</p>
        {highlights.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {highlights.map((highlight) => {
              const Icon = HIGHLIGHT_ICON[highlight.category];
              return (
                <li key={highlight.id} className="flex items-start gap-1.5 text-xs text-radar-light-text dark:text-radar-white">
                  <Icon className="mt-0.5 size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
                  <span>{highlight.text}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">No notable events to report today.</p>
        )}
      </div>
    </div>
  );
}
