import { describe, expect, it } from "vitest";

import { buildCollections } from "@/lib/projects/collections";
import { liveProject } from "./fixtures";

describe("buildCollections", () => {
  it("puts a project with a verified registry status into verified", () => {
    const project = liveProject({ verification: { status: "verified", level: null, verifiedAt: null } });
    const collections = buildCollections([project]);
    expect(collections.verified).toContain(project);
  });

  it("puts a project with discoveryStatus 'verified' into verified even without registry verification", () => {
    const project = liveProject({ source: "discovery", verification: { status: null, level: null, verifiedAt: null }, discoveryStatus: "verified" });
    const collections = buildCollections([project]);
    expect(collections.verified).toContain(project);
  });

  it("puts discoveryStatus 'new' projects into new", () => {
    const project = liveProject({ discoveryStatus: "new" });
    expect(buildCollections([project]).new).toContain(project);
  });

  it("puts discoveryStatus 'recently-updated' projects into recentlyUpdated", () => {
    const project = liveProject({ discoveryStatus: "recently-updated" });
    expect(buildCollections([project]).recentlyUpdated).toContain(project);
  });

  it("puts any project with discoveryMetadata into recentlyDiscovered", () => {
    const project = liveProject({ discoveryMetadata: { sources: ["coingecko"], discoveredAt: "2026-01-01T00:00:00.000Z", registryMatchType: "duplicate" } });
    expect(buildCollections([project]).recentlyDiscovered).toContain(project);
  });

  it("excludes a project with no discoveryMetadata from recentlyDiscovered", () => {
    const project = liveProject({ discoveryMetadata: null });
    expect(buildCollections([project]).recentlyDiscovered).not.toContain(project);
  });

  it("puts a recently-verifiedAt project into recentlyVerified", () => {
    const project = liveProject({ verification: { status: "verified", level: null, verifiedAt: new Date().toISOString() } });
    expect(buildCollections([project]).recentlyVerified).toContain(project);
  });

  it("excludes an old verifiedAt from recentlyVerified", () => {
    const project = liveProject({ verification: { status: "verified", level: null, verifiedAt: "2000-01-01T00:00:00.000Z" } });
    expect(buildCollections([project]).recentlyVerified).not.toContain(project);
  });

  it("treats multi-source discovery agreement as trending", () => {
    const project = liveProject({ discoveryMetadata: { sources: ["coingecko", "defillama"], discoveredAt: null, registryMatchType: null } });
    expect(buildCollections([project]).trending).toContain(project);
  });

  it("treats a strong 24h price move as trending", () => {
    const project = liveProject({ market: { ...liveProject().market, changePct24h: 15 } });
    expect(buildCollections([project]).trending).toContain(project);
  });

  it("does not treat a modest price move as trending", () => {
    const project = liveProject({ market: { ...liveProject().market, changePct24h: 3 } });
    expect(buildCollections([project]).trending).not.toContain(project);
  });

  it("puts discoveryStatus 'upcoming'/'announced' into upcoming", () => {
    const upcoming = liveProject({ id: "a", discoveryStatus: "upcoming" });
    const announced = liveProject({ id: "b", discoveryStatus: "announced" });
    const collections = buildCollections([upcoming, announced]);
    expect(collections.upcoming).toEqual(expect.arrayContaining([upcoming, announced]));
  });

  it("puts confidence.level 'high' into highConfidence", () => {
    const project = liveProject({ confidence: { score: 90, level: "high", source: "intelligence" } });
    expect(buildCollections([project]).highConfidence).toContain(project);
  });

  it("puts discoveryStatus 'needs-review' or confidence 'low' into needsReview", () => {
    const needsReview = liveProject({ id: "a", discoveryStatus: "needs-review" });
    const lowConfidence = liveProject({ id: "b", confidence: { score: 10, level: "low", source: "discovery" } });
    const collections = buildCollections([needsReview, lowConfidence]);
    expect(collections.needsReview).toEqual(expect.arrayContaining([needsReview, lowConfidence]));
  });

  it("groups every project into byCategory, including empty categories", () => {
    const dex = liveProject({ id: "a", category: "dex" });
    const lending = liveProject({ id: "b", category: "lending" });
    const collections = buildCollections([dex, lending]);
    expect(collections.byCategory.dex).toEqual([dex]);
    expect(collections.byCategory.lending).toEqual([lending]);
    expect(collections.byCategory.nft).toEqual([]);
  });

  it("is deterministic", () => {
    const projects = [liveProject({ id: "a" }), liveProject({ id: "b", discoveryStatus: "new" })];
    expect(buildCollections(projects)).toEqual(buildCollections(projects));
  });
});
