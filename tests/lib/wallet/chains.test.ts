import { describe, expect, it } from "vitest";
import { base, baseSepolia, mainnet } from "viem/chains";

import { getWalletExplorerAddressUrl, isSupportedWalletChain } from "@/lib/wallet/chains";

const ADDRESS = "0x1234567890123456789012345678901234567890";

describe("isSupportedWalletChain", () => {
  it("returns true for Base Mainnet", () => {
    expect(isSupportedWalletChain(base.id)).toBe(true);
  });

  it("returns true for Base Sepolia", () => {
    expect(isSupportedWalletChain(baseSepolia.id)).toBe(true);
  });

  it("returns false for every other chain", () => {
    expect(isSupportedWalletChain(mainnet.id)).toBe(false);
  });

  it("returns false when undefined (not yet connected)", () => {
    expect(isSupportedWalletChain(undefined)).toBe(false);
  });
});

describe("getWalletExplorerAddressUrl", () => {
  it("builds a BaseScan mainnet address URL", () => {
    expect(getWalletExplorerAddressUrl(base.id, ADDRESS)).toBe(`https://basescan.org/address/${ADDRESS}`);
  });

  it("builds a Base Sepolia BaseScan address URL, a distinct explorer instance", () => {
    expect(getWalletExplorerAddressUrl(baseSepolia.id, ADDRESS)).toBe(`https://sepolia.basescan.org/address/${ADDRESS}`);
  });

  it("returns null for an unsupported chain — never guesses at an explorer", () => {
    expect(getWalletExplorerAddressUrl(mainnet.id, ADDRESS)).toBeNull();
  });

  it("returns null when chainId is undefined", () => {
    expect(getWalletExplorerAddressUrl(undefined, ADDRESS)).toBeNull();
  });
});
