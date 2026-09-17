import { describe, expect, it } from "vitest";

import { mapContractDetail } from "@/lib/providers/blockscout/mapper";
import type { RawAddressInfo, RawContractDetail } from "@/lib/providers/blockscout/client";

const address: RawAddressInfo = {
  creator_address_hash: "0xcreator",
  creation_transaction_hash: "0xtx",
  is_contract: true,
  is_verified: true,
};

const baseContract: RawContractDetail = {
  name: "MyContract",
  is_verified: true,
  compiler_version: "0.8.19",
  optimization_enabled: true,
  license_type: "mit",
  language: "solidity",
  proxy_type: null,
  implementations: [],
  verified_at: "2026-01-01T00:00:00.000Z",
};

/**
 * Regression test for the Final Engineering Audit finding: `RawContractDetail`
 * declares `implementations` as a required array, but that field is only
 * confirmed populated for a *proxy* contract (the type's own doc comment
 * cites a proxy as its one live-verified example) — Blockscout's real
 * `/smart-contracts/{address}` response for a genuine, non-proxy verified
 * contract can plausibly omit it. `mapContractDetail` used to read
 * `contract.implementations[0]` with no guard on `implementations` itself
 * (only on `contract`), which throws `TypeError` the moment a real response
 * doesn't match the declared type — exactly the kind of provider-response
 * mismatch this codebase treats as reachable, not theoretical, everywhere
 * else (see the identical, already-guarded field at this file's
 * `mapTokenTransfers`: `item.to.implementations?.[0]?.name`).
 */
describe("mapContractDetail — implementations field null-safety", () => {
  it("does not throw and resolves to null when a real response omits `implementations` entirely", () => {
    const malformedContract = { ...baseContract } as RawContractDetail;
    // Simulates a real Blockscout response for a non-proxy contract that
    // omits the field — TypeScript's static type says this can't happen,
    // but nothing validates the actual HTTP response against it.
    delete (malformedContract as { implementations?: unknown }).implementations;

    expect(() => mapContractDetail(malformedContract, address)).not.toThrow();

    const result = mapContractDetail(malformedContract, address);
    expect(result.implementationAddress).toBeNull();
    expect(result.implementationName).toBeNull();
  });

  it("still resolves the first implementation for a real proxy contract", () => {
    const proxyContract: RawContractDetail = {
      ...baseContract,
      proxy_type: "eip1967",
      implementations: [{ address_hash: "0xImpl", name: "ImplName" }],
    };

    const result = mapContractDetail(proxyContract, address);
    expect(result.implementationAddress).toBe("0xImpl");
    expect(result.implementationName).toBe("ImplName");
  });

  it("resolves to null when `implementations` is a real empty array (non-proxy, well-formed response)", () => {
    const result = mapContractDetail(baseContract, address);
    expect(result.implementationAddress).toBeNull();
    expect(result.implementationName).toBeNull();
  });
});
