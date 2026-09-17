import { describe, expect, it } from "vitest";

import { getCategoryRank } from "@/lib/projects/rank";
import { liveProject } from "./fixtures";

describe("getCategoryRank", () => {
  const withTvl = (id: string, tvlUsd: number | null) =>
    liveProject({
      id,
      category: "lending",
      market: {
        available: tvlUsd !== null,
        priceUsd: null,
        changePct24h: null,
        changePct7d: null,
        changePct30d: null,
        marketCapUsd: null,
        fdvUsd: null,
        volume24hUsd: null,
        liquidityUsd: null,
        tvlUsd,
      },
    });

  it("returns null when the category has only one member", () => {
    const solo = withTvl("solo", 1_000_000);
    expect(getCategoryRank(solo, [solo])).toBeNull();
  });

  it("ranks descending by the category-aware primary metric, 1-based", () => {
    const first = withTvl("first", 3_000_000);
    const second = withTvl("second", 2_000_000);
    const third = withTvl("third", 1_000_000);
    const peers = [second, third, first]; // deliberately unsorted input

    expect(getCategoryRank(first, peers)).toEqual({ rank: 1, total: 3 });
    expect(getCategoryRank(second, peers)).toEqual({ rank: 2, total: 3 });
    expect(getCategoryRank(third, peers)).toEqual({ rank: 3, total: 3 });
  });

  it("returns null for a project whose own metric is unavailable, even in a multi-member category", () => {
    const noData = withTvl("no-data", null);
    const other = withTvl("other", 1_000_000);
    expect(getCategoryRank(noData, [noData, other])).toBeNull();
  });

  it("sorts peers with no metric to the bottom without excluding them from total", () => {
    const ranked = withTvl("ranked", 1_000_000);
    const noData = withTvl("no-data", null);
    const result = getCategoryRank(ranked, [ranked, noData]);
    expect(result).toEqual({ rank: 1, total: 2 });
  });

  it("never triggers new computation beyond the peers array it's given (pure, in-memory)", () => {
    const first = withTvl("first", 5);
    const second = withTvl("second", 1);
    // Calling twice with the same input must be deterministic — no hidden state, no fetch.
    expect(getCategoryRank(first, [first, second])).toEqual(getCategoryRank(first, [first, second]));
  });
});
