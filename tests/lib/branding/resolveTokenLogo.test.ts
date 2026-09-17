import { beforeEach, describe, expect, it, vi } from "vitest";

import { __resetProviderCacheForTests } from "@/lib/providers/common/cache";
import * as coingecko from "@/lib/providers/coingecko/service";
import { poolTokenIdentities, resolveTokenLogo, resolveTokenLogosForPools } from "@/lib/branding/resolveTokenLogo";

/**
 * PR-104 — no test file existed for this module before this PR, despite
 * `resolveTokenLogosForPools` now being called from two concurrent sites on
 * Project Profile (a speculative prewarm against `profile.trading.pools`,
 * racing DexScreener, plus — only when DexScreener returns a genuinely
 * different pool set — a second, fresh call). The whole optimization's
 * safety rests on one property: `resolveTokenLogo`'s cache has real
 * in-flight dedup, so two concurrent calls resolving the same token never
 * issue two real provider requests. That property is tested directly here,
 * not just asserted in a comment.
 */

vi.mock("@/lib/providers/coingecko/service", () => ({
  getTokenLogoByAddress: vi.fn(),
  getMarketsByIds: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  __resetProviderCacheForTests();
  vi.mocked(coingecko.getTokenLogoByAddress).mockReset();
  vi.mocked(coingecko.getMarketsByIds).mockReset();
});

describe("poolTokenIdentities (PR-104)", () => {
  it("is empty for empty pools", () => {
    expect(poolTokenIdentities([])).toEqual([]);
  });

  it("produces base then quote identity for a single pool, unchanged from the inline flatMap it replaces", () => {
    const pools = [{ baseTokenSymbol: "AERO", baseTokenAddress: "0xbase", quoteTokenSymbol: "WETH", quoteTokenAddress: "0xquote" }];
    expect(poolTokenIdentities(pools)).toEqual([
      { symbol: "AERO", address: "0xbase" },
      { symbol: "WETH", address: "0xquote" },
    ]);
  });

  it("preserves pool order across multiple pools (base+quote pairs stay adjacent, pools stay in input order)", () => {
    const pools = [
      { baseTokenSymbol: "A", baseTokenAddress: "0xa1", quoteTokenSymbol: "B", quoteTokenAddress: "0xb1" },
      { baseTokenSymbol: "C", baseTokenAddress: "0xc1", quoteTokenSymbol: "D", quoteTokenAddress: "0xd1" },
    ];
    expect(poolTokenIdentities(pools).map((t) => t.symbol)).toEqual(["A", "B", "C", "D"]);
  });

  it("passes through null symbol/address unchanged — never fabricates a placeholder", () => {
    const pools = [{ baseTokenSymbol: null, baseTokenAddress: null, quoteTokenSymbol: "USDC", quoteTokenAddress: null }];
    expect(poolTokenIdentities(pools)).toEqual([
      { symbol: null, address: null },
      { symbol: "USDC", address: null },
    ]);
  });
});

describe("resolveTokenLogo", () => {
  it("resolves a known symbol from the static, zero-network tier — never calls a provider", async () => {
    const url = await resolveTokenLogo({ symbol: "WETH", address: null });
    expect(url).toMatch(/^https:\/\//);
    expect(coingecko.getTokenLogoByAddress).not.toHaveBeenCalled();
    expect(coingecko.getMarketsByIds).not.toHaveBeenCalled();
  });

  it("falls through to address-based CoinGecko lookup for an unknown symbol", async () => {
    vi.mocked(coingecko.getTokenLogoByAddress).mockResolvedValue("https://example.com/unknown.png");
    const url = await resolveTokenLogo({ symbol: "NOTREAL", address: "0xabc" });
    expect(url).toBe("https://example.com/unknown.png");
    expect(coingecko.getTokenLogoByAddress).toHaveBeenCalledWith("0xabc");
  });

  it("falls through to coingeckoId lookup when address resolution finds nothing", async () => {
    vi.mocked(coingecko.getTokenLogoByAddress).mockResolvedValue(null);
    vi.mocked(coingecko.getMarketsByIds).mockResolvedValue({
      ok: true,
      data: [{ imageUrl: "https://example.com/by-id.png" } as never],
      source: "coingecko",
      fetchedAt: new Date().toISOString(),
    });
    const url = await resolveTokenLogo({ symbol: "NOTREAL2", address: "0xdef", coingeckoId: "notreal2" });
    expect(url).toBe("https://example.com/by-id.png");
  });

  it("is null — never fabricated — when no tier resolves anything", async () => {
    vi.mocked(coingecko.getTokenLogoByAddress).mockResolvedValue(null);
    vi.mocked(coingecko.getMarketsByIds).mockResolvedValue({ ok: true, data: [], source: "coingecko", fetchedAt: new Date().toISOString() });
    const url = await resolveTokenLogo({ symbol: "GHOST", address: "0x0", coingeckoId: "ghost" });
    expect(url).toBeNull();
  });

  it("degrades to null, never throws, when the provider call itself fails (ProviderResult ok:false)", async () => {
    vi.mocked(coingecko.getTokenLogoByAddress).mockResolvedValue(null);
    vi.mocked(coingecko.getMarketsByIds).mockResolvedValue({ ok: false, source: "coingecko", error: { code: "network_error", message: "boom" } });
    await expect(resolveTokenLogo({ symbol: "FAILCASE", address: null, coingeckoId: "failcase" })).resolves.toBeNull();
  });
});

describe("resolveTokenLogosForPools", () => {
  it("is empty for empty input — no calls made", async () => {
    const result = await resolveTokenLogosForPools([]);
    expect(result).toEqual({});
    expect(coingecko.getTokenLogoByAddress).not.toHaveBeenCalled();
  });

  it("resolves multiple distinct tokens and keys the result by both symbol and lowercased address", async () => {
    vi.mocked(coingecko.getTokenLogoByAddress).mockImplementation(async (address) =>
      address === "0xAAA" ? "https://example.com/aaa.png" : null
    );
    const result = await resolveTokenLogosForPools([
      { symbol: "WETH", address: "0xWethAddr" }, // static tier, never hits the mock
      { symbol: "UNKNOWNTOK", address: "0xAAA" },
    ]);
    expect(result.WETH).toMatch(/^https:\/\//);
    expect(result["0xwethaddr"]).toMatch(/^https:\/\//);
    expect(result.UNKNOWNTOK).toBe("https://example.com/aaa.png");
    expect(result["0xaaa"]).toBe("https://example.com/aaa.png");
  });

  it("dedupes repeated tokens across multiple pools (base of one pool == quote of another) into exactly one resolution", async () => {
    vi.mocked(coingecko.getTokenLogoByAddress).mockResolvedValue("https://example.com/dup.png");
    await resolveTokenLogosForPools([
      { symbol: "DUPTOK", address: "0xdup" },
      { symbol: "DUPTOK", address: "0xdup" },
      { symbol: "DUPTOK", address: "0xdup" },
    ]);
    expect(coingecko.getTokenLogoByAddress).toHaveBeenCalledTimes(1);
  });

  it("partial failure: one token resolves, a sibling token in the same call fails — the successful one is unaffected", async () => {
    vi.mocked(coingecko.getTokenLogoByAddress).mockImplementation(async (address) => (address === "0xGOOD" ? "https://example.com/good.png" : null));
    const result = await resolveTokenLogosForPools([
      { symbol: "GOODTOK", address: "0xGOOD" },
      { symbol: "BADTOK", address: "0xBAD" },
    ]);
    expect(result.GOODTOK).toBe("https://example.com/good.png");
    expect(result.BADTOK).toBeUndefined(); // missing, not fabricated — downstream renders the initials fallback for this key's absence
  });

  it("a token with neither symbol nor address is silently skipped, not an error", async () => {
    const result = await resolveTokenLogosForPools([{ symbol: null, address: null }]);
    expect(result).toEqual({});
  });

  it("preserves every unique pool's tokens regardless of input order", async () => {
    vi.mocked(coingecko.getTokenLogoByAddress).mockResolvedValue("https://example.com/x.png");
    const inputs = [
      { symbol: "TOKA", address: "0xa" },
      { symbol: "TOKB", address: "0xb" },
      { symbol: "TOKC", address: "0xc" },
    ];
    const forward = await resolveTokenLogosForPools(inputs);
    __resetProviderCacheForTests();
    const reversed = await resolveTokenLogosForPools([...inputs].reverse());
    expect(Object.keys(forward).sort()).toEqual(Object.keys(reversed).sort());
    expect(forward.TOKA).toBe(reversed.TOKA);
    expect(forward.TOKB).toBe(reversed.TOKB);
    expect(forward.TOKC).toBe(reversed.TOKC);
  });

  it("never throws even when every provider call fails — the caller always gets a plain object back", async () => {
    vi.mocked(coingecko.getTokenLogoByAddress).mockResolvedValue(null);
    vi.mocked(coingecko.getMarketsByIds).mockResolvedValue({ ok: false, source: "coingecko", error: { code: "network_error", message: "down" } });
    await expect(
      resolveTokenLogosForPools([
        { symbol: "DOWN1", address: "0x1", },
        { symbol: "DOWN2", address: "0x2" },
      ])
    ).resolves.toEqual({});
  });
});

describe("PR-104 — concurrent overlapping resolution never duplicates a provider call", () => {
  it("two concurrent resolveTokenLogosForPools calls for the SAME token share one in-flight request (never two)", async () => {
    const gate = deferred<string | null>();
    let callCount = 0;
    vi.mocked(coingecko.getTokenLogoByAddress).mockImplementation(async () => {
      callCount += 1;
      return gate.promise;
    });

    // Mirrors PR-104's real shape: a "prewarm" call and a "final" call for
    // an overlapping token, started concurrently rather than sequentially.
    const prewarm = resolveTokenLogosForPools([{ symbol: "SHARED", address: "0xshared" }]);
    const final = resolveTokenLogosForPools([{ symbol: "SHARED", address: "0xshared" }]);

    // Neither has resolved yet — the underlying provider call is still
    // in flight, shared between both callers (see `getOrSet`'s own
    // in-flight-dedup contract, `lib/providers/common/cache.ts`).
    expect(callCount).toBe(1);

    gate.resolve("https://example.com/shared.png");
    const [prewarmResult, finalResult] = await Promise.all([prewarm, final]);

    expect(callCount).toBe(1); // still exactly one real network call for both callers combined
    expect(prewarmResult.SHARED).toBe("https://example.com/shared.png");
    expect(finalResult.SHARED).toBe("https://example.com/shared.png");
  });

  it("a slow/failing prewarm call does not delay or corrupt a concurrent, independent final call for a DIFFERENT token", async () => {
    const slowGate = deferred<string | null>();
    vi.mocked(coingecko.getTokenLogoByAddress).mockImplementation(async (address) => {
      if (address === "0xslow") return slowGate.promise; // never resolves during this test
      if (address === "0xfast") return "https://example.com/fast.png";
      return null;
    });

    const prewarm = resolveTokenLogosForPools([{ symbol: "SLOWTOK", address: "0xslow" }]);
    prewarm.catch(() => {}); // mirrors the page's own `.catch(() => {})` on the unused prewarm promise

    const final = await resolveTokenLogosForPools([{ symbol: "FASTTOK", address: "0xfast" }]);
    expect(final.FASTTOK).toBe("https://example.com/fast.png");
    // The still-pending prewarm promise never rejected or threw into this
    // test — it simply hasn't settled, exactly as the real page leaves it
    // when the richer-data branch is taken and the prewarm result goes
    // unused.
  });

  it("a REJECTING prewarm-style call does not corrupt a concurrent, independent resolution for another token", async () => {
    vi.mocked(coingecko.getTokenLogoByAddress).mockImplementation(async (address) => {
      if (address === "0xthrows") throw new Error("simulated provider crash");
      return "https://example.com/ok.png";
    });

    // resolveTokenLogo/resolveTokenLogosForPools never actually throws in
    // production (every real provider call is wrapped in `toProviderResult`,
    // which converts a throw into `{ok:false}` — see `resolveTokenLogo`'s
    // own module doc comment). This test simulates the pathological case of
    // a raw throw slipping through anyway, to prove even that can't corrupt
    // a sibling concurrent call.
    const crashing = resolveTokenLogosForPools([{ symbol: "CRASHTOK", address: "0xthrows" }]).catch(() => "caught" as const);
    const healthy = await resolveTokenLogosForPools([{ symbol: "OKTOK", address: "0xok" }]);

    expect(healthy.OKTOK).toBe("https://example.com/ok.png");
    await expect(crashing).resolves.toBe("caught");
  });
});
