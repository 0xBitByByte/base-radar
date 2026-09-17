import { describe, expect, it } from "vitest";

import { buildDailyBrief } from "@/lib/brief/engine";

/**
 * V3-NOTIFICATION-001 — `buildDailyBrief`'s `id` used to embed the full
 * `generatedAt` timestamp verbatim. Since `lib/brief/storage.ts` calls this
 * with a fresh `new Date().toISOString()` on every cache rebuild (i.e.
 * every browser refresh), the id changed on every single reload, which
 * broke `lib/notifications/storage.ts`'s read-state overlay for the
 * "Daily Brief" roll-up notification every user gets. This suite proves
 * the fix directly against the real, unmodified `buildDailyBrief`.
 */
describe("buildDailyBrief — id stability (V3-NOTIFICATION-001)", () => {
  it("produces the SAME id for two calls on the same UTC day, even with different exact timestamps — reproduces then proves fixed the browser-refresh scenario", () => {
    const first = buildDailyBrief([], "2026-09-04T10:00:00.000Z");
    const second = buildDailyBrief([], "2026-09-04T18:42:07.123Z");
    expect(second.id).toBe(first.id);
  });

  it("produces a DIFFERENT id across a real UTC day boundary — a genuinely new day's brief is never silently merged into yesterday's", () => {
    const day1 = buildDailyBrief([], "2026-09-04T23:59:00.000Z");
    const day2 = buildDailyBrief([], "2026-09-05T00:01:00.000Z");
    expect(day2.id).not.toBe(day1.id);
  });

  it("still exposes the real, unmodified generatedAt for honest 'Generated X ago' displays — only id is truncated", () => {
    const exact = "2026-09-04T18:42:07.123Z";
    const brief = buildDailyBrief([], exact);
    expect(brief.generatedAt).toBe(exact);
    expect(brief.id).not.toContain("18:42:07");
  });

  it("remains fully deterministic given identical input — same generatedAt in, byte-identical id out", () => {
    const first = buildDailyBrief([], "2026-09-04T10:00:00.000Z");
    const second = buildDailyBrief([], "2026-09-04T10:00:00.000Z");
    expect(second.id).toBe(first.id);
  });
});
