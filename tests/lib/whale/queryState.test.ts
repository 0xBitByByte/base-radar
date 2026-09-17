import { describe, expect, it } from "vitest";

import { buildWhaleQuery, DEFAULT_WHALE_QUERY_STATE, parseWhaleQueryState, type WhaleQueryState } from "@/lib/whale/queryState";

// PR-097.01 (Performance — C1) — scoped to the real, new pagination
// behavior this turn added (`page` parsing/building and the
// reset-on-scope-change rule). The pre-existing category/search/sort
// parsing logic is unchanged and untouched by this turn's work.

describe("parseWhaleQueryState — page", () => {
  it("defaults to real page 1 when the URL has no page param at all", () => {
    expect(parseWhaleQueryState({}).page).toBe(1);
  });

  it("parses a real, valid page number from the URL", () => {
    expect(parseWhaleQueryState({ page: "3" }).page).toBe(3);
  });

  it("a genuinely malformed page value falls back to the real default rather than throwing or producing NaN", () => {
    expect(parseWhaleQueryState({ page: "not-a-number" }).page).toBe(1);
  });

  it("a genuinely non-positive page value falls back to the real default", () => {
    expect(parseWhaleQueryState({ page: "0" }).page).toBe(1);
    expect(parseWhaleQueryState({ page: "-5" }).page).toBe(1);
  });

  it("a genuinely non-integer page value falls back to the real default", () => {
    expect(parseWhaleQueryState({ page: "2.5" }).page).toBe(1);
  });
});

describe("buildWhaleQuery — page", () => {
  const readyState: WhaleQueryState = { ...DEFAULT_WHALE_QUERY_STATE, page: 3 };

  it("omits page from the real query string when it's the default (page 1) — never a noisy '?page=1'", () => {
    expect(buildWhaleQuery(DEFAULT_WHALE_QUERY_STATE)).toBe("");
  });

  it("includes a real, non-default page in the query string", () => {
    expect(buildWhaleQuery(readyState)).toBe("?page=3");
  });

  it("an explicit page override navigates to that real page, preserving the rest of state", () => {
    const withCategory: WhaleQueryState = { ...DEFAULT_WHALE_QUERY_STATE, category: "whale-alert", page: 1 };
    expect(buildWhaleQuery(withCategory, { page: 2 })).toBe("?category=whale-alert&page=2");
  });

  it("changing category resets page back to real page 1 — never stranding the viewer on a page number the new scope may not even have", () => {
    expect(buildWhaleQuery(readyState, { category: "large-transfer" })).toBe("?category=large-transfer");
  });

  it("changing search resets page back to real page 1", () => {
    expect(buildWhaleQuery(readyState, { search: "0xabc" })).toBe("?search=0xabc");
  });

  it("changing sort resets page back to real page 1", () => {
    expect(buildWhaleQuery(readyState, { sortField: "usdValue", sortOrder: "asc", sortExplicit: true })).toBe(
      "?sortField=usdValue&sortOrder=asc"
    );
  });

  it("re-setting a scope key to its own real, unchanged current value does NOT reset page — a genuine no-op change, not a real scope change", () => {
    expect(buildWhaleQuery(readyState, { category: readyState.category })).toBe("?page=3");
  });

  it("changing page itself alongside a scope key honors the real explicit page override, not the reset", () => {
    expect(buildWhaleQuery(readyState, { category: "whale-alert", page: 5 })).toBe("?category=whale-alert&page=5");
  });
});
