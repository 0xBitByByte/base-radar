import { describe, expect, it, vi } from "vitest";

import { buildCollections } from "@/lib/projects/collections";
import { filterLiveProjects } from "@/lib/projects/filter";
import { sortLiveProjects } from "@/lib/projects/sort";
import { liveProject } from "../../lib/projects/fixtures";

/**
 * PR-085.02C — proves `getProjectsHeroSnapshot()`'s counts/highest-projects
 * are byte-for-byte identical to what the full, unchanged
 * `buildCollections()`/leaderboard pipeline would produce for the exact
 * same fixture set — the mandatory "business logic must remain identical"
 * requirement, verified directly rather than assumed. `getLiveProjects()`
 * is mocked once, at the module boundary, so both the snapshot and the
 * full pipeline read the identical fixture array.
 */
const FIXTURE_PROJECTS = [
  liveProject({
    id: "aave",
    category: "lending",
    verification: { status: "verified", level: null, verifiedAt: null },
    confidence: { score: 95, level: "high", source: "intelligence" },
    market: { available: true, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: 1_000, liquidityUsd: null, tvlUsd: 900_000_000},
    engineering: { available: true, stars: 500, forks: 10, commitsLast7d: null, commitTrendPct: null, hasRecentActivity: false },
    governance: { configured: true, activeProposalCount: 3, totalProposalCount: 10 },
  }),
  liveProject({
    id: "aerodrome",
    category: "dex",
    discoveryStatus: "new",
    verification: { status: "unverified", level: null, verifiedAt: null },
    confidence: { score: 40, level: "low", source: "discovery" },
    market: { available: true, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: 50_000_000, liquidityUsd: null, tvlUsd: 300_000_000},
    engineering: { available: true, stars: 900, forks: 5, commitsLast7d: null, commitTrendPct: null, hasRecentActivity: false },
    governance: { configured: false, activeProposalCount: null, totalProposalCount: null },
  }),
  liveProject({
    id: "brand-new",
    category: "other",
    source: "discovery",
    slug: null,
    discoveryMetadata: { sources: ["coingecko"], discoveredAt: "2026-01-01T00:00:00.000Z", registryMatchType: null },
    verification: { status: null, level: null, verifiedAt: null },
    confidence: { score: 85, level: "high", source: "discovery" },
    market: { available: false, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: null},
    engineering: { available: false, stars: null, forks: null, commitsLast7d: null, commitTrendPct: null, hasRecentActivity: false },
    governance: { configured: false, activeProposalCount: null, totalProposalCount: null },
  }),
];

vi.mock("@/lib/projects/service", () => ({
  getLiveProjects: vi.fn().mockResolvedValue(FIXTURE_PROJECTS),
}));

describe("getProjectsHeroSnapshot (PR-085.02C)", () => {
  it("produces counts identical to buildCollections() for the same fixture set", async () => {
    const { getProjectsHeroSnapshot } = await import("@/components/projects/loadProjectsData");
    const snapshot = await getProjectsHeroSnapshot();
    const collections = buildCollections(FIXTURE_PROJECTS);

    expect(snapshot.newCount).toBe(collections.new.length);
    expect(snapshot.recentlyDiscoveredCount).toBe(collections.recentlyDiscovered.length);
    expect(snapshot.recentlyUpdatedCount).toBe(collections.recentlyUpdated.length);
    expect(snapshot.needsReviewCount).toBe(collections.needsReview.length);
    expect(snapshot.verifiedCount).toBe(collections.verified.length);
    expect(snapshot.highConfidenceCount).toBe(collections.highConfidence.length);
  });

  it("picks the same highest-TVL/Volume/Activity project the full leaderboard sort would", async () => {
    const { getProjectsHeroSnapshot } = await import("@/components/projects/loadProjectsData");
    const snapshot = await getProjectsHeroSnapshot();

    const topTvl = sortLiveProjects(filterLiveProjects(FIXTURE_PROJECTS, { hasTvl: true }), "tvl", "desc")[0];
    const topVolume = sortLiveProjects(filterLiveProjects(FIXTURE_PROJECTS, { hasVolume: true }), "volume", "desc")[0];
    const topActivity = sortLiveProjects(filterLiveProjects(FIXTURE_PROJECTS, { hasGithub: true }), "stars", "desc")[0];

    expect(snapshot.highestTvl?.id).toBe(topTvl.id);
    expect(snapshot.highestVolume?.id).toBe(topVolume.id);
    expect(snapshot.highestActivity?.id).toBe(topActivity.id);
  });

  it("never fabricates a highest-* project when no project in the set has that field", async () => {
    vi.doMock("@/lib/projects/service", () => ({
      getLiveProjects: vi.fn().mockResolvedValue([
        liveProject({
          id: "no-market-data",
          market: { available: false, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: null},
          engineering: { available: false, stars: null, forks: null, commitsLast7d: null, commitTrendPct: null, hasRecentActivity: false },
        }),
      ]),
    }));
    vi.resetModules();
    const { getProjectsHeroSnapshot } = await import("@/components/projects/loadProjectsData");
    const snapshot = await getProjectsHeroSnapshot();

    expect(snapshot.highestTvl).toBeUndefined();
    expect(snapshot.highestVolume).toBeUndefined();
    expect(snapshot.highestActivity).toBeUndefined();
    expect(snapshot.hasAnyTvl).toBe(false);
  });

  it("computes totalTvlUsd and governance aggregates correctly", async () => {
    vi.doMock("@/lib/projects/service", () => ({ getLiveProjects: vi.fn().mockResolvedValue(FIXTURE_PROJECTS) }));
    vi.resetModules();
    const { getProjectsHeroSnapshot } = await import("@/components/projects/loadProjectsData");
    const snapshot = await getProjectsHeroSnapshot();

    expect(snapshot.totalTvlUsd).toBe(900_000_000 + 300_000_000);
    expect(snapshot.activeProposalCount).toBe(3);
    expect(snapshot.governanceConfiguredCount).toBe(1);
    expect(snapshot.totalProjects).toBe(3);
  });
});
