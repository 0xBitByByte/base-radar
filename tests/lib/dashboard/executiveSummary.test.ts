import { describe, expect, it } from "vitest";

import { buildEcosystemHealthLines, buildExecutiveHighlights, buildExecutiveSummary, computeMarketSentiment } from "@/lib/dashboard/executiveSummary";
import type { Kpi, NarrativeHeatRow } from "@/lib/data/types";
import type { GovernanceEvent } from "@/lib/governance";
import type { WhaleEvent } from "@/lib/whale";
import type { VerifiedContract } from "@/lib/providers/blockscout/service";
import type { RepoStats } from "@/lib/providers/github/service";

function governanceEvent(overrides: Partial<GovernanceEvent> = {}): GovernanceEvent {
  return {
    projectId: "aave",
    provider: "snapshot",
    proposalId: "prop-1",
    title: "Test Proposal",
    description: null,
    status: "active",
    start: "2026-01-01T00:00:00.000Z",
    end: "2026-06-01T00:00:00.000Z",
    participation: null,
    quorumMet: null,
    url: "https://snapshot.org/#/aave.eth/proposal/prop-1",
    voterCount: null,
    discussionUrl: null,
    proposerAddress: null,
    confidence: 80,
    ...overrides,
  };
}

function verifiedContract(overrides: Partial<VerifiedContract> = {}): VerifiedContract {
  return { address: "0xdeadbeef", name: "TestToken", verifiedAt: new Date().toISOString(), ...overrides };
}

function repoStats(overrides: Partial<RepoStats> = {}): RepoStats {
  return {
    fullName: "base-org/node",
    stars: 100,
    forks: 20,
    openIssues: 5,
    latestReleaseTag: "v1.2.3",
    latestReleasePublishedAt: new Date().toISOString(),
    latestReleaseNoteSummary: null,
    language: "TypeScript",
    license: "MIT",
    createdAt: "2023-01-01T00:00:00.000Z",
    pushedAt: new Date().toISOString(),
    archived: false,
    avatarUrl: null,
    ...overrides,
  };
}

function whaleEvent(overrides: Partial<WhaleEvent> = {}): WhaleEvent {
  return {
    id: "whale-1",
    projectId: "aave",
    tokenSymbol: "AAVE",
    usdValue: 4_800_000,
    txHash: "0xabc",
    fromAddress: "0x1111111111111111111111111111111111111111",
    toAddress: "0x2222222222222222222222222222222222222222",
    toIsContract: false,
    toContractName: null,
    timestamp: new Date(Date.now() - 5 * 60_000).toISOString(),
    sourceProvider: "blockscout",
    confidence: 90,
    detectionMethod: "threshold",
    classification: "whale-alert",
    ...overrides,
  };
}

function heatRow(overrides: Partial<NarrativeHeatRow>): NarrativeHeatRow {
  return { category: "DeFi", heat: 50, momentum: "flat", change24hPct: 0, ...overrides };
}

describe("computeMarketSentiment", () => {
  it("returns null for an empty heatmap — never a fabricated reading", () => {
    expect(computeMarketSentiment([])).toBeNull();
  });

  it("reads Bullish when more categories trend up than down", () => {
    const result = computeMarketSentiment([heatRow({ momentum: "up" }), heatRow({ momentum: "up" }), heatRow({ momentum: "down" })]);
    expect(result?.sentiment).toBe("Bullish");
    expect(result?.justification).toBe("2 of 3 tracked categories trending up");
  });

  it("reads Bearish when more categories trend down than up", () => {
    const result = computeMarketSentiment([heatRow({ momentum: "down" }), heatRow({ momentum: "down" }), heatRow({ momentum: "up" })]);
    expect(result?.sentiment).toBe("Bearish");
    expect(result?.justification).toBe("2 of 3 tracked categories trending down");
  });

  it("reads Neutral when up and down counts tie", () => {
    const result = computeMarketSentiment([heatRow({ momentum: "up" }), heatRow({ momentum: "down" })]);
    expect(result?.sentiment).toBe("Neutral");
  });
});

describe("buildEcosystemHealthLines", () => {
  it("returns an empty array when the registry has no tracked projects", () => {
    expect(buildEcosystemHealthLines(0, 0)).toEqual([]);
  });

  it("presents the real verified ratio, never a single synthesized score", () => {
    expect(buildEcosystemHealthLines(68, 100)).toEqual(["68% of tracked projects verified"]);
  });

  it("reads from project.verification.status (the populated editorial field), not the verificationLevel pipeline field confirmed unset on every current project — see the live bug this fixed", () => {
    // A snapshot with a real, non-zero verifiedCount produces a non-zero reading.
    expect(buildEcosystemHealthLines(21, 756)).toEqual(["3% of tracked projects verified"]);
  });
});

