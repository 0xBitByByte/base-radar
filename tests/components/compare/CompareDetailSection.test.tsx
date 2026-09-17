import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { CompareDetailSection } from "@/components/compare/CompareDetailSection";
import type { CompareProjectDetail } from "@/lib/compare/detail";
import type { LiveProject } from "@/lib/projects/types";

function makeLiveProject(overrides: Partial<LiveProject> = {}): LiveProject {
  return {
    id: "test-project",
    slug: "test-project",
    source: "registry",
    identity: {
      name: "Test Project",
      shortDescription: null,
      description: null,
      logoUrl: null,
      logoUrlFallbacks: [],
      websiteUrl: null,
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
    market: { available: true, priceUsd: 1, changePct24h: 1, changePct7d: 1, changePct30d: 1, marketCapUsd: 1, fdvUsd: 1, volume24hUsd: 1, liquidityUsd: 1, tvlUsd: 1 },
    community: { verificationStatus: "verified", socialLinkCount: 0, socialLinkTotal: 10, governanceConfigured: false },
    engineering: { available: true, stars: 1, forks: 1, commitsLast7d: null, commitTrendPct: null, hasRecentActivity: false },
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

const AAVE = makeLiveProject({ id: "aave", slug: "aave", identity: { ...makeLiveProject().identity, name: "Aave" } });
const DISCOVERY_ONLY = makeLiveProject({ id: "disco", slug: null, source: "discovery", identity: { ...makeLiveProject().identity, name: "Discovery Project" } });

function renderWithClient(compared: LiveProject[]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CompareDetailSection compared={compared} />
    </QueryClientProvider>
  );
}

describe("CompareDetailSection", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders real Bull Case / Bear Case bullets and real contract detail once the fetch resolves (PR-091.03, PR-091.05)", async () => {
    const detail: CompareProjectDetail = {
      recommendation: "Suitable for Deeper Research",
      strengths: ["Verified in the Base Radar registry."],
      weaknesses: [],
      opportunities: ["Deployed across 2 chains."],
      threats: [],
      contracts: [{ address: "0xabc123", chain: "base", ok: true, verified: true, isContract: true, proxyType: null, compilerVersion: "0.8.19", licenseType: "MIT" }],
    };
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => detail } as Response);

    renderWithClient([AAVE]);

    await waitFor(() => expect(screen.getByText("Verified in the Base Radar registry.")).toBeInTheDocument());
    expect(screen.getByText("Deployed across 2 chains.")).toBeInTheDocument();
    expect(screen.getByText("Bull Case")).toBeInTheDocument();
    expect(screen.queryByText("Bear Case")).not.toBeInTheDocument(); // no weaknesses/threats for this fixture
    expect(screen.getByText("MIT license")).toBeInTheDocument();
    expect(screen.getByText("Compiler 0.8.19")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  it("shows an honest 'no strengths or risks' message rather than an empty Bull/Bear section", async () => {
    const detail: CompareProjectDetail = { recommendation: "Monitor Closely", strengths: [], weaknesses: [], opportunities: [], threats: [], contracts: [] };
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => detail } as Response);

    renderWithClient([AAVE]);

    await waitFor(() => expect(screen.getByText("No strengths or risks currently flagged for this project.")).toBeInTheDocument());
    expect(screen.getByText("No registered contracts for this project.")).toBeInTheDocument();
  });

  it("never fetches for a discovery-only project and says so honestly", () => {
    renderWithClient([DISCOVERY_ONLY]);
    expect(screen.getByText(/No AI Intelligence report/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows a real error message, never fabricated data, when the detail fetch fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response);

    renderWithClient([AAVE]);

    await waitFor(() => expect(screen.getByText(/Couldn't load intelligence/)).toBeInTheDocument());
  });
});
