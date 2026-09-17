import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
// Topbar's other children (wallet connection, command palette, sync/account
// menus) each pull in real provider/router/wagmi context this focused test
// isn't about — stubbed to isolate the one thing PR-091 actually changed:
// the Compare entry point.
vi.mock("@/components/wallet/WalletButton", () => ({ WalletButton: () => null }));
vi.mock("@/components/command/CommandPalette", () => ({ CommandPalette: () => null }));
vi.mock("@/components/notifications/NotificationDrawer", () => ({ NotificationDrawer: () => null }));
vi.mock("@/components/account/AccountMenu", () => ({ AccountMenu: () => null }));
vi.mock("@/components/sync/SyncStatusCard", () => ({ SyncStatusCard: () => null }));

import { Topbar } from "@/components/dashboard/Topbar";
import { addToCompare, clearCompare } from "@/lib/compare/storage";

const STORAGE_KEY = "base-radar:compare";

describe("Topbar — PR-091 Compare entry point", () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    clearCompare();
  });
  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    clearCompare();
  });

  it("Compare is a real, always-enabled link to /dashboard/compare, not a disabled 'coming soon' placeholder", () => {
    render(<Topbar onOpenMobileNav={() => {}} liveProjectsPromise={Promise.resolve([])} />);
    const link = screen.getByRole("link", { name: "Compare projects" });
    expect(link).toHaveAttribute("href", "/dashboard/compare");
    expect(link).not.toHaveAttribute("aria-disabled");
  });

  it("shows no count badge when the Compare list is empty", () => {
    render(<Topbar onOpenMobileNav={() => {}} liveProjectsPromise={Promise.resolve([])} />);
    expect(screen.getByRole("link", { name: "Compare projects" })).toBeInTheDocument();
    expect(screen.queryByText("2")).not.toBeInTheDocument();
  });

  it("shows a real, live count badge once projects are selected", () => {
    addToCompare("aave");
    addToCompare("compound");
    render(<Topbar onOpenMobileNav={() => {}} liveProjectsPromise={Promise.resolve([])} />);
    expect(screen.getByRole("link", { name: "Compare, 2 projects selected" })).toBeInTheDocument();
  });
});
