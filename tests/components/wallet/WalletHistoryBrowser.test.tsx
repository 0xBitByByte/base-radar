import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { HistoryBrowserSection } from "@/components/wallet/WalletHistoryBrowser";
import type { UseWalletHistoryResult } from "@/lib/hooks/useWalletHistory";
import type { AnalyticsHighlight } from "@/lib/wallet-analytics/types";
import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";

function snap(overrides: Partial<AnalyticsSnapshot> & { timestamp: string }): AnalyticsSnapshot {
  return {
    analyticsVersion: 1,
    overallScore: 60,
    healthScore: 65,
    riskScore: 30,
    confidenceScore: 80,
    confidenceLevel: "High",
    fingerprint: "Mixed",
    largestHoldingSymbol: "ETH",
    largestProtocolName: null,
    primaryRecommendationId: null,
    topWarningId: null,
    totalValue: 10000,
    stablecoinExposure: 20,
    ethPct: 50,
    diversificationScore: 70,
    pricingCoverage: 100,
    unknownAssetCount: 0,
    warningIds: [],
    topHoldings: [],
    ...overrides,
  };
}

function makeWalletHistory(history: AnalyticsSnapshot[]): UseWalletHistoryResult {
  return {
    history,
    latestSnapshot: history[history.length - 1] ?? null,
    newestSnapshot: history[history.length - 1] ?? null,
    oldestSnapshot: history[0] ?? null,
    snapshotCount: history.length,
    storageSizeBytes: 0,
    isEmpty: history.length === 0,
    clearHistory: () => {},
  };
}

describe("HistoryBrowserSection", () => {
  it("EMPTY HISTORY: shows an honest empty state, no crash", () => {
    render(<HistoryBrowserSection walletHistory={makeWalletHistory([])} />);
    expect(screen.getByText("No snapshots yet.")).toBeInTheDocument();
  });

  it("renders real snapshots grouped by recency with real group headers", () => {
    const now = new Date();
    const history = [snap({ timestamp: now.toISOString(), healthScore: 70 })];
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(history)} />);
    expect(screen.getByText(/Today \(1\)/)).toBeInTheDocument();
  });

  it("SELECTION / DETAIL EXPANSION: clicking a snapshot card expands it to show real stored metadata", async () => {
    const user = userEvent.setup();
    const history = [snap({ timestamp: new Date().toISOString(), healthScore: 70, riskScore: 42, analyticsVersion: 1 })];
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(history)} />);

    const card = screen.getByRole("button", { name: /Health 70/ });
    expect(card).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Snapshot Version")).not.toBeInTheDocument();

    await user.click(card);

    expect(card).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Snapshot Version")).toBeInTheDocument();
    expect(screen.getByText("Risk Score")).toBeInTheDocument();
  });

  it("clicking an expanded card again collapses it", async () => {
    const user = userEvent.setup();
    const history = [snap({ timestamp: new Date().toISOString(), healthScore: 70 })];
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(history)} />);

    const card = screen.getByRole("button", { name: /Health 70/ });
    await user.click(card);
    expect(screen.getByText("Snapshot Version")).toBeInTheDocument();

    await user.click(card);
    expect(screen.queryByText("Snapshot Version")).not.toBeInTheDocument();
  });

  it("only one snapshot is expanded at a time — selecting a different one switches", async () => {
    const user = userEvent.setup();
    const now = new Date();
    const history = [
      snap({ timestamp: new Date(now.getTime() - 60000).toISOString(), healthScore: 50, riskScore: 10 }),
      snap({ timestamp: now.toISOString(), healthScore: 90, riskScore: 90 }),
    ];
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(history)} />);

    const cardA = screen.getByRole("button", { name: /Health 50/ });
    const cardB = screen.getByRole("button", { name: /Health 90/ });

    await user.click(cardA);
    expect(cardA).toHaveAttribute("aria-expanded", "true");
    expect(cardB).toHaveAttribute("aria-expanded", "false");

    await user.click(cardB);
    expect(cardA).toHaveAttribute("aria-expanded", "false");
    expect(cardB).toHaveAttribute("aria-expanded", "true");
  });

  it("FILTERING: selecting a fingerprint narrows the visible list to real matches only", async () => {
    const user = userEvent.setup();
    const now = new Date();
    const history = [
      snap({ timestamp: new Date(now.getTime() - 120000).toISOString(), fingerprint: "Balanced", healthScore: 50 }),
      snap({ timestamp: new Date(now.getTime() - 60000).toISOString(), fingerprint: "Growth", healthScore: 70 }),
      snap({ timestamp: now.toISOString(), fingerprint: "Growth", healthScore: 90 }),
    ];
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(history)} />);

    expect(screen.getByRole("button", { name: /Health 50/ })).toBeInTheDocument();

    const select = screen.getByLabelText("Fingerprint");
    await user.selectOptions(select, "Growth");

    expect(screen.queryByRole("button", { name: /Health 50/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Health 70/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Health 90/ })).toBeInTheDocument();
  });

  it("SORT ORDER: toggling to 'oldest' changes the real display order", async () => {
    const user = userEvent.setup();
    const now = new Date();
    const history = [
      snap({ timestamp: new Date(now.getTime() - 60000).toISOString(), healthScore: 50 }),
      snap({ timestamp: now.toISOString(), healthScore: 90 }),
    ];
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(history)} />);

    let cards = screen.getAllByRole("button", { name: /Health/ });
    expect(cards[0]).toHaveTextContent("Health 90"); // newest first by default

    await user.click(screen.getByRole("button", { name: "oldest" }));

    cards = screen.getAllByRole("button", { name: /Health/ });
    expect(cards[0]).toHaveTextContent("Health 50"); // oldest first now
  });

  it("HIGHLIGHT INTEGRATION: a highlight whose real dedupeKey timestamp matches a snapshot shows as metadata on that card, never recomputed", () => {
    const timestamp = new Date().toISOString();
    const history = [snap({ timestamp, healthScore: 70 })];
    const highlights: AnalyticsHighlight[] = [
      {
        type: "recovery",
        priority: "important",
        stars: 4,
        title: "Recovered from High Risk",
        reason: "Risk improved.",
        supportingMetric: "80 → 20",
        topic: "risk",
        dedupeKey: `recovery:risk:${timestamp}`,
      },
    ];
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(history)} highlights={highlights} />);
    expect(screen.getByText("Recovered from High Risk")).toBeInTheDocument();
  });

  it("a highlight with no matching real snapshot timestamp shows nothing — never a guessed attribution", () => {
    const history = [snap({ timestamp: new Date().toISOString(), healthScore: 70 })];
    const highlights: AnalyticsHighlight[] = [
      { type: "biggestImprovement", priority: "important", stars: 4, title: "Biggest Improvement: Health", reason: "x", supportingMetric: null, topic: "health", dedupeKey: "biggestImprovement:health:biggest" },
    ];
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(history)} highlights={highlights} />);
    expect(screen.queryByText("Biggest Improvement: Health")).not.toBeInTheDocument();
  });

  it("LARGE HISTORY: renders 90 real snapshots without crashing", () => {
    const now = Date.now();
    const history = Array.from({ length: 90 }, (_, i) => snap({ timestamp: new Date(now - i * 3600_000).toISOString(), healthScore: 40 + (i % 60) }));
    expect(() => render(<HistoryBrowserSection walletHistory={makeWalletHistory(history)} />)).not.toThrow();
  });

  it("no filter matches — shows an honest 'no matches' message, not a blank screen", async () => {
    const user = userEvent.setup();
    const history = [snap({ timestamp: new Date().toISOString(), healthScore: 50 })];
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(history)} />);

    const healthMin = within(screen.getByText("Health min–max").closest("label")!).getAllByRole("spinbutton")[0];
    await user.type(healthMin, "99");

    expect(screen.getByText("No snapshots match these filters.")).toBeInTheDocument();
  });
});

