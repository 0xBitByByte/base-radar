import { describe, expect, it } from "vitest";

import { mapChainProtocols, mapProtocol } from "@/lib/providers/defillama/mapper";
import type { RawLlamaProtocol } from "@/lib/providers/defillama/client";

/**
 * PR-102 — Base-specific TVL regression tests, at the source: this is
 * where `chainTvls.Base` (real, already present on DefiLlama's bulk
 * `/protocols` response — confirmed live) gets read into `Protocol`.
 * Every downstream consumer (`mergeTvl`, `normalizeTvl`, Featured
 * Intelligence, Project Profile) inherits correctness from this one place.
 */

function rawProtocol(overrides: Partial<RawLlamaProtocol> = {}): RawLlamaProtocol {
  return {
    name: "Test Protocol",
    symbol: "TEST",
    chains: ["Base"],
    tvl: 1_000_000,
    mcap: null,
    change_1d: null,
    category: "Dexs",
    ...overrides,
  };
}

describe("mapProtocol — Base-specific TVL contract (PR-102)", () => {
  it("selects the real Base-specific TVL when chainTvls.Base is present", () => {
    // Live-verified real shape: a genuinely multi-chain protocol whose
    // Base footprint is a small fraction of its global total.
    const raw = rawProtocol({ tvl: 16_924_593_239, chainTvls: { Base: 505_941_780, Ethereum: 10_000_000_000, "Polygon-borrowed": 53_830_545 } });
    const protocol = mapProtocol(raw);
    expect(protocol.baseTvlUsd).toBe(505_941_780);
    expect(protocol.globalTvlUsd).toBe(16_924_593_239);
  });

  it("never silently substitutes global TVL when chainTvls has no Base entry", () => {
    const raw = rawProtocol({ tvl: 1_000_000_000, chainTvls: { Ethereum: 1_000_000_000 } }); // Base-less breakdown
    const protocol = mapProtocol(raw);
    expect(protocol.baseTvlUsd).toBeNull(); // never falls back to globalTvlUsd (1_000_000_000)
    expect(protocol.globalTvlUsd).toBe(1_000_000_000); // global stays available as real secondary context
  });

  it("is null (not 0, not a fallback) when the protocol has no chainTvls breakdown at all", () => {
    const raw = rawProtocol({ tvl: 42_000, chainTvls: undefined });
    const protocol = mapProtocol(raw);
    expect(protocol.baseTvlUsd).toBeNull();
    expect(protocol.globalTvlUsd).toBe(42_000);
  });

  it("a real single-chain-Base protocol has identical global and Base-specific TVL — the honest, expected real-world case", () => {
    const raw = rawProtocol({ tvl: 123_166_670, chains: ["Base"], chainTvls: { Base: 123_166_670 } });
    const protocol = mapProtocol(raw);
    expect(protocol.baseTvlUsd).toBe(protocol.globalTvlUsd);
    expect(protocol.baseTvlUsd).toBe(123_166_670);
  });

  it("chainTvls key matching is case-sensitive and exact — never matches a 'Base-borrowed' breakdown as if it were plain Base TVL", () => {
    const raw = rawProtocol({ tvl: 500_000, chainTvls: { "Base-borrowed": 200_000, base: 100_000 } }); // neither is the real "Base" key
    const protocol = mapProtocol(raw);
    expect(protocol.baseTvlUsd).toBeNull();
  });

  it("a non-finite or non-numeric chainTvls.Base value never surfaces as a fabricated TVL", () => {
    const raw = rawProtocol({ tvl: 500_000, chainTvls: { Base: Number.NaN } });
    const protocol = mapProtocol(raw);
    expect(protocol.baseTvlUsd).toBeNull();
  });
});

describe("mapChainProtocols — filter/sort still use the real global figure (PR-102)", () => {
  it("filters to protocols with real presence on the given chain, using the global tvl>0 gate unchanged", () => {
    const raw: RawLlamaProtocol[] = [
      rawProtocol({ name: "OnBase", chains: ["Base"], tvl: 1_000_000, chainTvls: { Base: 1_000_000 } }),
      rawProtocol({ name: "NotOnBase", chains: ["Ethereum"], tvl: 5_000_000, chainTvls: { Ethereum: 5_000_000 } }),
    ];
    const result = mapChainProtocols(raw, "Base");
    expect(result.map((p) => p.name)).toEqual(["OnBase"]);
  });

  it("sorts by global TVL descending (deciding prominence), even though each entry's own baseTvlUsd may tell a very different story", () => {
    const raw: RawLlamaProtocol[] = [
      rawProtocol({ name: "BigGlobalSmallBase", chains: ["Base", "Ethereum"], tvl: 10_000_000_000, chainTvls: { Base: 1_000_000 } }),
      rawProtocol({ name: "SmallGlobalAllBase", chains: ["Base"], tvl: 5_000_000, chainTvls: { Base: 5_000_000 } }),
    ];
    const result = mapChainProtocols(raw, "Base");
    expect(result.map((p) => p.name)).toEqual(["BigGlobalSmallBase", "SmallGlobalAllBase"]); // sorted by global, not Base-specific
    // But each entry's OWN baseTvlUsd is still real and honestly different from its rank-driving global figure.
    expect(result[0].baseTvlUsd).toBe(1_000_000);
    expect(result[1].baseTvlUsd).toBe(5_000_000);
  });
});
