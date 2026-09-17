import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

let mockPathname = "/dashboard";
vi.mock("next/navigation", () => ({ usePathname: () => mockPathname }));

import { AnalyticsTracker } from "@/components/observability/AnalyticsTracker";

describe("AnalyticsTracker", () => {
  beforeEach(() => {
    mockPathname = "/dashboard";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders nothing", () => {
    const { container } = render(<AnalyticsTracker />);
    expect(container).toBeEmptyDOMElement();
  });

  it("reports a real page_view via sendBeacon with the current real path on mount", () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { ...navigator, sendBeacon });
    render(<AnalyticsTracker />);

    expect(sendBeacon).toHaveBeenCalledWith("/api/observability/events", JSON.stringify({ name: "page_view", path: "/dashboard" }));
  });

  it("falls back to fetch with keepalive when sendBeacon is unavailable", () => {
    vi.stubGlobal("navigator", { ...navigator, sendBeacon: undefined });
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AnalyticsTracker />);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/observability/events",
      expect.objectContaining({ method: "POST", keepalive: true, body: JSON.stringify({ name: "page_view", path: "/dashboard" }) })
    );
  });

  it("reports again with the real new path when the real pathname changes — a genuine second page view, not deduplicated", () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { ...navigator, sendBeacon });
    const { rerender } = render(<AnalyticsTracker />);
    expect(sendBeacon).toHaveBeenCalledTimes(1);

    mockPathname = "/dashboard/projects";
    rerender(<AnalyticsTracker />);

    expect(sendBeacon).toHaveBeenCalledTimes(2);
    expect(sendBeacon).toHaveBeenLastCalledWith("/api/observability/events", JSON.stringify({ name: "page_view", path: "/dashboard/projects" }));
  });

  it("never re-reports on a re-render where the real pathname hasn't changed", () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { ...navigator, sendBeacon });
    const { rerender } = render(<AnalyticsTracker />);
    expect(sendBeacon).toHaveBeenCalledTimes(1);

    rerender(<AnalyticsTracker />);
    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });
});
