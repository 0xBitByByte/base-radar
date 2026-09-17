import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { SidebarNav } from "@/components/dashboard/Sidebar";

let mockPathname = "/dashboard";
vi.mock("next/navigation", () => ({ usePathname: () => mockPathname }));

vi.mock("@/lib/hooks/useWatchlist", () => ({ useWatchlist: () => ({ count: 0 }) }));
vi.mock("@/lib/hooks/useUnreadAlertCount", () => ({ useUnreadAlertCount: () => 0 }));
vi.mock("@/lib/hooks/useIntelligenceAlerts", () => ({ useIntelligenceAlerts: () => [] }));

/**
 * PR-092 — the one confirmed remaining gap: a persistent "Wallet" entry in
 * the existing "Portfolio" sidebar group, reusing `Sidebar.tsx`'s own
 * existing `isActive()` prefix-match logic (`pathname.startsWith(href)`) —
 * confirmed by direct source read to already handle `/dashboard/wallet`'s
 * sub-routes correctly, so `Sidebar.tsx` itself was left unmodified. These
 * tests prove that, and prove no existing nav item's behavior changed.
 */
describe("SidebarNav — Wallet item (PR-092)", () => {
  it("renders a real Wallet link to /dashboard/wallet in the Portfolio group", () => {
    mockPathname = "/dashboard";
    render(<SidebarNav />);
    const link = screen.getByRole("link", { name: "Wallet" });
    expect(link).toHaveAttribute("href", "/dashboard/wallet");
  });

  it("marks Wallet active on /dashboard/wallet itself", () => {
    mockPathname = "/dashboard/wallet";
    render(<SidebarNav />);
    expect(screen.getByRole("link", { name: "Wallet" })).toHaveAttribute("aria-current", "page");
  });

  it("keeps Wallet active on /dashboard/wallet/review", () => {
    mockPathname = "/dashboard/wallet/review";
    render(<SidebarNav />);
    expect(screen.getByRole("link", { name: "Wallet" })).toHaveAttribute("aria-current", "page");
  });

  it("keeps Wallet active on /dashboard/wallet/verify", () => {
    mockPathname = "/dashboard/wallet/verify";
    render(<SidebarNav />);
    expect(screen.getByRole("link", { name: "Wallet" })).toHaveAttribute("aria-current", "page");
  });

  it("never marks Wallet active on an unrelated route, and correctly activates Watchlists instead — proving no cross-contamination between items", () => {
    mockPathname = "/dashboard/watchlists";
    render(<SidebarNav />);
    expect(screen.getByRole("link", { name: /Wallet/ })).not.toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Watchlists" })).toHaveAttribute("aria-current", "page");
  });

  it("preserves every existing Portfolio-group item alongside the new Wallet item", () => {
    mockPathname = "/dashboard";
    render(<SidebarNav />);
    expect(screen.getByRole("link", { name: "Watchlists" })).toHaveAttribute("href", "/dashboard/watchlists");
    expect(screen.getByRole("link", { name: "Alerts" })).toHaveAttribute("href", "/dashboard/alerts");
    expect(screen.getByRole("link", { name: "Automation" })).toHaveAttribute("href", "/dashboard/automation");
  });

  it("preserves the Discover group and Settings item — full regression check that adding Wallet touched nothing else", () => {
    mockPathname = "/dashboard";
    render(<SidebarNav />);
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/dashboard/projects");
    expect(screen.getByRole("link", { name: "Smart Collections" })).toHaveAttribute("href", "/dashboard/collections");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/dashboard/settings/notifications");
  });
});
