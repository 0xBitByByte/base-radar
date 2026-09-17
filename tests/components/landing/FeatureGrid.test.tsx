import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { FeatureGrid } from "@/components/landing/FeatureGrid";

// framer-motion's `whileInView` needs IntersectionObserver, absent under jsdom by default.
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

describe("FeatureGrid", () => {
  it("renders exactly 12 cards, each linking to a real /dashboard route", () => {
    render(<FeatureGrid />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(12);
    for (const link of links) {
      expect(link.getAttribute("href")).toMatch(/^\/dashboard/);
    }
  });

  it("never mentions Analytics or Performance — internal admin-only tooling, not a public feature", () => {
    render(<FeatureGrid />);
    expect(screen.queryByText(/Analytics/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Performance/)).not.toBeInTheDocument();
  });

  it("includes every real capability named in the Landing Page V2 spec", () => {
    render(<FeatureGrid />);
    for (const title of [
      "AI Intelligence",
      "Project Intelligence",
      "Wallet Intelligence",
      "Portfolio Intelligence",
      "Watchlists",
      "Alerts",
      "Compare",
      "Automation",
      "AI Workspace",
      "AI Reports",
      "Risk Analysis",
      "Ecosystem Intelligence",
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });
});
