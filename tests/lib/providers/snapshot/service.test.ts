import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * MASTER HARDENING PASS — Concern 1 (API cost audit). Regression tests for
 * `getProposalsForSpaces` — the batched sibling of `getProposals` added to
 * cut Featured Intelligence's Governance-dimension provider calls from one
 * per project to one per snapshot regeneration. `client.ts` is mocked
 * directly (same convention as `tests/lib/providers/blockscoutService.test.ts`)
 * so the real `getOrSet`/`withStaleFallback`/`assertRateLimit` wiring runs
 * unmodified — this exercises the actual service-layer behavior, not a
 * re-implementation of it. Each scenario uses its own unique space names,
 * since the in-memory provider cache is module-scoped and persists across
 * tests in this file (the same convention `blockscoutService.test.ts` uses).
 */
vi.mock("@/lib/providers/snapshot/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/providers/snapshot/client")>();
  return { ...actual, fetchProposals: vi.fn(), fetchProposalsForSpaces: vi.fn() };
});

import * as client from "@/lib/providers/snapshot/client";
import { getProposalsForSpaces } from "@/lib/providers/snapshot/service";
import { __resetProviderCacheForTests } from "@/lib/providers/common/cache";
import { resetRateLimitBucketsForTests } from "@/lib/providers/common/rate-limit";
import type { RawSnapshotProposalWithSpace } from "@/lib/providers/snapshot/client";

function rawProposal(overrides: Partial<RawSnapshotProposalWithSpace> = {}): RawSnapshotProposalWithSpace {
  return {
    id: "0xproposal",
    title: "Test Proposal",
    body: "",
    state: "closed",
    start: 1_700_000_000,
    end: 1_700_100_000,
    scores_total: 1000,
    quorum: 500,
    link: "https://snapshot.org/#/test.eth/proposal/1",
    votes: 250,
    discussion: null,
    author: "0xauthor",
    space: { id: "test.eth" },
    ...overrides,
  };
}

describe("getProposalsForSpaces — batched governance (MASTER HARDENING PASS, Concern 1)", () => {
  beforeEach(() => {
    vi.mocked(client.fetchProposalsForSpaces).mockReset();
  });

  it("returns an empty, ok result without calling the client at all for an empty space list", async () => {
    const result = await getProposalsForSpaces([]);
    expect(result).toEqual({ ok: true, data: {}, source: "snapshot", fetchedAt: expect.any(String) });
    expect(client.fetchProposalsForSpaces).not.toHaveBeenCalled();
  });

  it("makes exactly ONE real call for multiple spaces and correctly groups proposals by space id", async () => {
    vi.mocked(client.fetchProposalsForSpaces).mockResolvedValue([
      rawProposal({ id: "0x1", space: { id: "hardening-a.eth" }, end: 1_700_200_000 }),
      rawProposal({ id: "0x2", space: { id: "hardening-a.eth" }, end: 1_700_100_000 }),
      rawProposal({ id: "0x3", space: { id: "hardening-b.eth" }, end: 1_700_150_000 }),
    ]);

    const result = await getProposalsForSpaces(["hardening-a.eth", "hardening-b.eth"]);

    expect(client.fetchProposalsForSpaces).toHaveBeenCalledTimes(1);
    expect(client.fetchProposalsForSpaces).toHaveBeenCalledWith(["hardening-a.eth", "hardening-b.eth"]);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.data["hardening-a.eth"]).toHaveLength(2);
    expect(result.data["hardening-b.eth"]).toHaveLength(1);
    expect(result.data["hardening-a.eth"][0].id).toBe("0x1");
  });

  it("a requested space with zero real proposals in the response resolves to an empty array, never omitted or fabricated", async () => {
    vi.mocked(client.fetchProposalsForSpaces).mockResolvedValue([rawProposal({ space: { id: "hardening-c.eth" } })]);

    const result = await getProposalsForSpaces(["hardening-c.eth", "hardening-quiet.eth"]);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.data["hardening-quiet.eth"]).toEqual([]);
    expect("hardening-quiet.eth" in result.data).toBe(true); // present as an honest empty list, not missing
  });

  it("deduplicates the requested space list and normalizes ordering into the same cache key", async () => {
    vi.mocked(client.fetchProposalsForSpaces).mockResolvedValue([]);

    await getProposalsForSpaces(["hardening-dedup.eth", "hardening-dedup.eth"]);
    await getProposalsForSpaces(["hardening-dedup.eth"]); // same effective set, different call shape

    expect(client.fetchProposalsForSpaces).toHaveBeenCalledTimes(1); // second call hit the same cache entry
  });

  it("caches the batched result: a second call for the same space set makes no additional real request", async () => {
    __resetProviderCacheForTests();
    vi.mocked(client.fetchProposalsForSpaces).mockResolvedValue([rawProposal({ space: { id: "hardening-cache.eth" } })]);

    await getProposalsForSpaces(["hardening-cache.eth"]);
    await getProposalsForSpaces(["hardening-cache.eth"]);

    expect(client.fetchProposalsForSpaces).toHaveBeenCalledTimes(1);
  });

  it("a request for a DIFFERENT space set is a genuinely different cache key — never silently reuses an unrelated batch's result", async () => {
    vi.mocked(client.fetchProposalsForSpaces)
      .mockResolvedValueOnce([rawProposal({ id: "0xset1", space: { id: "hardening-set1.eth" } })])
      .mockResolvedValueOnce([rawProposal({ id: "0xset2", space: { id: "hardening-set2.eth" } })]);

    const a = await getProposalsForSpaces(["hardening-set1.eth"]);
    const b = await getProposalsForSpaces(["hardening-set2.eth"]);

    expect(client.fetchProposalsForSpaces).toHaveBeenCalledTimes(2);
    if (!a.ok || !b.ok) throw new Error("expected ok");
    expect(a.data["hardening-set1.eth"][0].id).toBe("0xset1");
    expect(b.data["hardening-set2.eth"][0].id).toBe("0xset2");
  });

  it("on failure, degrades honestly to ok:false — never a fabricated empty-but-successful result", async () => {
    vi.mocked(client.fetchProposalsForSpaces).mockRejectedValue(new Error("simulated Snapshot outage"));

    const result = await getProposalsForSpaces(["hardening-fail.eth"]);

    expect(result.ok).toBe(false);
  });

  it("stale fallback: a prior successful batch survives a later failure, honestly tagged stale", async () => {
    vi.useFakeTimers();
    try {
      __resetProviderCacheForTests();
      resetRateLimitBucketsForTests();
      vi.mocked(client.fetchProposalsForSpaces).mockResolvedValueOnce([rawProposal({ id: "0xgood", space: { id: "hardening-stale.eth" } })]);

      const before = await getProposalsForSpaces(["hardening-stale.eth"]);
      expect(before.ok).toBe(true);
      if (!before.ok) throw new Error("expected ok");
      expect(before.stale).toBeFalsy();

      // Past the Governance TTL (20min) so the next call attempts a live refetch.
      await vi.advanceTimersByTimeAsync(21 * 60_000);
      vi.mocked(client.fetchProposalsForSpaces).mockRejectedValue(new Error("simulated outage"));

      const after = await getProposalsForSpaces(["hardening-stale.eth"]);
      expect(after.ok).toBe(true); // degraded to the last real data, not blanked
      if (!after.ok) throw new Error("expected ok");
      expect(after.data["hardening-stale.eth"][0].id).toBe("0xgood");
      expect(after.stale).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
