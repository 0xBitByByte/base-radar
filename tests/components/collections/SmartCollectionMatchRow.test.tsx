import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { SmartCollectionMatchRow } from "@/components/collections/SmartCollectionMatchRow";
import type { LiveProject } from "@/lib/projects/types";
import type { SmartCollectionMatch } from "@/lib/smart-collections/types";

function makeLiveProject(overrides: Partial<LiveProject> = {}): LiveProject {
  return {
    id: "test-project",
    slug: "test-project",
    source: "registry",
    identity: {
      name: "Test Project",
      shortDescription: "A test project.",
      description: "A test project.",
      logoUrl: null,
      logoUrlFallbacks: [],
      websiteUrl: "https://test-project.example",
      socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null },
    },
    category: "dex",
    subcategories: [],
    chains: ["base"],
    status: "live",
    discoveryStatus: null,
    verification: { status: "verified", level: null, verifiedAt: null },
    confidence: { score: 80, level: "high", source: "intelligence" },
    providerAttribution: null,
    discoveryEvidence: null,
    searchIdentifiers: { symbol: null, aliases: [], coingeckoId: null, defillamaSlug: null, github: null, contractAddresses: [] },
    market: { available: true, priceUsd: 1, changePct24h: 2, changePct7d: null, changePct30d: null, marketCapUsd: 1_000_000, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: null },
    community: { verificationStatus: "verified", socialLinkCount: 0, socialLinkTotal: 10, governanceConfigured: false },
    engineering: { available: false, stars: null, forks: null, commitsLast7d: null, commitTrendPct: null, hasRecentActivity: false },
    governance: { configured: false, activeProposalCount: null, totalProposalCount: null },
    contracts: { count: 0, verifiedCount: 0 },
    health: { score: 80, label: "Good", factors: [] },
    aiRating: "A",
    riskLevel: "low",
    riskContributors: [],
    lastUpdated: "2026-01-01T00:00:00.000Z",
    registryUpdatedAt: null,
    discoveryMetadata: null,
    ...overrides,
  } as LiveProject;
}

function makeMatch(overrides: Partial<SmartCollectionMatch> = {}): SmartCollectionMatch {
  return { projectId: "test-project", projectName: "Test Project", projectSlug: "test-project", liveProject: makeLiveProject(), reason: "A real, specific reason.", evidence: [{ label: "AI Grade", value: "A" }], ...overrides };
}

describe("SmartCollectionMatchRow — server-evaluated match with a real LiveProject", () => {
  it("renders via the existing LiveProjectCard, never a second card design", () => {
    render(
      <ul>
        <SmartCollectionMatchRow match={makeMatch()} />
      </ul>
    );
    expect(screen.getByText("Test Project")).toBeInTheDocument();
  });

  it("renders the real reason and evidence", () => {
    render(
      <ul>
        <SmartCollectionMatchRow match={makeMatch()} />
      </ul>
    );
    expect(screen.getByText("A real, specific reason.")).toBeInTheDocument();
    const evidenceLabel = screen.getByText("AI Grade:");
    expect(within(evidenceLabel.parentElement as HTMLElement).getByText("A")).toBeInTheDocument();
  });
});

describe("SmartCollectionMatchRow — client-evaluated match, no full LiveProject", () => {
  it("falls back to a real, working project link — never a broken one", () => {
    render(
      <ul>
        <SmartCollectionMatchRow match={makeMatch({ liveProject: null, projectSlug: "test-project" })} />
      </ul>
    );
    const link = screen.getByRole("link", { name: "Test Project" });
    expect(link).toHaveAttribute("href", "/dashboard/projects/test-project");
  });

  it("no slug resolvable: renders plain text, never a broken link", () => {
    render(
      <ul>
        <SmartCollectionMatchRow match={makeMatch({ liveProject: null, projectSlug: null })} />
      </ul>
    );
    expect(screen.queryByRole("link", { name: "Test Project" })).not.toBeInTheDocument();
    expect(screen.getByText("Test Project")).toBeInTheDocument();
  });
});

describe("SmartCollectionMatchRow — no fabricated evidence", () => {
  it("no evidence list is rendered when a match genuinely has none", () => {
    render(
      <ul>
        <SmartCollectionMatchRow match={makeMatch({ evidence: [] })} />
      </ul>
    );
    expect(screen.queryByText("AI Grade:")).not.toBeInTheDocument();
  });
});
