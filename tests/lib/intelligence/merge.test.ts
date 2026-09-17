import { describe, expect, it } from "vitest";

import { mergeMarket, mergeTvl } from "@/lib/intelligence/merge";
import type { CoinMarket } from "@/lib/providers/coingecko/service";
import type { Pair } from "@/lib/providers/dexscreener/service";
import type { Protocol } from "@/lib/providers/defillama/mapper";
import type { ProjectSources, ProviderSlice } from "@/lib/intelligence/types";

/**
 * PR-098.02 — Featured Ecosystem 24H% Semantics audit. `mergeMarket`'s
 * `changePct24h` is THE PROJECT'S OWN TOKEN USD PRICE CHANGE over the last
 * 24 hours, sourced exclusively from `sources.market` (CoinGecko) — this
 * covers every case the audit's required test matrix names, at the exact
 * layer ("intelligence service") the audit traced the field through.
 */

const UNAVAILABLE_TRADING: ProviderSlice<Pair[]> = {
  data: null,
  status: "unavailable",
  fetchedAt: null,
  matchQuality: "none",
  detail: "no trading data",
};

function coinMarket(overrides: Partial<CoinMarket> = {}): CoinMarket {
  return {
    id: "test-coin",
    symbol: "TEST",
    name: "Test Coin",
    imageUrl: "https://example.com/logo.png",
    priceUsd: 1.23,
    marketCapUsd: 1_000_000,
    marketCapRank: 100,
    fullyDilutedValuationUsd: null,
    volume24hUsd: 500_000,
    changePct24h: 0,
    changePct7d: null,
    changePct30d: null,
    circulatingSupply: null,
    totalSupply: null,
    maxSupply: null,
    athUsd: null,
    athDate: null,
    atlUsd: null,
    atlDate: null,
    sparkline7d: [],
    ...overrides,
  };
}

function marketSlice(overrides: Partial<ProviderSlice<CoinMarket>> = {}): ProviderSlice<CoinMarket> {
  return {
    data: coinMarket(),
    status: "live",
    fetchedAt: "2026-01-01T00:00:00.000Z",
    matchQuality: "exact",
    detail: null,
    ...overrides,
  };
}

function sourcesWith(market: ProviderSlice<CoinMarket>): ProjectSources {
  return {
    market,
    trading: UNAVAILABLE_TRADING,
    tvl: { data: null, status: "not_configured", fetchedAt: null, matchQuality: "none", detail: "n/a" },
    network: { data: null, status: "not_configured", fetchedAt: null, matchQuality: "none", detail: "n/a" },
    verifiedContract: { data: null, status: "not_configured", fetchedAt: null, matchQuality: "none", detail: "n/a" },
    github: { data: null, status: "not_configured", fetchedAt: null, matchQuality: "none", detail: "n/a" },
  };
}

describe("mergeMarket — changePct24h semantics (PR-098.02)", () => {
  it("resolves a positive token price change", () => {
    const market = mergeMarket(sourcesWith(marketSlice({ data: coinMarket({ changePct24h: 12.4 }) })));
    expect(market.changePct24h).toBe(12.4);
  });

  it("resolves a negative token price change", () => {
    const market = mergeMarket(sourcesWith(marketSlice({ data: coinMarket({ changePct24h: -5.8 }) })));
    expect(market.changePct24h).toBe(-5.8);
  });

  it("resolves exactly zero (a real, flat 24h move) rather than treating it as missing", () => {
    const market = mergeMarket(sourcesWith(marketSlice({ data: coinMarket({ changePct24h: 0 }) })));
    expect(market.changePct24h).toBe(0);
  });

  it("is null when the project has no token mapping configured (not_configured)", () => {
    const market = mergeMarket(
      sourcesWith({ data: null, status: "not_configured", fetchedAt: null, matchQuality: "none", detail: "No coingeckoId configured on this project" })
    );
    expect(market.changePct24h).toBeNull();
    expect(market.available).toBe(false);
  });

  it("is null when the project has a coingeckoId but no CoinGecko match was found (missing mapping)", () => {
    const market = mergeMarket(
      sourcesWith({ data: null, status: "unavailable", fetchedAt: null, matchQuality: "none", detail: 'No CoinGecko market found for id "ghost-coin"' })
    );
    expect(market.changePct24h).toBeNull();
  });

  it("is null when the provider is unavailable (fetch failed, no stale fallback available)", () => {
    const market = mergeMarket(sourcesWith({ data: null, status: "unavailable", fetchedAt: null, matchQuality: "none", detail: "network error" }));
    expect(market.changePct24h).toBeNull();
  });

  it("still resolves the real value from a stale fallback, flagged stale — never blanked just because it's old", () => {
    const market = mergeMarket(
      sourcesWith(marketSlice({ data: coinMarket({ changePct24h: 7.1 }), stale: true, detail: "Stale — CoinGecko is currently unavailable. Showing the last successfully fetched data." }))
    );
    expect(market.changePct24h).toBe(7.1);
    expect(market.stale).toBe(true);
  });

  it("defaults stale to false for a fresh live match", () => {
    const market = mergeMarket(sourcesWith(marketSlice()));
    expect(market.stale).toBe(false);
  });

  it("never substitutes TVL change, volume change, or any other metric when the token price change is unavailable", () => {
    const market = mergeMarket(sourcesWith({ data: null, status: "not_configured", fetchedAt: null, matchQuality: "none", detail: "No coingeckoId configured on this project" }));
    // The only two legitimate outcomes for this field are a real CoinGecko
    // price-change number, or null — nothing else is a valid value here.
    expect(market.changePct24h === null || typeof market.changePct24h === "number").toBe(true);
    expect(market.changePct24h).toBeNull();
  });
});

