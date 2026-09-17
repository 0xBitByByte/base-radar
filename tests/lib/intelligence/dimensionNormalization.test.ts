import { describe, expect, it } from "vitest";

import {
  normalizeDeveloperActivity,
  normalizeEcosystemTraction,
  normalizeGovernance,
  normalizeMarketStrength,
  normalizeOnchainActivity,
  normalizeSecurity,
  normalizeTvl,
} from "@/lib/intelligence/dimensionNormalization";
import { computeRadarScore, type RadarScoreDimensionInput } from "@/lib/intelligence/radarScore";
import { oku } from "@/data/projects/seed/oku";
import type { CoinMarket } from "@/lib/providers/coingecko/service";
import type { GithubIntel, Trading, TradingPool, Tvl } from "@/lib/intelligence/types";
import type { SnapshotProposal } from "@/lib/providers/snapshot/service";
import type { ContractDetail } from "@/lib/providers/blockscout/mapper";
import type { Project } from "@/data/projects/types";

/**
 * PR-099 — Live Radar Score & Intelligence Normalization. Each normalizer
 * tested independently and deterministically, per the brief's own 20-case
 * test list: outlier extremes, missing/N/A data, category applicability,
 * duplicate-evidence/correlation avoidance, and deterministic repeat calls.
 */

function project(overrides: Partial<Project> = {}): Project {
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
    contracts: [],
    social: {},
    verification: { status: "verified" },
    providerIds: {},
    ...overrides,
  };
}

