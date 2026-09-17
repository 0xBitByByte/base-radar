import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";

const RULE_STATE_KEY = "base-radar:wallet-automation-rule-state";
const PREFERENCES_KEY = "base-radar:automation-preferences";

// useWalletAutomation's own two genuine external/runtime boundaries —
// useWallet() (real wagmi provider state) and
// useWalletPortfolioIntelligence() (real on-chain RPC data, transitively
// via usePortfolio()) — are mocked here, the same narrow-mock convention
// already established in tests/components/wallet/WalletButton.test.tsx
// (mutable `let` + vi.mock factory closing over it) and
// tests/lib/hooks/useAIChat.test.ts. Everything else this hook actually
// orchestrates is left real: useAutomationPreferences() and
// useWalletAutomationRules() (both already coverage-closed) run their
// genuine localStorage-backed stores, and every wallet-automation lib
// function this hook calls (buildLifecycleEvents,
// buildPortfolioContentEvents, buildSmartPortfolioEvents,
// buildWalletAutomationResults, buildSmartWalletAutomationResults,
// buildAutomationSnapshot, buildAutomationDiff, buildAutomationMetadata —
// all already coverage-closed) runs unmocked. This file tests only
// useWalletAutomation's OWN orchestration: does it call those real
// functions with the right previous/current refs at the right time, does
// it correctly accumulate/cap/order state, and does it correctly exclude
// rules/preferences from its own effect dependencies — never re-testing
// the matching/diffing logic those already-tested functions own.
let mockWalletState = { isConnected: false, isSupportedNetwork: true };
let mockIntelligenceState: { intelligence: PortfolioIntelligence | null; chainSupported: boolean } = {
  intelligence: null,
  chainSupported: true,
};

vi.mock("@/lib/hooks/useWallet", () => ({ useWallet: () => mockWalletState }));
vi.mock("@/lib/hooks/useWalletPortfolioIntelligence", () => ({ useWalletPortfolioIntelligence: () => mockIntelligenceState }));

function intel(overrides: Partial<PortfolioIntelligence> = {}): PortfolioIntelligence {
  return {
    overallScore: 60,
    riskScore: 30,
    diversificationScore: 70,
    healthScore: 65,
    pricingCoverage: 100,
    unknownAssetCount: 0,
    totalUsdValue: 10000,
    largestHolding: { symbol: "ETH", name: "ETH", address: null, usdValue: 5000, allocationPct: 50 },
    largestProtocol: null,
    stablecoinExposure: 20,
    defiExposure: 30,
    concentrationRisk: { level: "moderate", topHoldingPct: 50, description: "" },
    recommendations: [],
    warnings: [],
    opportunities: [],
    summary: "",
    lastUpdated: "2026-09-04T00:00:00.000Z",
    healthBreakdown: [],
    quality: {
      verifiedAssetCount: 0,
      unverifiedAssetCount: 0,
      notCheckedAssetCount: 0,
      protocolsDetected: 0,
      diversificationRating: "Fair",
      diversificationRatingReason: "",
    },
    allocationBreakdown: {
      topHoldings: [],
      stablecoinPct: 20,
      ethPct: 50,
      otherPct: 30,
      unknownAssetPct: 0,
      protocolConcentrationPct: 0,
      largestProtocolName: null,
    },
    positiveContributors: [],
    negativeContributors: [],
    confidenceScore: 80,
    confidenceLevel: "High",
    fingerprint: "Mixed",
    fingerprintReason: "",
    executiveSummary: "",
    ...overrides,
  };
}

async function freshUseWalletAutomation() {
  vi.resetModules();
  mockWalletState = { isConnected: false, isSupportedNetwork: true };
  mockIntelligenceState = { intelligence: null, chainSupported: true };
  window.localStorage.removeItem(RULE_STATE_KEY);
  window.localStorage.removeItem(PREFERENCES_KEY);
  return import("@/lib/hooks/useWalletAutomation");
}

