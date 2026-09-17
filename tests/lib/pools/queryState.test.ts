import { describe, expect, it } from "vitest";

import { buildPoolsQuery, DEFAULT_POOLS_QUERY_STATE, parsePoolsQueryState, type PoolsQueryState } from "@/lib/pools/queryState";

// PR-097.01 (Performance — C1) — scoped to the real, new pagination
// behavior this turn added, mirroring tests/lib/whale/queryState.test.ts
// exactly. The pre-existing category/search/dex/sort parsing logic is
// unchanged and untouched.

describe("parsePoolsQueryState — page", () => {
  it("defaults to real page 1 when the URL has no page param at all", () => {
    expect(parsePoolsQueryState({}).page).toBe(1);
  });

  it("parses a real, valid page number from the URL", () => {
    expect(parsePoolsQueryState({ page: "4" }).page).toBe(4);
  });

  it("a genuinely malformed page value falls back to the real default rather than throwing or producing NaN", () => {
    expect(parsePoolsQueryState({ page: "not-a-number" }).page).toBe(1);
  });

  it("a genuinely non-positive page value falls back to the real default", () => {
    expect(parsePoolsQueryState({ page: "0" }).page).toBe(1);
    expect(parsePoolsQueryState({ page: "-5" }).page).toBe(1);
  });

  it("a genuinely non-integer page value falls back to the real default", () => {
    expect(parsePoolsQueryState({ page: "2.5" }).page).toBe(1);
  });
});

describe("buildPoolsQuery — page", () => {
  const readyState: PoolsQueryState = { ...DEFAULT_POOLS_QUERY_STATE, page: 3 };

  it("omits page from the real query string when it's the default (page 1)", () => {
    expect(buildPoolsQuery(DEFAULT_POOLS_QUERY_STATE)).toBe("");
  });

  it("includes a real, non-default page in the query string", () => {
    expect(buildPoolsQuery(readyState)).toBe("?page=3");
  });

  it("changing category resets page back to real page 1", () => {
    expect(buildPoolsQuery(readyState, { category: "highest-liquidity" })).toBe("?category=highest-liquidity");
  });

  it("changing search resets page back to real page 1", () => {
    expect(buildPoolsQuery(readyState, { search: "usdc" })).toBe("?search=usdc");
  });

  it("changing dex resets page back to real page 1", () => {
    expect(buildPoolsQuery(readyState, { dex: ["aerodrome"] })).toBe("?dex=aerodrome");
  });

  it("changing sort resets page back to real page 1", () => {
    expect(buildPoolsQuery(readyState, { sortField: "volume", sortOrder: "asc", sortExplicit: true })).toBe("?sortField=volume&sortOrder=asc");
  });

  it("re-setting a scope key to its own real, unchanged current value does NOT reset page", () => {
    expect(buildPoolsQuery(readyState, { category: readyState.category })).toBe("?page=3");
  });

  it("changing page itself alongside a scope key honors the real explicit page override, not the reset", () => {
    expect(buildPoolsQuery(readyState, { category: "highest-liquidity", page: 5 })).toBe("?category=highest-liquidity&page=5");
  });
});
