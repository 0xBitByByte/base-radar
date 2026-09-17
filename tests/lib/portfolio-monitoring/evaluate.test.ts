import { describe, expect, it } from "vitest";

import { currentGovernanceCounts, findGovernanceAlerts, findWhaleAlerts, toAlert } from "@/lib/portfolio-monitoring/evaluate";
import type { HeldProjectLink } from "@/lib/portfolio-intelligence/projectLinks";
import type { WhaleEvent } from "@/lib/whale/types";
import type { HoldingAsset } from "@/lib/holdings/types";
import type { LiveProject } from "@/lib/projects/types";

function makeHolding(overrides: Partial<HoldingAsset> = {}): HoldingAsset {
  return { address: "0xaave", symbol: "AAVE", name: "Aave Token", logo: null, balance: BigInt(1), decimals: 18, formattedBalance: "1", usdPrice: 100, usdValue: 100, allocationPct: 50, chain: "base", verified: true, tokenType: "erc20", ...overrides };
}

function makeProject(overrides: Partial<LiveProject> = {}): LiveProject {
  return {
    id: "aave",
    slug: "aave",
    source: "registry",
    identity: { name: "Aave", shortDescription: "", description: "", logoUrl: null, logoUrlFallbacks: [], websiteUrl: "https://aave.com", socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null } },
    category: "lending",
    subcategories: [],
    chains: ["base"],
    status: "live",
    discoveryStatus: null,
    verification: { status: "verified", level: null, verifiedAt: null },
    confidence: { score: 90, level: "high", source: "intelligence" },
    providerAttribution: null,
    discoveryEvidence: null,
    searchIdentifiers: { symbol: "AAVE", aliases: [], coingeckoId: null, defillamaSlug: null, github: null, contractAddresses: ["0xaave"] },
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

function makeLink(overrides: Partial<HeldProjectLink> = {}): HeldProjectLink {
  return { holding: makeHolding(), project: makeProject(), smartCollectionNames: [], ...overrides };
}

function makeWhaleEvent(overrides: Partial<WhaleEvent> = {}): WhaleEvent {
  return { id: "whale:1", projectId: "aave", tokenSymbol: "AAVE", usdValue: 500000, txHash: "0xtx", fromAddress: "0xfrom", toAddress: "0xto", toIsContract: false, toContractName: null, timestamp: "2026-01-01T00:00:00.000Z", sourceProvider: "blockscout", confidence: 90, ...overrides } as WhaleEvent;
}

describe("findWhaleAlerts", () => {
  it("surfaces a real whale event for a held project", () => {
    const alerts = findWhaleAlerts([makeLink()], [makeWhaleEvent()]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].projectId).toBe("aave");
    expect(alerts[0].dedupeKey).toBe("whale:1");
  });

  it("ignores a whale event for a project not held", () => {
    const alerts = findWhaleAlerts([makeLink()], [makeWhaleEvent({ projectId: "compound" })]);
    expect(alerts).toHaveLength(0);
  });

  it("dedupe key is the whale event's own real, stable id — never a derived/computed key", () => {
    const alerts = findWhaleAlerts([makeLink()], [makeWhaleEvent({ id: "whale:real-id-123" })]);
    expect(alerts[0].dedupeKey).toBe("whale:real-id-123");
  });

  it("no holdings held means no whale alerts, even with real whale events present", () => {
    expect(findWhaleAlerts([], [makeWhaleEvent()])).toHaveLength(0);
  });
});

describe("findGovernanceAlerts", () => {
  it("never fires on the first-ever observation of a project — nothing to compare against yet", () => {
    const alerts = findGovernanceAlerts([makeLink()], {});
    expect(alerts).toHaveLength(0);
  });

  it("fires when the real active-proposal count increased since the last-seen baseline", () => {
    const link = makeLink({ project: makeProject({ governance: { configured: true, activeProposalCount: 3, totalProposalCount: 5 } }) });
    const alerts = findGovernanceAlerts([link], { aave: 1 });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].detail).toContain("3 active proposals");
    expect(alerts[0].detail).toContain("up from 1");
  });

  it("never fires when the count is unchanged", () => {
    const link = makeLink({ project: makeProject({ governance: { configured: true, activeProposalCount: 2, totalProposalCount: 5 } }) });
    expect(findGovernanceAlerts([link], { aave: 2 })).toHaveLength(0);
  });

  it("never fires when the count decreased (a resolved proposal is not a new-activity alert)", () => {
    const link = makeLink({ project: makeProject({ governance: { configured: true, activeProposalCount: 1, totalProposalCount: 5 } }) });
    expect(findGovernanceAlerts([link], { aave: 3 })).toHaveLength(0);
  });

  it("treats a null activeProposalCount as a real zero, never as unknown/skipped", () => {
    const link = makeLink({ project: makeProject({ governance: { configured: false, activeProposalCount: null, totalProposalCount: null } }) });
    expect(findGovernanceAlerts([link], { aave: 0 })).toHaveLength(0);
  });
});

describe("currentGovernanceCounts", () => {
  it("reads the real current count straight off each held project, never computing anything new", () => {
    const link = makeLink({ project: makeProject({ id: "compound", governance: { configured: true, activeProposalCount: 4, totalProposalCount: 10 } }) });
    expect(currentGovernanceCounts([link])).toEqual({ compound: 4 });
  });

  it("a null activeProposalCount is recorded as a real 0", () => {
    const link = makeLink({ project: makeProject({ governance: { configured: false, activeProposalCount: null, totalProposalCount: null } }) });
    expect(currentGovernanceCounts([link])).toEqual({ aave: 0 });
  });
});

describe("toAlert", () => {
  it("builds a deterministic id from kind + dedupeKey, and an unread alert", () => {
    const alert = toAlert({ kind: "whale", dedupeKey: "whale:1", projectId: "aave", projectName: "Aave", projectSlug: "aave", headline: "h", detail: "d" }, "2026-01-01T00:00:00.000Z");
    expect(alert.id).toBe("portfolio-watch:whale:whale:1");
    expect(alert.isRead).toBe(false);
    expect(alert.readAt).toBeNull();
    expect(alert.firstSeenAt).toBe("2026-01-01T00:00:00.000Z");
  });
});
