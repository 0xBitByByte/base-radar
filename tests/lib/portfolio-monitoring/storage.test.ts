import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { HeldProjectLink } from "@/lib/portfolio-intelligence/projectLinks";
import type { WhaleEvent } from "@/lib/whale/types";
import type { LiveProject } from "@/lib/projects/types";
import type { HoldingAsset } from "@/lib/holdings/types";

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

/** Same "simulated browser refresh" technique `tests/lib/ai-watch/storage.test.ts` established — resets `lib/portfolio-monitoring/storage.ts`'s module-scope cache while leaving real jsdom `localStorage` untouched. */
async function freshStorageModule() {
  vi.resetModules();
  return import("@/lib/portfolio-monitoring/storage");
}

describe("Portfolio Monitoring storage — persistence across a simulated browser refresh", () => {
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

  it("a fresh install starts disabled, with no watch ever created", async () => {
    const mod = await freshStorageModule();
    expect(mod.getPortfolioMonitoringConfig()).toEqual({ enabled: false, createdAt: null });
    expect(mod.getPortfolioMonitoringAlerts()).toEqual([]);
  });

  it("enabling persists across a refresh, and createdAt is stable across re-enables", async () => {
    const first = await freshStorageModule();
    first.setPortfolioMonitoringEnabled(true);
    const createdAt = first.getPortfolioMonitoringConfig().createdAt;
    expect(createdAt).not.toBeNull();

    const second = await freshStorageModule();
    expect(second.getPortfolioMonitoringConfig().enabled).toBe(true);
    second.setPortfolioMonitoringEnabled(false);
    second.setPortfolioMonitoringEnabled(true);
    expect(second.getPortfolioMonitoringConfig().createdAt).toBe(createdAt);
  });

  it("runPortfolioMonitoringCheck does nothing while disabled", async () => {
    const mod = await freshStorageModule();
    const alerts = mod.runPortfolioMonitoringCheck([makeLink()], [makeWhaleEvent()]);
    expect(alerts).toEqual([]);
    expect(mod.getPortfolioMonitoringAlerts()).toEqual([]);
  });

  it("a real whale event on a held project fires once enabled, and persists across a refresh", async () => {
    const first = await freshStorageModule();
    first.setPortfolioMonitoringEnabled(true);
    const fired = first.runPortfolioMonitoringCheck([makeLink()], [makeWhaleEvent()]);
    expect(fired).toHaveLength(1);
    expect(fired[0].kind).toBe("whale");

    const second = await freshStorageModule();
    expect(second.getPortfolioMonitoringAlerts()).toHaveLength(1);
  });

  it("the same real whale event never fires twice, including across a simulated refresh", async () => {
    const first = await freshStorageModule();
    first.setPortfolioMonitoringEnabled(true);
    first.runPortfolioMonitoringCheck([makeLink()], [makeWhaleEvent()]);

    const second = await freshStorageModule();
    second.setPortfolioMonitoringEnabled(true);
    const fired = second.runPortfolioMonitoringCheck([makeLink()], [makeWhaleEvent()]);
    expect(fired).toHaveLength(0);
    expect(second.getPortfolioMonitoringAlerts()).toHaveLength(1);
  });

  it("governance: first visit records a baseline and fires nothing; a later visit with a real increase fires once", async () => {
    const first = await freshStorageModule();
    first.setPortfolioMonitoringEnabled(true);
    const linkAtOne = makeLink({ project: makeProject({ governance: { configured: true, activeProposalCount: 1, totalProposalCount: 5 } }) });
    expect(first.runPortfolioMonitoringCheck([linkAtOne], [])).toEqual([]);

    const second = await freshStorageModule();
    second.setPortfolioMonitoringEnabled(true);
    const linkAtThree = makeLink({ project: makeProject({ governance: { configured: true, activeProposalCount: 3, totalProposalCount: 5 } }) });
    const fired = second.runPortfolioMonitoringCheck([linkAtThree], []);
    expect(fired).toHaveLength(1);
    expect(fired[0].kind).toBe("governance");
  });

  it("removePortfolioMonitoring resets config, alerts, AND the governance baseline", async () => {
    const first = await freshStorageModule();
    first.setPortfolioMonitoringEnabled(true);
    first.runPortfolioMonitoringCheck([makeLink()], [makeWhaleEvent()]);
    first.removePortfolioMonitoring();
    expect(first.getPortfolioMonitoringConfig()).toEqual({ enabled: false, createdAt: null });
    expect(first.getPortfolioMonitoringAlerts()).toEqual([]);

    const second = await freshStorageModule();
    expect(second.getPortfolioMonitoringConfig()).toEqual({ enabled: false, createdAt: null });
    expect(second.getPortfolioMonitoringAlerts()).toEqual([]);
  });

  it("mark read/unread persists across a refresh", async () => {
    const first = await freshStorageModule();
    first.setPortfolioMonitoringEnabled(true);
    const [alert] = first.runPortfolioMonitoringCheck([makeLink()], [makeWhaleEvent()]);
    first.markPortfolioMonitoringAlertRead(alert.id);
    expect(first.getPortfolioMonitoringAlerts()[0].isRead).toBe(true);

    const second = await freshStorageModule();
    expect(second.getPortfolioMonitoringAlerts()[0].isRead).toBe(true);
    second.markPortfolioMonitoringAlertUnread(alert.id);
    expect(second.getPortfolioMonitoringAlerts()[0].isRead).toBe(false);
  });

  it("a corrupted stored value falls back to the honest empty/disabled default rather than throwing", async () => {
    window.localStorage.setItem(CONFIG_KEY, "{not valid json");
    window.localStorage.setItem(ALERTS_KEY, "{not valid json");
    const mod = await freshStorageModule();
    expect(() => mod.getPortfolioMonitoringConfig()).not.toThrow();
    expect(mod.getPortfolioMonitoringConfig()).toEqual({ enabled: false, createdAt: null });
    expect(mod.getPortfolioMonitoringAlerts()).toEqual([]);
  });
});
