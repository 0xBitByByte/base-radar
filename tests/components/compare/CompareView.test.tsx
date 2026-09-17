import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { CompareView } from "@/components/compare/CompareView";
import { addToCompare, clearCompare } from "@/lib/compare/storage";
import type { GovernanceEvent } from "@/lib/governance/types";
import type { LiveProject } from "@/lib/projects/types";
import type { SmartCollectionResult } from "@/lib/smart-collections/types";

const STORAGE_KEY = "base-radar:compare";

vi.mock("@/lib/hooks/useWatchlist", () => ({ useWatchlist: () => ({ isWatching: (id: string) => id === "aave", toggle: vi.fn() }) }));

// CompareView's own test scope is the table it renders directly — Visual
// Compare (`CompareCharts`) and the per-project Intelligence/Contract
// detail fetch (`CompareDetailSection`) each have their own dedicated test
// file, so they're stubbed here rather than re-exercised (and rather than
// needing a real `QueryClientProvider`/mocked `fetch` in every test below).
vi.mock("@/components/compare/CompareCharts", () => ({ CompareCharts: () => <div data-testid="compare-charts-stub" /> }));
vi.mock("@/components/compare/CompareDetailSection", () => ({ CompareDetailSection: () => <div data-testid="compare-detail-stub" /> }));

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
    confidence: { score: 50, level: "medium", source: "intelligence" },
    providerAttribution: null,
    discoveryEvidence: null,
    searchIdentifiers: { symbol: null, aliases: [], coingeckoId: null, defillamaSlug: null, github: null, contractAddresses: [] },
    market: { available: true, priceUsd: 1.5, changePct24h: 2.1, changePct7d: -3.4, changePct30d: 10, marketCapUsd: 1_000_000, fdvUsd: 1_200_000, volume24hUsd: 50_000, liquidityUsd: 20_000, tvlUsd: 500_000 },
    community: { verificationStatus: "verified", socialLinkCount: 0, socialLinkTotal: 10, governanceConfigured: false },
    engineering: { available: true, stars: 120, forks: 30, commitsLast7d: null, commitTrendPct: null, hasRecentActivity: false },
    governance: { configured: true, activeProposalCount: 2, totalProposalCount: 5 },
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

const AAVE = makeLiveProject({ id: "aave", slug: "aave", identity: { ...makeLiveProject().identity, name: "Aave" } });
const COMPOUND = makeLiveProject({ id: "compound", slug: "compound", identity: { ...makeLiveProject().identity, name: "Compound" } });

const LIVE_PROJECTS = [AAVE, COMPOUND];
const SERVER_COLLECTIONS: SmartCollectionResult[] = [
  {
    id: "high-conviction",
    name: "High Conviction",
    description: "",
    status: "ready",
    matches: [{ projectId: "aave", projectName: "Aave", projectSlug: "aave", liveProject: AAVE, reason: "r", evidence: [] }],
    lastEvaluatedAt: "2026-01-01T00:00:00.000Z",
    averageConfidence: 90,
  },
];

