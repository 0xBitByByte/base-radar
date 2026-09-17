import { describe, expect, it } from "vitest";

import { buildDailyBrief } from "@/lib/brief/engine";
import { buildPortfolioIntelligence } from "@/lib/portfolio/engine";

/**
 * V3-NOTIFICATION-001 — same bug, same fix, as `lib/brief/engine.ts`'s
 * `buildDailyBrief`: `id` used to embed the full `generatedAt` timestamp,
 * which `lib/portfolio/storage.ts` stamps fresh on every browser refresh,
 * breaking read-state persistence for the "Portfolio Intelligence" roll-up
 * notification every watchlist user gets.
 */
describe("buildPortfolioIntelligence — id stability (V3-NOTIFICATION-001)", () => {
  const dailyBrief = buildDailyBrief([], "2026-09-04T10:00:00.000Z");

  it("produces the SAME id for two calls on the same UTC day, even with different exact timestamps", () => {
    const first = buildPortfolioIntelligence(null, [], dailyBrief, "2026-09-04T10:00:00.000Z");
    const second = buildPortfolioIntelligence(null, [], dailyBrief, "2026-09-04T18:42:07.123Z");
    expect(second.id).toBe(first.id);
  });

  it("produces a DIFFERENT id across a real UTC day boundary", () => {
    const day1 = buildPortfolioIntelligence(null, [], dailyBrief, "2026-09-04T23:59:00.000Z");
    const day2 = buildPortfolioIntelligence(null, [], dailyBrief, "2026-09-05T00:01:00.000Z");
    expect(day2.id).not.toBe(day1.id);
  });

  it("still exposes the real, unmodified generatedAt — only id is truncated", () => {
    const exact = "2026-09-04T18:42:07.123Z";
    const portfolio = buildPortfolioIntelligence(null, [], dailyBrief, exact);
    expect(portfolio.generatedAt).toBe(exact);
    expect(portfolio.id).not.toContain("18:42:07");
  });
});
