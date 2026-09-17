import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MarketTvlTradingBulkData } from "@/lib/intelligence/sources";
import type { CoinMarket } from "@/lib/providers/coingecko/service";
import type { Protocol } from "@/lib/providers/defillama/service";
import { __resetProviderCacheForTests } from "@/lib/providers/common/cache";

/**
 * PR-098.05 — Landing Page Intelligence Delivery Architecture. Tests the
 * pure orchestration (`buildFeaturedIntelligenceSnapshot`) with a
 * controlled, mocked `fetchMarketTvlTradingBulkData()` — everything downstream
 * (`gatherProjectSources`, `mergeMarket`, `mergeTvl`) is the real,
 * already-tested pipeline, unmocked, so this exercises genuine
 * integration behavior rather than a hand-rolled duplicate of it.
 */

function coinMarket(overrides: Partial<CoinMarket> = {}): CoinMarket {
  return {
    id: "aerodrome-finance",
    symbol: "AERO",
    name: "Aerodrome Finance",
    imageUrl: "https://example.com/aero.png",
    priceUsd: 1.1,
    marketCapUsd: 100_000_000,
    marketCapRank: 50,
    fullyDilutedValuationUsd: null,
    volume24hUsd: 5_000_000,
    changePct24h: 4.2,
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

function protocol(overrides: Partial<Protocol> = {}): Protocol {
  return {
    name: "Aerodrome",
    symbol: "AERO",
    chains: ["Base"],
    // PR-102 — a real single-chain-Base project's global and Base-specific
    // TVL are identical (verified live: Aerodrome V1's `chainTvls.Base`
    // exactly equals its global `tvl`) — kept equal here so this fixture
    // stays realistic and every existing assertion on the resulting
    // `tvlUsd` (now Base-specific) continues to reflect real behavior.
    globalTvlUsd: 1_450_000_000,
    baseTvlUsd: 1_450_000_000,
    marketCapUsd: null,
    changePct24h: null,
    category: "Dexs",
    logoUrl: null,
    parentProtocol: null,
    ...overrides,
  };
}

function bulk(overrides: Partial<MarketTvlTradingBulkData> = {}): MarketTvlTradingBulkData {
  const unavailable = (): { ok: false; source: "coingecko"; error: { code: "network_error"; message: string } } => ({
    ok: false,
    source: "coingecko",
    error: { code: "network_error", message: "unavailable" },
  });
  return {
    markets: { ok: true, data: [coinMarket()], source: "coingecko", fetchedAt: "2026-01-01T00:00:00.000Z" },
    pairs: unavailable(),
    tokenPairs: unavailable(),
    protocols: { ok: true, data: [protocol()], source: "defillama", fetchedAt: "2026-01-01T00:00:00.000Z" },
    ...overrides,
  } as unknown as MarketTvlTradingBulkData;
}

// PR-099 — the live Radar Score pipeline also calls `matchGithub` (per
// project) plus real Snapshot/Blockscout service functions directly; none
// of those are the focus of THIS file's tests (which predate PR-099 and
// only assert on tvlUsd/tokenChangePct24h), so they're stubbed to a
// graceful "not configured" outcome — real network calls would otherwise
// be attempted here. `tests/lib/intelligence/dimensionNormalization.test.ts`
// and `featuredIntelligenceProviderLoad.test.ts` cover the real,
// fully-mocked live pipeline in depth.
vi.mock("@/lib/providers/snapshot/service", () => ({
  getProposals: vi.fn().mockResolvedValue({ ok: false, source: "snapshot", error: { code: "network_error", message: "not mocked in this test file" } }),
  getProposalsForSpaces: vi.fn().mockResolvedValue({ ok: false, source: "snapshot", error: { code: "network_error", message: "not mocked in this test file" } }),
}));
vi.mock("@/lib/providers/blockscout/service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/providers/blockscout/service")>();
  return { ...actual, getContractDetail: vi.fn().mockResolvedValue({ ok: false, source: "blockscout", error: { code: "network_error", message: "not mocked in this test file" } }) };
});
// MASTER HARDENING PASS — Concern 3: `fetchContributorCount` (`lib/data/
// featuredIntelligenceSnapshot.ts`) calls this real service directly — stub
// it the same "not mocked in this test file" way as every other real
// provider call above, so this file never attempts a real network call.
vi.mock("@/lib/providers/github/service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/providers/github/service")>();
  return { ...actual, getContributorCount: vi.fn().mockResolvedValue({ ok: false, source: "github", error: { code: "network_error", message: "not mocked in this test file" } }) };
});

vi.mock("@/lib/intelligence/sources", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/intelligence/sources")>();
  return {
    ...actual,
    fetchMarketTvlTradingBulkData: vi.fn(),
    matchGithub: vi.fn().mockResolvedValue({ data: null, status: "not_configured", fetchedAt: null, matchQuality: "none", detail: "not mocked in this test file" }),
  };
});

