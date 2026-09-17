import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { compareSnapshots } from "@/components/wallet/walletSnapshotCompare";
import { WalletSnapshotCompareView } from "@/components/wallet/WalletSnapshotCompareView";
import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";

function snap(overrides: Partial<AnalyticsSnapshot> & { timestamp: string }): AnalyticsSnapshot {
  return {
    analyticsVersion: 1,
    overallScore: 60,
    healthScore: 65,
    riskScore: 30,
    confidenceScore: 80,
    confidenceLevel: "moderate",
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

describe("WalletSnapshotCompareView", () => {
  it("DIFFERENCE DETECTION: shows a real fact for each changed field, using its own real summary string (once in the compact summary chips, once as an inline annotation in the table — the same real fact shown twice, by design)", () => {
    const older = snap({ timestamp: "2026-08-01T00:00:00.000Z", healthScore: 50, ethPct: 62 });
    const newer = snap({ timestamp: "2026-08-05T00:00:00.000Z", healthScore: 58, ethPct: 50 });
    render(<WalletSnapshotCompareView comparison={compareSnapshots(older, newer)} onSwap={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getAllByText("+8")).toHaveLength(2);
    expect(screen.getAllByText("-12%")).toHaveLength(2);
  });

  it("EQUAL SNAPSHOTS: shows the honest 'identical' message, no fabricated differences", () => {
    const a = snap({ timestamp: "2026-08-01T00:00:00.000Z" });
    const b = snap({ timestamp: "2026-08-05T00:00:00.000Z" });
    render(<WalletSnapshotCompareView comparison={compareSnapshots(a, b)} onSwap={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText(/identical across every compared field/)).toBeInTheDocument();
  });

  it("calls onSwap when 'Swap Snapshots' is clicked", async () => {
    const user = userEvent.setup();
    const onSwap = vi.fn();
    const older = snap({ timestamp: "2026-08-01T00:00:00.000Z" });
    const newer = snap({ timestamp: "2026-08-05T00:00:00.000Z" });
    render(<WalletSnapshotCompareView comparison={compareSnapshots(older, newer)} onSwap={onSwap} onCancel={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /Swap Snapshots/ }));
    expect(onSwap).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when 'Cancel Compare' is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const older = snap({ timestamp: "2026-08-01T00:00:00.000Z" });
    const newer = snap({ timestamp: "2026-08-05T00:00:00.000Z" });
    render(<WalletSnapshotCompareView comparison={compareSnapshots(older, newer)} onSwap={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: /Cancel Compare/ }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("renders every field's Old and New raw stored values, not just the changed ones", () => {
    const older = snap({ timestamp: "2026-08-01T00:00:00.000Z", healthScore: 50, riskScore: 30 });
    const newer = snap({ timestamp: "2026-08-05T00:00:00.000Z", healthScore: 90, riskScore: 30 });
    render(<WalletSnapshotCompareView comparison={compareSnapshots(older, newer)} onSwap={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText("Risk")).toBeInTheDocument(); // unchanged field still shown, quietly
    expect(screen.getAllByText("30")).toHaveLength(2); // old and new risk both 30
  });
});
