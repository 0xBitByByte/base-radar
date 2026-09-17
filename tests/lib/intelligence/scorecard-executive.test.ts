import { describe, expect, it } from "vitest";

import { buildHealthScorecard } from "@/lib/intelligence/scorecard";
import type { ScorecardInput } from "@/lib/intelligence/scorecard";
import type { GithubIntel, Market } from "@/lib/intelligence/types";

/**
 * PR-084.06 (final completion) — regression coverage for the three new
 * Scorecard tiles (Activity, Transparency, Documentation). Every case below
 * asserts the tile is a pure function of already-real input data, never an
 * invented number.
 */

function emptyResolution<T>(): { value: T | null; provider: null; attemptedProviders: never[]; fallbackUsed: false; lastUpdated: null; confidence: null; failureReason: null } {
  return { value: null, provider: null, attemptedProviders: [], fallbackUsed: false, lastUpdated: null, confidence: null, failureReason: null };
}

function baseInput(overrides: Partial<ScorecardInput> = {}): ScorecardInput {
  return {
    health: { score: 70, label: "good", factors: [] },
    confidence: { score: 70, level: "medium", factors: [] },
    risk: { level: "moderate", explanation: "", contributors: [] },
    market: {
      available: false,
      imageUrl: null,
      symbol: null,
      priceUsd: null,
      marketCapUsd: null,
      marketCapRank: null,
      fullyDilutedValuationUsd: null,
      changePct24h: null,
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
      genesisDate: null,
      priceResolution: emptyResolution<number>(),
      stale: false,
    },
    tvl: {
      available: false,
      tvlUsd: null,
      globalTvlUsd: null,
      changePct24h: null,
      changePct7d: null,
      changePct30d: null,
      defillamaCategory: null,
      tvlResolution: emptyResolution<number>(),
      imageUrl: null,
    },
    trading: {
      available: false,
      volume24hUsd: null,
      liquidityUsd: null,
      buys24h: null,
      sells24h: null,
      priceChangePct24h: null,
      pairCount: 0,
      pools: [],
      largestPool: null,
      volumeResolution: emptyResolution<number>(),
      liquidityResolution: emptyResolution<number>(),
    },
    github: {
      available: false,
      fullName: null,
      stars: null,
      forks: null,
      openIssues: null,
      latestReleaseTag: null,
      latestReleasePublishedAt: null,
      latestReleaseNoteSummary: null,
      language: null,
      license: null,
      createdAt: null,
      pushedAt: null,
      commitsLast7d: null,
      commitsPrev7d: null,
      commitTrendPct: null,
      developerCadence: null,
      avatarUrl: null,
      stale: false,
      dataFetchedAt: null,
    },
    governance: null,
    governanceType: null,
    whaleEvents: [],
    narrativeLabel: null,
    communityLinkCount: 0,
    communityLinkTotal: 0,
    contracts: { count: 0, items: [] },
    verificationStatus: "unverified",
    docsUrl: null,
    ...overrides,
  };
}

function findTile(input: ScorecardInput, id: string) {
  return buildHealthScorecard(input).find((tile) => tile.id === id)!;
}

describe("buildHealthScorecard — Activity tile", () => {
  it("reports 'not enough verified data' when neither Engineering Health nor Market Momentum has a real signal", () => {
    const tile = findTile(baseInput(), "activity");
    expect(tile.score).toBeNull();
    expect(tile.severity).toBe("unknown");
  });

  it("blends the two already-computed tiles when both have real signals — never a third independent model", () => {
    const recentPush = new Date(Date.now() - 5 * 86_400_000).toISOString();
    const github: GithubIntel = {
      available: true,
      fullName: "org/repo",
      stars: 2000,
      forks: 50,
      openIssues: 5,
      latestReleaseTag: "v1.0.0",
      latestReleasePublishedAt: recentPush,
      latestReleaseNoteSummary: null,
      language: "Solidity",
      license: "MIT",
      createdAt: null,
      pushedAt: recentPush,
      commitsLast7d: null,
      commitsPrev7d: null,
      commitTrendPct: null,
      developerCadence: null,
      avatarUrl: null,
      stale: false,
      dataFetchedAt: recentPush,
    };
    const market: Market = {
      available: true,
      imageUrl: null,
      symbol: "TEST",
      priceUsd: 1,
      marketCapUsd: null,
      marketCapRank: null,
      fullyDilutedValuationUsd: null,
      changePct24h: 10,
      changePct7d: 10,
      changePct30d: null,
      circulatingSupply: null,
      totalSupply: null,
      maxSupply: null,
      athUsd: null,
      athDate: null,
      atlUsd: null,
      atlDate: null,
      sparkline7d: [],
      genesisDate: null,
      priceResolution: emptyResolution<number>(),
      stale: false,
    };
    const input = baseInput({ github, market });
    const developerTile = findTile(input, "developer");
    const momentumTile = findTile(input, "momentum");
    const activityTile = findTile(input, "activity");

    expect(developerTile.score).not.toBeNull();
    expect(momentumTile.score).not.toBeNull();
    // The exact average of the two already-computed sibling tiles — proves this is a pure blend, not a recomputation.
    const expected = Math.round(((developerTile.score as number) + (momentumTile.score as number)) / 2);
    expect(activityTile.score).toBe(expected);
  });
});

describe("buildHealthScorecard — Transparency tile", () => {
  it("reports 'not enough verified data' when no contracts are registered", () => {
    const tile = findTile(baseInput(), "transparency");
    expect(tile.score).toBeNull();
    expect(tile.severity).toBe("unknown");
  });

  it("scores the exact verified/total contract ratio — the same fallback ratio ProfileTrustCenter's buildContractsTile already computes", () => {
    const input = baseInput({
      contracts: {
        count: 4,
        items: [
          { chain: "base", address: "0x1", type: "token", label: null, verified: true },
          { chain: "base", address: "0x2", type: "token", label: null, verified: true },
          { chain: "base", address: "0x3", type: "token", label: null, verified: false },
          { chain: "base", address: "0x4", type: "token", label: null, verified: null },
        ],
      },
    });
    const tile = findTile(input, "transparency");
    expect(tile.score).toBe(50); // 2 of 4 verified
    expect(tile.detail).toContain("2 of 4");
  });

  it("scores 100 when every registered contract is verified", () => {
    const input = baseInput({
      contracts: { count: 1, items: [{ chain: "base", address: "0x1", type: "token", label: null, verified: true }] },
    });
    expect(findTile(input, "transparency").score).toBe(100);
  });
});

describe("buildHealthScorecard — Documentation tile", () => {
  it("reports 'not enough verified data' when no docs link is configured", () => {
    const tile = findTile(baseInput(), "documentation");
    expect(tile.score).toBeNull();
    expect(tile.severity).toBe("unknown");
  });

  it("scores 100 when a real docs link is configured — the same field ProfileTrustCenter's Documentation trust tile already checks", () => {
    const tile = findTile(baseInput({ docsUrl: "https://docs.example.com" }), "documentation");
    expect(tile.score).toBe(100);
    expect(tile.severity).toBe("excellent");
  });
});

describe("buildHealthScorecard — full tile set", () => {
  it("returns all 11 tiles, including the three new ones", () => {
    const ids = buildHealthScorecard(baseInput()).map((tile) => tile.id);
    expect(ids).toEqual([
      "security",
      "liquidity",
      "momentum",
      "developer",
      "governance",
      "community",
      "whale",
      "aiRating",
      "activity",
      "transparency",
      "documentation",
    ]);
  });
});
