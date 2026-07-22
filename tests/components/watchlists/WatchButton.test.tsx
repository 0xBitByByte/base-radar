import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WatchButton } from "@/components/watchlists/WatchButton";

const toggle = vi.fn();
let watchedProjectIds: string[] = [];

/**
 * `WatchButton`'s only external dependency is `useWatchlist` — mocking it
 * isolates this test from `lib/personalization/storage`'s real
 * `localStorage`/`useSyncExternalStore` wiring, which is exactly the
 * "stable, deterministic" surface this PR is scoped to.
 */
vi.mock("@/lib/hooks/useWatchlist", () => ({
  useWatchlist: () => ({
    projectIds: watchedProjectIds,
    count: watchedProjectIds.length,
    isWatching: (projectId: string) => watchedProjectIds.includes(projectId),
    toggle,
  }),
}));

describe("WatchButton", () => {
  beforeEach(() => {
    toggle.mockClear();
    watchedProjectIds = [];
  });

  it("renders in the unwatched state with the correct accessible name", () => {
    render(<WatchButton projectId="base" projectName="Base" />);

    const button = screen.getByRole("button", { name: "Add Base to Watchlist" });
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("renders in the watched state with the correct accessible name", () => {
    watchedProjectIds = ["base"];
    render(<WatchButton projectId="base" projectName="Base" />);

    const button = screen.getByRole("button", { name: "Remove Base from Watchlist" });
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("calls toggle with the project id when clicked", async () => {
    const user = userEvent.setup();
    render(<WatchButton projectId="base" projectName="Base" />);

    await user.click(screen.getByRole("button"));

    expect(toggle).toHaveBeenCalledTimes(1);
    expect(toggle).toHaveBeenCalledWith("base");
  });

  it("stops the click from bubbling to an ancestor (e.g. a project card row)", async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    render(
      <div onClick={onRowClick}>
        <WatchButton projectId="base" />
      </div>
    );

    await user.click(screen.getByRole("button"));

    expect(onRowClick).not.toHaveBeenCalled();
  });
});