describe("useWalletAutomation — initial state", () => {
  it("with no wallet connected and no real intelligence, returns the honest empty/default state", async () => {
    const { useWalletAutomation } = await freshUseWalletAutomation();
    const { result } = renderHook(() => useWalletAutomation());

    expect(result.current.events).toEqual([]);
    expect(result.current.results).toEqual([]);
    expect(result.current.snapshot).toBeNull();
    expect(result.current.previousSnapshot).toBeNull();
    expect(result.current.diff).toBeNull();
    expect(result.current.automationEnabled).toBe(true);
    expect(result.current.rules.length).toBeGreaterThan(0);
    expect(result.current.metadata.eventCount).toBe(0);
    expect(result.current.metadata.triggeredResultCount).toBe(0);
  });
});

describe("useWalletAutomation — real wallet lifecycle transitions", () => {
  it("a genuine disconnected→connected transition produces a real WalletConnected event", async () => {
    const { useWalletAutomation } = await freshUseWalletAutomation();
    const { result, rerender } = renderHook(() => useWalletAutomation());
    expect(result.current.events).toEqual([]);

    mockWalletState = { isConnected: true, isSupportedNetwork: true };
    await act(async () => rerender());

    expect(result.current.events.some((event) => event.kind === "WalletConnected")).toBe(true);
  });

  it("a genuine connected→disconnected transition produces a real WalletDisconnected event, without duplicating the earlier WalletConnected one", async () => {
    const { useWalletAutomation } = await freshUseWalletAutomation();
    const { result, rerender } = renderHook(() => useWalletAutomation());

    // First establish a real baseline connection (mounts disconnected, per
    // freshUseWalletAutomation's own reset, then transitions to connected —
    // mirroring the real-world sequence a session actually goes through).
    mockWalletState = { isConnected: true, isSupportedNetwork: true };
    await act(async () => rerender());
    expect(result.current.events.filter((event) => event.kind === "WalletConnected")).toHaveLength(1);

    mockWalletState = { isConnected: false, isSupportedNetwork: true };
    await act(async () => rerender());

    expect(result.current.events.filter((event) => event.kind === "WalletDisconnected")).toHaveLength(1);
    // Still exactly the one real WalletConnected event from before — never re-fired or duplicated.
    expect(result.current.events.filter((event) => event.kind === "WalletConnected")).toHaveLength(1);
  });
});

