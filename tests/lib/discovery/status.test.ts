import { describe, expect, it } from "vitest";

import { computeDiscoveryStatus } from "@/lib/discovery/status";
import { matchAgainstRegistry } from "@/lib/discovery/registryMatch";
import { candidate, registryProject } from "./fixtures";

const noEvidence = { hasLiveMarketData: false, hasLiveTvlData: false, volume24hUsd: null, tvlUsd: null, changePct24h: null, githubActivity: null };
const liveEvidence = { ...noEvidence, hasLiveMarketData: true };

describe("computeDiscoveryStatus", () => {
  it("returns 'verified' for a duplicate match against a verified registry project", () => {
    const project = registryProject({ id: "aave", name: "Aave", providerIds: { coingeckoId: "aave" }, verification: { status: "verified" } });
    const c = candidate({ displayName: "Aave", normalizedName: "aave", coingeckoId: "aave" });
    const match = matchAgainstRegistry(c, [project]);
    const result = computeDiscoveryStatus(c, match, noEvidence);
    expect(result.status).toBe("verified");
  });

  it("returns 'tracked' for a duplicate match against a not-yet-verified registry project", () => {
    const project = registryProject({ id: "x", name: "X", providerIds: { coingeckoId: "x" }, verification: { status: "community" } });
    const c = candidate({ displayName: "X", normalizedName: "x", coingeckoId: "x" });
    const match = matchAgainstRegistry(c, [project]);
    const result = computeDiscoveryStatus(c, match, noEvidence);
    expect(result.status).toBe("tracked");
  });

  it("returns 'deprecated' when the matched registry project's own status says so", () => {
    const project = registryProject({ id: "x", name: "X", providerIds: { coingeckoId: "x" }, status: "sunset" });
    const c = candidate({ displayName: "X", normalizedName: "x", coingeckoId: "x" });
    const match = matchAgainstRegistry(c, [project]);
    const result = computeDiscoveryStatus(c, match, noEvidence);
    expect(result.status).toBe("deprecated");
  });

  it("returns 'inactive' when the matched registry project's lifecycle says so", () => {
    const project = registryProject({ id: "x", name: "X", providerIds: { coingeckoId: "x" }, lifecycle: { state: "inactive" } });
    const c = candidate({ displayName: "X", normalizedName: "x", coingeckoId: "x" });
    const match = matchAgainstRegistry(c, [project]);
    const result = computeDiscoveryStatus(c, match, noEvidence);
    expect(result.status).toBe("inactive");
  });

  it("returns 'recently-updated' for an updated match", () => {
    const project = registryProject({ id: "x", name: "X", providerIds: { coingeckoId: "x" } });
    const c = candidate({ displayName: "X", normalizedName: "x", coingeckoId: "x", socials: { twitter: "https://twitter.com/x" } });
    const match = matchAgainstRegistry(c, [project]);
    const result = computeDiscoveryStatus(c, match, noEvidence);
    expect(result.status).toBe("recently-updated");
  });

  it("returns 'needs-review' for an ambiguous match", () => {
    const project = registryProject({ id: "x", name: "X" });
    const c = candidate({ displayName: "X", normalizedName: "x" });
    const match = matchAgainstRegistry(c, [project]);
    const result = computeDiscoveryStatus(c, match, noEvidence);
    expect(result.status).toBe("needs-review");
  });

  it("returns 'new' for an unmatched candidate with corroborating live market evidence", () => {
    const c = candidate({ displayName: "Brand New Project" });
    const match = matchAgainstRegistry(c, []);
    const result = computeDiscoveryStatus(c, match, liveEvidence);
    expect(result.status).toBe("new");
  });

  it("returns 'discovered' for an unmatched candidate with no corroborating evidence at all", () => {
    const c = candidate({ displayName: "Bare Candidate" });
    const match = matchAgainstRegistry(c, []);
    const result = computeDiscoveryStatus(c, match, noEvidence);
    expect(result.status).toBe("discovered");
  });

  it("returns 'announced' for a community-sourced candidate with no registry match", () => {
    const c = candidate({ source: "community", displayName: "Pre-Launch Pitch" });
    const match = matchAgainstRegistry(c, []);
    const result = computeDiscoveryStatus(c, match, noEvidence);
    expect(result.status).toBe("announced");
  });

  it("is deterministic", () => {
    const project = registryProject({ id: "aave", name: "Aave", providerIds: { coingeckoId: "aave" } });
    const c = candidate({ displayName: "Aave", normalizedName: "aave", coingeckoId: "aave" });
    const match = matchAgainstRegistry(c, [project]);
    const first = computeDiscoveryStatus(c, match, noEvidence);
    const second = computeDiscoveryStatus(c, match, noEvidence);
    expect(first).toEqual(second);
  });
});
