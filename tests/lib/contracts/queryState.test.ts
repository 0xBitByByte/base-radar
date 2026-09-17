import { describe, expect, it } from "vitest";

import { buildContractsQuery, DEFAULT_CONTRACTS_QUERY_STATE, parseContractsQueryState, type ContractsQueryState } from "@/lib/contracts/queryState";

// PR-097.01 (Performance — C1) — scoped to the real, new pagination
// behavior this turn added, mirroring tests/lib/whale/queryState.test.ts
// exactly. The pre-existing category/search/chain/sort parsing logic is
// unchanged and untouched.

describe("parseContractsQueryState — page", () => {
  it("defaults to real page 1 when the URL has no page param at all", () => {
    expect(parseContractsQueryState({}).page).toBe(1);
  });

  it("parses a real, valid page number from the URL", () => {
    expect(parseContractsQueryState({ page: "2" }).page).toBe(2);
  });

  it("a genuinely malformed page value falls back to the real default rather than throwing or producing NaN", () => {
    expect(parseContractsQueryState({ page: "not-a-number" }).page).toBe(1);
  });

  it("a genuinely non-positive page value falls back to the real default", () => {
    expect(parseContractsQueryState({ page: "0" }).page).toBe(1);
    expect(parseContractsQueryState({ page: "-5" }).page).toBe(1);
  });

  it("a genuinely non-integer page value falls back to the real default", () => {
    expect(parseContractsQueryState({ page: "2.5" }).page).toBe(1);
  });
});

describe("buildContractsQuery — page", () => {
  const readyState: ContractsQueryState = { ...DEFAULT_CONTRACTS_QUERY_STATE, page: 3 };

  it("omits page from the real query string when it's the default (page 1)", () => {
    expect(buildContractsQuery(DEFAULT_CONTRACTS_QUERY_STATE)).toBe("");
  });

  it("includes a real, non-default page in the query string", () => {
    expect(buildContractsQuery(readyState)).toBe("?page=3");
  });

  it("changing category resets page back to real page 1", () => {
    expect(buildContractsQuery(readyState, { category: "verified" })).toBe("?category=verified");
  });

  it("changing search resets page back to real page 1", () => {
    expect(buildContractsQuery(readyState, { search: "0xabc" })).toBe("?search=0xabc");
  });

  it("changing chain resets page back to real page 1", () => {
    expect(buildContractsQuery(readyState, { chain: ["base"] })).toBe("?chain=base");
  });

  it("changing sort resets page back to real page 1", () => {
    expect(buildContractsQuery(readyState, { sortField: "address", sortOrder: "asc", sortExplicit: true })).toBe("?sortField=address&sortOrder=asc");
  });

  it("re-setting a scope key to its own real, unchanged current value does NOT reset page", () => {
    expect(buildContractsQuery(readyState, { category: readyState.category })).toBe("?page=3");
  });

  it("changing page itself alongside a scope key honors the real explicit page override, not the reset", () => {
    expect(buildContractsQuery(readyState, { category: "verified", page: 5 })).toBe("?category=verified&page=5");
  });
});
