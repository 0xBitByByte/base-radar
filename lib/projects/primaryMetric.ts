/**
 * The one category-aware primary-metric selection rule for a `LiveProject`
 * — which real field is *most meaningful* differs by category (a Lending
 * market's headline number is what it holds, a DEX's is trading activity,
 * a Stablecoin/Infrastructure/AI token's is its supply value), falling
 * back through Price → Market Cap → TVL, first real one wins. Originally
 * private to `components/projects/LiveProjectCard.tsx` (PR-071 Round 3,
 * Task 8) and re-derived a second time for Category Rank's ranking needs
 * (Universal Project Card, PR-1) before this extraction — this file is now
 * the single source of truth both consumers import from, so the rule is
 * defined exactly once regardless of whether the caller wants a raw
 * number (ranking) or a formatted display value (the card itself).
 *
 * Never fabricates a number a project doesn't actually have — every
 * branch reads a real field or falls through to the next one; a project
 * with no real market read at all gets `null`/`{ label: "Market" }`, never
 * an invented value.
 */

import type { ProjectCategory } from "@/data/projects/enums";
import { formatCompactCurrency } from "@/lib/data/format";
import type { LiveProject } from "@/lib/projects/types";

export type PrimaryMetric = { label: string; value?: string; changePct24h?: number | null };

/**
 * PR-085.05, Task 7 — a Project-Card-specific presentation wrapper around
 * the shared `formatCompactCurrency`, not a change to that shared utility
 * (explicitly out of scope: its pinned `minimumFractionDigits: 2` exists to
 * avoid a real Node-SSR-vs-browser-CSR ICU hydration mismatch — a
 * constraint every other app-wide consumer of that function still needs).
 * This only trims trailing zero decimals from the *already-deterministic*
 * formatted string via a plain, ICU-independent regex — the same output in
 * every environment by construction, so it introduces no hydration risk of
 * its own. `"$198.45B"` (real, meaningful precision) is untouched; only
 * `"$198.00B"` → `"$198B"` / `"$24.50M"` → `"$24.5M"` style noise is
 * removed. Local to this file — every `LiveProjectCard` display value flows
 * through `categoryPrimaryMetric()`/`standardMetrics()` below, both already
 * exclusively card-presentation functions.
 */
function formatCardCurrency(value: number): string {
  return formatCompactCurrency(value)
    .replace(/(\.\d*?)0+(?=\D*$)/, "$1")
    .replace(/\.(?=\D*$)/, "");
}

/** Two categories from the brief's own examples are deliberately NOT mapped: Oracle → "Integrations" and Gaming → "Users" have no corresponding field anywhere in `LiveProject`/`MarketSummary` — no provider this app integrates surfaces either number. Both keep the general Price/Market Cap/TVL chain below instead — honest, not most-relevant-in-theory. */
const CATEGORY_PRIMARY_METRIC: Partial<Record<ProjectCategory, "tvl" | "volume" | "marketCap">> = {
  lending: "tvl",
  dex: "volume",
  bridge: "volume",
  stablecoin: "marketCap",
  infrastructure: "marketCap",
  ai: "marketCap",
};

/** Category preference first (when that project actually has the number) → Price → Market Cap → TVL, first real one wins; never two empty dashes side by side when a project genuinely has no market read at all. Price carries its real 24h change alongside it when available — the other fallbacks have no 24h figure of their own to attach. */
export function categoryPrimaryMetric(project: LiveProject): PrimaryMetric {
  const { market } = project;
  const preferred = CATEGORY_PRIMARY_METRIC[project.category];
  if (preferred === "tvl" && market.tvlUsd !== null) {
    return { label: "TVL", value: formatCardCurrency(market.tvlUsd) };
  }
  if (preferred === "volume" && market.volume24hUsd !== null) {
    return { label: "Volume 24h", value: formatCardCurrency(market.volume24hUsd) };
  }
  if (preferred === "marketCap" && market.marketCapUsd !== null) {
    return { label: "Market Cap", value: formatCardCurrency(market.marketCapUsd) };
  }
  if (market.available && market.priceUsd !== null) {
    return { label: "Price", value: formatCardCurrency(market.priceUsd), changePct24h: market.changePct24h };
  }
  if (market.marketCapUsd !== null) return { label: "Market Cap", value: formatCardCurrency(market.marketCapUsd) };
  if (market.tvlUsd !== null) return { label: "TVL", value: formatCardCurrency(market.tvlUsd) };
  return { label: "Market" };
}

/**
 * The raw numeric value behind whatever `categoryPrimaryMetric` would show
 * as this project's headline number — same category-preference-then-
 * fallback-chain, unformatted, for ranking rather than display (Category
 * Rank, Universal Project Card §9). `null` when a project genuinely has no
 * market read at all (mirrors `categoryPrimaryMetric`'s own final
 * `{ label: "Market" }` fallback).
 */
export function categoryAwarePrimaryMetricValue(project: LiveProject): number | null {
  const { market } = project;
  const preferred = CATEGORY_PRIMARY_METRIC[project.category];
  if (preferred === "tvl" && market.tvlUsd !== null) return market.tvlUsd;
  if (preferred === "volume" && market.volume24hUsd !== null) return market.volume24hUsd;
  if (preferred === "marketCap" && market.marketCapUsd !== null) return market.marketCapUsd;
  if (market.available && market.priceUsd !== null) return market.priceUsd;
  if (market.marketCapUsd !== null) return market.marketCapUsd;
  if (market.tvlUsd !== null) return market.tvlUsd;
  return null;
}

export type StandardMetric = { label: string; value?: string };

/**
 * PR-085.03 — supersedes PR-085.02A's `discoverySecondaryMetric` (a single
 * FDV → Market Cap → 24h Volume fallback field). Requirement 5 of the
 * Executive Card Final Polish directive mandates every `detailed` card
 * always display exactly these four fixed fields — Market Cap, Price, 24h
 * Volume, FDV — regardless of category, alongside (not instead of) the
 * category-aware primary metric above it. Unlike the superseded function,
 * this never skips a field that happens to equal the primary: "the layout
 * must remain identical" across every card is the explicit, approved
 * requirement — an occasional incidental repeat (e.g. a DEX's Volume
 * primary also appearing in the fixed Volume slot) is expected, not a bug.
 * Each field is always present with its own label; `value` is omitted
 * (never fabricated) when a project genuinely has no real read for it —
 * `MetricItem`'s `unavailableLabel="Not Tracked"` renders the honest gap.
 */
export function standardMetrics(project: LiveProject): [StandardMetric, StandardMetric, StandardMetric, StandardMetric] {
  const { market } = project;
  return [
    { label: "Market Cap", value: market.marketCapUsd !== null ? formatCardCurrency(market.marketCapUsd) : undefined },
    { label: "Price", value: market.priceUsd !== null ? formatCardCurrency(market.priceUsd) : undefined },
    { label: "24H Volume", value: market.volume24hUsd !== null ? formatCardCurrency(market.volume24hUsd) : undefined },
    { label: "FDV", value: market.fdvUsd !== null ? formatCardCurrency(market.fdvUsd) : undefined },
  ];
}