describe("buildFeaturedIntelligenceSnapshot (PR-098.05)", () => {
  // MASTER HARDENING PASS — Concern 2: `buildFeaturedIntelligenceSnapshot`
  // is now itself wrapped in `getOrSet` (see its own doc comment in
  // `lib/data/featuredIntelligenceSnapshot.ts`), so two `it` blocks calling
  // it with the SAME project id set (several tests below all use
  // `["aerodrome-finance"]`) would otherwise silently share one cached
  // result across tests instead of each getting its own mock's data.
  beforeEach(() => {
    __resetProviderCacheForTests();
  });

  it("resolves real TVL and Token 24H Change for a project with a verified registry mapping", async () => {
    const { fetchMarketTvlTradingBulkData } = await import("@/lib/intelligence/sources");
    vi.mocked(fetchMarketTvlTradingBulkData).mockResolvedValue(bulk());
    const { buildFeaturedIntelligenceSnapshot } = await import("@/lib/data/featuredIntelligenceSnapshot");

    const snapshot = await buildFeaturedIntelligenceSnapshot(["aerodrome-finance"]);
    const entry = snapshot.entries[0];

    expect(entry.available).toBe(true);
    expect(entry.tvlUsd).toBe(1_450_000_000);
    expect(entry.tokenChangePct24h).toBe(4.2);
    expect(entry.stale).toBe(false);
    expect(snapshot.generatedAt).toBeTruthy();
  });

  it("degrades a project with no registry entry to unavailable, never fabricating a value", async () => {
    const { fetchMarketTvlTradingBulkData } = await import("@/lib/intelligence/sources");
    vi.mocked(fetchMarketTvlTradingBulkData).mockResolvedValue(bulk());
    const { buildFeaturedIntelligenceSnapshot } = await import("@/lib/data/featuredIntelligenceSnapshot");

    // Any id with no registry seed file at all degrades honestly — using a
    // generic placeholder here (not "superchain-eco"/"based-agents", which
    // PR-100 removed from Featured Ecosystem entirely rather than leaving
    // as an always-unavailable member).
    const snapshot = await buildFeaturedIntelligenceSnapshot(["not-a-real-registry-id"]);
    expect(snapshot.entries[0]).toEqual({
      id: "not-a-real-registry-id",
      available: false,
      tvlUsd: null,
      tokenChangePct24h: null,
      stale: false,
      tvlFreshness: null,
      tokenChangeFreshness: null,
      radarScore: null,
    });
  });

  it("resolves one project's real match alongside another's honest 'no match found' unavailable, in the same batch", async () => {
    const { fetchMarketTvlTradingBulkData } = await import("@/lib/intelligence/sources");
    vi.mocked(fetchMarketTvlTradingBulkData).mockResolvedValue(bulk());
    const { buildFeaturedIntelligenceSnapshot } = await import("@/lib/data/featuredIntelligenceSnapshot");

    // "aave" is a real registry id whose CoinGecko match won't be found in
    // this test's single-entry `bulk()` markets list — `matchMarket`
    // returns "unavailable" honestly (not a throw), proving one project's
    // missing match doesn't affect another's real one in the same batch.
    const snapshot = await buildFeaturedIntelligenceSnapshot(["aerodrome-finance", "aave"]);
    expect(snapshot.entries).toHaveLength(2);
    expect(snapshot.entries[0].available).toBe(true);
    expect(snapshot.entries[1].available).toBe(false);
  });

  it("shares exactly one fetchMarketTvlTradingBulkData() call across every project in the batch (never N provider-fetch fanouts)", async () => {
    const { fetchMarketTvlTradingBulkData } = await import("@/lib/intelligence/sources");
    const mockFn = vi.mocked(fetchMarketTvlTradingBulkData);
    mockFn.mockClear();
    mockFn.mockResolvedValue(bulk());
    const { buildFeaturedIntelligenceSnapshot } = await import("@/lib/data/featuredIntelligenceSnapshot");

    await buildFeaturedIntelligenceSnapshot(["aerodrome-finance", "aave", "uniswap", "moonwell"]);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("PR-098.07 — attaches real fresh/stale freshness metadata per signal, derived from each provider's own fetchedAt", async () => {
    const { fetchMarketTvlTradingBulkData } = await import("@/lib/intelligence/sources");
    const justNow = new Date().toISOString();
    const overAnHourAgo = new Date(Date.now() - 65 * 60_000).toISOString();
    vi.mocked(fetchMarketTvlTradingBulkData).mockResolvedValue(
      bulk({
        markets: { ok: true, data: [coinMarket()], source: "coingecko", fetchedAt: justNow },
        protocols: { ok: true, data: [protocol()], source: "defillama", fetchedAt: overAnHourAgo },
      })
    );
    const { buildFeaturedIntelligenceSnapshot } = await import("@/lib/data/featuredIntelligenceSnapshot");

    const snapshot = await buildFeaturedIntelligenceSnapshot(["aerodrome-finance"]);
    const entry = snapshot.entries[0];

    // Token price (2min TTL / 6min stale window): fetched just now => fresh.
    expect(entry.tokenChangeFreshness?.state).toBe("fresh");
    // TVL (12min TTL / 36min stale window): fetched 65min ago => hard-expired, unavailable.
    expect(entry.tvlFreshness?.state).toBe("unavailable");
  });
});
