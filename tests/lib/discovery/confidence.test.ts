import { describe, expect, it } from "vitest";

import { computeDiscoveryConfidence } from "@/lib/discovery/confidence";
import { dedupeCandidates } from "@/lib/discovery/dedupe";
import { matchAgainstRegistry } from "@/lib/discovery/registryMatch";
import { candidate, registryProject } from "./fixtures";

const emptyEvidence = { hasLiveMarketData: false, hasLiveTvlData: false, volume24hUsd: null, tvlUsd: null, changePct24h: null, githubActivity: null };

describe("computeDiscoveryConfidence", () => {
  it("starts from the source trust baseline when no evidence is present", () => {
    const c = candidate({ website: undefined, coingeckoId: undefined, contracts: [], confidence: 60 });
    const [group] = dedupeCandidates([c]);
    const match = matchAgainstRegistry(c, []);
    const result = computeDiscoveryConfidence(group, match, emptyEvidence);
    expect(result.score).toBe(60);
    expect(result.level).toBe("medium");
  });

  it("increases score for each real evidence signal present", () => {
    const c = candidate({ website: "https://example.com", coingeckoId: "example", contracts: [{ chain: "base", address: "0x1111111111111111111111111111111111111111" }], confidence: 60 });
    const [group] = dedupeCandidates([c]);
    const match = matchAgainstRegistry(c, []);
    const result = computeDiscoveryConfidence(group, match, emptyEvidence);
    expect(result.score).toBeGreaterThan(60);
    expect(result.factors.length).toBeGreaterThan(1);
  });

  it("adds a bonus for multiple-provider agreement", () => {
    const shared = { coingeckoId: "shared-id" };
    const [group] = dedupeCandidates([
      candidate({ source: "coingecko", externalId: "a", confidence: 60, ...shared }),
      candidate({ source: "defillama", externalId: "b", confidence: 60, ...shared }),
    ]);
    const match = matchAgainstRegistry(group.primary, []);
    const withAgreement = computeDiscoveryConfidence(group, match, emptyEvidence);

    const [soloGroup] = dedupeCandidates([candidate({ source: "coingecko", externalId: "a", confidence: 60, ...shared })]);
    const soloMatch = matchAgainstRegistry(soloGroup.primary, []);
    const withoutAgreement = computeDiscoveryConfidence(soloGroup, soloMatch, emptyEvidence);

    expect(withAgreement.score).toBeGreaterThan(withoutAgreement.score);
  });

  it("adds a bonus when the candidate matches an existing registry project", () => {
    const project = registryProject({ id: "aave", name: "Aave", providerIds: { coingeckoId: "aave" } });
    const c = candidate({ displayName: "Aave", normalizedName: "aave", coingeckoId: "aave", confidence: 60 });
    const [group] = dedupeCandidates([c]);

    const matched = matchAgainstRegistry(c, [project]);
    const unmatched = matchAgainstRegistry(c, []);

    const matchedScore = computeDiscoveryConfidence(group, matched, emptyEvidence).score;
    const unmatchedScore = computeDiscoveryConfidence(group, unmatched, emptyEvidence).score;
    expect(matchedScore).toBeGreaterThan(unmatchedScore);
  });

  it("never exceeds 100", () => {
    const c = candidate({
      website: "https://example.com",
      coingeckoId: "example",
      defillamaSlug: "example",
      github: { owner: "example", repo: "example", url: "https://github.com/example/example" },
      contracts: [{ chain: "base", address: "0x1111111111111111111111111111111111111111" }],
      confidence: 80,
    });
    const [group] = dedupeCandidates([c]);
    const project = registryProject({ id: "example", name: "Test Project" });
    const match = matchAgainstRegistry(c, [project]);
    const result = computeDiscoveryConfidence(group, match, { ...emptyEvidence, hasLiveMarketData: true, hasLiveTvlData: true });
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("is deterministic", () => {
    const c = candidate({ website: "https://example.com", confidence: 60 });
    const [group] = dedupeCandidates([c]);
    const match = matchAgainstRegistry(c, []);
    const first = computeDiscoveryConfidence(group, match, emptyEvidence);
    const second = computeDiscoveryConfidence(group, match, emptyEvidence);
    expect(first).toEqual(second);
  });
});
