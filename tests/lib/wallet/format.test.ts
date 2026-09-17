import { describe, expect, it } from "vitest";

import { shortenAddress } from "@/lib/wallet/format";

describe("shortenAddress", () => {
  it("shortens a real 42-char address to 0x1234…6789 form", () => {
    expect(shortenAddress("0x1234567890123456789012345678901234567890")).toBe("0x1234…7890");
  });

  it("matches the exact example from the V3-WALLET-001 spec", () => {
    expect(shortenAddress("0x12ABCDEFCDEFCDEFCDEFCDEFCDEFCDEFCDEF98EF")).toBe("0x12AB…98EF");
  });

  it("returns a short string unchanged rather than mangling it", () => {
    expect(shortenAddress("0x1234")).toBe("0x1234");
  });
});
