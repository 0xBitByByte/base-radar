import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { AICommandCenter } from "@/components/landing/AICommandCenter";

// framer-motion's `whileInView` needs IntersectionObserver, absent under jsdom by default.
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

/**
 * `lib/dashboard/commandCenter.ts`'s `RECOMMENDATION_CATEGORY_LABEL` is the
 * real, complete 6-category vocabulary. "liquidity" is defined there but no
 * provider ever produces it — it must never appear on the landing page.
 * "Repository Health" is a display override for GitHub-sourced Security
 * alerts specifically, not an independent 7th category, so it must not
 * appear as a standalone category badge either.
 */
const REAL_CATEGORIES = ["TVL", "Whale Activity", "Governance", "Security", "Developer Activity", "Market Momentum"];

describe("AICommandCenter", () => {
  it("renders the real exact heading and group labels", () => {
    render(<AICommandCenter />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Stop watching the blockchain. Start knowing what matters."
    );
    expect(screen.getByText("Top Opportunities")).toBeInTheDocument();
    expect(screen.getByText("Watch Closely")).toBeInTheDocument();
  });

  it("only ever uses the real 6-category vocabulary", () => {
    render(<AICommandCenter />);
    const badges = screen.getAllByText(new RegExp(REAL_CATEGORIES.join("|")));
    expect(badges.length).toBeGreaterThan(0);
    expect(screen.queryByText(/liquidity/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Repository Health$/)).not.toBeInTheDocument();
  });

  it("renders a confidence percentage on every card, never a fabricated success rate", () => {
    render(<AICommandCenter />);
    const confidences = screen.getAllByText(/% confidence$/);
    expect(confidences.length).toBeGreaterThanOrEqual(5);
  });
});