describe("buildExecutiveSummary", () => {
  const kpis: Kpi[] = [
    { id: "projects", label: "Indexed Projects", value: 2314, format: "number", tooltip: "" },
    { id: "tvl", label: "TVL", value: 3_680_000_000, format: "currency", tooltip: "" },
    { id: "volume24h", label: "24H Volume", value: 486_000_000, format: "currency", tooltip: "" },
  ];

  it("V1-FIX-006A — templates real KPI numbers into a compact stat line", () => {
    const summary = buildExecutiveSummary(kpis);
    expect(summary).toBe("2.31K Projects · TVL $3.68B · 24h Volume $486.00M");
  });

  it("never fabricates a clause for a KPI that isn't present", () => {
    const summary = buildExecutiveSummary([]);
    expect(summary).not.toContain("Projects");
    expect(summary).not.toContain("TVL");
  });

  it("V1-FIX-006 — no longer states a bare governance/whale count (moved to buildExecutiveHighlights)", () => {
    const summary = buildExecutiveSummary(kpis);
    expect(summary).not.toContain("active governance proposal");
    expect(summary).not.toContain("whale transfer");
  });

  it("V1-FIX-006A — no longer restates sentiment (already shown once on its own chip row)", () => {
    const summary = buildExecutiveSummary(kpis);
    expect(summary).not.toContain("sentiment");
  });
});

describe("buildExecutiveHighlights", () => {
  const empty = { topTvlMover: null, whaleEvents: [], governanceEvents: [], verifiedContract: null, repoStats: null };

  it("returns nothing when every source is empty — never a fabricated placeholder", () => {
    expect(buildExecutiveHighlights(empty)).toEqual([]);
  });

  it("names the real project for a whale event, not a bare count", () => {
    const highlights = buildExecutiveHighlights({ ...empty, whaleEvents: [whaleEvent()] });
    expect(highlights).toHaveLength(1);
    expect(highlights[0].text).toContain("Aave");
    expect(highlights[0].text).toContain("AAVE");
  });

  it("picks the highest-value whale event when several exist", () => {
    const highlights = buildExecutiveHighlights({
      ...empty,
      whaleEvents: [whaleEvent({ id: "small", usdValue: 200_000 }), whaleEvent({ id: "big", usdValue: 9_000_000 })],
    });
    expect(highlights[0].text).toContain("$9");
  });

  it("groups multiple active proposals from the same project into one count-based line", () => {
    const highlights = buildExecutiveHighlights({
      ...empty,
      governanceEvents: [governanceEvent({ proposalId: "p1" }), governanceEvent({ proposalId: "p2" })],
    });
    expect(highlights).toHaveLength(1);
    expect(highlights[0].text).toBe("Aave has 2 governance votes closing soon");
  });

  it("names the real proposal title for a single active proposal", () => {
    const highlights = buildExecutiveHighlights({
      ...empty,
      governanceEvents: [governanceEvent({ title: "Increase Reserve Factor" })],
    });
    expect(highlights[0].text).toContain("Increase Reserve Factor");
  });

  it("ignores non-active proposals — only real, currently-open votes count", () => {
    const highlights = buildExecutiveHighlights({
      ...empty,
      governanceEvents: [governanceEvent({ status: "passed" })],
    });
    expect(highlights).toEqual([]);
  });

  it("surfaces a real newly-verified contract", () => {
    const highlights = buildExecutiveHighlights({ ...empty, verifiedContract: verifiedContract() });
    expect(highlights[0].text).toBe("New contract verified: TestToken");
  });

  it("surfaces real developer activity from the primary repo", () => {
    const highlights = buildExecutiveHighlights({ ...empty, repoStats: repoStats() });
    expect(highlights[0].text).toBe("base-org/node released v1.2.3");
  });

  it("V1-FIX-006A — surfaces a real, notable 24h TVL mover", () => {
    const highlights = buildExecutiveHighlights({
      ...empty,
      topTvlMover: { projectId: "aerodrome", projectName: "Aerodrome", changePct24h: 19.4 },
    });
    expect(highlights[0].text).toBe("Aerodrome TVL increased 19.4% (24h)");
  });

  it("V1-FIX-006A — names a real TVL decrease honestly", () => {
    const highlights = buildExecutiveHighlights({
      ...empty,
      topTvlMover: { projectId: "moonwell", projectName: "Moonwell", changePct24h: -53.1 },
    });
    expect(highlights[0].text).toBe("Moonwell TVL decreased 53.1% (24h)");
  });

  it("V1-FIX-006A — ignores a real but non-notable (<5%) TVL move", () => {
    const highlights = buildExecutiveHighlights({
      ...empty,
      topTvlMover: { projectId: "aave", projectName: "Aave", changePct24h: 1.2 },
    });
    expect(highlights).toEqual([]);
  });

  it("respects priority order — TVL before whale before governance before security before dev activity — and never duplicates a category", () => {
    const highlights = buildExecutiveHighlights({
      topTvlMover: { projectId: "aerodrome", projectName: "Aerodrome", changePct24h: 19.4 },
      whaleEvents: [whaleEvent()],
      governanceEvents: [governanceEvent()],
      verifiedContract: verifiedContract(),
      repoStats: repoStats(),
    });
    expect(highlights).toHaveLength(5);
    expect(highlights.map((h) => h.id)[0]).toMatch(/^tvl-/);
    expect(highlights.map((h) => h.id)[1]).toMatch(/^whale-/);
    expect(highlights.map((h) => h.id)[2]).toMatch(/^governance-/);
    expect(highlights.map((h) => h.id)[3]).toMatch(/^verify-/);
    expect(highlights.map((h) => h.id)[4]).toMatch(/^dev-/);
  });
});
