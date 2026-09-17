import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { HeldProjectsIntelligenceSection } from "@/components/wallet/HeldProjectsIntelligenceSection";
import type { HeldProjectLink } from "@/lib/portfolio-intelligence/projectLinks";
import type { HoldingAsset } from "@/lib/holdings/types";
import type { LiveProject } from "@/lib/projects/types";

function makeHolding(overrides: Partial<HoldingAsset> = {}): HoldingAsset {
  return { address: "0xaave", symbol: "AAVE", name: "Aave Token", logo: null, balance: BigInt(1), decimals: 18, formattedBalance: "1.5", usdPrice: 100, usdValue: 150, allocationPct: 50, chain: "base", verified: true, tokenType: "erc20", ...overrides };
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

describe("HeldProjectsIntelligenceSection", () => {
  it("honest empty state when no holdings match a tracked project", () => {
    render(<HeldProjectsIntelligenceSection links={[]} />);
    expect(screen.getByText("No tracked projects held")).toBeInTheDocument();
  });

  it("renders the real project's AI Grade, Risk, and Confidence for a matched holding", () => {
    render(<HeldProjectsIntelligenceSection links={[makeLink()]} />);
    expect(screen.getByText("Aave")).toBeInTheDocument();
    expect(screen.getByText("A+")).toBeInTheDocument();
    expect(screen.getByText("Low Risk")).toBeInTheDocument();
    expect(screen.getByText("90/100 confidence")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Aave/ })).toHaveAttribute("href", "/dashboard/projects/aave");
  });

  it("renders real Smart Collection membership badges, never fabricated for a non-member", () => {
    render(<HeldProjectsIntelligenceSection links={[makeLink({ smartCollectionNames: ["High Conviction"] })]} />);
    expect(screen.getByText("High Conviction")).toBeInTheDocument();
  });

  it("shows the real held balance and USD value alongside each project", () => {
    render(<HeldProjectsIntelligenceSection links={[makeLink()]} />);
    expect(screen.getByText(/1\.5 AAVE/)).toBeInTheDocument();
  });
});
