import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { TrustedDataSources } from "@/components/landing/TrustedDataSources";

// framer-motion's `whileInView` needs IntersectionObserver, absent under jsdom by default.
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

describe("TrustedDataSources", () => {
  it("renders the real heading", () => {
    render(<TrustedDataSources />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Built on trusted Base ecosystem data.");
  });

  it("renders all 7 real provider cards, including Snapshot", () => {
    // Visual refinement pass — the Sources row is now a continuously
    // scrolling marquee (`br-ticker`), which renders the provider list
    // twice back-to-back for a seamless loop (same technique
    // `KeyMetrics.tsx`'s own ticker uses), so every label appears exactly
    // twice, not once.
    render(<TrustedDataSources />);
    for (const label of ["Base Network", "Blockscout", "CoinGecko", "DefiLlama", "DexScreener", "GitHub", "Snapshot"]) {
      expect(screen.getAllByText(label)).toHaveLength(2);
    }
  });

  it("never implies ownership of third-party data — only aggregation", () => {
    const { container } = render(<TrustedDataSources />);
    const text = container.textContent ?? "";
    expect(text).toMatch(/aggregat/i);
    expect(text).not.toMatch(/\bowns?\b/i);
  });
});
