import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * V1-IMPLEMENT-001 (ADR V1-BLOCKER-001, Phase 1) — verifies the
 * `withStaleFallback` wiring added to `getRecentlyVerifiedContract`,
 * `getTokenTransfers`, and `getContractDetail` in
 * `lib/providers/blockscout/service.ts`, mirroring the exact pattern
 * already proven for `getChainStats` (this file) and `github.getRepoStats`.
 *
 * `client.ts` is mocked directly — the real `getOrSet`/`withStaleFallback`/
 * `toProviderResult` machinery runs unmodified, so these tests exercise the
 * actual wiring, not a re-implementation of it. Each scenario uses a unique
 * token/contract address as its cache key, since the in-memory cache is
 * module-scoped and persists across tests in this file.
 */
vi.mock("@/lib/providers/blockscout/client", () => ({
  fetchChainStats: vi.fn(),
  fetchRecentSmartContracts: vi.fn(),
  fetchTokenTransfers: vi.fn(),
  fetchContractDetail: vi.fn(),
  fetchAddressInfo: vi.fn(),
}));

import * as client from "@/lib/providers/blockscout/client";
import { getContractDetail, getRecentlyVerifiedContract, getTokenTransfers } from "@/lib/providers/blockscout/service";

const rawTransfer = (hash: string) => ({
  items: [
    {
      transaction_hash: hash,
      log_index: 0,
      timestamp: "2026-01-01T00:00:00.000Z",
      from: { hash: "0xfrom" },
      to: { hash: "0xto", is_contract: false },
      total: { value: "1000000000000000000", decimals: "18" },
      block_number: 1,
    },
  ],
});

describe("blockscout service — Phase 1 stale fallback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(client.fetchTokenTransfers).mockReset();
    vi.mocked(client.fetchRecentSmartContracts).mockReset();
    vi.mocked(client.fetchContractDetail).mockReset();
    vi.mocked(client.fetchAddressInfo).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("healthy provider: returns fresh data, unchanged, with no stale flag", async () => {
    vi.mocked(client.fetchTokenTransfers).mockResolvedValueOnce(rawTransfer("0xaaa"));

    const result = await getTokenTransfers("0xhealthy1111111111111111111111111111111");

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.stale).toBeUndefined();
    expect(result.data[0]?.txHash).toBe("0xaaa");
  });

  it("provider failure with a real stale value present: returns the last successful value, honestly marked stale", async () => {
    const address = "0xstale22222222222222222222222222222222";

    vi.mocked(client.fetchTokenTransfers).mockResolvedValueOnce(rawTransfer("0xfirst"));
    const first = await getTokenTransfers(address);
    expect(first.ok).toBe(true);

    // Advance past this endpoint's 30s cache TTL so the next call re-fetches
    // instead of returning the still-fresh cached value.
    vi.advanceTimersByTime(31_000);

    vi.mocked(client.fetchTokenTransfers).mockRejectedValueOnce(new Error("blockscout unavailable"));
    const second = await getTokenTransfers(address);

    expect(second.ok).toBe(true);
    if (!second.ok) throw new Error("expected a stale ok result, got a hard failure");
    expect(second.stale).toBe(true);
    expect(second.data[0]?.txHash).toBe("0xfirst"); // the real, last-known-good value — never fabricated
  });

  it("provider failure with no stale value: fails exactly as before Phase 1 — no fabricated fallback", async () => {
    vi.mocked(client.fetchTokenTransfers).mockRejectedValueOnce(new Error("blockscout unavailable"));

    const result = await getTokenTransfers("0xnostale333333333333333333333333333333");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected a hard failure — no stale value has ever existed for this key");
    expect(result.error.message).toContain("blockscout unavailable");
  });

  it("getRecentlyVerifiedContract: healthy wiring smoke test — unaffected by the fallback wrapper", async () => {
    vi.mocked(client.fetchRecentSmartContracts).mockResolvedValueOnce({
      items: [{ address: { hash: "0xcontract", name: "Test" }, verified_at: "2026-01-01T00:00:00.000Z" }],
    });

    const result = await getRecentlyVerifiedContract();
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.stale).toBeUndefined();
  });

  it("getContractDetail: healthy wiring smoke test — unaffected by the fallback wrapper", async () => {
    vi.mocked(client.fetchContractDetail).mockResolvedValueOnce({
      name: "Test",
      is_verified: true,
      compiler_version: "0.8.0",
      optimization_enabled: true,
      license_type: "mit",
      language: "solidity",
      proxy_type: null,
      implementations: [],
      verified_at: "2026-01-01T00:00:00.000Z",
    });
    vi.mocked(client.fetchAddressInfo).mockResolvedValueOnce({
      creator_address_hash: "0xcreator",
      creation_transaction_hash: "0xtx",
      is_contract: true,
      is_verified: true,
    });

    const result = await getContractDetail("0xdetailsmoke4444444444444444444444444444");
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.stale).toBeUndefined();
  });
});
