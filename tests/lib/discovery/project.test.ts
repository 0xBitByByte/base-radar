import { describe, expect, it } from "vitest";

import { buildDiscoveryProject } from "@/lib/discovery/project";
import { dedupeCandidates } from "@/lib/discovery/dedupe";
import { extractMarketEvidence } from "@/lib/discovery/enrich";
import { runDiscoveryPipeline } from "@/lib/discovery/project";
import type { DiscoveryProvider } from "@/lib/discovery/provider";
import { candidate, registryProject } from "./fixtures";

describe("extractMarketEvidence", () => {
  it("reads real market/TVL fields already present in providerMetadata", () => {
    const [group] = dedupeCandidates([candidate({ providerMetadata: { volume24hUsd: 1_000_000, changePct24h: 5.2 } })]);
    const evidence = extractMarketEvidence(group);
    expect(evidence.hasLiveMarketData).toBe(true);
    expect(evidence.volume24hUsd).toBe(1_000_000);
    expect(evidence.hasLiveTvlData).toBe(false);
    expect(evidence.tvlUsd).toBeNull();
  });

  it("reports no live data when providerMetadata carries none", () => {
    const [group] = dedupeCandidates([candidate({ providerMetadata: {} })]);
    const evidence = extractMarketEvidence(group);
    expect(evidence.hasLiveMarketData).toBe(false);
    expect(evidence.hasLiveTvlData).toBe(false);
  });
});

describe("buildDiscoveryProject", () => {
  it("assembles a full DiscoveryProject with no matched project (no network call needed)", async () => {
    const [group] = dedupeCandidates([
      candidate({ displayName: "SuperBridge Protocol", normalizedName: "superbridge protocol", providerMetadata: { volume24hUsd: 500 } }),
    ]);
    const result = await buildDiscoveryProject(group, []);

    expect(result.displayName).toBe("SuperBridge Protocol");
    expect(result.category).toBe("bridge");
    expect(result.status).toBe("new");
    expect(result.evidence.registryMatch.type).toBe("new");
    expect(result.confidence.score).toBeGreaterThan(0);
    expect(result.sources).toEqual(["coingecko"]);
  });

  it("assembles a DiscoveryProject matched to an existing, verified registry project", async () => {
    const project = registryProject({ id: "aave", name: "Aave", providerIds: { coingeckoId: "aave" }, verification: { status: "verified" } });
    const [group] = dedupeCandidates([candidate({ displayName: "Aave", normalizedName: "aave", coingeckoId: "aave" })]);
    const result = await buildDiscoveryProject(group, [project]);

    expect(result.status).toBe("verified");
    expect(result.evidence.registryMatch.project?.id).toBe("aave");
  });

  it("is deterministic for identical inputs", async () => {
    const project = registryProject({ id: "aave", name: "Aave", providerIds: { coingeckoId: "aave" } });
    const [group] = dedupeCandidates([candidate({ displayName: "Aave", normalizedName: "aave", coingeckoId: "aave" })]);
    const first = await buildDiscoveryProject(group, [project]);
    const second = await buildDiscoveryProject(group, [project]);
    expect(first.status).toBe(second.status);
    expect(first.category).toBe(second.category);
    expect(first.confidence.score).toBe(second.confidence.score);
  });
});

describe("runDiscoveryPipeline", () => {
  function stubProvider(overrides: Partial<DiscoveryProvider> & Pick<DiscoveryProvider, "source">): DiscoveryProvider {
    return {
      async discover() {
        return { source: overrides.source, candidates: [], fetchedAt: new Date().toISOString() };
      },
      ...overrides,
    };
  }

  it("runs discovery, dedupes, and builds a DiscoveryProject per real candidate", async () => {
    const providers: DiscoveryProvider[] = [
      {
        source: "coingecko",
        async discover() {
          const fetchedAt = new Date().toISOString();
          return {
            source: "coingecko",
            fetchedAt,
            candidates: [candidate({ source: "coingecko", externalId: "swaptown", displayName: "SwapTown", coingeckoId: "swaptown", discoveredAt: fetchedAt })],
          };
        },
      },
      stubProvider({ source: "defillama" }),
    ];

    const { projects, raw } = await runDiscoveryPipeline([], providers);
    expect(raw.candidates).toHaveLength(1);
    expect(projects).toHaveLength(1);
    expect(projects[0].displayName).toBe("SwapTown");
    expect(projects[0].category).toBe("dex");
  });

  it("never returns duplicate DiscoveryProjects for candidates from different sources referring to the same project", async () => {
    const sharedId = "shared-project";
    const providers: DiscoveryProvider[] = [
      {
        source: "coingecko",
        async discover() {
          const fetchedAt = new Date().toISOString();
          return { source: "coingecko", fetchedAt, candidates: [candidate({ source: "coingecko", externalId: sharedId, displayName: "Shared Project", coingeckoId: sharedId, discoveredAt: fetchedAt })] };
        },
      },
      {
        source: "defillama",
        async discover() {
          const fetchedAt = new Date().toISOString();
          return { source: "defillama", fetchedAt, candidates: [candidate({ source: "defillama", externalId: "Shared Project", displayName: "Shared Project", coingeckoId: sharedId, discoveredAt: fetchedAt })] };
        },
      },
    ];

    const { projects } = await runDiscoveryPipeline([], providers);
    expect(projects).toHaveLength(1);
    expect(projects[0].sources.sort()).toEqual(["coingecko", "defillama"].sort());
  });
});