describe("HistoryBrowserSection — V4-HISTORY-003 Snapshot Compare", () => {
  const now = new Date();
  const threeSnapshots = [
    snap({ timestamp: new Date(now.getTime() - 2 * 3600_000).toISOString(), healthScore: 40, totalValue: 8000 }),
    snap({ timestamp: new Date(now.getTime() - 1 * 3600_000).toISOString(), healthScore: 60, totalValue: 10000 }),
    snap({ timestamp: now.toISOString(), healthScore: 90, totalValue: 14000 }),
  ];

  it("clicking 'Compare' enters selection mode with an honest 'select 2 more' prompt", async () => {
    const user = userEvent.setup();
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(threeSnapshots)} />);

    await user.click(screen.getByRole("button", { name: /^Compare$/ }));
    expect(screen.getByText("Select 2 more snapshots to compare.")).toBeInTheDocument();
  });

  it("SINGLE SELECTION: selecting one snapshot updates the prompt to 'select 1 more', comparison view not shown yet", async () => {
    const user = userEvent.setup();
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(threeSnapshots)} />);

    await user.click(screen.getByRole("button", { name: /^Compare$/ }));
    await user.click(screen.getByRole("button", { name: /Health 40/ }));

    expect(screen.getByText("Select 1 more snapshot to compare.")).toBeInTheDocument();
    expect(screen.queryByText("Compare Snapshots")).not.toBeInTheDocument();
  });

  it("DOUBLE SELECTION: selecting a second snapshot auto-transitions to the real comparison view", async () => {
    const user = userEvent.setup();
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(threeSnapshots)} />);

    await user.click(screen.getByRole("button", { name: /^Compare$/ }));
    await user.click(screen.getByRole("button", { name: /Health 40/ }));
    await user.click(screen.getByRole("button", { name: /Health 60/ }));

    expect(screen.getByText("Compare Snapshots")).toBeInTheDocument();
    expect(screen.getAllByText("+20")).toHaveLength(2); // real health delta between the two selected snapshots
  });

  it("REPLACEMENT: clicking an already-selected snapshot again deselects it, freeing the slot for a different one", async () => {
    const user = userEvent.setup();
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(threeSnapshots)} />);

    await user.click(screen.getByRole("button", { name: /^Compare$/ }));
    await user.click(screen.getByRole("button", { name: /Health 40/ }));
    expect(screen.getByRole("button", { name: /Health 40/ })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: /Health 40/ })); // deselect
    expect(screen.getByRole("button", { name: /Health 40/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Select 2 more snapshots to compare.")).toBeInTheDocument();

    // now select a genuinely different pair
    await user.click(screen.getByRole("button", { name: /Health 60/ }));
    await user.click(screen.getByRole("button", { name: /Health 90/ }));
    expect(screen.getByText("Compare Snapshots")).toBeInTheDocument();
    expect(screen.getAllByText("+30")).toHaveLength(2); // 90 - 60, confirms the REPLACED pair was actually used
  });

  it("INVALID COMPARISON (self-compare) is prevented by construction: clicking the same card twice toggles it off rather than duplicating it into both slots", async () => {
    const user = userEvent.setup();
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(threeSnapshots)} />);

    await user.click(screen.getByRole("button", { name: /^Compare$/ }));
    await user.click(screen.getByRole("button", { name: /Health 40/ }));
    await user.click(screen.getByRole("button", { name: /Health 40/ }));
    await user.click(screen.getByRole("button", { name: /Health 40/ }));

    // still only a single, real toggle-able selection — never silently compared against itself
    expect(screen.queryByText("Compare Snapshots")).not.toBeInTheDocument();
  });

  it("'Cancel Compare' exits selection mode and clears any in-progress selection", async () => {
    const user = userEvent.setup();
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(threeSnapshots)} />);

    await user.click(screen.getByRole("button", { name: /^Compare$/ }));
    await user.click(screen.getByRole("button", { name: /Health 40/ }));
    await user.click(screen.getByRole("button", { name: /Cancel Compare/ }));

    expect(screen.getByRole("button", { name: /^Compare$/ })).toBeInTheDocument();
    expect(screen.queryByText(/Select \d more/)).not.toBeInTheDocument();
  });

  it("QUICK COMPARE: 'vs Previous' immediately opens a real comparison against the real chronologically-previous snapshot", async () => {
    const user = userEvent.setup();
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(threeSnapshots)} />);

    // health 60's real previous is health 40 (delta +20); only health 60/90 have a "vs Previous" button (health 40 is oldest)
    const middleCardRow = screen.getByRole("button", { name: /Health 60/ }).closest("li")!;
    await user.click(within(middleCardRow).getByText("vs Previous"));

    expect(screen.getByText("Compare Snapshots")).toBeInTheDocument();
    expect(screen.getAllByText("+20")).toHaveLength(2);
  });

  it("QUICK COMPARE: 'vs Latest' is not offered on the latest snapshot itself (comparing it to itself would be invalid)", () => {
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(threeSnapshots)} />);
    const latestCardRow = screen.getByRole("button", { name: /Health 90/ }).closest("li")!;
    expect(within(latestCardRow).queryByText("vs Latest")).not.toBeInTheDocument();
  });

  it("QUICK COMPARE: 'vs Previous' is not offered on the oldest snapshot (there is honestly nothing before it)", () => {
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(threeSnapshots)} />);
    const oldestCardRow = screen.getByRole("button", { name: /Health 40/ }).closest("li")!;
    expect(within(oldestCardRow).queryByText("vs Previous")).not.toBeInTheDocument();
  });

  it("SWAP: 'Swap Snapshots' genuinely reverses the comparison — the delta's sign flips", async () => {
    const user = userEvent.setup();
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(threeSnapshots)} />);

    await user.click(screen.getByRole("button", { name: /^Compare$/ }));
    await user.click(screen.getByRole("button", { name: /Health 40/ }));
    await user.click(screen.getByRole("button", { name: /Health 60/ }));
    expect(screen.getAllByText("+20")).toHaveLength(2); // 60 - 40

    await user.click(screen.getByRole("button", { name: /Swap Snapshots/ }));
    expect(screen.getAllByText("-20")).toHaveLength(2); // 40 - 60, genuinely reversed
  });

  it("EQUAL SNAPSHOTS: comparing two snapshots with identical stored values shows the honest 'identical' message", async () => {
    const user = userEvent.setup();
    const identicalPair = [
      snap({ timestamp: new Date(now.getTime() - 3600_000).toISOString(), healthScore: 70 }),
      snap({ timestamp: now.toISOString(), healthScore: 70 }),
    ];
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(identicalPair)} />);

    await user.click(screen.getByRole("button", { name: /vs Previous/ }));
    expect(screen.getByText(/identical across every compared field/)).toBeInTheDocument();
  });
});
