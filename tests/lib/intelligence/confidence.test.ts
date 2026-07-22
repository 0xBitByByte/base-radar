import { describe, expect, it } from "vitest";

import { computeConfidence } from "@/lib/intelligence/confidence";
import type { Project } from "@/data/projects/types";
import type { ProjectSources, ProviderSlice } from "@/lib/intelligence/types";

function project(status: Project["verification"]["status"]): Project {
  return { verification: { status } } as unknown as Project;
}

function unavailableSlice(): ProviderSlice<unknown> {
  return { data: null, status: "unavailable", fetchedAt: null, matchQuality: "none", detail: null };
}

/** All six sources unavailable — isolates the verification baseline. */
function noLiveSources(): ProjectSources {
  return {
    market: unavailableSlice(),
    trading: unavailableSlice(),
    tvl: unavailableSlice(),
    network: unavailableSlice(),
    verifiedContract: unavailableSlice(),
    github: unavailableSlice(),
  } as ProjectSources;
}

describe("computeConfidence", () => {
  it("scores a verified project higher than an unverified one with identical sources", () => {
    const verified = computeConfidence(project("verified"), noLiveSources());
    const unverified = computeConfidence(project("unverified"), noLiveSources());

    expect(verified.score).toBeGreaterThan(unverified.score);
  });

  it("penalizes a flagged project even with the same sources as a verified one", () => {
    const flagged = computeConfidence(project("flagged"), noLiveSources());
    const verified = computeConfidence(project("verified"), noLiveSources());

    expect(flagged.score).toBeLessThan(verified.score);
    expect(flagged.level).toBe("low");
  });

  it("gives a fuzzy-matched live source fewer points than an exact match", () => {
    const exact = computeConfidence(project("verified"), {
      ...noLiveSources(),
      market: { data: {}, status: "live", fetchedAt: "now", matchQuality: "exact", detail: null },
    } as ProjectSources);

    const fuzzy = computeConfidence(project("verified"), {
      ...noLiveSources(),
      market: { data: {}, status: "live", fetchedAt: "now", matchQuality: "fuzzy", detail: null },
    } as ProjectSources);

    expect(exact.score).toBeGreaterThan(fuzzy.score);
  });

  it("keeps the score within 0-100 and reaches the high tier with verification plus every live source", () => {
    const allLive: ProjectSources = {
      market: { data: {}, status: "live", fetchedAt: "now", matchQuality: "exact", detail: null },
      trading: { data: {}, status: "live", fetchedAt: "now", matchQuality: "exact", detail: null },
      tvl: { data: {}, status: "live", fetchedAt: "now", matchQuality: "exact", detail: null },
      network: { data: {}, status: "live", fetchedAt: "now", matchQuality: "exact", detail: null },
      verifiedContract: { data: {}, status: "live", fetchedAt: "now", matchQuality: "exact", detail: null },
      github: { data: {}, status: "live", fetchedAt: "now", matchQuality: "exact", detail: null },
    } as ProjectSources;

    const result = computeConfidence(project("verified"), allLive);

    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.level).toBe("high");
  });
});
