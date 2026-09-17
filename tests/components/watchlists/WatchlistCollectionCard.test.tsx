import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { WatchlistCollectionCard } from "@/components/watchlists/WatchlistCollectionCard";
import type { PersonalWatchlist } from "@/lib/personalization/types";
import type { LiveProject } from "@/lib/projects/types";

vi.mock("@/lib/hooks/useWatchlist", () => ({ useWatchlist: () => ({ isWatching: () => false, toggle: () => {} }) }));

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
    confidence: { score: 82, level: "high", source: "intelligence" },
    providerAttribution: null,
    discoveryEvidence: null,
    searchIdentifiers: { symbol: null, aliases: [], coingeckoId: null, defillamaSlug: null, github: null, contractAddresses: [] },
    market: { available: false, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: null },
    community: { verificationStatus: "verified", socialLinkCount: 0, socialLinkTotal: 10, governanceConfigured: false },
    engineering: { available: false, stars: null, forks: null, commitsLast7d: null, commitTrendPct: null, hasRecentActivity: false },
    governance: { configured: false, activeProposalCount: null, totalProposalCount: null },
    contracts: { count: 0, verifiedCount: 0 },
    health: { score: 80, label: "excellent", factors: [] },
    aiRating: "A",
    riskLevel: "low",
    riskContributors: [],
    lastUpdated: "2026-01-01T00:00:00.000Z",
    registryUpdatedAt: null,
    discoveryMetadata: null,
    ...overrides,
  } as LiveProject;
}

function makeWatchlist(overrides: Partial<PersonalWatchlist> = {}): PersonalWatchlist {
  return { id: "w1", name: "My Watchlist", description: "", icon: "star", color: "primary", pinned: false, projectIds: ["aave"], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", ...overrides };
}

const NOOP_HANDLERS = {
  onSetActive: () => {},
  onEdit: () => {},
  onAddProjects: () => {},
  onDuplicate: () => {},
  onDelete: () => {},
  onTogglePin: () => {},
  onMoveUp: () => {},
  onMoveDown: () => {},
  onRemoveProject: () => {},
};

describe("WatchlistCollectionCard", () => {
  it("surfaces real Risk level and Confidence for a watched project — not just AI Grade", () => {
    const liveProject = makeLiveProject();
    const liveProjectById = new Map([["aave", liveProject]]);
    render(
      <WatchlistCollectionCard
        watchlist={makeWatchlist()}
        liveProjectById={liveProjectById}
        active={false}
        canMoveUp={false}
        canMoveDown={false}
        {...NOOP_HANDLERS}
      />
    );
    expect(screen.getByText("Low Risk")).toBeInTheDocument();
    expect(screen.getByText("high Confidence")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("shows no AI Watch status chip when AI Watch has never been enabled", () => {
    const liveProjectById = new Map([["aave", makeLiveProject()]]);
    render(
      <WatchlistCollectionCard
        watchlist={makeWatchlist()}
        liveProjectById={liveProjectById}
        active={false}
        canMoveUp={false}
        canMoveDown={false}
        {...NOOP_HANDLERS}
      />
    );
    expect(screen.queryByText(/AI Watch/)).not.toBeInTheDocument();
  });
});
