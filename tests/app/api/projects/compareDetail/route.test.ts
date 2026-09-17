// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import type { ProjectIntelligence } from "@/lib/intelligence/types";
import type { IntelligenceReport } from "@/lib/intelligence/report";

vi.mock("@/lib/intelligence/engine", () => ({ buildProjectIntelligence: vi.fn() }));
vi.mock("@/lib/intelligence/scorecard", () => ({ buildHealthScorecard: vi.fn(() => []) }));
vi.mock("@/lib/intelligence/report", () => ({ buildIntelligenceReport: vi.fn() }));
vi.mock("@/lib/data/aggregate", () => ({ getRawWhaleEvents: vi.fn(async () => []) }));
vi.mock("@/lib/providers/blockscout/service", () => ({ getContractDetail: vi.fn() }));

import { GET } from "@/app/api/projects/[slug]/compare-detail/route";
import { buildProjectIntelligence } from "@/lib/intelligence/engine";
import { buildIntelligenceReport } from "@/lib/intelligence/report";
import { getRawWhaleEvents } from "@/lib/data/aggregate";
import * as blockscout from "@/lib/providers/blockscout/service";

/** Only the fields `route.ts` actually reads — cast past `ProjectIntelligence`'s full real shape deliberately, since `buildHealthScorecard`/`buildIntelligenceReport` are mocked below and never actually read anything beyond what's threaded through here. */
function makeProfile(overrides: Record<string, unknown> = {}): ProjectIntelligence {
  return {
    identity: { id: "aave", name: "Aave", slug: "aave", websiteUrl: null, logoUrl: null, logoUrlFallbacks: [] },
    market: { available: true, priceUsd: 1, changePct24h: null, changePct7d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null, tvlUsd: null },
    trading: { pools: [] },
    tvl: {},
    contracts: { count: 1, items: [{ chain: "base", address: "0x63706e401c06ac8513145b7687a14804d17f814b", type: "token", label: null, verified: null }] },
    github: { available: false, fullName: null },
    chain: {},
    community: {
      socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null },
      governanceUrl: null,
      governanceType: null,
      verificationStatus: "verified",
    },
    health: {},
    sources: {},
    confidence: { score: 50, level: "medium" },
    freshness: {},
    metadata: {},
    summary: "",
    narrative: null,
    risk: { contributors: [] },
    governance: null,
    ...overrides,
  } as unknown as ProjectIntelligence;
}

const REPORT: IntelligenceReport = {
  grade: "A",
  recommendation: "Suitable for Deeper Research",
  confidenceLabel: "High",
  riskLevel: "low",
  thesis: "",
  highlights: [],
  strengths: ["Verified in the Base Radar registry."],
  weaknesses: [],
  opportunities: [],
  threats: [],
  metricsExplained: [],
  recentDevelopments: [],
  upcomingCatalysts: [],
  watchClosely: [],
  thingsWeCouldntVerify: [],
  sourcesUsed: [],
};

function request(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

describe("GET /api/projects/[slug]/compare-detail", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns a real 404 for a slug with no matching registry project, never a fabricated 200", async () => {
    const response = await GET(new NextRequest("http://localhost:3000/api/projects/not-a-real-project/compare-detail"), request("not-a-real-project"));
    expect(response.status).toBe(404);
  });

  it("reuses the exact same buildProjectIntelligence/buildIntelligenceReport calls the Profile AI page makes, and returns their real output verbatim", async () => {
    vi.mocked(buildProjectIntelligence).mockResolvedValueOnce(makeProfile());
    vi.mocked(buildIntelligenceReport).mockReturnValueOnce(REPORT);
    vi.mocked(blockscout.getContractDetail).mockResolvedValueOnce({
      ok: true,
      source: "blockscout",
      fetchedAt: "2026-01-01T00:00:00.000Z",
      data: { verified: true, isContract: true, name: null, compilerVersion: "0.8.19", optimizationEnabled: true, licenseType: "MIT", language: null, proxyType: null, implementationAddress: null, implementationName: null, creatorAddress: null, creationTxHash: null },
    });

    const response = await GET(new NextRequest("http://localhost:3000/api/projects/aave/compare-detail"), request("aave"));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.recommendation).toBe("Suitable for Deeper Research");
    expect(body.strengths).toEqual(["Verified in the Base Radar registry."]);
    expect(body.weaknesses).toEqual([]);
    expect(body.contracts).toEqual([{ address: "0x63706e401c06ac8513145b7687a14804d17f814b", chain: "base", ok: true, verified: true, isContract: true, proxyType: null, compilerVersion: "0.8.19", licenseType: "MIT" }]);
  });

  it("marks a contract as ok: false, never fabricating a verified/compiler value, when Blockscout itself fails", async () => {
    vi.mocked(buildProjectIntelligence).mockResolvedValueOnce(makeProfile());
    vi.mocked(buildIntelligenceReport).mockReturnValueOnce(REPORT);
    vi.mocked(blockscout.getContractDetail).mockResolvedValueOnce({ ok: false, source: "blockscout", error: { code: "not_found", message: "not found" } });

    const response = await GET(new NextRequest("http://localhost:3000/api/projects/aave/compare-detail"), request("aave"));
    const body = await response.json();
    expect(body.contracts).toEqual([{ address: "0x63706e401c06ac8513145b7687a14804d17f814b", chain: "base", ok: false, verified: null, isContract: null, proxyType: null, compilerVersion: null, licenseType: null }]);
  });

  it("returns a real, clean 502 rather than an uncaught exception when a real upstream provider call fails (e.g. buildProjectIntelligence rejecting)", async () => {
    vi.mocked(buildProjectIntelligence).mockRejectedValueOnce(new Error("real provider failure"));

    const response = await GET(new NextRequest("http://localhost:3000/api/projects/aave/compare-detail"), request("aave"));
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toBe("Couldn't build intelligence/contract detail for this project right now.");
  });

  it("returns the same clean 502 when getRawWhaleEvents itself fails — the exact real failure mode lib/data/aggregate.ts's own getWhaleEventsImpl already guards against elsewhere", async () => {
    vi.mocked(buildProjectIntelligence).mockResolvedValueOnce(makeProfile());
    vi.mocked(getRawWhaleEvents).mockRejectedValueOnce(new Error("whale detection failed"));

    const response = await GET(new NextRequest("http://localhost:3000/api/projects/aave/compare-detail"), request("aave"));
    expect(response.status).toBe(502);
  });

  it("dedupes the registry's own blockscoutAddress against its contracts.items list, never fetching the same real address twice", async () => {
    vi.mocked(buildProjectIntelligence).mockResolvedValueOnce(
      makeProfile({ contracts: { count: 1, items: [{ chain: "base", address: "0x63706e401c06ac8513145b7687a14804d17f814b", type: "token", label: null, verified: null }] } })
    );
    vi.mocked(buildIntelligenceReport).mockReturnValueOnce(REPORT);
    vi.mocked(blockscout.getContractDetail).mockResolvedValueOnce({ ok: false, source: "blockscout", error: { code: "not_found", message: "not found" } });

    await GET(new NextRequest("http://localhost:3000/api/projects/aave/compare-detail"), request("aave"));
    // The real Aave seed's own `providerIds.blockscoutAddress` is this exact address — matching it here means the route's own dedup logic must collapse both candidates into one real fetch, not two.
    expect(blockscout.getContractDetail).toHaveBeenCalledTimes(1);
  });
});
