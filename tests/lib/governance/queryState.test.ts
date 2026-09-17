import { describe, expect, it } from "vitest";

import { buildGovernanceQuery, DEFAULT_GOVERNANCE_QUERY_STATE, parseGovernanceQueryState, type GovernanceQueryState } from "@/lib/governance/queryState";

// PR-097.01 (Performance — C1) — scoped to the real, new pagination
// behavior this turn added, mirroring tests/lib/whale/queryState.test.ts
// exactly. The pre-existing category/search/sort parsing logic is
// unchanged and untouched.

describe("parseGovernanceQueryState — page", () => {
  it("defaults to real page 1 when the URL has no page param at all", () => {
    expect(parseGovernanceQueryState({}).page).toBe(1);
  });

  it("parses a real, valid page number from the URL", () => {
    expect(parseGovernanceQueryState({ page: "3" }).page).toBe(3);
  });

  it("a genuinely malformed page value falls back to the real default rather than throwing or producing NaN", () => {
    expect(parseGovernanceQueryState({ page: "not-a-number" }).page).toBe(1);
  });

  it("a genuinely non-positive page value falls back to the real default", () => {
    expect(parseGovernanceQueryState({ page: "0" }).page).toBe(1);
    expect(parseGovernanceQueryState({ page: "-5" }).page).toBe(1);
  });

  it("a genuinely non-integer page value falls back to the real default", () => {
    expect(parseGovernanceQueryState({ page: "2.5" }).page).toBe(1);
  });
});

describe("buildGovernanceQuery — page", () => {
  const readyState: GovernanceQueryState = { ...DEFAULT_GOVERNANCE_QUERY_STATE, page: 3 };

  it("omits page from the real query string when it's the default (page 1)", () => {
    expect(buildGovernanceQuery(DEFAULT_GOVERNANCE_QUERY_STATE)).toBe("");
  });

  it("includes a real, non-default page in the query string", () => {
    expect(buildGovernanceQuery(readyState)).toBe("?page=3");
  });

  it("changing category resets page back to real page 1", () => {
    expect(buildGovernanceQuery(readyState, { category: "active" })).toBe("?category=active");
  });

  it("changing search resets page back to real page 1", () => {
    expect(buildGovernanceQuery(readyState, { search: "treasury" })).toBe("?search=treasury");
  });

  it("changing sort resets page back to real page 1", () => {
    expect(buildGovernanceQuery(readyState, { sortField: "voterCount", sortOrder: "asc", sortExplicit: true })).toBe(
      "?sortField=voterCount&sortOrder=asc"
    );
  });

  it("re-setting a scope key to its own real, unchanged current value does NOT reset page", () => {
    expect(buildGovernanceQuery(readyState, { category: readyState.category })).toBe("?page=3");
  });

  it("changing page itself alongside a scope key honors the real explicit page override, not the reset", () => {
    expect(buildGovernanceQuery(readyState, { category: "active", page: 5 })).toBe("?category=active&page=5");
  });
});