describe("useWalletAutomation — real end-to-end automation orchestration", () => {
  it("the very first real intelligence snapshot sets snapshot but leaves previousSnapshot/diff honestly empty — nothing existed before it", async () => {
    const { useWalletAutomation } = await freshUseWalletAutomation();
    const { result, rerender } = renderHook(() => useWalletAutomation());

    mockIntelligenceState = { intelligence: intel({ healthScore: 65 }), chainSupported: true };
    await act(async () => rerender());

    expect(result.current.snapshot).not.toBeNull();
    expect(result.current.snapshot?.healthScore).toBe(65);
    expect(result.current.previousSnapshot).toBeNull();
    expect(result.current.diff?.changed).toEqual([]);
    // Edge-triggered per lib/wallet-automation/triggers.ts's own contract — a first-ever snapshot never fires a health/content event.
    expect(result.current.events).toEqual([]);
    expect(result.current.results).toEqual([]);
  });

  it("a genuine second intelligence change produces real events AND results, and previousSnapshot/diff correctly reflect the real transition", async () => {
    // healthScore alone only ever produces a real wallet-rule:health RESULT
    // (via buildWalletAutomationResults) — there is no health-related
    // ContentEventKind at all in lib/wallet-automation/summary.ts, so a
    // healthScore-only change never produces a tier-1 EVENT. overallScore
    // is changed too here specifically to also exercise the real
    // PortfolioScoreChanged event path, genuinely demonstrating both.
    const { useWalletAutomation } = await freshUseWalletAutomation();
    const { result, rerender } = renderHook(() => useWalletAutomation());

    mockIntelligenceState = { intelligence: intel({ healthScore: 50, overallScore: 40 }), chainSupported: true };
    await act(async () => rerender());

    mockIntelligenceState = { intelligence: intel({ healthScore: 90, overallScore: 90 }), chainSupported: true };
    await act(async () => rerender());

    expect(result.current.results.some((r) => r.ruleId === "wallet-rule:health")).toBe(true);
    expect(result.current.events.some((event) => event.kind === "PortfolioScoreChanged")).toBe(true);
    expect(result.current.previousSnapshot?.healthScore).toBe(50);
    expect(result.current.snapshot?.healthScore).toBe(90);
    expect(result.current.diff?.changed).toContain("healthScore");
  });

  it("a refresh with a genuinely new reference but identical field values appends zero new events/results, and reports an honestly empty diff", async () => {
    const { useWalletAutomation } = await freshUseWalletAutomation();
    const { result, rerender } = renderHook(() => useWalletAutomation());

    mockIntelligenceState = { intelligence: intel({ healthScore: 65 }), chainSupported: true };
    await act(async () => rerender());
    const eventsAfterFirst = result.current.events;
    const resultsAfterFirst = result.current.results;

    // A genuinely new object reference (as a real background refresh would produce), identical content.
    mockIntelligenceState = { intelligence: intel({ healthScore: 65 }), chainSupported: true };
    await act(async () => rerender());

    expect(result.current.events).toEqual(eventsAfterFirst);
    expect(result.current.results).toEqual(resultsAfterFirst);
    expect(result.current.diff?.changed).toEqual([]);
    // previousSnapshot still genuinely advances even on a no-op transition — it is not gated by the "any real change" check.
    expect(result.current.previousSnapshot?.healthScore).toBe(65);
  });
});

describe("useWalletAutomation — newest-first ordering and MAX_RECENT_EVENTS capping", () => {
  it("newest real events/results are prepended, not appended", async () => {
    const { useWalletAutomation } = await freshUseWalletAutomation();
    const { result, rerender } = renderHook(() => useWalletAutomation());

    mockIntelligenceState = { intelligence: intel({ healthScore: 50 }), chainSupported: true };
    await act(async () => rerender());
    mockIntelligenceState = { intelligence: intel({ healthScore: 90 }), chainSupported: true }; // health change #1
    await act(async () => rerender());
    mockIntelligenceState = { intelligence: intel({ healthScore: 40 }), chainSupported: true }; // health change #2, real and newer
    await act(async () => rerender());

    const healthResults = result.current.results.filter((r) => r.ruleId === "wallet-rule:health");
    expect(healthResults.length).toBe(2);
    // The most recent real transition's result is at index 0.
    expect(new Date(healthResults[0].triggeredAt).getTime()).toBeGreaterThanOrEqual(new Date(healthResults[1].triggeredAt).getTime());
  });

  it("caps retained events and results at the real MAX_RECENT_EVENTS (50), never growing unbounded", async () => {
    const { useWalletAutomation } = await freshUseWalletAutomation();
    const { result, rerender } = renderHook(() => useWalletAutomation());

    // 60 genuine alternating health-score transitions — each one a real, distinct >=3-point change.
    for (let i = 0; i < 60; i++) {
      mockIntelligenceState = { intelligence: intel({ healthScore: i % 2 === 0 ? 20 : 90 }), chainSupported: true };
      await act(async () => rerender());
    }

    expect(result.current.events.length).toBeLessThanOrEqual(50);
    expect(result.current.results.length).toBeLessThanOrEqual(50);
  }, 15000);
});

