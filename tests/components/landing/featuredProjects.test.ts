import { describe, expect, it } from "vitest";

import { buildFeaturedProjectsWithSnapshot, FEATURED_PROJECT_IDS, FEATURED_PROJECTS } from "@/components/landing/featuredProjects";
import type { FeaturedIntelligenceSnapshot } from "@/lib/data/featuredIntelligenceSnapshot";

/**
 * PR-098.02 — Featured Ecosystem 24H% Semantics audit. Covers the "non-token
 * project" case from the audit's required test matrix at the Featured
 * Ecosystem dataset layer itself: every project without a verified
 * `providerIds.coingeckoId` in the canonical registry (`data/projects/seed/`)
 * must resolve to `market.changePct24h === null` — never a fabricated
 * illustrative number — regardless of what the landing fixture's own spec
 * array happens to contain.
 */

// Ground truth from PR-098.01's provider-mapping audit: these 4 of the 18
// Featured Ecosystem projects have no verified CoinGecko token mapping.
// ("superchain-eco"/"based-agents" were removed entirely in PR-100 — see
// that PR's report — rather than merely staying token-less.)
const NON_TOKEN_PROJECT_IDS = ["farcaster", "basenames", "clanker", "oku"];

// The remaining 14 all have a real, verified `providerIds.coingeckoId`
// (confirmed in `data/projects/seed/`) — a genuine, positive control.
const TOKEN_PROJECT_IDS = [
  "aerodrome-finance",
  "aave",
  "morpho",
  "virtuals-protocol",
  "zora",
  "moonwell",
  "hydrex",
  "compound",
  "curve-finance",
  "balancer",
  "spark",
  "uniswap",
  "seamless-protocol",
  "extra-finance",
];

function project(id: string) {
  const found = FEATURED_PROJECTS.find((p) => p.identity.id === id);
  if (!found) throw new Error(`Featured project fixture missing for id "${id}"`);
  return found;
}

describe("Featured Ecosystem — 24H% semantics (PR-098.02)", () => {
  it("has exactly 18 Featured Ecosystem projects (PR-100 removed superchain-eco/based-agents, not replaced)", () => {
    expect(FEATURED_PROJECTS.length).toBe(18);
  });

  it.each(NON_TOKEN_PROJECT_IDS)("'%s' (no verified token mapping) shows no 24H token change", (id) => {
    const { market } = project(id);
    expect(market.changePct24h).toBeNull();
    expect(market.available).toBe(false);
  });

  it.each(TOKEN_PROJECT_IDS)("'%s' (verified token mapping) has a real, finite 24H token change", (id) => {
    const { market } = project(id);
    expect(market.changePct24h).not.toBeNull();
    expect(Number.isFinite(market.changePct24h)).toBe(true);
  });

  it("covers every Featured Ecosystem project between the token/non-token lists (no project silently omitted)", () => {
    const covered = new Set([...NON_TOKEN_PROJECT_IDS, ...TOKEN_PROJECT_IDS]);
    for (const p of FEATURED_PROJECTS) {
      expect(covered.has(p.identity.id)).toBe(true);
    }
    expect(covered.size).toBe(FEATURED_PROJECTS.length);
  });

  it("never generates narrative prose describing a price move for a non-token project", () => {
    for (const id of NON_TOKEN_PROJECT_IDS) {
      expect(project(id).narrative).toBeNull();
    }
  });
});

describe("buildFeaturedProjectsWithSnapshot (PR-098.05)", () => {
  it("returns the plain illustrative FEATURED_PROJECTS when there's no snapshot yet", () => {
    expect(buildFeaturedProjectsWithSnapshot(null)).toEqual(FEATURED_PROJECTS);
  });

  it("overlays real TVL and Token 24H Change for a project the snapshot has live data for", () => {
    const snapshot: FeaturedIntelligenceSnapshot = {
      generatedAt: "2026-01-01T00:00:00.000Z",
      entries: [{ id: "aerodrome-finance", available: true, tvlUsd: 999_000_000, tokenChangePct24h: 12.5, stale: false, tvlFreshness: null, tokenChangeFreshness: null, radarScore: null }],
    };
    const merged = buildFeaturedProjectsWithSnapshot(snapshot);
    const aero = merged.find((p) => p.identity.id === "aerodrome-finance")!;
    expect(aero.tvl.tvlUsd).toBe(999_000_000);
    expect(aero.market.changePct24h).toBe(12.5);
  });

  it("falls back to the illustrative value when the snapshot marks an entry unavailable (transient hiccup, not a regression)", () => {
    const snapshot: FeaturedIntelligenceSnapshot = {
      generatedAt: "2026-01-01T00:00:00.000Z",
      entries: [{ id: "aerodrome-finance", available: false, tvlUsd: null, tokenChangePct24h: null, stale: false, tvlFreshness: null, tokenChangeFreshness: null, radarScore: null }],
    };
    const merged = buildFeaturedProjectsWithSnapshot(snapshot);
    const illustrative = FEATURED_PROJECTS.find((p) => p.identity.id === "aerodrome-finance")!;
    const aero = merged.find((p) => p.identity.id === "aerodrome-finance")!;
    expect(aero.tvl.tvlUsd).toBe(illustrative.tvl.tvlUsd);
    expect(aero.market.changePct24h).toBe(illustrative.market.changePct24h);
  });

  it("still nulls out a live 24h value for a project with no verified token mapping — the PR-098.02 guard applies to live data too", () => {
    // "oku" has no coingeckoId (PR-098.01) — even if a snapshot somehow
    // carried a number for it, resolveTokenChangePct24h must still null it.
    const snapshot: FeaturedIntelligenceSnapshot = {
      generatedAt: "2026-01-01T00:00:00.000Z",
      entries: [{ id: "oku", available: true, tvlUsd: 5_000_000, tokenChangePct24h: 9.9, stale: false, tvlFreshness: null, tokenChangeFreshness: null, radarScore: null }],
    };
    const merged = buildFeaturedProjectsWithSnapshot(snapshot);
    const oku = merged.find((p) => p.identity.id === "oku")!;
    expect(oku.market.changePct24h).toBeNull();
  });

  it("leaves every project with a spec entry, in order, for every id the illustrative fixture defines", () => {
    const merged = buildFeaturedProjectsWithSnapshot({ generatedAt: "2026-01-01T00:00:00.000Z", entries: [] });
    expect(merged.map((p) => p.identity.id)).toEqual(FEATURED_PROJECT_IDS);
  });
});

