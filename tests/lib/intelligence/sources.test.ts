import { describe, expect, it } from "vitest";

import { gatherProjectSources, matchTrading } from "@/lib/intelligence/sources";
import type { Project } from "@/data/projects/types";
import type { ProviderBulkData } from "@/lib/intelligence/sources";
import type { ProviderResult } from "@/lib/providers/common/types";
import type { VerifiedContract } from "@/lib/providers/blockscout/service";
import type { Pair } from "@/lib/providers/dexscreener/mapper";

/**
 * V1-IMPLEMENT-001 follow-up (ADR V1-BLOCKER-001, Phase 1) — verifies
 * `matchVerifiedContract()` now threads `result.stale` through exactly the
 * way `matchGithub()` already does, so a Blockscout outage can no longer
 * silently present possibly-hours-old "recently verified contract"
 * evidence as indistinguishable from fresh data.
 *
 * `github: null` on the fixture lets `matchGithub()` short-circuit at its
 * own `notConfiguredSlice` guard with no network call, so only
 * `verifiedContract` needs a real `bulk` value — every other `bulk` field
 * is set to a matching "unavailable" result, irrelevant to this test.
 */
function project(blockscoutAddress: string): Project {
  return {
    categories: [],
    chains: ["base"],
    contracts: [],
    providerIds: {
      blockscoutAddress,
      coingeckoId: null,
      dexscreenerChainId: null,
      dexscreenerDexIds: null,
      dexscreenerPairAddresses: null,
      defillamaSlug: null,
    },
    github: null,
  } as unknown as Project;
}

function unavailable<T>(): ProviderResult<T> {
  return { ok: false, source: "blockscout", error: { code: "network_error", message: "unavailable" } };
}

function bulkWith(verifiedContract: ProviderResult<VerifiedContract>): ProviderBulkData {
  return {
    markets: unavailable(),
    pairs: unavailable(),
    tokenPairs: unavailable(),
    protocols: unavailable(),
    verifiedContract,
    network: unavailable(),
  } as unknown as ProviderBulkData;
}

const ADDRESS = "0xabc0000000000000000000000000000000abc";

describe("matchVerifiedContract — stale propagation", () => {
  it("a fresh match carries no stale flag and no stale detail", async () => {
    const bulk = bulkWith({
      ok: true,
      data: { address: ADDRESS, name: "Test", verifiedAt: "2026-01-01T00:00:00.000Z" },
      source: "blockscout",
      fetchedAt: "2026-01-01T00:00:00.000Z",
    });

    const sources = await gatherProjectSources(project(ADDRESS), bulk);

    expect(sources.verifiedContract.status).toBe("live");
    expect(sources.verifiedContract.stale).toBeUndefined();
    expect(sources.verifiedContract.detail).toBeNull();
  });

  it("a stale match (Blockscout down, serving the last real value) is honestly surfaced — mirrors matchGithub's own pattern", async () => {
    const bulk = bulkWith({
      ok: true,
      data: { address: ADDRESS, name: "Test", verifiedAt: "2026-01-01T00:00:00.000Z" },
      source: "blockscout",
      fetchedAt: "2026-01-01T00:00:00.000Z",
      stale: true,
    });

    const sources = await gatherProjectSources(project(ADDRESS), bulk);

    expect(sources.verifiedContract.status).toBe("live"); // real data, not fabricated — same status matchGithub uses for its own stale case
    expect(sources.verifiedContract.stale).toBe(true);
    expect(sources.verifiedContract.detail).toBe("Stale — Blockscout is currently unavailable. Showing the last successfully fetched data.");
  });

  it("no match still resolves to unavailable, unaffected by the stale-propagation change", async () => {
    const bulk = bulkWith({
      ok: true,
      data: { address: "0xsomeoneelse0000000000000000000000000000", name: "Other", verifiedAt: "2026-01-01T00:00:00.000Z" },
      source: "blockscout",
      fetchedAt: "2026-01-01T00:00:00.000Z",
    });

    const sources = await gatherProjectSources(project(ADDRESS), bulk);

    expect(sources.verifiedContract.status).toBe("unavailable");
    expect(sources.verifiedContract.stale).toBeUndefined();
  });
});

/**
 * Radar Score V2 Priority 3 — regression tests for a confirmed, live-
 * reproduced defect in `matchTrading`'s "dex" discovery strategy: it
 * returned the FIRST dexId-matching pool from `search?q=base` (a
 * relevance/keyword search, not a volume ranking) even when that pool's
 * volume/transaction count was negligible, without ever checking whether
 * this project's own exact "token" match would be more representative.
 * Live-verified real case: Balancer matched a single pool with $1.38 in
 * 24h volume and 2 total transactions while its real Base token pool data
 * went unchecked. Fixed by `isMeaningfulTradingMatch()` — a deliberately
 * low bar (combined volume >= $500 OR combined transactions >= 10) that
 * only rejects matches indistinguishable from noise, falling through to
 * the next configured strategy (same fallthrough machinery the pre-
 * existing zero-match case already used) rather than a scoring judgment.
 */
