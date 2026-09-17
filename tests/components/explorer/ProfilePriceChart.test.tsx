import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProfilePriceChart } from "@/components/explorer/ProfilePriceChart";
import type { SparklinePoint } from "@/lib/data/types";

// The real chart is a `React.lazy` + `recharts` component with no bearing on
// the bug under test (state ordering, not rendering) — replaced with a
// direct probe of exactly what `data` prop it received.
vi.mock("@/components/explorer/LazyProfileChart", () => ({
  ProfileChart: ({ data }: { data: SparklinePoint[] }) => <div data-testid="chart" data-marker={data[0]?.v} />,
}));

const { getProjectPriceHistory, getProjectVolumeHistory } = vi.hoisted(() => ({
  getProjectPriceHistory: vi.fn(),
  getProjectVolumeHistory: vi.fn(),
}));
vi.mock("@/app/dashboard/projects/[slug]/actions", () => ({
  getProjectPriceHistory,
  getProjectVolumeHistory,
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const initialData: SparklinePoint[] = [
  { t: 0, v: 7 },
  { t: 1, v: 7 },
];

/**
 * Regression test for the race condition found in the Final Engineering
 * Audit: clicking a second period pill before the first click's fetch
 * resolves used to let whichever response arrived *last* win, even if it
 * was the stale one — silently overwriting the newer period's chart/average
 * with an older period's data while the pill kept showing the newer period.
 * `ProfilePriceChart` now guards every `setData`/`setAverageVolumeUsd` call
 * behind a `latestRequestId` ref check.
 */
describe("ProfilePriceChart — stale response guard", () => {
  it("ignores a slower earlier request's response once a newer one has already resolved", async () => {
    const user = userEvent.setup();

    const slow30dPrice = deferred<SparklinePoint[]>();
    const slow30dVolume = deferred<SparklinePoint[]>();
    getProjectPriceHistory.mockImplementation((_id: string, period: string) => {
      if (period === "30D") return slow30dPrice.promise;
      if (period === "90D") return Promise.resolve([{ t: 0, v: 90 }, { t: 1, v: 90 }]);
      throw new Error(`unexpected period ${period}`);
    });
    getProjectVolumeHistory.mockImplementation((_id: string, period: string) => {
      if (period === "30D") return slow30dVolume.promise;
      if (period === "90D") return Promise.resolve([{ t: 0, v: 900 }, { t: 1, v: 900 }]);
      throw new Error(`unexpected period ${period}`);
    });

    render(<ProfilePriceChart coingeckoId="aave" initialData={initialData} />);

    // Click 30D (slow, in-flight) then immediately 90D (fast) before 30D resolves.
    await user.click(screen.getByRole("button", { name: "30D" }));
    await user.click(screen.getByRole("button", { name: "90D" }));

    // 90D's full round trip (price + volume) resolves and commits first.
    await waitFor(() => expect(screen.getByTestId("chart")).toHaveAttribute("data-marker", "90"));
    expect(screen.getByRole("button", { name: "90D" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Average Volume \(90D\)/)).toBeInTheDocument();

    // Now let 30D's stale response land. Pre-fix, this would silently
    // overwrite the chart/pill/average back to 30D's data.
    slow30dPrice.resolve([{ t: 0, v: 30 }, { t: 1, v: 30 }]);
    slow30dVolume.resolve([{ t: 0, v: 300 }, { t: 1, v: 300 }]);

    // Give the stale promise chain a chance to run (it shouldn't change anything).
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getByTestId("chart")).toHaveAttribute("data-marker", "90");
    expect(screen.getByRole("button", { name: "90D" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "30D" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/Average Volume \(90D\)/)).toBeInTheDocument();
  });
});