/**
 * PR-102 — Base-specific TVL regression tests at the merge layer: proves
 * `mergeTvl` correctly selects `baseTvlUsd` as canonical `tvlUsd`, never
 * silently falls back to `globalTvlUsd`, and still keeps the global figure
 * available as real secondary context.
 */
function protocol(overrides: Partial<Protocol> = {}): Protocol {
  return {
    name: "Test Protocol",
    symbol: "TEST",
    chains: ["Base"],
    globalTvlUsd: 1_000_000,
    baseTvlUsd: 1_000_000,
    marketCapUsd: null,
    changePct24h: null,
    category: "Dexs",
    logoUrl: null,
    parentProtocol: null,
    ...overrides,
  };
}

function tvlSourcesWith(tvl: ProviderSlice<Protocol>): ProjectSources {
  return {
    market: { data: null, status: "not_configured", fetchedAt: null, matchQuality: "none", detail: "n/a" },
    trading: UNAVAILABLE_TRADING,
    tvl,
    network: { data: null, status: "not_configured", fetchedAt: null, matchQuality: "none", detail: "n/a" },
    verifiedContract: { data: null, status: "not_configured", fetchedAt: null, matchQuality: "none", detail: "n/a" },
    github: { data: null, status: "not_configured", fetchedAt: null, matchQuality: "none", detail: "n/a" },
  };
}

describe("mergeTvl — Base-specific TVL is canonical (PR-102)", () => {
  it("selects Base-specific TVL as the canonical tvlUsd when a protocol has one", () => {
    const result = mergeTvl(
      tvlSourcesWith({ data: protocol({ globalTvlUsd: 16_924_593_239, baseTvlUsd: 505_941_780 }), status: "live", fetchedAt: "2026-01-01T00:00:00.000Z", matchQuality: "exact", detail: null })
    );
    expect(result.tvlUsd).toBe(505_941_780);
  });

  it("global TVL remains available as real secondary context, alongside the canonical Base-specific value", () => {
    const result = mergeTvl(
      tvlSourcesWith({ data: protocol({ globalTvlUsd: 16_924_593_239, baseTvlUsd: 505_941_780 }), status: "live", fetchedAt: "2026-01-01T00:00:00.000Z", matchQuality: "exact", detail: null })
    );
    expect(result.globalTvlUsd).toBe(16_924_593_239);
  });

  it("never silently substitutes global TVL for a matched protocol with no Base-specific breakdown — tvlUsd is honestly null, available is false", () => {
    const result = mergeTvl(
      tvlSourcesWith({ data: protocol({ globalTvlUsd: 5_000_000_000, baseTvlUsd: null }), status: "live", fetchedAt: "2026-01-01T00:00:00.000Z", matchQuality: "exact", detail: null })
    );
    expect(result.tvlUsd).toBeNull();
    expect(result.available).toBe(false);
    expect(result.globalTvlUsd).toBe(5_000_000_000); // still real, still present — just never promoted to canonical
  });

  it("a real single-chain-Base protocol has identical Base and global figures, and is honestly available", () => {
    const result = mergeTvl(
      tvlSourcesWith({ data: protocol({ globalTvlUsd: 123_166_670, baseTvlUsd: 123_166_670 }), status: "live", fetchedAt: "2026-01-01T00:00:00.000Z", matchQuality: "exact", detail: null })
    );
    expect(result.tvlUsd).toBe(123_166_670);
    expect(result.available).toBe(true);
  });

  it("no match at all: both tvlUsd and globalTvlUsd are honestly null, never fabricated", () => {
    const result = mergeTvl(tvlSourcesWith({ data: null, status: "unavailable", fetchedAt: null, matchQuality: "none", detail: "no match" }));
    expect(result.tvlUsd).toBeNull();
    expect(result.globalTvlUsd).toBeNull();
    expect(result.available).toBe(false);
  });

  it("the tvlResolution trace resolves the canonical Base-specific value, not the global one", () => {
    const result = mergeTvl(
      tvlSourcesWith({ data: protocol({ globalTvlUsd: 999_999_999, baseTvlUsd: 42_000 }), status: "live", fetchedAt: "2026-01-01T00:00:00.000Z", matchQuality: "exact", detail: null })
    );
    expect(result.tvlResolution.value).toBe(42_000);
  });
});
