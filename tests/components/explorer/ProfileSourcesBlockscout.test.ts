import { describe, expect, it } from "vitest";

import { classifyBlockscoutVerification } from "@/components/explorer/ProfileSources";
import type { ContractDetailEntry } from "@/lib/providers/blockscout/contractDetails";
import type { ContractDetail } from "@/lib/providers/blockscout/mapper";

/**
 * V1-FOLLOWUP-004 — verifies `classifyBlockscoutVerification()`'s new
 * `stale` propagation, mirroring `matchGithub`'s already-proven pattern.
 * Existing classification behavior (verified/not-verified/not-matched/
 * no-entries/failure) is re-asserted unchanged alongside it.
 */
function contractDetail(overrides: Partial<ContractDetail> = {}): ContractDetail {
  return {
    verified: true,
    isContract: true,
    name: "Test",
    compilerVersion: "0.8.0",
    optimizationEnabled: true,
    licenseType: "mit",
    proxyType: null,
    implementationAddress: null,
    implementationName: null,
    creatorAddress: null,
    creationTxHash: null,
    ...overrides,
  } as ContractDetail;
}

function okEntry(address: string, overrides: Partial<ContractDetail> = {}, stale?: boolean): ContractDetailEntry {
  return { address, result: { ok: true, data: contractDetail(overrides), source: "blockscout", fetchedAt: "2026-01-01T00:00:00.000Z", stale } };
}

function failedEntry(address: string, message = "blockscout unavailable"): ContractDetailEntry {
  return { address, result: { ok: false, source: "blockscout", error: { code: "network_error", message } } };
}

describe("classifyBlockscoutVerification — stale propagation", () => {
  it("a fresh verified match carries no stale flag (unchanged behavior)", () => {
    const outcome = classifyBlockscoutVerification([okEntry("0xabc", { verified: true })]);
    expect(outcome.status).toBe("live");
    expect(outcome.stale).toBeUndefined();
  });

  it("a stale verified match (Blockscout down, serving the last real value) is honestly surfaced", () => {
    const outcome = classifyBlockscoutVerification([okEntry("0xabc", { verified: true }, true)]);
    expect(outcome.status).toBe("live");
    expect(outcome.stale).toBe(true);
    // The real verification finding is preserved unchanged — only staleness is new information.
    expect(outcome.description).toBe("Blockscout confirms this project's registered contract is verified — real, on-record source code and compiler metadata.");
  });

  it("a stale 'real contract, not verified' match still reports stale", () => {
    const outcome = classifyBlockscoutVerification([okEntry("0xabc", { verified: false, isContract: true }, true)]);
    expect(outcome.status).toBe("unavailable");
    expect(outcome.stale).toBe(true);
  });

  it("no entries configured: stale is not applicable (undefined), unchanged behavior", () => {
    const outcome = classifyBlockscoutVerification([]);
    expect(outcome.status).toBe("not_configured");
    expect(outcome.stale).toBeUndefined();
  });

  it("every lookup failed outright: stale is not applicable (a failed entry can never be stale)", () => {
    const outcome = classifyBlockscoutVerification([failedEntry("0xabc")]);
    expect(outcome.status).toBe("unavailable");
    expect(outcome.stale).toBeUndefined();
  });
});
