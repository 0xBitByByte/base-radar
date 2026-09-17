import { describe, expect, it } from "vitest";

import { buildHeldProjectLinks } from "@/lib/portfolio-intelligence/projectLinks";
import type { HoldingAsset } from "@/lib/holdings/types";
import type { LiveProject } from "@/lib/projects/types";
import type { SmartCollectionResult } from "@/lib/smart-collections/types";

function makeHolding(overrides: Partial<HoldingAsset> = {}): HoldingAsset {
  return {
    address: "0xAave000000000000000000000000000000aave",
    symbol: "AAVE",
    name: "Aave Token",
    logo: null,
    balance: BigInt("1000000000000000000"),
    decimals: 18,
    formattedBalance: "1",
    usdPrice: 100,
    usdValue: 100,
    allocationPct: 50,
    chain: "base",
    verified: true,
    tokenType: "erc20",
    ...overrides,
  };
}

function makeLiveProject(overrides: Partial<LiveProject> = {}): LiveProject {
  return {
    id: "aave",
    slug: "aave",
    source: "registry",
    identity: {
      name: "Aave",
      shortDescription: "A lending protocol.",
      description: "A lending protocol.",
      logoUrl: null,
      logoUrlFallbacks: [],
      websiteUrl: "https://aave.com",
      socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null },
    },
    category: "lending",
    subcategories: [],
    chains: ["base"],
    status: "live",
    discoveryStatus: null,
    verification: { status: "verified", level: null, verifiedAt: null },
    confidence: { score: 90, level: "high", source: "intelligence" },
    providerAttribution: null,
    discoveryEvidence: null,
    searchIdentifiers: { symbol: "AAVE", aliases: [], coingeckoId: null, defillamaSlug: null, github: null, contractAddresses: ["0xaave000000000000000000000000000000aave"] },
    market: { available: false, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: null },
    community: { verificationStatus: "verified", socialLinkCount: 0, socialLinkTotal: 10, governanceConfigured: true },
    engineering: { available: false, stars: null, forks: null, commitsLast7d: null, commitTrendPct: null, hasRecentActivity: false },
    governance: { configured: true, activeProposalCount: 1, totalProposalCount: 5 },
    contracts: { count: 0, verifiedCount: 0 },
    health: { score: 90, label: "excellent", factors: [] },
    aiRating: "A+",
    riskLevel: "low",
    riskContributors: [],
    lastUpdated: "2026-01-01T00:00:00.000Z",
    registryUpdatedAt: null,
    discoveryMetadata: null,
    ...overrides,
  } as LiveProject;
}

function makeCollection(id: string, name: string, projectIds: string[]): SmartCollectionResult {
  return {
    id: id as SmartCollectionResult["id"],
    name,
    description: "",
    status: "ready",
    matches: projectIds.map((projectId) => ({ projectId, projectName: projectId, projectSlug: projectId, liveProject: null, reason: "r", evidence: [] })),
    lastEvaluatedAt: "2026-01-01T00:00:00.000Z",
    averageConfidence: 90,
  };
}

describe("buildHeldProjectLinks", () => {
  it("matches a holding to a real project by contract address, case-insensitively", () => {
    const holding = makeHolding({ address: "0xAAVE000000000000000000000000000000AAVE" });
    const project = makeLiveProject();
    const links = buildHeldProjectLinks([holding], [project], []);
    expect(links).toHaveLength(1);
    expect(links[0].project.id).toBe("aave");
    expect(links[0].holding).toBe(holding);
  });

  it("falls back to a case-insensitive symbol match when no address matches", () => {
    const holding = makeHolding({ address: "0xNotRegisteredAddress00000000000000000000", symbol: "aave" });
    const project = makeLiveProject();
    const links = buildHeldProjectLinks([holding], [project], []);
    expect(links).toHaveLength(1);
    expect(links[0].project.id).toBe("aave");
  });

  it("native ETH (address: null) never matches by address, only by a real 'ETH' symbol entry if one exists", () => {
    const holding = makeHolding({ address: null, symbol: "ETH", tokenType: "native" });
    const project = makeLiveProject(); // symbol "AAVE", not "ETH"
    const links = buildHeldProjectLinks([holding], [project], []);
    expect(links).toHaveLength(0);
  });

  it("a holding with no real registry match is silently absent — never a fabricated placeholder", () => {
    const holding = makeHolding({ address: "0xUnknownRandomToken00000000000000000000000", symbol: "RANDOMTOKEN" });
    const project = makeLiveProject();
    const links = buildHeldProjectLinks([holding], [project], []);
    expect(links).toHaveLength(0);
  });

  it("attaches real Smart Collection membership by the matched project's real id", () => {
    const holding = makeHolding();
    const project = makeLiveProject();
    const collections = [makeCollection("high-conviction", "High Conviction", ["aave"]), makeCollection("low-risk", "Low Risk", ["aave"]), makeCollection("governance-active", "Governance Active", ["some-other-project"])];
    const links = buildHeldProjectLinks([holding], [project], collections);
    expect(links[0].smartCollectionNames).toEqual(["High Conviction", "Low Risk"]);
  });

  it("smartCollectionNames is a real empty array (never omitted) when the project belongs to none", () => {
    const holding = makeHolding();
    const project = makeLiveProject();
    const links = buildHeldProjectLinks([holding], [project], [makeCollection("low-risk", "Low Risk", ["some-other-project"])]);
    expect(links[0].smartCollectionNames).toEqual([]);
  });

  it("preserves the order of assets — already value-sorted upstream", () => {
    const compound = makeHolding({ address: "0xComp0000000000000000000000000000000comp", symbol: "COMP" });
    const aave = makeHolding({ address: "0xAave000000000000000000000000000000aave" });
    const compoundProject = makeLiveProject({ id: "compound", searchIdentifiers: { symbol: "COMP", aliases: [], coingeckoId: null, defillamaSlug: null, github: null, contractAddresses: ["0xcomp0000000000000000000000000000000comp"] } });
    const aaveProject = makeLiveProject();
    const links = buildHeldProjectLinks([compound, aave], [aaveProject, compoundProject], []);
    expect(links.map((l) => l.project.id)).toEqual(["compound", "aave"]);
  });

  it("multiple distinct holdings can each match their own distinct project", () => {
    const compound = makeHolding({ address: "0xComp0000000000000000000000000000000comp", symbol: "COMP" });
    const aave = makeHolding({ address: "0xAave000000000000000000000000000000aave" });
    const compoundProject = makeLiveProject({ id: "compound", searchIdentifiers: { symbol: "COMP", aliases: [], coingeckoId: null, defillamaSlug: null, github: null, contractAddresses: ["0xcomp0000000000000000000000000000000comp"] } });
    const aaveProject = makeLiveProject();
    const links = buildHeldProjectLinks([aave, compound], [aaveProject, compoundProject], []);
    expect(links).toHaveLength(2);
    expect(new Set(links.map((l) => l.project.id))).toEqual(new Set(["aave", "compound"]));
  });
});
