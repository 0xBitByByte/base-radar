import { describe, expect, it } from "vitest";

import { cn, sortAlphabetically, splitOverflow } from "@/lib/utils";

describe("cn", () => {
  it("merges class strings and resolves conflicting Tailwind classes to the last one", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });
});

describe("splitOverflow", () => {
  it("returns everything as visible when nothing overflows", () => {
    expect(splitOverflow([1, 2, 3], 5)).toEqual({ visible: [1, 2, 3], hidden: [] });
  });

  it("reserves one slot for the overflow indicator when items exceed max", () => {
    expect(splitOverflow([1, 2, 3, 4], 3)).toEqual({ visible: [1, 2], hidden: [3, 4] });
  });

  it("always shows at least one real item, even when max is 1", () => {
    expect(splitOverflow([1, 2, 3], 1)).toEqual({ visible: [1], hidden: [2, 3] });
  });
});

describe("sortAlphabetically", () => {
  it("sorts strings using locale-aware comparison", () => {
    expect(sortAlphabetically(["Charlie", "alpha", "Bravo"])).toEqual(["alpha", "Bravo", "Charlie"]);
  });

  it("sorts objects by a provided display key without mutating the input array", () => {
    const items = [{ name: "Zeta" }, { name: "Alpha" }];
    const sorted = sortAlphabetically(items, (item) => item.name);

    expect(sorted.map((item) => item.name)).toEqual(["Alpha", "Zeta"]);
    expect(items.map((item) => item.name)).toEqual(["Zeta", "Alpha"]);
  });
});
