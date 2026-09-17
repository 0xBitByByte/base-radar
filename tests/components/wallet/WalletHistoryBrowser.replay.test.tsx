import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { HistoryBrowserSection } from "@/components/wallet/WalletHistoryBrowser";
import type { UseWalletHistoryResult } from "@/lib/hooks/useWalletHistory";
import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";

/**
 * V4-HISTORY-004 (Phase 10) — Replay integration tests: first/last/middle
 * snapshot, jump, next, previous, exit replay, empty history, single
 * snapshot. Mirrors `WalletHistoryBrowser.test.tsx`'s own established
 * `snap()`/`makeWalletHistory()` fixtures exactly.
 */

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

const THREE_SNAPSHOTS = [
  snap({ timestamp: "2026-08-01T00:00:00.000Z", healthScore: 50 }),
  snap({ timestamp: "2026-08-05T00:00:00.000Z", healthScore: 65 }),
  snap({ timestamp: "2026-08-10T00:00:00.000Z", healthScore: 80 }),
];

// The header's entry-point "Replay" button and each card's per-snapshot
// "Replay" quick action share the same accessible name — the header one is
// the real first "Replay" button in DOM order (it renders above the list).
function headerReplayButton() {
  return screen.getAllByRole("button", { name: /^Replay$/ })[0];
}

describe("HistoryBrowserSection — Replay", () => {
  it("EMPTY HISTORY: no Replay entry point rendered at all", () => {
    render(<HistoryBrowserSection walletHistory={makeWalletHistory([])} />);
    expect(screen.queryByRole("button", { name: /^Replay$/ })).not.toBeInTheDocument();
  });

  it("SINGLE SNAPSHOT: opening Replay shows 'Snapshot 1 of 1', both First/Previous and Next/Latest disabled", async () => {
    const user = userEvent.setup();
    render(<HistoryBrowserSection walletHistory={makeWalletHistory([THREE_SNAPSHOTS[0]])} />);

    await user.click(headerReplayButton());

    expect(screen.getByText("Replay Status: Active")).toBeInTheDocument();
    expect(screen.getByText("1 of 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "First snapshot" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous snapshot" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next snapshot" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Jump to latest snapshot" })).toBeDisabled();
  });

  it("opening Replay from the header starts at the real LATEST snapshot", async () => {
    const user = userEvent.setup();
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(THREE_SNAPSHOTS)} />);

    await user.click(headerReplayButton());

    expect(screen.getByText("3 of 3")).toBeInTheDocument();
    expect(screen.getByText("80")).toBeInTheDocument(); // health of the newest snapshot
  });

  it("FIRST SNAPSHOT: 'First snapshot' jumps to the real oldest, and disables First/Previous there", async () => {
    const user = userEvent.setup();
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(THREE_SNAPSHOTS)} />);
    await user.click(headerReplayButton());

    await user.click(screen.getByRole("button", { name: "First snapshot" }));

    expect(screen.getByText("1 of 3")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "First snapshot" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous snapshot" })).toBeDisabled();
  });

  it("PREVIOUS: steps back exactly one real snapshot from the latest", async () => {
    const user = userEvent.setup();
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(THREE_SNAPSHOTS)} />);
    await user.click(headerReplayButton()); // starts at 3 of 3

    await user.click(screen.getByRole("button", { name: "Previous snapshot" }));

    expect(screen.getByText("2 of 3")).toBeInTheDocument();
    expect(screen.getByText("65")).toBeInTheDocument();
  });

  it("MIDDLE SNAPSHOT: neither boundary button is disabled", async () => {
    const user = userEvent.setup();
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(THREE_SNAPSHOTS)} />);
    await user.click(headerReplayButton());
    await user.click(screen.getByRole("button", { name: "Previous snapshot" })); // now at 2 of 3

    expect(screen.getByText("2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "First snapshot" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous snapshot" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Next snapshot" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Jump to latest snapshot" })).not.toBeDisabled();
  });

  it("NEXT: steps forward exactly one real snapshot", async () => {
    const user = userEvent.setup();
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(THREE_SNAPSHOTS)} />);
    await user.click(headerReplayButton());
    await user.click(screen.getByRole("button", { name: "First snapshot" })); // 1 of 3

    await user.click(screen.getByRole("button", { name: "Next snapshot" }));

    expect(screen.getByText("2 of 3")).toBeInTheDocument();
  });

  it("LATEST: jumps straight back to the real newest snapshot from anywhere", async () => {
    const user = userEvent.setup();
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(THREE_SNAPSHOTS)} />);
    await user.click(headerReplayButton());
    await user.click(screen.getByRole("button", { name: "First snapshot" })); // 1 of 3

    await user.click(screen.getByRole("button", { name: "Jump to latest snapshot" }));

    expect(screen.getByText("3 of 3")).toBeInTheDocument();
  });

  it("JUMP TO DATE: the real 'jump to date' input navigates to the latest real snapshot at or before that date", async () => {
    const user = userEvent.setup();
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(THREE_SNAPSHOTS)} />);
    await user.click(headerReplayButton());

    const dateInput = screen.getByLabelText("Jump to date");
    await user.type(dateInput, "2026-08-06");

    expect(screen.getByText("2 of 3")).toBeInTheDocument(); // Aug 5 is the latest snapshot at-or-before Aug 6
  });

  it("EXIT REPLAY: returns to the normal browse view, real snapshot cards visible again", async () => {
    const user = userEvent.setup();
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(THREE_SNAPSHOTS)} />);
    await user.click(headerReplayButton());
    expect(screen.getByText("Replay Status: Active")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Exit Replay" }));

    expect(screen.queryByText("Replay Status: Active")).not.toBeInTheDocument();
    expect(headerReplayButton()).toBeInTheDocument(); // back to the entry point
  });

  it("'Replay opens from any snapshot' — the per-card Replay action starts Replay AT that specific snapshot, not the latest", async () => {
    const user = userEvent.setup();
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(THREE_SNAPSHOTS)} />);

    const oldestCard = screen.getByRole("button", { name: /Health 50/ }).closest("li")!;
    await user.click(within(oldestCard).getByText("Replay"));

    expect(screen.getByText("1 of 3")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  it("Replay Viewer shows real, stored-only fields — Date/Snapshot index/Fingerprint/Health/Confidence/Portfolio value — never a recomputed value", async () => {
    const user = userEvent.setup();
    const history = [snap({ timestamp: "2026-08-10T00:00:00.000Z", healthScore: 77, confidenceScore: 91, fingerprint: "Growth Seeker", totalValue: 12345 })];
    render(<HistoryBrowserSection walletHistory={makeWalletHistory(history)} />);

    await user.click(headerReplayButton());

    expect(screen.getByText("Growth Seeker")).toBeInTheDocument();
    expect(screen.getByText("77")).toBeInTheDocument();
    expect(screen.getByText("91%")).toBeInTheDocument();
    expect(screen.getByText("$12,345.00")).toBeInTheDocument();
  });
});
