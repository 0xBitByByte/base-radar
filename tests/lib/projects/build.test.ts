import { describe, expect, it } from "vitest";

import { buildLiveProjectFromDiscovery, buildLiveProjectFromIntelligence } from "@/lib/projects/build";
import { discoveryProject, intelligence, registryProject } from "./fixtures";

describe("buildLiveProjectFromIntelligence", () => {
  it("maps core identity, category, and status fields from the registry + intelligence record", () => {
    const project = registryProject({ id: "aave", slug: "aave", name: "Aave", categories: ["lending"], status: "live" });
    const result = buildLiveProjectFromIntelligence(project, intelligence({ identity: { ...intelligence().identity, id: "aave", slug: "aave", name: "Aave", categories: ["lending"], status: "live" } }), null);

    expect(result.id).toBe("aave");
    expect(result.slug).toBe("aave");
    expect(result.source).toBe("registry");
    expect(result.category).toBe("lending");
    expect(result.status).toBe("live");
  });

  it("leaves discoveryStatus/discoveryMetadata/discoveryEvidence null when no discovery match was made this run", () => {
    const project = registryProject();
    const result = buildLiveProjectFromIntelligence(project, intelligence(), null);
    expect(result.discoveryStatus).toBeNull();
    expect(result.discoveryMetadata).toBeNull();
    expect(result.discoveryEvidence).toBeNull();
  });

  it("folds a matched discovery project's status/evidence/metadata into the registry LiveProject", () => {
    const project = registryProject({ id: "aave", name: "Aave" });
    const matched = discoveryProject({
      displayName: "Aave",
      status: "verified",
      sources: ["coingecko", "defillama"],
      evidence: {
        ...discoveryProject().evidence,
        registryMatch: { type: "duplicate", project, matches: [], strongestMatch: null, reason: "Matched on coingeckoId." },
      },
    });

    const result = buildLiveProjectFromIntelligence(project, intelligence(), matched);
    expect(result.discoveryStatus).toBe("verified");
    expect(result.discoveryMetadata).toEqual({ sources: ["coingecko", "defillama"], discoveredAt: matched.discoveredAt, registryMatchType: "duplicate" });
    expect(result.discoveryEvidence).toBe(matched.evidence);
  });

  it("records the matched discovery project's differing display name as an alias", () => {
    const project = registryProject({ id: "aave", name: "Aave" });
    const matched = discoveryProject({ displayName: "Aave V4", evidence: { ...discoveryProject().evidence, registryMatch: { type: "renamed", project, matches: [], strongestMatch: null, reason: "renamed" } } });
    const result = buildLiveProjectFromIntelligence(project, intelligence(), matched);
    expect(result.searchIdentifiers.aliases).toEqual(["Aave V4"]);
  });

  it("computes contract verifiedCount from intelligence contract items", () => {
    const project = registryProject();
    const withContracts = intelligence({
      contracts: {
        count: 2,
        items: [
          { chain: "base", address: "0x1", type: "token", label: null, verified: true },
          { chain: "base", address: "0x2", type: "router", label: null, verified: false },
        ],
      },
    });
    const result = buildLiveProjectFromIntelligence(project, withContracts, null);
    expect(result.contracts).toEqual({ count: 2, verifiedCount: 1 });
  });
});

describe("buildLiveProjectFromDiscovery", () => {
  it("builds a standalone discovery-only LiveProject with no registry fields fabricated", () => {
    const candidate = discoveryProject({ id: "coingecko:new-coin", displayName: "New Coin", status: "new" });
    const result = buildLiveProjectFromDiscovery(candidate);

    expect(result.id).toBe("coingecko:new-coin");
    expect(result.slug).toBeNull();
    expect(result.source).toBe("discovery");
    expect(result.status).toBeNull();
    expect(result.discoveryStatus).toBe("new");
    expect(result.verification).toEqual({ status: null, level: null, verifiedAt: null });
    expect(result.providerAttribution).toBeNull();
  });

  it("derives chains from the candidate's own contracts", () => {
    const candidate = discoveryProject({ contracts: [{ chain: "base", address: "0x1" }, { chain: "ethereum", address: "0x2" }] });
    const result = buildLiveProjectFromDiscovery(candidate);
    expect(result.chains).toEqual(["base", "ethereum"]);
  });

  it("reads market evidence from the enrichment evidence, never fabricating a price", () => {
    const candidate = discoveryProject({
      evidence: {
        ...discoveryProject().evidence,
        enrichment: { hasLiveMarketData: true, hasLiveTvlData: false, volume24hUsd: 5000, tvlUsd: null, changePct24h: 12.5, githubActivity: null },
      },
    });
    const result = buildLiveProjectFromDiscovery(candidate);
    expect(result.market).toEqual({ available: true, priceUsd: null, changePct24h: 12.5, marketCapUsd: null, fdvUsd: null, volume24hUsd: 5000, liquidityUsd: null, tvlUsd: null });
  });

  it("records an alias when this run's registry match found a differently-named project", () => {
    const matchedProject = registryProject({ name: "Aave" });
    const candidate = discoveryProject({
      displayName: "Aave Labs",
      evidence: { ...discoveryProject().evidence, registryMatch: { type: "alias", project: matchedProject, matches: [], strongestMatch: null, reason: "alias" } },
    });
    const result = buildLiveProjectFromDiscovery(candidate);
    expect(result.searchIdentifiers.aliases).toEqual(["Aave"]);
  });
});
