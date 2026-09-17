import { describe, expect, it } from "vitest";

import { mapDiscoveredTokenBalances } from "@/lib/providers/blockscout/mapper";
import type { RawTokenBalance } from "@/lib/providers/blockscout/client";

const erc20 = (overrides: Partial<RawTokenBalance["token"]> = {}, value = "1000000"): RawTokenBalance => ({
  value,
  token: {
    address_hash: "0xusdc",
    symbol: "USDC",
    name: "USD Coin",
    decimals: "6",
    type: "ERC-20",
    exchange_rate: "1.00",
    icon_url: "https://example.com/usdc.svg",
    ...overrides,
  },
});

describe("mapDiscoveredTokenBalances", () => {
  it("maps a real ERC-20 balance entry to the domain shape, keeping balance as a bigint", () => {
    const result = mapDiscoveredTokenBalances([erc20()]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      address: "0xusdc",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      usdPrice: 1,
      logo: "https://example.com/usdc.svg",
    });
    expect(result[0].balance).toBe(BigInt(1_000_000));
    expect(typeof result[0].balance).toBe("bigint");
  });

  it("filters out NFTs (ERC-721/ERC-1155) — this feature reports ERC-20 balances only", () => {
    const nft = erc20({ type: "ERC-721" });
    const sft = erc20({ type: "ERC-1155" });
    expect(mapDiscoveredTokenBalances([nft, sft])).toHaveLength(0);
  });

  it("drops a zero-balance entry — a token this wallet has fully sent away isn't a real holding", () => {
    const zero = erc20({}, "0");
    expect(mapDiscoveredTokenBalances([zero])).toHaveLength(0);
  });

  it("maps a null exchange_rate (a token Blockscout doesn't price) to usdPrice: null, never a fabricated 0", () => {
    const unpriced = erc20({ exchange_rate: null });
    expect(mapDiscoveredTokenBalances([unpriced])[0].usdPrice).toBeNull();
  });

  it("maps a missing icon_url to logo: null", () => {
    const noIcon = erc20({ icon_url: undefined });
    expect(mapDiscoveredTokenBalances([noIcon])[0].logo).toBeNull();
  });

  it("preserves order and handles a mix of ERC-20, NFT, and zero-balance entries in one real response", () => {
    const usdc = erc20({ address_hash: "0xusdc" }, "1000000");
    const nft = erc20({ type: "ERC-721" });
    const dust = erc20({ address_hash: "0xdust" }, "0");
    const weth = erc20({ address_hash: "0xweth", symbol: "WETH" }, "500000000000000000");
    const result = mapDiscoveredTokenBalances([usdc, nft, dust, weth]);
    expect(result.map((t) => t.address)).toEqual(["0xusdc", "0xweth"]);
  });
});
