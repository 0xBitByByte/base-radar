import { afterEach, describe, expect, it, vi } from "vitest";

// `coingecko/service.ts` mocked at the same boundary the established
// convention (`tests/lib/holdings/pricing.test.ts`) already uses — this
// file is scoped to the real new behavior PR-097.01 (H2) added
// (downsampling applied to the real fetched series), not to re-exercising
// the provider layer's own cache/rate-limit wiring, already covered by its
// own tests.
vi.mock("@/lib/providers/coingecko/service", () => ({ getMarketChart: vi.fn() }));

import * as coingecko from "@/lib/providers/coingecko/service";
import { getProjectPriceHistory, getProjectVolumeHistory } from "@/app/dashboard/projects/[slug]/actions";
import type { SparklinePoint } from "@/lib/data/types";

function points(count: number): SparklinePoint[] {
  return Array.from({ length: count }, (_, i) => ({ t: i, v: i }));
}

function ok(prices: SparklinePoint[] | null, volumes: SparklinePoint[] | null) {
  return { ok: true as const, data: { prices, volumes }, source: "coingecko" as const, fetchedAt: "2026-09-11T00:00:00.000Z" };
}

describe("getProjectPriceHistory / getProjectVolumeHistory (PR-097.01 — H2 chart downsampling)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("a genuinely oversized real prices series is downsampled before being returned", async () => {
    vi.mocked(coingecko.getMarketChart).mockResolvedValue(ok(points(1000), points(1000)));

    const result = await getProjectPriceHistory("aerodrome-finance", "ALL");
    expect(result).not.toBeNull();
    expect(result!.length).toBeLessThan(1000);
    expect(result![0]).toEqual({ t: 0, v: 0 });
    expect(result![result!.length - 1]).toEqual({ t: 999, v: 999 });
  });

  it("a genuinely oversized real volumes series is downsampled before being returned — independently of prices", async () => {
    vi.mocked(coingecko.getMarketChart).mockResolvedValue(ok(points(1000), points(1000)));

    const result = await getProjectVolumeHistory("aerodrome-finance", "ALL");
    expect(result).not.toBeNull();
    expect(result!.length).toBeLessThan(1000);
  });

  it("a real series already under the cap (e.g. a real 7D period) passes through completely untouched", async () => {
    const prices = points(168); // a real, typical 7-day hourly series
    vi.mocked(coingecko.getMarketChart).mockResolvedValue(ok(prices, points(168)));

    const result = await getProjectPriceHistory("aerodrome-finance", "7D");
    expect(result).toEqual(prices);
  });

  it("a real provider failure still returns an honest null, never a fabricated series", async () => {
    vi.mocked(coingecko.getMarketChart).mockResolvedValue({
      ok: false,
      source: "coingecko",
      error: { code: "rate-limited", message: "rate limited" },
    });

    expect(await getProjectPriceHistory("aerodrome-finance", "ALL")).toBeNull();
    expect(await getProjectVolumeHistory("aerodrome-finance", "ALL")).toBeNull();
  });

  it("a genuinely null prices field on an otherwise-ok result stays a real null, never coerced into an empty array", async () => {
    vi.mocked(coingecko.getMarketChart).mockResolvedValue(ok(null, points(10)));

    expect(await getProjectPriceHistory("aerodrome-finance", "ALL")).toBeNull();
  });
});
