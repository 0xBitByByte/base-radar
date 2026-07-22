import { describe, expect, it } from "vitest";

import { computeHealth } from "@/lib/intelligence/scoring";
import type { Project } from "@/data/projects/types";
import type { GithubIntel, Market, Trading, Tvl } from "@/lib/intelligence/types";

/**
 * `computeHealth` only ever reads `project.verification.status` from
 * `Project`, and `.available` plus one numeric field from each section —
 * these fixtures deliberately supply only what the function under test
 * actually reads, not a full, real-shaped record. The casts are the
 * fixture being narrower than the real type on purpose, not a type-safety
 * gap in the production code.
 */
function project(status: Project["verification"]["status"]): Project {
  return { verification: { status } } as unknown as Project;
}

const UNAVAILABLE_SECTIONS = {
  market: { available: false } as unknown as Market,
  trading: { available: false } as unknown as Trading,
  tvl: { available: false } as unknown as Tvl,
  github: { available: false } as unknown as GithubIntel,
};

describe("computeHealth", () => {
  it("caps a flagged project at the lowest score regardless of other signals", () => {
    const result = computeHealth(project("flagged"), {
      ...UNAVAILABLE_SECTIONS,
      tvl: { available: true, tvlUsd: 50_000_000 } as unknown as Tvl,
    });

    expect(result.score).toBe(5);
    expect(result.label).toBe("poor");
  });

  it("reports unknown with a zero score when no live signals are available", () => {
    const result = computeHealth(project("verified"), UNAVAILABLE_SECTIONS);

    expect(result.score).toBe(0);
    expect(result.label).toBe("unknown");
  });

  it("scores higher with a strong TVL signal than with no signal at all", () => {
    const withTvl = computeHealth(project("verified"), {
      ...UNAVAILABLE_SECTIONS,
      tvl: { available: true, tvlUsd: 50_000_000 } as unknown as Tvl,
    });
    const withoutSignals = computeHealth(project("verified"), UNAVAILABLE_SECTIONS);

    expect(withTvl.score).toBeGreaterThan(withoutSignals.score);
    expect(withTvl.factors.some((factor) => factor.includes("TVL signal"))).toBe(true);
  });

  it("never exceeds the 0-100 range even when every signal is maximally positive", () => {
    const result = computeHealth(project("verified"), {
      market: { available: true, changePct24h: 10_000 } as unknown as Market,
      trading: { available: true, liquidityUsd: 10_000_000_000 } as unknown as Trading,
      tvl: { available: true, tvlUsd: 10_000_000_000 } as unknown as Tvl,
      github: { available: true, stars: 1_000_000 } as unknown as GithubIntel,
    });

    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.label).toBe("excellent");
  });
});
