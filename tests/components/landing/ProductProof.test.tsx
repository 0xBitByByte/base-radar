import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProductProof } from "@/components/landing/ProductProof";

// framer-motion's `whileInView` needs IntersectionObserver, absent under jsdom by default.
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

/**
 * Visual refinement pass — Product Proof (`DashboardPreviewPanel`,
 * `size="large"`) is now the ONLY section carrying the complete Executive
 * Summary structure (Hero's own preview was cut down to a teaser to fix a
 * "same thing in two places" duplication). This asserts Product Proof
 * still renders the full, real structure — the "evidence" half of the
 * intended "Hero = promise + teaser, Product Proof = evidence" split.
 */
describe("ProductProof", () => {
  it("renders the real heading", () => {
    render(<ProductProof />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Base intelligence at a glance.");
  });

  it("renders the complete Executive Summary structure — sentiment, health, and the full AI Command Center list", () => {
    render(<ProductProof />);
    expect(screen.getByText("Executive Summary")).toBeInTheDocument();
    expect(screen.getByText(/Sentiment$/)).toBeInTheDocument();
    expect(screen.getByText(/tracked projects verified/)).toBeInTheDocument();
    expect(screen.getAllByText(/AI Command Center/).length).toBeGreaterThan(0);
  });

  it("shows all 4 illustrative opportunity rows, not the teaser's reduced set of 2", () => {
    render(<ProductProof />);
    expect(screen.getByText("TVL")).toBeInTheDocument();
    expect(screen.getByText("Whale Activity")).toBeInTheDocument();
    expect(screen.getByText("Governance")).toBeInTheDocument();
    expect(screen.getByText("Security")).toBeInTheDocument();
  });
});
