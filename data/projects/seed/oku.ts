import type { Project } from "@/data/projects/types";

/**
 * PR-098.01 — Featured Ecosystem Provider Mapping Audit. Oku is real (a
 * Uniswap v3 / Morpho trading interface built by GFX Labs, live on 35+
 * chains including Base) but genuinely has no token, TVL, or Base contract
 * of its own to map — it's an interface over pools/markets that belong to
 * the underlying protocols it renders, not a protocol with its own
 * balance sheet. Confirmed absence, not an unchecked gap: no CoinGecko coin
 * (only unrelated "Oku Trade (<chain>)" *exchange/venue* listings, which
 * are DEX-aggregator profiles, not a tradable OKU token), no DefiLlama
 * protocol TVL page, no distinct Base contract. GitHub is the one real,
 * independently confirmed mapping.
 *
 * PR-101 — Oku Featured Ecosystem Classification & Intelligence. Two
 * corrections made after re-verifying every claim above independently:
 *
 * 1. `categories` changed from `["dex"]` to `["infrastructure"]`. "dex"
 *    implies Oku itself operates a decentralized exchange / owns
 *    liquidity — factually wrong (it's an interface OVER Uniswap v3 and
 *    Morpho's pools, not their operator). This also makes TVL's
 *    N/A result in `lib/intelligence/dimensionNormalization.ts`
 *    STRUCTURAL (category-excluded, matching "Oku does not own the
 *    underlying liquidity") rather than merely incidental (would have
 *    read as "data missing" under the old category, which is a weaker,
 *    less honest reason for the same right answer).
 * 2. `github.repo` pinned to `"oku-router"` — PR-098.01 left this
 *    org-only (`owner` with no `repo`), which means `matchGithub()`
 *    (`lib/intelligence/sources.ts`) has always returned "not configured"
 *    for Oku, contradicting this file's own claim that GitHub is "the one
 *    real... mapping." The exact same gap PR-051 already fixed for
 *    across-protocol/layerzero/pyth-network/safe/usd-coin. Re-verified via
 *    the GitHub API (`gh api orgs/oku-trade/repos`, 2026-09-16): `oku-router`
 *    is oku-trade's most recently pushed real (non-fork) repo — Oku's own
 *    trading/routing engine, the piece most relevant to its actual
 *    product — so Developer Activity can now compute a real score instead
 *    of always resolving N/A.
 *
 * See the PR-101 report for the full identity re-audit (Phase 1) and data
 * model classification (Phase 2) this entry now reflects.
 */
export const oku: Project = {
  id: "oku",
  slug: "oku",
  name: "Oku",
  shortDescription: "Trading interface / aggregator for Uniswap v3 and Morpho, live on 35+ chains.",
  description:
    "Oku (built by GFX Labs) is a trading interface and liquidity aggregator over Uniswap v3 and Morpho, spanning 35+ EVM chains including Base. It has no native token, no governance of its own, and no protocol-level TVL of its own — the capital and liquidity it routes trades through belongs to the underlying protocols, not to Oku.",
  websiteUrl: "https://oku.trade",
  categories: ["infrastructure"],
  tags: ["cross-chain"],
  status: "live",
  chains: ["base"],
  contracts: [],
  github: {
    // Confirmed real org via direct search: github.com/oku-trade. PR-101
    // pinned to the org's real, most-recently-pushed, non-fork repo (the
    // same methodology PR-051 used elsewhere) — see the doc comment above.
    owner: "oku-trade",
    repo: "oku-router",
    url: "https://github.com/oku-trade/oku-router",
  },
  social: {},
  verification: {
    status: "verified",
    source: "Base Radar review (PR-098.01, re-verified PR-101)",
    verifiedAt: "2026-09-16",
  },
  providerIds: {},
};