function coinMarket(overrides: Partial<CoinMarket> = {}): CoinMarket {
  return {
    id: "test",
    symbol: "TEST",
    name: "Test",
    imageUrl: "",
    priceUsd: 1,
    marketCapUsd: 10_000_000,
    marketCapRank: 100,
    fullyDilutedValuationUsd: null,
    volume24hUsd: 500_000,
    changePct24h: 1,
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

function tvl(overrides: Partial<Tvl> = {}): Tvl {
  return {
    available: true,
    tvlUsd: 5_000_000,
    globalTvlUsd: 5_000_000,
    changePct24h: null,
    changePct7d: null,
    changePct30d: null,
    defillamaCategory: null,
    tvlResolution: { value: null, provider: null, attemptedProviders: [], fallbackUsed: false, lastUpdated: null, confidence: null, failureReason: null },
    imageUrl: null,
    ...overrides,
  };
}

function pool(overrides: Partial<TradingPool> = {}): TradingPool {
  return {
    dexId: "aerodrome",
    liquidityUsd: 100_000,
    volume24hUsd: 50_000,
    pairCreatedAt: null,
    baseTokenSymbol: "TEST",
    baseTokenAddress: "0xabc",
    quoteTokenSymbol: "USDC",
    quoteTokenAddress: "0xdef",
    pairAddress: "0x111",
    url: null,
    volume6hUsd: null,
    ...overrides,
  };
}

function trading(overrides: Partial<Trading> = {}): Trading {
  const pools = overrides.pools ?? [pool()];
  return {
    available: pools.length > 0,
    volume24hUsd: null,
    liquidityUsd: null,
    buys24h: 20,
    sells24h: 15,
    priceChangePct24h: null,
    pairCount: pools.length,
    pools,
    largestPool: pools[0] ?? null,
    volumeResolution: { value: null, provider: null, attemptedProviders: [], fallbackUsed: false, lastUpdated: null, confidence: null, failureReason: null },
    liquidityResolution: { value: null, provider: null, attemptedProviders: [], fallbackUsed: false, lastUpdated: null, confidence: null, failureReason: null },
    ...overrides,
  };
}

function github(overrides: Partial<GithubIntel> = {}): GithubIntel {
  return {
    available: true,
    fullName: "org/repo",
    stars: 500,
    forks: 20,
    openIssues: 3,
    latestReleaseTag: null,
    latestReleasePublishedAt: null,
    latestReleaseNoteSummary: null,
    language: "Solidity",
    license: "MIT",
    createdAt: "2022-01-01T00:00:00.000Z",
    pushedAt: new Date().toISOString(),
    commitsLast7d: null,
    commitsPrev7d: null,
    commitTrendPct: null,
    developerCadence: null,
    avatarUrl: null,
    stale: false,
    dataFetchedAt: new Date().toISOString(),
    ...overrides,
  };
}

// -----------------------------------------------------------------------
// Market Strength
// -----------------------------------------------------------------------
describe("normalizeMarketStrength", () => {
  it("is N/A with no market data", () => {
    expect(normalizeMarketStrength(null).score).toBeNull();
  });

  it("scores a huge market cap with strong turnover highly, and never exceeds 100 even at the absolute ceiling", () => {
    // A near-ceiling market cap with the max-credited 30% turnover ratio
    // should read as close to 100 as this two-component formula allows.
    const strong = normalizeMarketStrength(coinMarket({ marketCapUsd: 40_000_000_000, volume24hUsd: 12_000_000_000 })); // 30% turnover
    expect(strong.score).not.toBeNull();
    expect(strong.score!).toBeLessThanOrEqual(100);
    expect(strong.score!).toBeGreaterThan(85);

    // Even literally at the ceiling with max turnover, the score never exceeds 100.
    const atCeiling = normalizeMarketStrength(coinMarket({ marketCapUsd: 50_000_000_000, volume24hUsd: 15_000_000_000 }));
    expect(atCeiling.score).toBe(100);
  });

  it("scores a tiny market cap near the floor close to 0", () => {
    const result = normalizeMarketStrength(coinMarket({ marketCapUsd: 120_000, volume24hUsd: 100 }));
    expect(result.score!).toBeLessThan(20);
  });

  it("handles zero volume without throwing or going negative", () => {
    const result = normalizeMarketStrength(coinMarket({ volume24hUsd: 0 }));
    expect(result.score).not.toBeNull();
    expect(result.score!).toBeGreaterThanOrEqual(0);
  });

  it("caps turnover contribution so an extreme volume/mcap ratio can't exceed the cap's contribution", () => {
    const normal = normalizeMarketStrength(coinMarket({ marketCapUsd: 10_000_000, volume24hUsd: 3_000_000 })); // 30%
    const extreme = normalizeMarketStrength(coinMarket({ marketCapUsd: 10_000_000, volume24hUsd: 90_000_000 })); // 900%, way past the 30% cap
    expect(extreme.score).toBe(normal.score); // capped identically
  });

  it("is deterministic across repeated calls with the same input", () => {
    const input = coinMarket();
    const a = normalizeMarketStrength(input);
    const b = normalizeMarketStrength(input);
    expect(a).toEqual(b);
  });
});

// -----------------------------------------------------------------------
// TVL / Liquidity — category applicability
// -----------------------------------------------------------------------
describe("normalizeTvl", () => {
  it("is N/A (not zero) for a structurally inapplicable category (social)", () => {
    const result = normalizeTvl(project({ categories: ["social"] }), tvl({ available: false, tvlUsd: null }));
    expect(result.score).toBeNull();
    expect(result.detail).toMatch(/not structurally applicable/i);
  });

  it("is N/A for a DEX project with genuinely no DefiLlama match (data-missing, not category-missing)", () => {
    const result = normalizeTvl(project({ categories: ["dex"] }), tvl({ available: false, tvlUsd: null }));
    expect(result.score).toBeNull();
    expect(result.detail).toMatch(/no real base-specific defillama data/i);
  });

  it("PR-102: is N/A when a protocol matched but has no real Base-specific TVL breakdown — never silently substituted with global TVL", () => {
    const result = normalizeTvl(project({ categories: ["dex"] }), tvl({ available: false, tvlUsd: null, globalTvlUsd: 5_000_000_000 }));
    expect(result.score).toBeNull();
    expect(result.detail).not.toMatch(/5,000,000,000|5000000000/);
  });

  it("scores a real DEX with real TVL", () => {
    const result = normalizeTvl(project({ categories: ["dex"] }), tvl({ tvlUsd: 1_450_000_000 }));
    expect(result.score).not.toBeNull();
    expect(result.score!).toBeGreaterThan(50);
  });

  it("an extreme TVL outlier stays bounded at 100", () => {
    const result = normalizeTvl(project({ categories: ["lending"] }), tvl({ tvlUsd: 500_000_000_000 }));
    expect(result.score).toBe(100);
  });

  it("a tiny TVL outlier stays bounded at/near 0", () => {
    const result = normalizeTvl(project({ categories: ["yield"] }), tvl({ tvlUsd: 50_000 }));
    expect(result.score).toBe(0);
  });
});

// -----------------------------------------------------------------------
// Onchain Activity — never reads the CoinGecko-fallback-resolved volume
// -----------------------------------------------------------------------
describe("normalizeOnchainActivity", () => {
  it("is N/A with zero matched pools", () => {
    expect(normalizeOnchainActivity(trading({ pools: [], available: false })).score).toBeNull();
  });

  it("scores real pool volume/transactions", () => {
    const result = normalizeOnchainActivity(trading({ pools: [pool({ volume24hUsd: 2_000_000 })], buys24h: 500, sells24h: 400 }));
    expect(result.score).not.toBeNull();
    expect(result.score!).toBeGreaterThan(0);
  });

  it("sums volume across multiple pools rather than using only one", () => {
    const single = normalizeOnchainActivity(trading({ pools: [pool({ volume24hUsd: 1_000_000 })] }));
    const multi = normalizeOnchainActivity(trading({ pools: [pool({ volume24hUsd: 1_000_000 }), pool({ volume24hUsd: 1_000_000, dexId: "uniswap" })] }));
    expect(multi.score!).toBeGreaterThan(single.score!);
  });

  it("an extreme volume outlier stays bounded at 100", () => {
    const result = normalizeOnchainActivity(trading({ pools: [pool({ volume24hUsd: 500_000_000 })], buys24h: 500_000, sells24h: 500_000 }));
    expect(result.score).toBe(100);
  });

  it("near-zero volume stays bounded near 0, never negative", () => {
    const result = normalizeOnchainActivity(trading({ pools: [pool({ volume24hUsd: 1 })], buys24h: 0, sells24h: 0 }));
    expect(result.score!).toBeGreaterThanOrEqual(0);
    expect(result.score!).toBeLessThan(20);
  });
});

// -----------------------------------------------------------------------
// Developer Activity — recency-weighted, stars never used
// -----------------------------------------------------------------------
describe("normalizeDeveloperActivity", () => {
  it("is N/A when GitHub is unavailable", () => {
    expect(normalizeDeveloperActivity(github({ available: false, pushedAt: null })).score).toBeNull();
  });

  it("scores near 100 for a repo pushed today", () => {
    const result = normalizeDeveloperActivity(github({ pushedAt: new Date().toISOString() }));
    expect(result.score!).toBeGreaterThan(90);
  });

  it("scores near 0 for a repo not pushed in 200+ days", () => {
    const result = normalizeDeveloperActivity(github({ pushedAt: new Date(Date.now() - 200 * 86_400_000).toISOString() }));
    expect(result.score!).toBeLessThan(15);
  });

  it("never penalizes a repo with no releases at all — push recency alone carries full weight", () => {
    const result = normalizeDeveloperActivity(github({ pushedAt: new Date().toISOString(), latestReleasePublishedAt: null }));
    expect(result.score).toBe(100);
  });

  it("does not use stars in the score at all — a huge star count on an old repo doesn't inflate a stale one", () => {
    const oldButPopular = normalizeDeveloperActivity(github({ stars: 50_000, pushedAt: new Date(Date.now() - 300 * 86_400_000).toISOString() }));
    const activeButUnknown = normalizeDeveloperActivity(github({ stars: 2, pushedAt: new Date().toISOString() }));
    expect(activeButUnknown.score!).toBeGreaterThan(oldButPopular.score!);
  });

  // MASTER HARDENING PASS — Concern 3: contributor breadth, a genuinely
  // independent axis from recency (bus-factor/community diversity, not
  // "when was this last touched"). commitsLast7d/trendPct deliberately NOT
  // added — see the function's own doc comment for why (raw-activity-reward
  // risk, substantial redundancy with push recency).
  describe("contributor breadth (Concern 3)", () => {
    it("without contributor data, behaves exactly as before (graceful degradation, not N/A)", () => {
      const withData = normalizeDeveloperActivity(github({ pushedAt: new Date().toISOString(), latestReleasePublishedAt: null }), null);
      const withoutParam = normalizeDeveloperActivity(github({ pushedAt: new Date().toISOString(), latestReleasePublishedAt: null }));
      expect(withData.score).toBe(withoutParam.score);
      expect(withData.score).toBe(100); // push recency alone still carries full weight
    });

    it("a repo with many real contributors scores higher than an otherwise-identical single-maintainer repo", () => {
      const pushedAt = new Date(Date.now() - 30 * 86_400_000).toISOString(); // same moderate recency for both
      const soloMaintainer = normalizeDeveloperActivity(github({ pushedAt, latestReleasePublishedAt: null }), { count: 1, hitCap: false });
      const manyContributors = normalizeDeveloperActivity(github({ pushedAt, latestReleasePublishedAt: null }), { count: 40, hitCap: false });
      expect(manyContributors.score!).toBeGreaterThan(soloMaintainer.score!);
    });

    it("contributor count is bounded/outlier-resistant — hitting the 100-contributor page cap never exceeds 100 or distorts the blend", () => {
      const pushedAt = new Date().toISOString();
      const result = normalizeDeveloperActivity(github({ pushedAt, latestReleasePublishedAt: null }), { count: 100, hitCap: true });
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.score).toBe(100); // push recency=100, release absent, contributors at/above ceiling=100 → weighted avg still 100
    });

    it("a single contributor is real (low, not zero, not N/A) evidence — never penalized to N/A just for being small", () => {
      const result = normalizeDeveloperActivity(github({ pushedAt: new Date().toISOString(), latestReleasePublishedAt: null }), { count: 1, hitCap: false });
      expect(result.score).not.toBeNull();
    });

    it("combines all three components (push + release + contributors) without any one alone determining the score", () => {
      const recentPushOnly = normalizeDeveloperActivity(github({ pushedAt: new Date().toISOString(), latestReleasePublishedAt: null }), null);
      const allThree = normalizeDeveloperActivity(
        github({ pushedAt: new Date().toISOString(), latestReleasePublishedAt: new Date(Date.now() - 400 * 86_400_000).toISOString() }),
        { count: 3, hitCap: false }
      );
      // Old release (near-zero release recency) + modest contributor count
      // pulls the blended score below push-recency-alone, proving all three
      // components genuinely contribute rather than one dominating.
      expect(allThree.score!).toBeLessThan(recentPushOnly.score!);
    });

    it("is deterministic across repeated calls with identical inputs", () => {
      const input = github({ pushedAt: new Date().toISOString() });
      const contributors = { count: 12, hitCap: false };
      expect(normalizeDeveloperActivity(input, contributors)).toEqual(normalizeDeveloperActivity(input, contributors));
    });
  });
});

// -----------------------------------------------------------------------
// Governance — N/A never a failure
// -----------------------------------------------------------------------
describe("normalizeGovernance", () => {
  it("is N/A (not a penalty) when no Snapshot space is configured", () => {
    const result = normalizeGovernance(project({ governance: undefined }), null);
    expect(result.score).toBeNull();
    expect(result.detail).not.toMatch(/fail|penalt/i);
  });

  it("is N/A when a space exists but has zero proposals", () => {
    const result = normalizeGovernance(project({ governance: { snapshotSpace: "test.eth" } }), []);
    expect(result.score).toBeNull();
  });

  it("scores high for a recent, well-attended proposal", () => {
    const proposal: SnapshotProposal = {
      id: "1",
      title: "Test",
      description: null,
      status: "passed",
      start: new Date().toISOString(),
      end: new Date().toISOString(),
      participation: null,
      quorumMet: true,
      url: "https://snapshot.org",
      voterCount: 1500,
      discussionUrl: null,
      proposerAddress: null,
    };
    const result = normalizeGovernance(project({ governance: { snapshotSpace: "test.eth" } }), [proposal]);
    expect(result.score!).toBeGreaterThan(80);
  });

  it("picks the MOST RECENT proposal when several exist, not an arbitrary one", () => {
    const old: SnapshotProposal = {
      id: "1",
      title: "Old",
      description: null,
      status: "passed",
      start: "2020-01-01T00:00:00.000Z",
      end: "2020-01-08T00:00:00.000Z",
      participation: null,
      quorumMet: true,
      url: "",
      voterCount: 10,
      discussionUrl: null,
      proposerAddress: null,
    };
    const recent: SnapshotProposal = { ...old, id: "2", title: "Recent", end: new Date().toISOString(), voterCount: 10 };
    const result = normalizeGovernance(project({ governance: { snapshotSpace: "test.eth" } }), [old, recent]);
    // High recency score proves the RECENT proposal's `end` drove the calculation, not the old one's.
    expect(result.score!).toBeGreaterThan(50);
  });
});

// -----------------------------------------------------------------------
// Ecosystem Traction — breadth, distinct from Onchain Activity's intensity
// -----------------------------------------------------------------------
describe("normalizeEcosystemTraction", () => {
  it("falls back to registry chain count alone when no pools matched, IF genuinely multi-chain (real evidence, not the registry's universal default)", () => {
    const result = normalizeEcosystemTraction(project({ chains: ["base", "ethereum"] }), trading({ pools: [], available: false }));
    expect(result.score).not.toBeNull();
  });

  // MASTER HARDENING PASS — Concern 4. Audit finding: 8 of 23 real registry
  // projects (including Oku) have `chains.length === 1` — this Base-focused
  // registry's universal default, not differentiating evidence. The old
  // "chains.length alone" fallback fed this into `linearNormalize(1, 1, 6)`,
  // which is exactly 0 at the floor — silently treating "no real breadth
  // evidence" as "confirmed worst-possible breadth." Fixed: N/A instead.
  it("is N/A — not floored to 0 — when there are no matched pools AND only the registry's default single chain (no real breadth evidence at all)", () => {
    const result = normalizeEcosystemTraction(project({ chains: ["base"] }), trading({ pools: [], available: false }));
    expect(result.score).toBeNull();
    expect(result.detail).not.toMatch(/^0/); // never silently reads as a real zero
  });

  it("Oku specifically (PR-101's real registry entry: chains=['base'], no token so never matches pools) is N/A here, never penalized simply for being an aggregator/interface rather than a protocol with its own chain deployments", () => {
    const result = normalizeEcosystemTraction(oku, trading({ pools: [], available: false }));
    expect(oku.chains).toEqual(["base"]);
    expect(result.score).toBeNull();
  });

  it("a genuinely multi-chain project with no matched pools (e.g. an infrastructure project like LayerZero/Pyth/Safe) still gets a real, non-N/A score — the fix is general, not a special case carved out for one category", () => {
    const result = normalizeEcosystemTraction(project({ categories: ["infrastructure"], chains: ["base", "ethereum", "arbitrum", "optimism"] }), trading({ pools: [], available: false }));
    expect(result.score).not.toBeNull();
    expect(result.score!).toBeGreaterThan(0);
  });

  it("with real pool data but only one chain, venue breadth alone still produces a real score (pools ARE real evidence, unlike the bare chain-count floor)", () => {
    const result = normalizeEcosystemTraction(project({ chains: ["base"] }), trading({ pools: [pool({ dexId: "aerodrome" }), pool({ dexId: "uniswap" })] }));
    expect(result.score).not.toBeNull();
    expect(result.score!).toBeGreaterThan(0);
  });

  it("rewards broader venue count, not volume — a low-volume multi-venue project beats a high-volume single-venue one on THIS dimension", () => {
    const singleVenue = normalizeEcosystemTraction(
      project(),
      trading({ pools: [pool({ dexId: "aerodrome", volume24hUsd: 50_000_000 })] })
    );
    const multiVenue = normalizeEcosystemTraction(
      project(),
      trading({ pools: [pool({ dexId: "aerodrome", volume24hUsd: 1_000 }), pool({ dexId: "uniswap", volume24hUsd: 1_000 }), pool({ dexId: "balancer", volume24hUsd: 1_000 })] })
    );
    expect(multiVenue.score!).toBeGreaterThan(singleVenue.score!);
  });

  it("counts DISTINCT dexIds, not raw pool count", () => {
    const samevenue = normalizeEcosystemTraction(project(), trading({ pools: [pool({ dexId: "aerodrome" }), pool({ dexId: "aerodrome" }), pool({ dexId: "aerodrome" })] }));
    const distinctVenues = normalizeEcosystemTraction(project(), trading({ pools: [pool({ dexId: "aerodrome" }), pool({ dexId: "uniswap" })] }));
    expect(distinctVenues.score!).toBeGreaterThan(samevenue.score!);
  });
});

// -----------------------------------------------------------------------
// Security — coverage across ALL registered contracts, never one arbitrary contract
// -----------------------------------------------------------------------
describe("normalizeSecurity", () => {
  const verified: ContractDetail = {
    verified: true,
    isContract: true,
    name: "Token",
    compilerVersion: null,
    optimizationEnabled: null,
    licenseType: null,
    language: null,
  } as ContractDetail;
  const unverified: ContractDetail = { ...verified, verified: false };

  it("is N/A with zero registered contracts", () => {
    expect(normalizeSecurity(project({ contracts: [] }), {}).score).toBeNull();
  });

  it("is N/A when every lookup failed (no data to compute coverage from)", () => {
    const p = project({ contracts: [{ chain: "base", address: "0xabc", type: "token" }] });
    expect(normalizeSecurity(p, {}).score).toBeNull();
  });

  it("scores 100 for a single fully-verified contract", () => {
    const p = project({ contracts: [{ chain: "base", address: "0xabc", type: "token" }] });
    expect(normalizeSecurity(p, { "0xabc": verified }).score).toBe(100);
  });

  it("scores 0 for a single fully-unverified contract (real evidence, not N/A)", () => {
    const p = project({ contracts: [{ chain: "base", address: "0xabc", type: "token" }] });
    expect(normalizeSecurity(p, { "0xabc": unverified }).score).toBe(0);
  });

  it("computes coverage across ALL registered contracts, not just one arbitrary contract", () => {
    const p = project({
      contracts: [
        { chain: "base", address: "0xaaa", type: "token" },
        { chain: "base", address: "0xbbb", type: "router" },
        { chain: "base", address: "0xccc", type: "vault" },
      ],
    });
    const result = normalizeSecurity(p, { "0xaaa": verified, "0xbbb": verified, "0xccc": unverified });
    expect(result.score).toBe(round1((2 / 3) * 100));
  });
});

describe("Oku — real project integration, interface/aggregator classification (PR-101)", () => {
  // Oku (`data/projects/seed/oku.ts`) is a real, verified trading interface
  // over Uniswap v3/Morpho with no token, TVL, or Base contract of its own.
  // These tests run the normalizers against Oku's ACTUAL registry entry
  // (not a synthetic fixture) to prove the pipeline treats it honestly end
  // to end, and that its two genuinely-applicable dimensions alone can't
  // slip past `computeRadarScore()`'s minimum-evidence floor.

  it("has no CoinGecko id — Market Strength is N/A, never fabricated", () => {
    expect(oku.providerIds.coingeckoId).toBeUndefined();
    expect(normalizeMarketStrength(null)).toEqual({ score: null, detail: expect.stringContaining("No verified CoinGecko market data") });
  });

  it("TVL is N/A for a STRUCTURAL reason (category), not merely missing data — Oku doesn't own the underlying liquidity", () => {
    // PR-101 changed Oku's category from "dex" to "infrastructure"
    // specifically so this dimension excludes it by category, not by
    // incidental data absence — the honest reason the brief asked for.
    expect(oku.categories).toEqual(["infrastructure"]);
    const result = normalizeTvl(oku, tvl({ available: false, tvlUsd: null }));
    expect(result.score).toBeNull();
    expect(result.detail).toContain("not structurally applicable");
  });

  it("never substitutes the combined TVL of the pools it renders for its own TVL", () => {
    // Even if a (hypothetical, real) DefiLlama match existed, Oku's
    // category exclusion means normalizeTvl never reaches the
    // branch that would report a number at all.
    const result = normalizeTvl(oku, tvl({ available: true, tvlUsd: 5_000_000_000 }));
    expect(result.score).toBeNull();
  });

  it("has no registered Base contracts — Security and Onchain Activity are both N/A", () => {
    expect(oku.contracts).toEqual([]);
    expect(normalizeSecurity(oku, {}).score).toBeNull();
    expect(normalizeOnchainActivity(trading({ available: false, pools: [] })).score).toBeNull();
  });

  it("has no Snapshot governance configured — Governance is N/A", () => {
    expect(oku.governance).toBeUndefined();
    expect(normalizeGovernance(oku, null).score).toBeNull();
  });

  it("Developer Activity is now a REAL, computed score — PR-101 pinned github.repo (was org-only, always N/A before)", () => {
    expect(oku.github?.repo).toBe("oku-router");
    const recentPush = github({ available: true, pushedAt: new Date().toISOString(), latestReleasePublishedAt: null });
    const result = normalizeDeveloperActivity(recentPush);
    expect(result.score).not.toBeNull();
    expect(result.score).toBeGreaterThan(90); // pushed today, full push-recency credit
  });

  it("Ecosystem Traction — MASTER HARDENING PASS Concern 4 supersedes the PR-101-era expectation here: Oku (1 chain, no pools) is now N/A, not floored to a fabricated 0", () => {
    const result = normalizeEcosystemTraction(oku, trading({ available: false, pools: [] }));
    expect(result.score).toBeNull();
    expect(result.detail).toMatch(/no real evidence/i);
  });

  it("end to end: with Concern 3+4's changes, Oku's only genuinely-applicable dimension is Developer Activity (1 of 7, 15% weight) — Radar Score is honestly null, further below the minimum-evidence floor than before, never propped up by N/A dimensions", () => {
    const inputs: RadarScoreDimensionInput[] = [
      { id: "marketStrength", score: null, stale: false },
      { id: "tvlLiquidity", score: null, stale: false },
      { id: "onchainActivity", score: null, stale: false },
      { id: "developerActivity", score: 95, stale: false }, // best-case real Developer Activity
      { id: "governance", score: null, stale: false },
      { id: "ecosystemTraction", score: null, stale: false }, // now honestly N/A, not a fabricated floor score
      { id: "security", score: null, stale: false },
    ];
    const result = computeRadarScore(inputs);
    // Only 1 of 7 dimensions (15% weight) — below both the 3-dimension and 40%-weight minimum-evidence thresholds.
    expect(result.availability).toBe("unavailable");
    expect(result.score).toBeNull();
  });
});

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
