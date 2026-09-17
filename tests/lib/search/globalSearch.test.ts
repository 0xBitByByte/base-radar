import { FolderKanban } from "lucide-react";
import { describe, expect, it } from "vitest";

import { globalSearch, groupSearchResults } from "@/lib/search/globalSearch";
import type { SearchableItem } from "@/lib/search/types";

function item(overrides: Partial<SearchableItem> & Pick<SearchableItem, "id" | "title">): SearchableItem {
  return {
    description: "",
    group: "Projects",
    type: "project",
    icon: FolderKanban,
    route: "/dashboard",
    keywords: [],
    metadata: {},
    source: "test",
    ...overrides,
  };
}

function titles(results: SearchableItem[]): string[] {
  return results.map((r) => r.title);
}

describe("globalSearch — exact/prefix/substring behavior (regression)", () => {
  const items = [
    item({ id: "1", title: "Aave" }),
    item({ id: "2", title: "Aave Protocol" }),
    item({ id: "3", title: "Uniswap" }),
    item({ id: "4", title: "Compound" }),
  ];

  it("an exact title match ranks first, above a substring match on another item", () => {
    const results = globalSearch("aave", items);
    expect(titles(results)[0]).toBe("Aave");
  });

  it("a prefix match ranks above a mere substring match", () => {
    const prefixed = [item({ id: "1", title: "Uniswap" }), item({ id: "2", title: "The Uniswap Story" })];
    const results = globalSearch("uni", prefixed);
    expect(titles(results)[0]).toBe("Uniswap");
  });

  it("an unrelated item never appears in results", () => {
    const results = globalSearch("aave", items);
    expect(titles(results)).not.toContain("Compound");
    expect(titles(results)).not.toContain("Uniswap");
  });

  it("an empty query returns every item (browsable list), unscored", () => {
    const results = globalSearch("", items);
    expect(results).toHaveLength(items.length);
  });

  it("keyword exact match still outranks a mere title substring match (existing tier ordering preserved)", () => {
    const results = globalSearch("lend", [
      item({ id: "1", title: "Something Lending Related" }), // title substring: 60
      item({ id: "2", title: "Aave", keywords: ["lend"] }), // keyword exact: 90
    ]);
    expect(titles(results)[0]).toBe("Aave");
  });

  it("is case-insensitive", () => {
    const results = globalSearch("AAVE", items);
    expect(titles(results)[0]).toBe("Aave");
  });

  it("matches on description, group, and metadata as existing lower tiers", () => {
    const results = globalSearch("lending protocol", [item({ id: "1", title: "Foo", description: "A lending protocol on Base" })]);
    expect(results).toHaveLength(1);
  });

  it("ties break by original registry order, not alphabetically or randomly", () => {
    const tied = [item({ id: "a", title: "Zeta" }), item({ id: "b", title: "Zeta" })];
    const results = globalSearch("zeta", tied);
    expect(results.map((r) => r.id)).toEqual(["a", "b"]);
  });
});