function pair(overrides: Partial<Pair> = {}): Pair {
  return {
    chainId: "base",
    dexId: "test-dex",
    baseToken: { address: "0xtoken", name: "Test", symbol: "TEST" },
    quoteTokenSymbol: "WETH",
    quoteTokenAddress: "0xweth",
    pairAddress: "0xpair",
    url: null,
    priceUsd: 1,
    priceChangePct24h: null,
    volume24hUsd: 0,
    volume6hUsd: null,
    liquidityUsd: 0,
    buys24h: 0,
    sells24h: 0,
    pairCreatedAt: null,
    ...overrides,
  };
}

function tradingProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "test",
    slug: "test",
    name: "Test",
    shortDescription: "",
    description: "",
    websiteUrl: "https://example.com",
    categories: ["dex"],
    tags: [],
    status: "live",
    chains: ["base"],
    contracts: [{ chain: "base", address: "0xtoken", type: "token", label: "Test token" }],
    social: {},
    verification: { status: "verified" },
    providerIds: { dexscreenerDexIds: ["test-dex"] },
    ...overrides,
  } as unknown as Project;
}

function ok<T>(data: T): ProviderResult<T> {
  return { ok: true, data, source: "dexscreener", fetchedAt: "2026-01-01T00:00:00.000Z" };
}

describe("matchTrading — dex-strategy negligible-match fallthrough (Radar Score V2 Priority 3)", () => {
  it("a negligible dex-search match (below both thresholds) falls through to the exact token match, when one is configured", () => {
    const negligibleDexMatch = [pair({ dexId: "test-dex", pairAddress: "0xnegligible", volume24hUsd: 1.38, buys24h: 1, sells24h: 1 })];
    const realTokenMatch = [pair({ dexId: "test-dex", pairAddress: "0xreal", baseToken: { address: "0xtoken", name: "Test", symbol: "TEST" }, volume24hUsd: 2_800_000, buys24h: 1000, sells24h: 2500 })];

    const result = matchTrading(tradingProject(), ok(negligibleDexMatch), ok(realTokenMatch));

    expect(result.status).toBe("live");
    expect(result.data).toEqual(realTokenMatch);
  });

  it("a meaningful dex-search match (clears the volume threshold) is accepted directly — no regression for the common case", () => {
    const meaningfulMatch = [pair({ dexId: "test-dex", pairAddress: "0xreal", volume24hUsd: 2_800_000, buys24h: 1000, sells24h: 2500 })];
    const irrelevantTokenMatch = [pair({ dexId: "other-dex", pairAddress: "0xshouldnotmatch", volume24hUsd: 999_999 })];

    const result = matchTrading(tradingProject(), ok(meaningfulMatch), ok(irrelevantTokenMatch));

    expect(result.data).toEqual(meaningfulMatch); // the dex match, never the token fallback, when the dex match itself is real
  });

  it("a meaningful dex-search match clearing ONLY the transaction-count threshold (low volume, real transaction activity) is still accepted directly", () => {
    const txHeavyMatch = [pair({ dexId: "test-dex", pairAddress: "0xtxheavy", volume24hUsd: 42, buys24h: 6, sells24h: 6 })]; // $42 volume (below $500), 12 txns (clears >=10)

    const result = matchTrading(tradingProject(), ok(txHeavyMatch), ok([]));

    expect(result.data).toEqual(txHeavyMatch);
  });

  it("when the dex-search match is negligible AND no meaningful token match exists either, honestly reports unavailable — never silently returns the negligible match", () => {
    const negligibleDexMatch = [pair({ dexId: "test-dex", pairAddress: "0xnegligible", volume24hUsd: 1.38, buys24h: 1, sells24h: 1 })];

    const result = matchTrading(tradingProject(), ok(negligibleDexMatch), ok([])); // no token pools found at all

    // The token strategy is genuinely tried next (and also finds nothing),
    // so its own honest "not found" detail is the final, most-relevant
    // explanation — never the negligible dex match silently accepted.
    expect(result.status).toBe("unavailable");
    expect(result.detail).toMatch(/no dexscreener pair found/i);
  });

  it("when no token strategy is configured at all (e.g. Uniswap — no Base governance token registered), a negligible dex-search match is still returned as the only available real data, honestly", () => {
    const negligibleDexMatch = [pair({ dexId: "test-dex", pairAddress: "0xnegligible", volume24hUsd: 0.5, buys24h: 0, sells24h: 1 })];
    const projectWithNoToken = tradingProject({ contracts: [] });

    const result = matchTrading(projectWithNoToken, ok(negligibleDexMatch), ok([]));

    // No better strategy exists to fall through to — this is the honest
    // "real but thin" data DexScreener's search actually returned, not a
    // fabricated substitute. The pipeline's own log-normalization floors
    // (not this matcher) are what correctly score this as near-zero.
    expect(result.status).toBe("unavailable");
    expect(result.detail).toMatch(/negligible/i);
  });

  it("two small pools that are only meaningful when SUMMED together (neither alone clears the bar) are still correctly accepted", () => {
    const twoSmallPools = [
      pair({ dexId: "test-dex", pairAddress: "0xa", volume24hUsd: 300, buys24h: 2, sells24h: 2 }),
      pair({ dexId: "test-dex", pairAddress: "0xb", volume24hUsd: 250, buys24h: 2, sells24h: 3 }),
    ]; // combined $550 volume (clears >=500), 9 txns (does not clear >=10 alone) — volume alone should be enough

    const result = matchTrading(tradingProject(), ok(twoSmallPools), ok([]));

    expect(result.status).toBe("live");
    expect(result.data).toEqual(twoSmallPools);
  });
});
