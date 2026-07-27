import { describe, expect, it } from "vitest";

import { dedupeCandidates } from "@/lib/discovery/dedupe";
import { candidate } from "./fixtures";

describe("dedupeCandidates", () => {
  it("keeps unrelated candidates separate", () => {
    const groups = dedupeCandidates([
      candidate({ source: "coingecko", externalId: "a", displayName: "Alpha" }),
      candidate({ source: "defillama", externalId: "b", displayName: "Beta" }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("merges two candidates sharing a coingeckoId into one group", () => {
    const groups = dedupeCandidates([
      candidate({ source: "coingecko", externalId: "aero", displayName: "Aerodrome", coingeckoId: "aerodrome-finance", confidence: 60 }),
      candidate({ source: "ai-discovery", externalId: "aero2", displayName: "Aerodrome (via cross-ref)", coingeckoId: "aerodrome-finance", confidence: 20 }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].sources.sort()).toEqual(["ai-discovery", "coingecko"].sort());
  });

  it("does not merge two candidates that merely share a name with no other signal", () => {
    const groups = dedupeCandidates([
      candidate({ source: "coingecko", externalId: "aero", displayName: "Aerodrome", coingeckoId: "aerodrome-finance", confidence: 60 }),
      candidate({ source: "defillama", externalId: "Aerodrome Finance", displayName: "Aerodrome Finance", confidence: 60 }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("merges candidates sharing a contract address", () => {
    const address = "0x1111111111111111111111111111111111111111";
    const groups = dedupeCandidates([
      candidate({ source: "blockscout", externalId: address, displayName: "Contract A", contracts: [{ chain: "base", address }] }),
      candidate({ source: "coingecko", externalId: "coin-a", displayName: "Coin A", contracts: [{ chain: "base", address }] }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].sources.sort()).toEqual(["blockscout", "coingecko"].sort());
  });

  it("merges candidates sharing a normalized website", () => {
    const groups = dedupeCandidates([
      candidate({ source: "coingecko", externalId: "a", displayName: "Project A", website: "https://project.xyz/" }),
      candidate({ source: "defillama", externalId: "b", displayName: "Project A Protocol", website: "project.xyz" }),
    ]);
    expect(groups).toHaveLength(1);
  });

  it("never merges on a bare name match alone", () => {
    const groups = dedupeCandidates([
      candidate({ source: "coingecko", externalId: "a", displayName: "Shared Name", normalizedName: "shared name" }),
      candidate({ source: "defillama", externalId: "b", displayName: "Shared Name", normalizedName: "shared name" }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("picks the highest-confidence candidate as primary", () => {
    const groups = dedupeCandidates([
      candidate({ source: "blockscout", externalId: "x", displayName: "Low Confidence", confidence: 35, coingeckoId: "shared-id" }),
      candidate({ source: "coingecko", externalId: "y", displayName: "High Confidence", confidence: 60, coingeckoId: "shared-id" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].primary.displayName).toBe("High Confidence");
    expect(groups[0].duplicates).toHaveLength(1);
  });
});
