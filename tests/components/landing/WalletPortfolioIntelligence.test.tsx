import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { WalletPortfolioIntelligence } from "@/components/landing/WalletPortfolioIntelligence";

// framer-motion's `whileInView` needs IntersectionObserver, absent under jsdom by default.
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

describe("WalletPortfolioIntelligence", () => {
  it("renders the real heading and both distinct panels", () => {
    render(<WalletPortfolioIntelligence />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Your wallet. Your portfolio. Your intelligence.");
    expect(screen.getByText("Wallet")).toBeInTheDocument();
    expect(screen.getByText("Portfolio Intelligence")).toBeInTheDocument();
  });

  /** Report "Share" is local export/download only — no public link, no upload, ever. This is a regression guard against ever *affirmatively* implying public sharing (the copy is allowed to say "never a public link" — the honest, negated claim). */
  it("never implies public/social sharing anywhere in its copy", () => {
    const { container } = render(<WalletPortfolioIntelligence />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/\bshare (it |this |your )?publicly\b/i);
    expect(text).not.toMatch(/\bpublicly shareable\b/i);
    expect(text).toMatch(/never a public link/i);
  });

  it("never claims free-form AI chat — the real feature is deterministic templates", () => {
    const { container } = render(<WalletPortfolioIntelligence />);
    const text = container.textContent ?? "";
    expect(text).toMatch(/never.{0,10}(a )?live model call/i);
  });
});
