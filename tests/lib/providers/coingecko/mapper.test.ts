import { describe, expect, it } from "vitest";

import { mapCoinMarket } from "@/lib/providers/coingecko/mapper";
import type { RawCoinGeckoMarket } from "@/lib/providers/coingecko/client";

/**
 * PR-098.02 — Featured Ecosystem 24H% Semantics audit. `mapCoinMarket` is
 * the raw-provider → domain boundary for `changePct24h` (THE PROJECT'S OWN
 * TOKEN USD PRICE CHANGE over 24h) — this covers the "malformed provider
 * value" case the audit's required test matrix names, at the exact layer
 * ("provider mapper") the audit traced the field through.
 */
function rawMarket(overrides: Partial<RawCoinGeckoMarket> = {}): RawCoinGeckoMarket {
  return {
    id: "test-coin",
    symbol: "test",
    name: "Test Coin",
    image: "https://example.com/logo.png",
    current_price: 1.23,
    market_cap: 1_000_000,
    market_cap_rank: 100,
    fully_diluted_valuation: null,
    total_volume: 500_000,
    price_change_percentage_24h: 5.2,
    circulating_supply: null,
    total_supply: null,
    max_supply: null,
    ath: null,
    ath_date: null,
    atl: null,
    atl_date: null,
    ...overrides,
  };
}

describe("mapCoinMarket — changePct24h malformed-value guard (PR-098.02)", () => {
  it("passes through a real positive value unchanged", () => {
    expect(mapCoinMarket(rawMarket({ price_change_percentage_24h: 5.2 })).changePct24h).toBe(5.2);
  });

  it("passes through a real negative value unchanged", () => {
    expect(mapCoinMarket(rawMarket({ price_change_percentage_24h: -5.2 })).changePct24h).toBe(-5.2);
  });

  it("passes through exactly zero", () => {
    expect(mapCoinMarket(rawMarket({ price_change_percentage_24h: 0 })).changePct24h).toBe(0);
  });

  it("passes through null (CoinGecko's own honest 'no data' signal)", () => {
    expect(mapCoinMarket(rawMarket({ price_change_percentage_24h: null })).changePct24h).toBeNull();
  });

  it("treats NaN as unavailable, not a renderable number", () => {
    expect(mapCoinMarket(rawMarket({ price_change_percentage_24h: Number.NaN })).changePct24h).toBeNull();
  });

  it("treats Infinity/-Infinity as unavailable", () => {
    expect(mapCoinMarket(rawMarket({ price_change_percentage_24h: Number.POSITIVE_INFINITY })).changePct24h).toBeNull();
    expect(mapCoinMarket(rawMarket({ price_change_percentage_24h: Number.NEGATIVE_INFINITY })).changePct24h).toBeNull();
  });

  it("treats a non-numeric malformed value as unavailable", () => {
    // A malformed/truncated raw response could hand back a string after
    // JSON parsing in edge cases — simulated here via an unchecked cast,
    // the same way a real malformed HTTP body would arrive untyped.
    const malformed = rawMarket({ price_change_percentage_24h: "not-a-number" as unknown as number });
    expect(mapCoinMarket(malformed).changePct24h).toBeNull();
  });
});
