import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProfileVolumeTrendPanel } from "@/components/explorer/ProfileVolumeTrendPanel";
import type { SparklinePoint } from "@/lib/data/types";

vi.mock("@/components/explorer/LazyProfileChart", () => ({
  ProfileChart: ({ data }: { data: SparklinePoint[] }) => <div data-testid="chart" data-marker={data[0]?.v} />,
}));

const { getProjectVolumeHistory } = vi.hoisted(() => ({
  getProjectVolumeHistory: vi.fn(),
}));
vi.mock("@/app/dashboard/projects/[slug]/actions", () => ({
  getProjectVolumeHistory,
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/**
 * Regression test for the same stale-response race the Final Engineering
 * Audit found in `ProfilePriceChart` — `ProfileVolumeTrendPanel`'s period-
 * click handler had the identical unguarded shape. See that file's test
 * for the full trace of the bug this proves is fixed.
 */
describe("ProfileVolumeTrendPanel — stale response guard", () => {
  it("ignores a slower earlier request's response once a newer one has already resolved", async () => {
    const user = userEvent.setup();

    const slow30d = deferred<SparklinePoint[]>();
    getProjectVolumeHistory.mockImplementation((_id: string, period: string) => {
      if (period === "7D") return Promise.resolve([{ t: 0, v: 7 }, { t: 1, v: 7 }]);
      if (period === "30D") return slow30d.promise;
      if (period === "90D") return Promise.resolve([{ t: 0, v: 90 }, { t: 1, v: 90 }]);
      throw new Error(`unexpected period ${period}`);
    });

    render(<ProfileVolumeTrendPanel coingeckoId="aave" />);

    // Mount fetch (7D) must resolve before the period pills exist at all.
    await waitFor(() => expect(screen.getByRole("button", { name: "30D" })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "30D" }));
    await user.click(screen.getByRole("button", { name: "90D" }));

    await waitFor(() => expect(screen.getByTestId("chart")).toHaveAttribute("data-marker", "90"));
    expect(screen.getByRole("button", { name: "90D" })).toHaveAttribute("aria-pressed", "true");

    slow30d.resolve([{ t: 0, v: 30 }, { t: 1, v: 30 }]);
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getByTestId("chart")).toHaveAttribute("data-marker", "90");
    expect(screen.getByRole("button", { name: "90D" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "30D" })).toHaveAttribute("aria-pressed", "false");
  });
});
