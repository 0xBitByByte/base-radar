import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

let capturedCallback: ((metric: { name: string; value: number; rating: string }) => void) | undefined;
let mockPathname = "/dashboard";

vi.mock("next/navigation", () => ({ usePathname: () => mockPathname }));
vi.mock("next/web-vitals", () => ({
  useReportWebVitals: (callback: (metric: { name: string; value: number; rating: string }) => void) => {
    capturedCallback = callback;
  },
}));

import { WebVitalsReporter } from "@/components/observability/WebVitalsReporter";

// The real hook (`next/web-vitals`'s `useReportWebVitals`) listens to
// browser PerformanceObserver entries, which jsdom doesn't produce — mocked
// here to invoke the exact same callback `WebVitalsReporter` registers,
// so this exercises the real reporting logic, not a fabricated substitute
// for the whole component.
describe("WebVitalsReporter", () => {
  beforeEach(() => {
    capturedCallback = undefined;
    mockPathname = "/dashboard";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders nothing", () => {
    const { container } = render(<WebVitalsReporter />);
    expect(container).toBeEmptyDOMElement();
  });

  it("reports a real metric via sendBeacon with the metric's own real name/value/rating and the current real path", () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { ...navigator, sendBeacon });
    render(<WebVitalsReporter />);

    expect(capturedCallback).toBeTypeOf("function");
    capturedCallback?.({ name: "LCP", value: 1234.5, rating: "good" });

    expect(sendBeacon).toHaveBeenCalledWith("/api/observability/web-vitals", JSON.stringify({ name: "LCP", value: 1234.5, rating: "good", path: "/dashboard" }));
  });

  it("falls back to fetch with keepalive when sendBeacon is unavailable", () => {
    vi.stubGlobal("navigator", { ...navigator, sendBeacon: undefined });
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<WebVitalsReporter />);

    capturedCallback?.({ name: "CLS", value: 0.02, rating: "good" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/observability/web-vitals",
      expect.objectContaining({
        method: "POST",
        keepalive: true,
        body: JSON.stringify({ name: "CLS", value: 0.02, rating: "good", path: "/dashboard" }),
      })
    );
  });

  it("includes the real current pathname, not a hardcoded one", () => {
    mockPathname = "/dashboard/projects/aerodrome-finance";
    const sendBeacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { ...navigator, sendBeacon });
    render(<WebVitalsReporter />);

    capturedCallback?.({ name: "FCP", value: 500, rating: "good" });

    const [, body] = sendBeacon.mock.calls[0];
    expect(JSON.parse(body).path).toBe("/dashboard/projects/aerodrome-finance");
  });
});
