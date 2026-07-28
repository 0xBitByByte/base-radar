import { describe, expect, it } from "vitest";

import { filterLiveProjects } from "@/lib/projects/filter";
import { liveProject } from "./fixtures";

describe("filterLiveProjects", () => {
  it("returns everything when no options are given", () => {
    const projects = [liveProject({ id: "a" }), liveProject({ id: "b" })];
    expect(filterLiveProjects(projects, {})).toHaveLength(2);
  });

  it("filters by category", () => {
    const dex = liveProject({ id: "a", category: "dex" });
    const lending = liveProject({ id: "b", category: "lending" });
    expect(filterLiveProjects([dex, lending], { category: "dex" })).toEqual([dex]);
  });

  it("filters by discoveryStatus", () => {
    const verified = liveProject({ id: "a", discoveryStatus: "verified" });
    const needsReview = liveProject({ id: "b", discoveryStatus: "needs-review" });
    expect(filterLiveProjects([verified, needsReview], { discoveryStatus: "needs-review" })).toEqual([needsReview]);
  });

  it("filters by hasMarket", () => {
    const available = liveProject({ id: "a", market: { ...liveProject().market, available: true } });
    const unavailable = liveProject({ id: "b", market: { ...liveProject().market, available: false } });
    expect(filterLiveProjects([available, unavailable], { hasMarket: true })).toEqual([available]);
    expect(filterLiveProjects([available, unavailable], { hasMarket: false })).toEqual([unavailable]);
  });

  it("filters by hasTvl based on a non-null tvlUsd", () => {
    const withTvl = liveProject({ id: "a", market: { ...liveProject().market, tvlUsd: 500 } });
    const withoutTvl = liveProject({ id: "b", market: { ...liveProject().market, tvlUsd: null } });
    expect(filterLiveProjects([withTvl, withoutTvl], { hasTvl: true })).toEqual([withTvl]);
  });

  it("filters by hasGithub", () => {
    const withGithub = liveProject({ id: "a", engineering: { ...liveProject().engineering, available: true } });
    const withoutGithub = liveProject({ id: "b", engineering: { ...liveProject().engineering, available: false } });
    expect(filterLiveProjects([withGithub, withoutGithub], { hasGithub: true })).toEqual([withGithub]);
  });

  it("filters by hasGovernance", () => {
    const configured = liveProject({ id: "a", governance: { configured: true, activeProposalCount: 1, totalProposalCount: 3 } });
    const unconfigured = liveProject({ id: "b" });
    expect(filterLiveProjects([configured, unconfigured], { hasGovernance: true })).toEqual([configured]);
  });

  it("filters by hasContracts based on contracts.count", () => {
    const withContracts = liveProject({ id: "a", contracts: { count: 2, verifiedCount: 1 } });
    const withoutContracts = liveProject({ id: "b", contracts: { count: 0, verifiedCount: 0 } });
    expect(filterLiveProjects([withContracts, withoutContracts], { hasContracts: true })).toEqual([withContracts]);
  });

  it("filters by minConfidence", () => {
    const high = liveProject({ id: "a", confidence: { score: 80, level: "high", source: "intelligence" } });
    const low = liveProject({ id: "b", confidence: { score: 20, level: "low", source: "intelligence" } });
    expect(filterLiveProjects([high, low], { minConfidence: 50 })).toEqual([high]);
  });

  it("ANDs multiple options together", () => {
    const match = liveProject({ id: "a", category: "dex", confidence: { score: 80, level: "high", source: "intelligence" } });
    const wrongCategory = liveProject({ id: "b", category: "lending", confidence: { score: 80, level: "high", source: "intelligence" } });
    const wrongConfidence = liveProject({ id: "c", category: "dex", confidence: { score: 10, level: "low", source: "intelligence" } });
    const result = filterLiveProjects([match, wrongCategory, wrongConfidence], { category: "dex", minConfidence: 50 });
    expect(result).toEqual([match]);
  });

  it("does not mutate the input array", () => {
    const projects = [liveProject({ id: "a" }), liveProject({ id: "b" })];
    filterLiveProjects(projects, { category: "dex" });
    expect(projects).toHaveLength(2);
  });

  describe("multi-select (PR-056)", () => {
    it("matches a bare single value exactly as before (backward compatibility)", () => {
      const dex = liveProject({ id: "a", category: "dex" });
      const lending = liveProject({ id: "b", category: "lending" });
      expect(filterLiveProjects([dex, lending], { category: "dex" })).toEqual([dex]);
    });

    it("matches an array as OR within the same facet", () => {
      const dex = liveProject({ id: "a", category: "dex" });
      const lending = liveProject({ id: "b", category: "lending" });
      const nft = liveProject({ id: "c", category: "nft" });
      const result = filterLiveProjects([dex, lending, nft], { category: ["dex", "lending"] });
      expect(result).toEqual(expect.arrayContaining([dex, lending]));
      expect(result).not.toContain(nft);
    });

    it("treats an empty array as no constraint, matching everything", () => {
      const projects = [liveProject({ id: "a", category: "dex" }), liveProject({ id: "b", category: "nft" })];
      expect(filterLiveProjects(projects, { category: [] })).toHaveLength(2);
    });

    it("ANDs across facets while ORing within each — category (dex OR lending) AND verified", () => {
      const dexVerified = liveProject({ id: "a", category: "dex", verification: { status: "verified", level: null, verifiedAt: null } });
      const lendingVerified = liveProject({ id: "b", category: "lending", verification: { status: "verified", level: null, verifiedAt: null } });
      const dexUnverified = liveProject({ id: "c", category: "dex", verification: { status: "unverified", level: null, verifiedAt: null } });
      const nftVerified = liveProject({ id: "d", category: "nft", verification: { status: "verified", level: null, verifiedAt: null } });

      const result = filterLiveProjects([dexVerified, lendingVerified, dexUnverified, nftVerified], {
        category: ["dex", "lending"],
        verified: true,
      });

      expect(result).toEqual(expect.arrayContaining([dexVerified, lendingVerified]));
      expect(result).not.toContain(dexUnverified);
      expect(result).not.toContain(nftVerified);
      expect(result).toHaveLength(2);
    });

    it("supports multi-select on discoveryStatus", () => {
      const verified = liveProject({ id: "a", discoveryStatus: "verified" });
      const tracked = liveProject({ id: "b", discoveryStatus: "tracked" });
      const needsReview = liveProject({ id: "c", discoveryStatus: "needs-review" });
      const result = filterLiveProjects([verified, tracked, needsReview], { discoveryStatus: ["verified", "tracked"] });
      expect(result).toEqual(expect.arrayContaining([verified, tracked]));
      expect(result).not.toContain(needsReview);
    });

    it("supports multi-select on status", () => {
      const live = liveProject({ id: "a", status: "live" });
      const beta = liveProject({ id: "b", status: "beta" });
      const deprecated = liveProject({ id: "c", status: "deprecated" });
      const result = filterLiveProjects([live, beta, deprecated], { status: ["live", "beta"] });
      expect(result).toEqual(expect.arrayContaining([live, beta]));
      expect(result).not.toContain(deprecated);
    });

    it("supports multi-select on verificationStatus, matching a null status against nothing", () => {
      const verified = liveProject({ id: "a", verification: { status: "verified", level: null, verifiedAt: null } });
      const community = liveProject({ id: "b", verification: { status: "community", level: null, verifiedAt: null } });
      const unset = liveProject({ id: "c", verification: { status: null, level: null, verifiedAt: null } });
      const result = filterLiveProjects([verified, community, unset], { verificationStatus: ["verified", "community"] });
      expect(result).toEqual(expect.arrayContaining([verified, community]));
      expect(result).not.toContain(unset);
    });
  });

  describe("verified filter (PR-056)", () => {
    it("matches a registry-verified project", () => {
      const project = liveProject({ verification: { status: "verified", level: null, verifiedAt: null } });
      expect(filterLiveProjects([project], { verified: true })).toEqual([project]);
    });

    it("matches a discovery-verified project even with no registry verification status", () => {
      const project = liveProject({ source: "discovery", verification: { status: null, level: null, verifiedAt: null }, discoveryStatus: "verified" });
      expect(filterLiveProjects([project], { verified: true })).toEqual([project]);
    });

    it("excludes an unverified project when verified: true", () => {
      const project = liveProject({ verification: { status: "unverified", level: null, verifiedAt: null } });
      expect(filterLiveProjects([project], { verified: true })).toEqual([]);
    });

    it("with verified: false, returns only unverified projects", () => {
      const verified = liveProject({ id: "a", verification: { status: "verified", level: null, verifiedAt: null } });
      const unverified = liveProject({ id: "b", verification: { status: "unverified", level: null, verifiedAt: null } });
      expect(filterLiveProjects([verified, unverified], { verified: false })).toEqual([unverified]);
    });
  });

  describe("hasVolume filter (PR-056)", () => {
    it("matches a project with a non-null volume24hUsd", () => {
      const withVolume = liveProject({ id: "a", market: { ...liveProject().market, volume24hUsd: 1000 } });
      const withoutVolume = liveProject({ id: "b", market: { ...liveProject().market, volume24hUsd: null } });
      expect(filterLiveProjects([withVolume, withoutVolume], { hasVolume: true })).toEqual([withVolume]);
    });

    it("with hasVolume: false, returns only projects with no volume data", () => {
      const withVolume = liveProject({ id: "a", market: { ...liveProject().market, volume24hUsd: 1000 } });
      const withoutVolume = liveProject({ id: "b", market: { ...liveProject().market, volume24hUsd: null } });
      expect(filterLiveProjects([withVolume, withoutVolume], { hasVolume: false })).toEqual([withoutVolume]);
    });

    it("treats a real zero volume as having volume data (not null)", () => {
      const zeroVolume = liveProject({ market: { ...liveProject().market, volume24hUsd: 0 } });
      expect(filterLiveProjects([zeroVolume], { hasVolume: true })).toEqual([zeroVolume]);
    });
  });

  describe("financialRanges (PR-063)", () => {
    it("matches a project whose real value falls in the selected range", () => {
      const highTvl = liveProject({ id: "a", market: { ...liveProject().market, tvlUsd: 500_000_000 } });
      const lowTvl = liveProject({ id: "b", market: { ...liveProject().market, tvlUsd: 500_000 } });
      const result = filterLiveProjects([highTvl, lowTvl], { financialRanges: { tvl: "tvl-over-100m" } });
      expect(result).toEqual([highTvl]);
    });

    it("ANDs across metrics — a project must satisfy every active range", () => {
      const both = liveProject({
        id: "a",
        market: { ...liveProject().market, tvlUsd: 500_000_000, volume24hUsd: 50_000_000 },
      });
      const onlyTvl = liveProject({
        id: "b",
        market: { ...liveProject().market, tvlUsd: 500_000_000, volume24hUsd: 10_000 },
      });
      const result = filterLiveProjects([both, onlyTvl], {
        financialRanges: { tvl: "tvl-over-100m", volume: "volume-high" },
      });
      expect(result).toEqual([both]);
    });

    it("excludes a project with no real value for the ranged metric", () => {
      const noTvl = liveProject({ market: { ...liveProject().market, tvlUsd: null } });
      expect(filterLiveProjects([noTvl], { financialRanges: { tvl: "tvl-over-100m" } })).toEqual([]);
    });
  });
});