describe("buildFeaturedProjectsWithSnapshot — live Radar Score overlay (PR-099)", () => {
  function radarScoreResult(score: number): FeaturedIntelligenceSnapshot["entries"][number]["radarScore"] {
    return {
      score,
      availability: "full",
      coveragePct: 1,
      confidence: { score: 100, level: "high" },
      dimensions: [],
      staleDimensionIds: [],
      scoreFreshness: "fresh",
      explanation: [`Final Radar Score: ${score}.`],
    };
  }

  it("overrides the illustrative health.score/label with the real live Radar Score when available", () => {
    const snapshot: FeaturedIntelligenceSnapshot = {
      generatedAt: "2026-01-01T00:00:00.000Z",
      entries: [{ id: "aerodrome-finance", available: true, tvlUsd: 999_000_000, tokenChangePct24h: 12.5, stale: false, tvlFreshness: null, tokenChangeFreshness: null, radarScore: radarScoreResult(87) }],
    };
    const merged = buildFeaturedProjectsWithSnapshot(snapshot);
    const aero = merged.find((p) => p.identity.id === "aerodrome-finance")!;
    expect(aero.health.score).toBe(87);
    expect(aero.health.label).toBe("excellent");
  });

  it("keeps the illustrative health.score/label when the live Radar Score is null (insufficient evidence) — never a fabricated live score", () => {
    const illustrative = FEATURED_PROJECTS.find((p) => p.identity.id === "aerodrome-finance")!;
    const snapshot: FeaturedIntelligenceSnapshot = {
      generatedAt: "2026-01-01T00:00:00.000Z",
      entries: [{ id: "aerodrome-finance", available: true, tvlUsd: 999_000_000, tokenChangePct24h: 12.5, stale: false, tvlFreshness: null, tokenChangeFreshness: null, radarScore: null }],
    };
    const merged = buildFeaturedProjectsWithSnapshot(snapshot);
    const aero = merged.find((p) => p.identity.id === "aerodrome-finance")!;
    expect(aero.health.score).toBe(illustrative.health.score);
    expect(aero.health.label).toBe(illustrative.health.label);
  });
});

describe("Featured Ecosystem — entity review, Superchain Eco & Based Agents removal (PR-100)", () => {
  // PR-100 — Superchain Eco is a real entity (an ecosystem directory site
  // for the whole OP Superchain), but not a protocol — it has no token,
  // TVL, Base contracts, or governance, so it can never produce genuine
  // Radar Score intelligence. "Based Agents" has no distinct canonical
  // protocol at all. Both were removed from the fixture entirely (not
  // merely nulled out) — these guards prevent either from silently
  // reappearing with a fabricated mapping.
  it("does not include superchain-eco or based-agents in the Featured Ecosystem id list", () => {
    expect(FEATURED_PROJECT_IDS).not.toContain("superchain-eco");
    expect(FEATURED_PROJECT_IDS).not.toContain("based-agents");
  });

  it("does not include superchain-eco or based-agents in the rendered Featured Ecosystem projects", () => {
    expect(FEATURED_PROJECTS.some((p) => p.identity.id === "superchain-eco")).toBe(false);
    expect(FEATURED_PROJECTS.some((p) => p.identity.id === "based-agents")).toBe(false);
  });

  it("even if a live snapshot somehow carried an entry for either id, buildFeaturedProjectsWithSnapshot never surfaces it (no fixture spec exists to merge onto)", () => {
    const snapshot: FeaturedIntelligenceSnapshot = {
      generatedAt: "2026-01-01T00:00:00.000Z",
      entries: [
        { id: "superchain-eco", available: true, tvlUsd: 1, tokenChangePct24h: 1, stale: false, tvlFreshness: null, tokenChangeFreshness: null, radarScore: null },
        { id: "based-agents", available: true, tvlUsd: 1, tokenChangePct24h: 1, stale: false, tvlFreshness: null, tokenChangeFreshness: null, radarScore: null },
      ],
    };
    const merged = buildFeaturedProjectsWithSnapshot(snapshot);
    expect(merged.some((p) => p.identity.id === "superchain-eco")).toBe(false);
    expect(merged.some((p) => p.identity.id === "based-agents")).toBe(false);
  });
});