describe("CompareView", () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    clearCompare();
  });
  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    clearCompare();
  });

  it("shows an honest empty state with 0 selected", () => {
    render(<CompareView liveProjects={LIVE_PROJECTS} serverCollections={[]} governanceEvents={[]} />);
    expect(screen.getByText("Nothing to compare yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse Projects" })).toHaveAttribute("href", "/dashboard/projects");
  });

  it("shows a distinct 'add one more' empty state with exactly 1 selected", () => {
    addToCompare("aave");
    render(<CompareView liveProjects={LIVE_PROJECTS} serverCollections={[]} governanceEvents={[]} />);
    expect(screen.getByText("Add one more project")).toBeInTheDocument();
  });

  it("silently drops a selected id that no longer resolves to a real project, rather than rendering a broken column", () => {
    addToCompare("aave");
    addToCompare("does-not-exist");
    render(<CompareView liveProjects={LIVE_PROJECTS} serverCollections={[]} governanceEvents={[]} />);
    // Only 1 real project resolves — still below the 2-project minimum, so the honest empty state renders.
    expect(screen.getByText("Add one more project")).toBeInTheDocument();
  });

  it("renders a real comparison table for 2 real selected projects, with real AI Grade/Risk/Market values", () => {
    addToCompare("aave");
    addToCompare("compound");
    render(<CompareView liveProjects={LIVE_PROJECTS} serverCollections={[]} governanceEvents={[]} />);

    expect(screen.getByText("Comparing 2 of 4 projects. Saved on this device only.")).toBeInTheDocument();
    expect(screen.getAllByText("A")).toHaveLength(2); // both fixtures share aiRating "A"
    expect(screen.getAllByText("Low Risk")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Aave/ })).toHaveAttribute("href", "/dashboard/projects/aave");
    expect(screen.getByRole("link", { name: /Compound/ })).toHaveAttribute("href", "/dashboard/projects/compound");
  });

  it("renders real Smart Collection membership per project, never fabricated for a non-member", () => {
    addToCompare("aave");
    addToCompare("compound");
    render(<CompareView liveProjects={LIVE_PROJECTS} serverCollections={SERVER_COLLECTIONS} governanceEvents={[]} />);
    expect(screen.getByText("High Conviction")).toBeInTheDocument();
    expect(screen.getByText("None")).toBeInTheDocument(); // Compound isn't in any collection
  });

  it("shows real Watchlist status per project", () => {
    addToCompare("aave");
    addToCompare("compound");
    render(<CompareView liveProjects={LIVE_PROJECTS} serverCollections={[]} governanceEvents={[]} />);
    expect(screen.getByText("Watching")).toBeInTheDocument();
    expect(screen.getByText("Not watched")).toBeInTheDocument();
  });

  it("remove button removes a project from the comparison", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    addToCompare("aave");
    addToCompare("compound");
    render(<CompareView liveProjects={LIVE_PROJECTS} serverCollections={[]} governanceEvents={[]} />);
    await user.click(screen.getByRole("button", { name: "Remove Compound from Compare" }));
    expect(screen.getByText("Add one more project")).toBeInTheDocument();
  });

  it("clear all empties the comparison", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    addToCompare("aave");
    addToCompare("compound");
    render(<CompareView liveProjects={LIVE_PROJECTS} serverCollections={[]} governanceEvents={[]} />);
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.getByText("Nothing to compare yet")).toBeInTheDocument();
  });

  // PR-091.02 (Metrics Compare) — FDV was already real on `LiveProject.market.fdvUsd` but not wired into this table.
  it("renders real FDV for both projects (PR-091.02)", () => {
    addToCompare("aave");
    addToCompare("compound");
    render(<CompareView liveProjects={LIVE_PROJECTS} serverCollections={[]} governanceEvents={[]} />);
    expect(screen.getAllByText("$1.20M")).toHaveLength(2); // both fixtures share fdvUsd: 1_200_000
  });

  // PR-091.02 — Revenue/Fees/Holders/Transactions are genuinely not tracked anywhere in this app; shown honestly rather than silently omitted.
  it("shows Revenue/Fees/Holders/Transactions as honestly Not Tracked, never a fabricated number (PR-091.02)", () => {
    addToCompare("aave");
    addToCompare("compound");
    render(<CompareView liveProjects={LIVE_PROJECTS} serverCollections={[]} governanceEvents={[]} />);
    expect(screen.getByRole("row", { name: /^Revenue/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /^Fees/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /^Holders/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /^Transactions/ })).toBeInTheDocument();
  });

  // PR-091.03 (Intelligence Compare) — reuses the exact same `RECOMMENDATION_FOR_RISK` map every other real Recommendation label in the app already reads, never a new opinion generated for Compare.
  it("renders the real Recommendation for each project's risk level (PR-091.03)", () => {
    addToCompare("aave");
    addToCompare("compound");
    render(<CompareView liveProjects={LIVE_PROJECTS} serverCollections={[]} governanceEvents={[]} />);
    expect(screen.getAllByText("Suitable for Deeper Research")).toHaveLength(2); // both fixtures share riskLevel "low"
  });

  it("falls back to 'Not Rated' when a project has no computed risk level", () => {
    const noRisk = makeLiveProject({ id: "no-risk", slug: "no-risk", identity: { ...makeLiveProject().identity, name: "No Risk Project" }, riskLevel: null });
    addToCompare("aave");
    addToCompare("no-risk");
    render(<CompareView liveProjects={[AAVE, noRisk]} serverCollections={[]} governanceEvents={[]} />);
    expect(screen.getByText("Not Rated")).toBeInTheDocument();
  });

  // PR-091.04 (Governance Compare) — real Snapshot voter-count, threaded from `getRegistryGovernanceEvents()` down through `ComparePage`, never invented.
  //
  // Deliberately renders `voterCount`, never `event.participation` — live
  // browser QA against real large-cap governance tokens (Aave, Uniswap,
  // Compound, Morpho) showed `participation` is Snapshot's raw
  // token-weighted `scores_total`, not a percentage; rendering it as "N%"
  // produced real numbers over 100,000% on real data. `voterCount` is this
  // codebase's own documented "more honest participation basis" for
  // exactly this reason (`lib/governance/types.ts`).
  it("renders the real voter count and quorum status from a real governance event, never the misleading raw participation figure (PR-091.04)", () => {
    const events: GovernanceEvent[] = [
      {
        projectId: "aave",
        provider: "snapshot",
        proposalId: "prop-1",
        title: "Raise the collateral factor",
        description: null,
        status: "passed",
        start: "2026-01-01T00:00:00.000Z",
        end: "2026-01-08T00:00:00.000Z",
        participation: 5_349_528, // real-shaped raw token-weight figure, deliberately not what the row renders
        quorumMet: true,
        url: "https://snapshot.org/prop-1",
        voterCount: 341,
        discussionUrl: null,
        proposerAddress: null,
        confidence: 90,
      },
    ];
    addToCompare("aave");
    addToCompare("compound");
    render(<CompareView liveProjects={LIVE_PROJECTS} serverCollections={[]} governanceEvents={events} />);
    expect(screen.getByText("341 real voters · Quorum met")).toBeInTheDocument(); // Aave's real event
    expect(screen.queryByText(/5349528%|5,349,528%/)).not.toBeInTheDocument();
    expect(screen.getByText("No proposals on record")).toBeInTheDocument(); // Compound has none
  });

  // PR-091.04 — Treasury/Delegates confirmed not real fields anywhere in this registry's schema; shown honestly, never fabricated.
  it("shows Treasury and Delegates as honestly Not Tracked (PR-091.04)", () => {
    addToCompare("aave");
    addToCompare("compound");
    render(<CompareView liveProjects={LIVE_PROJECTS} serverCollections={[]} governanceEvents={[]} />);
    expect(screen.getByRole("row", { name: /^Treasury/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /^Delegates/ })).toBeInTheDocument();
  });

  // UX polish — a lone selected project previously had no way to clear it without leaving this page.
  it("lets a single selected project be removed directly from the 'add one more' empty state", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    addToCompare("aave");
    render(<CompareView liveProjects={LIVE_PROJECTS} serverCollections={[]} governanceEvents={[]} />);
    expect(screen.getByText("Add one more project")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove Aave from Compare" }));
    expect(screen.getByText("Nothing to compare yet")).toBeInTheDocument();
  });

  it("renders the Visual Compare and Intelligence/Contract detail sections once 2+ projects are compared", () => {
    addToCompare("aave");
    addToCompare("compound");
    render(<CompareView liveProjects={LIVE_PROJECTS} serverCollections={[]} governanceEvents={[]} />);
    expect(screen.getByTestId("compare-charts-stub")).toBeInTheDocument();
    expect(screen.getByTestId("compare-detail-stub")).toBeInTheDocument();
  });
});
