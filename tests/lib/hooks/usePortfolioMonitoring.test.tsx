import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";

import { usePortfolioMonitoring } from "@/lib/hooks/usePortfolioMonitoring";
import { setPortfolioMonitoringEnabled } from "@/lib/portfolio-monitoring/storage";
import type { HeldProjectLink } from "@/lib/portfolio-intelligence/projectLinks";
import type { WhaleEvent } from "@/lib/whale/types";
import type { HoldingAsset } from "@/lib/holdings/types";
import type { LiveProject } from "@/lib/projects/types";

const CONFIG_KEY = "base-radar:portfolio-monitoring-config";
const ALERTS_KEY = "base-radar:portfolio-monitoring-alerts";
const BASELINE_KEY = "base-radar:portfolio-monitoring-governance-baseline";

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

describe("usePortfolioMonitoring", () => {
  beforeEach(() => {
    window.localStorage.removeItem(CONFIG_KEY);
    window.localStorage.removeItem(ALERTS_KEY);
    window.localStorage.removeItem(BASELINE_KEY);
  });
  afterEach(() => {
    window.localStorage.removeItem(CONFIG_KEY);
    window.localStorage.removeItem(ALERTS_KEY);
    window.localStorage.removeItem(BASELINE_KEY);
  });

  it("status is 'checking' while holdings are still loading", () => {
    const { result } = renderHook(() => usePortfolioMonitoring([], [], "loading"));
    expect(result.current.status).toBe("checking");
  });

  it("status is 'unavailable' on a real holdings load error — never evaluates in this state", () => {
    const { result } = renderHook(() => usePortfolioMonitoring([makeLink()], [makeWhaleEvent()], "error"));
    expect(result.current.status).toBe("unavailable");
    expect(result.current.alerts).toEqual([]);
  });

  it("the very first render (before any effect resolves) is the honest disabled default — never a fabricated 'already checked' state", () => {
    const { result } = renderHook(() => usePortfolioMonitoring([], [], "ready"));
    expect(result.current.enabled).toBe(false);
    expect(result.current.exists).toBe(false);
    expect(result.current.alerts).toEqual([]);
  });

  it("enabling and reaching 'ready' with a real held whale event fires a real alert", () => {
    act(() => setPortfolioMonitoringEnabled(true));
    const { result, rerender } = renderHook(({ status }: { status: "loading" | "ready" }) => usePortfolioMonitoring([makeLink()], [makeWhaleEvent()], status), { initialProps: { status: "loading" } });
    expect(result.current.alerts).toEqual([]);
    rerender({ status: "ready" });
    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.unreadCount).toBe(1);
  });

  it("heldProjectCount reflects the real number of matched held projects passed in", () => {
    const { result } = renderHook(() => usePortfolioMonitoring([makeLink(), makeLink({ project: makeProject({ id: "compound" }) })], [], "ready"));
    expect(result.current.heldProjectCount).toBe(2);
  });

  it("PR-090.07-established hydration safety: the server-rendered snapshot never reads live localStorage, even when a real enabled config already exists (which real SSR, with no `window`, could never see)", () => {
    act(() => setPortfolioMonitoringEnabled(true));

    function Probe() {
      const { enabled } = usePortfolioMonitoring([], [], "ready");
      return <span>{enabled ? "enabled" : "disabled"}</span>;
    }

    const html = renderToString(<Probe />);
    expect(html).not.toContain("enabled<");
    expect(html).toContain("disabled");
  });
});
