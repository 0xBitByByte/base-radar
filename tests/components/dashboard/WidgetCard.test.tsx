import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WidgetCard } from "@/components/dashboard/WidgetCard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

/**
 * Regression test for the Final Premium UX Polish audit's Issue C
 * ("Dashboard Spotlight hover feels strange"): `WidgetCard`'s own
 * `whileHover={{y:-3}}` used to fire on every consumer unconditionally,
 * including `ProjectSpotlight`, whose embedded `LiveProjectCard` now has
 * its own real elevation hover — two independent animation systems
 * (Framer spring vs. CSS transition) compounding into a double-lift.
 *
 * Bug fix — `disableHoverLift` (the fix this test originally verified) has
 * been removed. It suppressed the SHELL's lift so `LiveProjectCard`'s own
 * elevation could "win," but for `ProjectSpotlight` specifically that inner
 * elevation wrapper only ever covered `cardBody`'s own footprint (logo
 * through the metrics grid) — not the full widget — because `cardBody`'s
 * rest-state chrome is deliberately stripped there (`SPOTLIGHT_CARD_CLASS`)
 * while the elevation wrapper's hover classes were never part of that
 * stripping. Confirmed live via a real screenshot: hovering showed a
 * rounded shadow box appearing out of nowhere in the middle of the widget,
 * not a lift of the whole thing. The real fix lives in
 * `LiveProjectCard.tsx`: its `soloCard` prop (already `ProjectSpotlight`'s
 * own flag for "embedded standalone, no visual siblings") now also skips
 * the elevation wrapper's own hover classes, so `WidgetCard`'s single,
 * always-on `whileHover={{y:-3}}` is once again the only hover reaction —
 * lifting the whole widget as one unit, matching what the rest state
 * already does.
 */
describe("WidgetCard hover lift", () => {
  it("lifts on hover", async () => {
    const user = userEvent.setup();
    render(
      <WidgetCard icon={<span />} title="Test Widget" accent="primary">
        <p>content</p>
      </WidgetCard>
    );
    const card = screen.getByText("Test Widget").closest("div[style]") ?? screen.getByText("content").closest("div")!.parentElement!;
    await user.hover(card);
    await vi.waitFor(() => {
      expect(card.getAttribute("style") ?? "").toMatch(/translateY\(-3px\)/);
    });
  });
});
