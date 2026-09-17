import { describe, expect, it } from "vitest";

import { DASHBOARD_WIDGET_TREND_METRICS } from "@/components/dashboard/PortfolioWidget";

describe("PortfolioWidget — dashboard trend badge metrics (PR-092.02)", () => {
  it("includes 'value' (Portfolio Value) — the honest PnL-equivalent — alongside Health and Confidence", () => {
    expect(DASHBOARD_WIDGET_TREND_METRICS).toContain("value");
    expect(DASHBOARD_WIDGET_TREND_METRICS).toContain("health");
    expect(DASHBOARD_WIDGET_TREND_METRICS).toContain("confidence");
  });

  it("never claims a metric this widget doesn't actually have real trend data for", () => {
    const KNOWN_TREND_METRICS = ["health", "confidence", "risk", "value", "diversification", "stablecoinAllocation", "recommendation", "fingerprint"];
    for (const metric of DASHBOARD_WIDGET_TREND_METRICS) {
      expect(KNOWN_TREND_METRICS).toContain(metric);
    }
  });
});
