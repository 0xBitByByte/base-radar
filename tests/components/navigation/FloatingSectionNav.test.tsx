import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ArrowUp } from "lucide-react";

import { FloatingSectionNav, type FloatingNavSection } from "@/components/navigation/FloatingSectionNav";

vi.mock("framer-motion", () => ({
  useReducedMotion: () => false,
}));

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

const sections: FloatingNavSection[] = [{ id: "summary", label: "Summary", icon: ArrowUp }];

/**
 * Regression test for the hydration mismatch found in the Final Engineering
 * Audit: `isTouch` used to be computed via a `useState` lazy initializer
 * that read `window.matchMedia` — which re-runs on the client's *first*
 * render (not just once on the server), so on a touch device the client's
 * initial render produced `true` while the server (no `window`) always
 * produced `false`. React's hydration pass then found a "Back to Top" row
 * in the client tree that the server's HTML never had.
 *
 * The fix starts `isTouch` at a literal `false` (so the component's first
 * render is unconditionally identical to what the server always produces,
 * regardless of device) and only reads the real value inside an effect,
 * after hydration has already completed.
 */
describe("FloatingSectionNav — hydration-safe touch detection", () => {
  it("renders without the touch-only Back to Top row on the very first render, even on a touch device", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;

    render(<FloatingSectionNav sections={sections} />);

    // First paint must match what the server always renders (isTouch=false)
    // — the touch-only row must not exist yet, synchronously after render.
    expect(screen.queryByRole("button", { name: "Back to Top" })).not.toBeInTheDocument();
  });

  it("still detects touch and reveals the row once mounted, just not during the render that hydration diffs against", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;

    render(<FloatingSectionNav sections={sections} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Back to Top" })).toBeInTheDocument());
  });

  it("never shows the touch-only row on a non-touch device", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;

    render(<FloatingSectionNav sections={sections} />);

    // Give the detection effect a chance to run; the row should still be absent.
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("button", { name: "Back to Top" })).not.toBeInTheDocument();
  });
});
