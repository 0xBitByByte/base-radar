import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { AdminNav } from "@/components/admin/AdminNav";

let mockPathname = "/dashboard/admin";
vi.mock("next/navigation", () => ({ usePathname: () => mockPathname }));

/**
 * PR-097.03 (Observability) — the one confirmed remaining gap from that
 * closeout: `/dashboard/observability/analytics` and `/dashboard/
 * observability/performance` were both fully built and admin-protected,
 * but had no in-app link anywhere. This registers them into `AdminNav`,
 * the real, established navigation every other admin page already uses
 * (PR-095.02/.05/.06) — these tests prove the two new links render
 * correctly and that every pre-existing admin nav entry is unaffected.
 */
describe("AdminNav — Observability links (PR-097.03)", () => {
  it("renders a real Analytics link to /dashboard/observability/analytics", () => {
    mockPathname = "/dashboard/admin";
    render(<AdminNav />);
    expect(screen.getByRole("link", { name: "Analytics" })).toHaveAttribute("href", "/dashboard/observability/analytics");
  });

  it("renders a real Performance link to /dashboard/observability/performance", () => {
    mockPathname = "/dashboard/admin";
    render(<AdminNav />);
    expect(screen.getByRole("link", { name: "Performance" })).toHaveAttribute("href", "/dashboard/observability/performance");
  });

  it("marks Analytics active on its own real route", () => {
    mockPathname = "/dashboard/observability/analytics";
    render(<AdminNav />);
    expect(screen.getByRole("link", { name: "Analytics" }).className).toContain("border-radar-primary");
    expect(screen.getByRole("link", { name: "Performance" }).className).not.toContain("border-radar-primary");
  });

  it("marks Performance active on its own real route", () => {
    mockPathname = "/dashboard/observability/performance";
    render(<AdminNav />);
    expect(screen.getByRole("link", { name: "Performance" }).className).toContain("border-radar-primary");
    expect(screen.getByRole("link", { name: "Analytics" }).className).not.toContain("border-radar-primary");
  });

  it("still renders every pre-existing admin nav entry, unchanged", () => {
    mockPathname = "/dashboard/admin";
    render(<AdminNav />);
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/dashboard/admin");
    expect(screen.getByRole("link", { name: "Project Registry" })).toHaveAttribute("href", "/dashboard/admin/registry");
    expect(screen.getByRole("link", { name: "Activity Log" })).toHaveAttribute("href", "/dashboard/admin/activity");
    expect(screen.getByRole("link", { name: "Roles & Permissions" })).toHaveAttribute("href", "/dashboard/admin/roles");
  });

  it("renders exactly six nav items, in the established order, with Observability links last", () => {
    mockPathname = "/dashboard/admin";
    render(<AdminNav />);
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Overview",
      "Project Registry",
      "Activity Log",
      "Roles & Permissions",
      "Analytics",
      "Performance",
    ]);
  });
});
