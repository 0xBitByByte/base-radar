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
});