describe("globalSearch — PR-094.03 fuzzy/typo matching", () => {
  it("a one-letter-missing typo on a project title still surfaces that project", () => {
    const results = globalSearch("uniswp", [item({ id: "1", title: "Uniswap" }), item({ id: "2", title: "Compound" })]);
    expect(titles(results)).toContain("Uniswap");
    expect(titles(results)).not.toContain("Compound");
  });

  it("a transposed-letter typo still surfaces the intended result", () => {
    const results = globalSearch("wachtlist", [item({ id: "1", title: "Watchlist" }), item({ id: "2", title: "Automation" })]);
    expect(titles(results)).toContain("Watchlist");
  });

  it("a typo'd keyword still surfaces the item via fuzzy keyword matching", () => {
    const results = globalSearch("lendign", [item({ id: "1", title: "Aave", keywords: ["lending", "defi"] }), item({ id: "2", title: "Timeline" })]);
    expect(titles(results)).toContain("Aave");
    expect(titles(results)).not.toContain("Timeline");
  });

  it("does not fuzzy-match genuinely unrelated words just because they share some letters", () => {
    const results = globalSearch("timeline", [item({ id: "1", title: "Daily Brief" }), item({ id: "2", title: "Automation" })]);
    expect(results).toHaveLength(0);
  });

  it("a fuzzy match never outranks a real exact match for a different, more specific item", () => {
    const results = globalSearch("aave", [
      item({ id: "1", title: "Aave" }), // exact: 100
      item({ id: "2", title: "Cave" }), // fuzzy typo-adjacent, should score well below 100
    ]);
    expect(titles(results)[0]).toBe("Aave");
  });

  it("a fuzzy match never outranks a real substring match on the same query", () => {
    const results = globalSearch("uniswap", [
      item({ id: "1", title: "The Uniswap Protocol" }), // substring: 60
      item({ id: "2", title: "Uniswqp" }), // fuzzy typo of the query itself against a typo'd title
    ]);
    // whichever the substring-matched item is, it must never rank below a fuzzy-only match
    const substringIndex = results.findIndex((r) => r.id === "1");
    const fuzzyIndex = results.findIndex((r) => r.id === "2");
    if (fuzzyIndex !== -1) expect(substringIndex).toBeLessThan(fuzzyIndex);
  });

  it("does not fuzzy-match very short queries (below the minimum fuzzy length)", () => {
    // "ai" (2 chars) should not fuzzy-match "Automation" or similar unrelated short titles
    const results = globalSearch("xz", [item({ id: "1", title: "Automation" }), item({ id: "2", title: "xz" })]);
    expect(titles(results)).toEqual(["xz"]); // only the real exact/substring match on "xz" itself
  });

  it("fuzzy title matching also considers individual words in a multi-word title", () => {
    const results = globalSearch("protocl", [item({ id: "1", title: "Aave Protocol" }), item({ id: "2", title: "Notifications" })]);
    expect(titles(results)).toContain("Aave Protocol");
    expect(titles(results)).not.toContain("Notifications");
  });

  it("ranking is deterministic: identical inputs always produce identical ordering", () => {
    const source = [
      item({ id: "1", title: "Uniswap" }),
      item({ id: "2", title: "Uniswap Labs" }),
      item({ id: "3", title: "Uniswqp" }),
      item({ id: "4", title: "Unrelated Thing" }),
    ];
    const first = globalSearch("uniswp", source).map((r) => r.id);
    const second = globalSearch("uniswp", source).map((r) => r.id);
    const third = globalSearch("uniswp", [...source]).map((r) => r.id);
    expect(first).toEqual(second);
    expect(first).toEqual(third);
  });
});

describe("globalSearch — prioritized watchlist tie-break (regression, unaffected by fuzzy changes)", () => {
  it("prioritization only breaks ties between equally-scored items, never overrides a stronger match", () => {
    const items = [
      item({ id: "exact", title: "Aave", type: "project" }),
      item({ id: "weak", title: "Something mentioning aave in description", description: "aave", type: "project" }),
    ];
    // "weak" is in the watchlist but its match is weaker than the exact title match — exact still wins
    const results = globalSearch("aave", items, new Set(["weak"]));
    expect(results[0].id).toBe("exact");
  });

  it("breaks a genuine tie in favor of the prioritized project", () => {
    const items = [item({ id: "a", title: "Aave", type: "project" }), item({ id: "b", title: "Aave", type: "project" })];
    const results = globalSearch("aave", items, new Set(["b"]));
    expect(results[0].id).toBe("b");
  });
});

describe("groupSearchResults — regression (unaffected by fuzzy changes)", () => {
  it("groups appear in first-seen order, not a fixed canonical order", () => {
    const results = [
      item({ id: "1", title: "A", group: "Notifications" }),
      item({ id: "2", title: "B", group: "Commands" }),
      item({ id: "3", title: "C", group: "Notifications" }),
    ];
    const grouped = groupSearchResults(results);
    expect(grouped.map((g) => g.group)).toEqual(["Notifications", "Commands"]);
    expect(grouped[0].items).toHaveLength(2);
  });

  it("never produces an empty group", () => {
    const grouped = groupSearchResults([item({ id: "1", title: "A", group: "Commands" })]);
    expect(grouped.every((g) => g.items.length > 0)).toBe(true);
  });
});
