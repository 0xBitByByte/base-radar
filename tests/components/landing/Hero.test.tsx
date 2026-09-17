import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { Hero } from "@/components/landing/Hero";
import { LANDING_CTAS, TRUST_INDICATORS } from "@/constants/site";

// framer-motion's `whileInView` needs IntersectionObserver, which doesn't
// exist under jsdom by default — same stub every other whileInView-based
// component test in this suite already uses (e.g. AIProjectsWidget.test.tsx).
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

describe("Hero", () => {
  it("renders the real headline", () => {
    render(<Hero />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("See Base.Understand Base.Act on Base.");
  });

  it("renders both CTAs pointing at their real destinations", () => {
    render(<Hero />);
    expect(screen.getByRole("link", { name: new RegExp(LANDING_CTAS.primary.label) })).toHaveAttribute(
      "href",
      LANDING_CTAS.primary.href
    );
    expect(screen.getByRole("link", { name: new RegExp(LANDING_CTAS.secondary.label) })).toHaveAttribute(
      "href",
      LANDING_CTAS.secondary.href
    );
  });

  it("renders every trust indicator", () => {
    render(<Hero />);
    for (const indicator of TRUST_INDICATORS) {
      expect(screen.getByText(indicator)).toBeInTheDocument();
    }
  });

  /**
   * Visual refinement pass — Hero's preview is deliberately a compact
   * teaser, not a second full Executive Summary (that duplication was the
   * bug this fixes; the real, complete structure lives only in
   * `ProductProof.tsx`, size="large"). This asserts the teaser's actual
   * reduced content and, just as importantly, the absence of the
   * full-Executive-Summary elements it used to duplicate.
   */
  it("renders a compact teaser preview, never a second full Executive Summary", () => {
    render(<Hero />);
    expect(screen.getByText("Live Base Intelligence")).toBeInTheDocument();
    expect(screen.getByText("Projects Tracked")).toBeInTheDocument();
    expect(screen.getByText("Ecosystem TVL")).toBeInTheDocument();
    expect(screen.getByText("24H Volume")).toBeInTheDocument();

    expect(screen.queryByText("Executive Summary")).not.toBeInTheDocument();
    expect(screen.queryByText(/Sentiment$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/tracked projects verified/)).not.toBeInTheDocument();
    expect(screen.queryByText(/AI Command Center/)).not.toBeInTheDocument();
  });
});