describe("useWalletAutomation — rules/preferences deliberately excluded from the effect's own dependencies", () => {
  it("toggling a real wallet rule's enabled state never retroactively appends a new event/result for an already-true condition", async () => {
    const { useWalletAutomation } = await freshUseWalletAutomation();
    const { setWalletRuleEnabled } = await import("@/lib/wallet-automation/rules");
    const { result, rerender } = renderHook(() => useWalletAutomation());

    mockIntelligenceState = { intelligence: intel({ healthScore: 50 }), chainSupported: true };
    await act(async () => rerender());
    mockIntelligenceState = { intelligence: intel({ healthScore: 90 }), chainSupported: true };
    await act(async () => rerender());

    const eventsBefore = result.current.events;
    const resultsBefore = result.current.results;

    act(() => setWalletRuleEnabled("wallet-rule:health", false));

    // The returned `rules` genuinely reflects the real toggle immediately...
    expect(result.current.rules.find((r) => r.id === "wallet-rule:health")!.enabled).toBe(false);
    // ...but the effect itself never re-ran because of it — no new/duplicate entries.
    expect(result.current.events).toEqual(eventsBefore);
    expect(result.current.results).toEqual(resultsBefore);
  });

  it("toggling the real automation master switch never retroactively appends a new event/result either", async () => {
    const { useWalletAutomation } = await freshUseWalletAutomation();
    const { setAutomationEnabled } = await import("@/lib/automation/preferences");
    const { result, rerender } = renderHook(() => useWalletAutomation());

    mockIntelligenceState = { intelligence: intel({ healthScore: 50 }), chainSupported: true };
    await act(async () => rerender());
    mockIntelligenceState = { intelligence: intel({ healthScore: 90 }), chainSupported: true };
    await act(async () => rerender());

    const resultsBefore = result.current.results;

    act(() => setAutomationEnabled(false));

    expect(result.current.automationEnabled).toBe(false);
    expect(result.current.results).toEqual(resultsBefore);
  });
});

describe("useWalletAutomation — real pass-through of mutations", () => {
  it("setRuleEnabled forwards to the real setWalletRuleEnabled", async () => {
    const { useWalletAutomation } = await freshUseWalletAutomation();
    const { getWalletAutomationRules } = await import("@/lib/wallet-automation/rules");
    const { result } = renderHook(() => useWalletAutomation());

    act(() => result.current.setRuleEnabled("wallet-rule:health", false));
    expect(getWalletAutomationRules().find((r) => r.id === "wallet-rule:health")!.enabled).toBe(false);
  });

  it("resetRules forwards to the real resetWalletAutomationRules", async () => {
    const { useWalletAutomation } = await freshUseWalletAutomation();
    const { getWalletAutomationRules } = await import("@/lib/wallet-automation/rules");
    const { result } = renderHook(() => useWalletAutomation());

    act(() => result.current.setRuleEnabled("wallet-rule:health", false));
    act(() => result.current.resetRules());
    expect(getWalletAutomationRules().every((r) => r.enabled)).toBe(true);
  });
});

describe("useWalletAutomation — reference stability", () => {
  it("snapshot and metadata stay the exact same reference across an unrelated re-render", async () => {
    const { useWalletAutomation } = await freshUseWalletAutomation();
    mockIntelligenceState = { intelligence: intel({ healthScore: 65 }), chainSupported: true };
    const { result, rerender } = renderHook(() => useWalletAutomation());

    const snapshotBefore = result.current.snapshot;
    const metadataBefore = result.current.metadata;
    rerender();

    expect(result.current.snapshot).toBe(snapshotBefore);
    expect(result.current.metadata).toBe(metadataBefore);
  });
});

describe("useWalletAutomation — unmount safety", () => {
  it("unmounts cleanly without throwing, with real intelligence and real events/results already present", async () => {
    const { useWalletAutomation } = await freshUseWalletAutomation();
    const { result, rerender, unmount } = renderHook(() => useWalletAutomation());

    mockIntelligenceState = { intelligence: intel({ healthScore: 50 }), chainSupported: true };
    await act(async () => rerender());
    mockIntelligenceState = { intelligence: intel({ healthScore: 90 }), chainSupported: true };
    await act(async () => rerender());
    expect(result.current.results.length).toBeGreaterThan(0);

    expect(() => unmount()).not.toThrow();
  });
});
