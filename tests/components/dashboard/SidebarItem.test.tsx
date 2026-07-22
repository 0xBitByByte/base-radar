import { Home } from "lucide-react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { SidebarItem } from "@/components/dashboard/SidebarItem";

describe("SidebarItem", () => {
  it("marks the active nav item with aria-current for assistive technology", () => {
    render(
      <SidebarItem href="/dashboard" label="Dashboard" icon={<Home aria-hidden="true" />} active />
    );

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
  });

  it("does not set aria-current on an inactive nav item", () => {
    render(<SidebarItem href="/dashboard/alerts" label="Alerts" icon={<Home aria-hidden="true" />} />);

    expect(screen.getByRole("link", { name: "Alerts" })).not.toHaveAttribute("aria-current");
  });

  it("adds a real accessible warning when linking to an external destination", () => {
    render(
      <SidebarItem href="https://example.com" label="Docs" icon={<Home aria-hidden="true" />} external />
    );

    const link = screen.getByRole("link", { name: "Docs" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
