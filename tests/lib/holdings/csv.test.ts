import { describe, expect, it } from "vitest";

import { buildHoldingsCsv, buildHoldingsCsvFilename } from "@/lib/holdings/csv";
import type { HoldingAsset } from "@/lib/holdings/types";

const GENERATED_AT = "2026-09-06T21:00:00.000Z";

function makeAsset(overrides: Partial<HoldingAsset> = {}): HoldingAsset {
  return { address: "0xaave", symbol: "AAVE", name: "Aave Token", logo: null, balance: BigInt(1), decimals: 18, formattedBalance: "1.5", usdPrice: 100, usdValue: 150, allocationPct: 50, chain: "base", verified: true, tokenType: "erc20", ...overrides };
}

describe("buildHoldingsCsv", () => {
  it("real header row, one real data row per holding", () => {
    const csv = buildHoldingsCsv([makeAsset()], GENERATED_AT);
    const lines = csv.trim().split("\r\n");
    expect(lines[1]).toBe("Symbol,Name,Balance,Address,Chain,USD Price,USD Value,Allocation %,Verified");
    expect(lines[2]).toBe("AAVE,Aave Token,1.5,0xaave,base,100,150,50.00,Yes");
  });

  it("native ETH (address: null) is labeled honestly, never a fabricated address", () => {
    const csv = buildHoldingsCsv([makeAsset({ address: null, symbol: "ETH", name: "Ethereum", tokenType: "native" })], GENERATED_AT);
    expect(csv).toContain("ETH,Ethereum,1.5,Native ETH,base");
  });

  it("an unknown price/value/allocation is an honest empty cell, never a fabricated 0", () => {
    const csv = buildHoldingsCsv([makeAsset({ usdPrice: null, usdValue: null, allocationPct: null })], GENERATED_AT);
    expect(csv).toContain("AAVE,Aave Token,1.5,0xaave,base,,,,Yes");
  });

  it("verified: null is labeled 'Not checked', distinct from a real 'No'", () => {
    const csv = buildHoldingsCsv([makeAsset({ verified: null })], GENERATED_AT);
    expect(csv).toContain(",Not checked");
    const csvFalse = buildHoldingsCsv([makeAsset({ verified: false })], GENERATED_AT);
    expect(csvFalse.trim().split("\r\n")[2].endsWith(",No")).toBe(true);
  });

  it("a genuinely empty holdings list produces just the header — never a fabricated row", () => {
    const csv = buildHoldingsCsv([], GENERATED_AT);
    const lines = csv.trim().split("\r\n");
    expect(lines).toHaveLength(2);
  });

  it("determinism: identical inputs produce an identical CSV", () => {
    const assets = [makeAsset()];
    expect(buildHoldingsCsv(assets, GENERATED_AT)).toBe(buildHoldingsCsv(assets, GENERATED_AT));
  });
});

describe("buildHoldingsCsvFilename", () => {
  it("is deterministic for the same real generatedAt", () => {
    expect(buildHoldingsCsvFilename(GENERATED_AT)).toBe(buildHoldingsCsvFilename(GENERATED_AT));
  });

  it("ends in .csv", () => {
    expect(buildHoldingsCsvFilename(GENERATED_AT)).toMatch(/\.csv$/);
  });
});
