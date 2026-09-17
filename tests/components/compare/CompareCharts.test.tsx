import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { CompareCharts } from "@/components/compare/CompareCharts";
import type { LiveProject } from "@/lib/projects/types";

/**
 * JSDOM has no real layout engine and no `ResizeObserver` at all, so
 * Recharts' `ResponsiveContainer` (which needs one or the other to learn
 * its real pixel size) never mounts an actual chart SVG here by default —
 * confirmed directly: without this stub, `svg.recharts-surface` is 0 in
 * every test in this file, chart-content assertions included. A minimal,
 * scoped `ResizeObserver` stub (removed again in `afterAll`, never
 * touching global test setup) is the standard, real way to let this real
 * chart component actually render in a real DOM test, rather than testing
 * around the fact that it doesn't.
 */
class StubResizeObserver {
  private readonly callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback([{ target, contentRect: { width: 400, height: 260 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
  unobserve() {}
  disconnect() {}
}

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
    market: { available: true, priceUsd: 1, changePct24h: 1, changePct7d: 1, changePct30d: 1, marketCapUsd: 1_000_000, fdvUsd: 1_200_000, volume24hUsd: 50_000, liquidityUsd: 20_000, tvlUsd: 500_000 },
    community: { verificationStatus: "verified", socialLinkCount: 0, socialLinkTotal: 10, governanceConfigured: false },
    engineering: { available: true, stars: 100, forks: 10, commitsLast7d: null, commitTrendPct: null, hasRecentActivity: false },
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

const AAVE = makeLiveProject({ id: "aave", identity: { ...makeLiveProject().identity, name: "Aave" } });
const COMPOUND = makeLiveProject({
  id: "compound",
  identity: { ...makeLiveProject().identity, name: "Compound" },
  market: { ...makeLiveProject().market, tvlUsd: 250_000, marketCapUsd: 2_000_000, volume24hUsd: 10_000 },
  engineering: { available: true, stars: 50, forks: 5, commitsLast7d: null, commitTrendPct: null, hasRecentActivity: false },
  health: { score: 60, label: "good", factors: [] },
});

describe("CompareCharts", () => {
  it("renders the TVL/Market Cap/24h Volume panels and the Heatmap when real data exists", () => {
    render(<CompareCharts compared={[AAVE, COMPOUND]} />);
    expect(screen.getAllByText("TVL").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Market Cap").length).toBeGreaterThan(0);
    expect(screen.getAllByText("24h Volume").length).toBeGreaterThan(0);
    expect(screen.getByText(/Heatmap/)).toBeInTheDocument();
  });

  it("renders the Intelligence Radar legend with one entry per compared project", () => {
    render(<CompareCharts compared={[AAVE, COMPOUND]} />);
    expect(screen.getAllByText("Aave").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Compound").length).toBeGreaterThan(0);
  });

  it("never renders a metric panel when every compared project genuinely has no data for it", () => {
    const noTvl = { ...AAVE, market: { ...AAVE.market, tvlUsd: null } };
    const noTvl2 = { ...COMPOUND, market: { ...COMPOUND.market, tvlUsd: null } };
    render(<CompareCharts compared={[noTvl, noTvl2]} />);
    expect(screen.queryByText("TVL")).not.toBeInTheDocument();
    // Market Cap still has real data for both, so it still renders.
    expect(screen.getAllByText("Market Cap").length).toBeGreaterThan(0);
  });

  it("shows Not Tracked in the Heatmap for a project with genuinely no value on a shown row, never a fabricated number", () => {
    const noHealth = { ...COMPOUND, health: null };
    render(<CompareCharts compared={[AAVE, noHealth]} />);
    expect(screen.getByText("Not Tracked")).toBeInTheDocument();
  });

  // Accessibility fix — every chart's root SVG previously rendered as an
  // unlabeled, focusable `role="application"` region (Recharts'
  // `accessibilityLayer` default). Each chart now carries a real `title`/
  // `desc`, which Recharts renders as real `<title>`/`<desc>` child
  // elements of the SVG — the standard SVG accessible-name/description
  // mechanism, not a new pattern invented for this fix.
  describe("with a real ResizeObserver so the chart SVGs actually mount", () => {
    const originalResizeObserver = global.ResizeObserver;

    beforeAll(() => {
      vi.stubGlobal("ResizeObserver", StubResizeObserver);
    });
    afterAll(() => {
      vi.stubGlobal("ResizeObserver", originalResizeObserver);
    });

    it("gives every chart a real, non-empty accessible name and description, naming the real compared projects", () => {
      const { container } = render(<CompareCharts compared={[AAVE, COMPOUND]} />);
      const svgs = container.querySelectorAll("svg.recharts-surface");
      expect(svgs.length).toBeGreaterThan(0);
      svgs.forEach((svg) => {
        const title = svg.querySelector("title")?.textContent ?? "";
        const desc = svg.querySelector("desc")?.textContent ?? "";
        expect(title.length).toBeGreaterThan(0);
        expect(desc).toContain("Aave");
        expect(desc).toContain("Compound");
      });
    });
  });
});
