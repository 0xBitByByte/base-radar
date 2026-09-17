import { describe, expect, it } from "vitest";

import {
  computeRadarScore,
  formatRadarScoreTooltip,
  MIN_COVERAGE_PCT,
  MIN_DIMENSION_COUNT,
  radarScoreToHealthLabel,
  RADAR_SCORE_DIMENSION_IDS,
  RADAR_SCORE_WEIGHTS,
  type RadarScoreDimensionInput,
} from "@/lib/intelligence/radarScore";

/**
 * PR-098.04 — Radar Score Methodology Audit & Hardening. Deterministic
 * fixtures for the audited methodology: renormalization-inflation
 * resistance, a minimum evidence bar, a confidence discount for partial
 * coverage, duplicate-evidence rejection, and stale-but-valid data.
 */

function full(overrides: Partial<Record<string, number>> = {}): RadarScoreDimensionInput[] {
  const defaults: Record<string, number> = {
    marketStrength: 70,
    tvlLiquidity: 65,
    onchainActivity: 60,
    developerActivity: 75,
    governance: 55,
    ecosystemTraction: 50,
    security: 80,
  };
  return RADAR_SCORE_DIMENSION_IDS.map((id) => ({ id, score: overrides[id] ?? defaults[id] }));
}

describe("computeRadarScore — weights (PR-098.04)", () => {
  it("sums to exactly 1", () => {
    const total = RADAR_SCORE_DIMENSION_IDS.reduce((sum, id) => sum + RADAR_SCORE_WEIGHTS[id], 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it("caps every single dimension below the minimum coverage bar (no dimension can carry the score alone)", () => {
    for (const id of RADAR_SCORE_DIMENSION_IDS) {
      expect(RADAR_SCORE_WEIGHTS[id]).toBeLessThan(MIN_COVERAGE_PCT);
    }
  });
});

describe("computeRadarScore — complete data (balanced project)", () => {
  it("is deterministic: the same input always produces the same output", () => {
    const inputs = full();
    const a = computeRadarScore(inputs);
    const b = computeRadarScore(inputs);
    expect(a).toEqual(b);
  });

  it("returns a bounded, full-coverage score with full-confidence metadata (PR-102: Model B — confidence is metadata, never applied to score)", () => {
    const result = computeRadarScore(full());
    expect(result.availability).toBe("full");
    expect(result.coveragePct).toBeCloseTo(1, 10);
    expect(result.confidence).toEqual({ score: 100, level: "high" });
    expect(result.score).not.toBeNull();
    expect(result.score!).toBeGreaterThanOrEqual(0);
    expect(result.score!).toBeLessThanOrEqual(100);
  });

  it("matches a hand-computed weighted average for a known input", () => {
    // All dimensions at exactly 80 → weighted average is exactly 80, full coverage, no discount.
    const result = computeRadarScore(full({ marketStrength: 80, tvlLiquidity: 80, onchainActivity: 80, developerActivity: 80, governance: 80, ecosystemTraction: 80, security: 80 }));
    expect(result.score).toBe(80);
  });

  it("regression-pins the PR-098.04 report's 'Scenario B' example exactly (70/65/60/75/55/50/80 → 67)", () => {
    expect(computeRadarScore(full()).score).toBe(67);
  });
});

describe("computeRadarScore — partial data (PR-102: Model B — score equals quality, no confidence adjustment)", () => {
  it("the score equals the raw renormalized average exactly — no discount, no cap, no hidden penalty, regardless of coverage", () => {
    // 5 of 7 dimensions (missing governance + ecosystemTraction, 20% of weight) — above both gates.
    const inputs = full().filter((d) => d.id !== "governance" && d.id !== "ecosystemTraction");
    const result = computeRadarScore(inputs);
    expect(result.availability).toBe("partial");
    expect(result.coveragePct).toBeCloseTo(0.8, 10);
    expect(result.score).not.toBeNull();

    const naiveAverage = inputs.reduce((sum, d) => sum + (d.score as number) * RADAR_SCORE_WEIGHTS[d.id], 0) / result.coveragePct;
    expect(result.score).toBe(Math.round(naiveAverage)); // exact match — Model A used to pull this below the naive average
  });

  it("confidence is reported independently and never equals the score — a real project can show a HIGH score with only MEDIUM confidence", () => {
    const inputs = full().filter((d) => d.id !== "governance" && d.id !== "ecosystemTraction"); // 80% coverage
    const result = computeRadarScore(inputs);
    expect(result.score).toBeGreaterThan(60); // a genuinely high-quality score
    expect(result.confidence.level).toBe("medium"); // 80% coverage sits below the 90% "high" threshold
    expect(result.confidence.score).toBeGreaterThan(70);
    expect(result.confidence.score).toBeLessThan(100);
  });

  it("regression-pins the PR-102 recomputation of the former 'Scenario C' example — Model B: naive 70.0, score is exactly 70 (was 63 under Model A's discount)", () => {
    const inputs = full().filter((d) => d.id !== "governance" && d.id !== "ecosystemTraction");
    expect(computeRadarScore(inputs).score).toBe(70);
  });

  it("regression-pins the former 'Scenario D' example — a tokenless project exactly at the coverage floor: score is the undiscounted 81 (was 56 under Model A), confidence sits at its own floor (70/100, medium)", () => {
    const inputs: RadarScoreDimensionInput[] = [
      { id: "developerActivity", score: 85 },
      { id: "ecosystemTraction", score: 60 },
      { id: "security", score: 90 },
    ];
    const result = computeRadarScore(inputs);
    expect(result.coveragePct).toBeCloseTo(0.4, 10);
    expect(result.score).toBe(81);
    expect(result.confidence).toEqual({ score: 70, level: "low" }); // exactly at the evidence floor — the lowest real confidence.score (70) and the "low" level tier (coverage < 60%)
  });

  it("two projects with IDENTICAL available-dimension quality but DIFFERENT coverage now score identically — the exact conflation Model A had that PR-102 removes", () => {
    const sevenSevenths = computeRadarScore(full({ marketStrength: 70, tvlLiquidity: 70, onchainActivity: 70, developerActivity: 70, governance: 70, ecosystemTraction: 70, security: 70 }));
    const fiveSevenths = computeRadarScore(
      full({ marketStrength: 70, tvlLiquidity: 70, onchainActivity: 70, developerActivity: 70, governance: 70, ecosystemTraction: 70, security: 70 }).filter(
        (d) => d.id !== "governance" && d.id !== "ecosystemTraction"
      )
    );
    expect(sevenSevenths.score).toBe(70);
    expect(fiveSevenths.score).toBe(70); // identical quality, different coverage — SAME score under Model B
    expect(sevenSevenths.confidence.level).not.toBe(fiveSevenths.confidence.level); // but confidence still honestly differs
  });
});

describe("computeRadarScore — missing provider", () => {
  it("is null/unavailable, never a fabricated number, below the minimum dimension count", () => {
    // Only 2 dimensions — even though their combined weight could exceed 40%, MIN_DIMENSION_COUNT still blocks it.
    const inputs: RadarScoreDimensionInput[] = [
      { id: "marketStrength", score: 90 },
      { id: "security", score: 90 },
    ];
    const result = computeRadarScore(inputs);
    expect(result.score).toBeNull();
    expect(result.availability).toBe("unavailable");
  });

  it("is null/unavailable below the minimum coverage percentage even with enough dimension count", () => {
    // 3 of the smallest-weight dimensions: governance(10%) + ecosystemTraction(10%) + developerActivity(15%) = 35% < 40%.
    const inputs: RadarScoreDimensionInput[] = [
      { id: "governance", score: 90 },
      { id: "ecosystemTraction", score: 90 },
      { id: "developerActivity", score: 90 },
    ];
    const result = computeRadarScore(inputs);
    expect(result.score).toBeNull();
    expect(result.availability).toBe("unavailable");
  });

  it("treats an omitted dimension identically to one explicitly passed as null", () => {
    const omitted = computeRadarScore(full().filter((d) => d.id !== "governance"));
    const explicitNull = computeRadarScore(full().map((d) => (d.id === "governance" ? { ...d, score: null } : d)));
    expect(omitted).toEqual(explicitNull);
  });
});

describe("computeRadarScore — stale provider", () => {
  it("counts a stale dimension's real value at full weight (staleness is informational, not a validity discount)", () => {
    const fresh = computeRadarScore(full());
    const staleInputs = full().map((d) => (d.id === "marketStrength" ? { ...d, stale: true } : d));
    const stale = computeRadarScore(staleInputs);
    expect(stale.score).toBe(fresh.score);
    expect(stale.staleDimensionIds).toEqual(["marketStrength"]);
  });

  it("never marks a missing (null) dimension as stale", () => {
    const inputs = full()
      .filter((d) => d.id !== "governance")
      .concat([{ id: "governance", score: null, stale: true }]);
    const result = computeRadarScore(inputs);
    expect(result.staleDimensionIds).not.toContain("governance");
  });
});

describe("computeRadarScore — duplicated/correlated signals", () => {
  it("rejects a dimension supplied more than once, rather than silently double-counting it", () => {
    const inputs: RadarScoreDimensionInput[] = [...full(), { id: "marketStrength", score: 10 }];
    expect(() => computeRadarScore(inputs)).toThrow(/duplicate/i);
  });
});

describe("computeRadarScore — extremely strong one-dimensional project", () => {
  it("does not let a single maxed-out dimension produce an artificially high score", () => {
    const inputs: RadarScoreDimensionInput[] = [{ id: "marketStrength", score: 100 }];
    const result = computeRadarScore(inputs);
    expect(result.score).toBeNull();
    expect(result.availability).toBe("unavailable");
  });

  it("does not let two strong dimensions alone produce a confidently-high score (the audit's own motivating example)", () => {
    // Market Strength + TVL/Liquidity, both maxed — 35% coverage, below MIN_COVERAGE_PCT (40%).
    const inputs: RadarScoreDimensionInput[] = [
      { id: "marketStrength", score: 100 },
      { id: "tvlLiquidity", score: 100 },
    ];
    const result = computeRadarScore(inputs);
    expect(result.score).toBeNull();
    expect(result.availability).toBe("unavailable");
  });

  it("three strong dimensions clearing both gates DO produce a score — PR-102 (Model B): the raw quality average of 100 is reported as-is, never discounted for partial coverage", () => {
    const inputs: RadarScoreDimensionInput[] = [
      { id: "marketStrength", score: 100 },
      { id: "tvlLiquidity", score: 100 },
      { id: "security", score: 100 },
    ];
    const result = computeRadarScore(inputs);
    expect(result.availability).toBe("partial");
    expect(result.score).toBe(100); // Model A used to discount this below 100; Model B reports quality honestly
    expect(result.confidence.level).toBe("low"); // confidence still honestly reflects the thin (50%) coverage, separately
  });
});

describe("computeRadarScore — bounds", () => {
  it("never exceeds 100 or drops below 0 regardless of input", () => {
    const allZero = computeRadarScore(full().map((d) => ({ ...d, score: 0 })));
    const allHundred = computeRadarScore(full().map((d) => ({ ...d, score: 100 })));
    expect(allZero.score).toBeGreaterThanOrEqual(0);
    expect(allHundred.score).toBeLessThanOrEqual(100);
  });

  it(`guarantees at least ${MIN_DIMENSION_COUNT} dimensions and ${Math.round(MIN_COVERAGE_PCT * 100)}% coverage for every non-null score`, () => {
    const cases: RadarScoreDimensionInput[][] = [
      full(),
      full().filter((d) => d.id !== "governance"),
      [
        { id: "marketStrength", score: 50 },
        { id: "tvlLiquidity", score: 50 },
        { id: "security", score: 50 },
      ],
    ];
    for (const inputs of cases) {
      const result = computeRadarScore(inputs);
      if (result.score !== null) {
        expect(inputs.filter((i) => i.score !== null).length).toBeGreaterThanOrEqual(MIN_DIMENSION_COUNT);
        expect(result.coveragePct).toBeGreaterThanOrEqual(MIN_COVERAGE_PCT);
      }
    }
  });
});

describe("computeRadarScore — scoreFreshness (PR-098.07)", () => {
  it("is fresh when every used dimension is fresh (the default — no dimension marked stale)", () => {
    expect(computeRadarScore(full()).scoreFreshness).toBe("fresh");
  });

  it("becomes stale when any used dimension is stale — the score is still returned (valid), just flagged", () => {
    const inputs = full().map((d) => (d.id === "security" ? { ...d, stale: true } : d));
    const result = computeRadarScore(inputs);
    expect(result.score).not.toBeNull();
    expect(result.scoreFreshness).toBe("stale");
  });

  it("a stale dimension that was NOT used (excluded, score null) never taints scoreFreshness", () => {
    // governance omitted entirely (not stale — simply absent) alongside one real stale dimension.
    const inputs = full()
      .filter((d) => d.id !== "governance")
      .map((d) => (d.id === "developerActivity" ? { ...d, stale: true } : d));
    const result = computeRadarScore(inputs);
    expect(result.scoreFreshness).toBe("stale"); // still stale, from developerActivity — but governance's absence isn't why
  });

  it("is unavailable exactly when the score itself is unavailable (insufficient evidence)", () => {
    const result = computeRadarScore([{ id: "marketStrength", score: 90 }]);
    expect(result.score).toBeNull();
    expect(result.scoreFreshness).toBe("unavailable");
  });

  it("never presents a stale-evidence score as silently fresh — explanation surfaces it", () => {
    const inputs = full().map((d) => (d.id === "marketStrength" ? { ...d, stale: true } : d));
    const result = computeRadarScore(inputs);
    expect(result.explanation.some((line) => line.toLowerCase().includes("stale"))).toBe(true);
  });
});

describe("radarScoreToHealthLabel (PR-099)", () => {
  it.each([
    [95, "excellent"],
    [80, "excellent"],
    [79.9, "good"],
    [60, "good"],
    [59.9, "fair"],
    [40, "fair"],
    [39.9, "poor"],
    [0, "poor"],
  ])("score %d -> %s", (score, label) => {
    expect(radarScoreToHealthLabel(score)).toBe(label);
  });
});

describe("formatRadarScoreTooltip (PR-099, updated PR-102)", () => {
  it("reflects the real computed coverage/confidence, never invented text — PR-102: confidence shown as a level (High/Medium/Low), not a percentage that could read as discounting the score", () => {
    const result = computeRadarScore(full());
    const tooltip = formatRadarScoreTooltip(result);
    expect(tooltip).toContain(`${Math.round(result.coveragePct * 100)}%`);
    expect(tooltip).toContain(`${result.dimensions.filter((d) => d.score !== null).length}/${result.dimensions.length}`);
    const expectedLabel = result.confidence.level.charAt(0).toUpperCase() + result.confidence.level.slice(1);
    expect(tooltip).toContain(`Confidence: ${expectedLabel}`);
  });

  it("never phrases confidence as something that reduces or caps the score", () => {
    const inputs = full().filter((d) => d.id !== "governance" && d.id !== "ecosystemTraction");
    const result = computeRadarScore(inputs);
    const tooltip = formatRadarScoreTooltip(result);
    expect(tooltip).not.toMatch(/discount|penalt|reduc|cap/i);
  });

  it("flags stale evidence in the tooltip without exposing implementation details", () => {
    const inputs = full().map((d) => (d.id === "security" ? { ...d, stale: true } : d));
    const result = computeRadarScore(inputs);
    const tooltip = formatRadarScoreTooltip(result);
    expect(tooltip).toMatch(/aging|stale|refresh/i);
    expect(tooltip).not.toMatch(/ttl|cache|blockscout/i);
  });
});

describe("Model B guarantees (PR-102 — explicit, direct tests of the Definition of Done)", () => {
  it("the score equals the quality score across a full sweep of coverage levels — no multiplier, no proportional discount, no hidden penalty, no cap", () => {
    // Every dimension held at a constant 75 — the raw weighted average is
    // ALWAYS 75 regardless of which/how-many dimensions are available
    // (equal values -> equal weighted average), so any deviation from 75
    // in `score` would prove some form of confidence adjustment survived.
    const constantQuality = full({
      marketStrength: 75,
      tvlLiquidity: 75,
      onchainActivity: 75,
      developerActivity: 75,
      governance: 75,
      ecosystemTraction: 75,
      security: 75,
    });
    const coverageLevels = [
      constantQuality, // 100%
      constantQuality.filter((d) => d.id !== "governance"), // 90%
      constantQuality.filter((d) => d.id !== "governance" && d.id !== "ecosystemTraction"), // 80%
      [constantQuality[0], constantQuality[1], constantQuality[6]], // market+tvl+security = 50%
    ];
    for (const inputs of coverageLevels) {
      const result = computeRadarScore(inputs);
      expect(result.score).toBe(75); // identical at every coverage level — proves no multiplier/discount/penalty/cap
    }
  });

  it("confidence is independent from the final score — varying coverage changes confidence.level/.score but never changes score for identical quality", () => {
    const inputs100 = full({ marketStrength: 60, tvlLiquidity: 60, onchainActivity: 60, developerActivity: 60, governance: 60, ecosystemTraction: 60, security: 60 });
    const inputs50 = [inputs100[0], inputs100[1], inputs100[6]]; // market+tvl+security = 50% coverage, same value (60) throughout
    const full100 = computeRadarScore(inputs100);
    const partial50 = computeRadarScore(inputs50);
    expect(full100.score).toBe(partial50.score); // 60 === 60
    expect(full100.confidence).not.toEqual(partial50.confidence); // but confidence genuinely differs (100% vs 50% coverage)
  });

  it("deterministic: confidence (not just score) is byte-identical across repeated calls with the same input", () => {
    const inputs = full().filter((d) => d.id !== "governance");
    const a = computeRadarScore(inputs);
    const b = computeRadarScore(inputs);
    expect(a.confidence).toEqual(b.confidence);
  });

  it("a zero-valued but VALID (non-null) dimension is real evidence, not treated as missing — contributes its true weighted zero to both score and coverage", () => {
    const inputs: RadarScoreDimensionInput[] = [
      { id: "marketStrength", score: 0 }, // a real, valid zero — not null
      { id: "tvlLiquidity", score: 100 },
      { id: "security", score: 100 },
    ];
    const result = computeRadarScore(inputs);
    expect(result.coveragePct).toBeCloseTo(0.5, 10); // all 3 dimensions count toward coverage, including the zero
    // weighted: 0*.2 + 100*.15 + 100*.15 = 30, /0.5 coverage = 60
    expect(result.score).toBe(60);
  });

  it("N/A remains distinct from zero: an N/A dimension is EXCLUDED from coverage/score, never coerced to a zero contribution", () => {
    const withNull: RadarScoreDimensionInput[] = [
      { id: "marketStrength", score: null }, // N/A — excluded entirely
      { id: "tvlLiquidity", score: 100 },
      { id: "security", score: 100 },
    ];
    const result = computeRadarScore(withNull);
    // Only 2 non-null dimensions supplied — below MIN_DIMENSION_COUNT (3), so genuinely unavailable.
    expect(result.score).toBeNull();
    expect(result.availability).toBe("unavailable");
    // Contrast with the zero-valued case above, which DID produce a real 60 — proving N/A and 0 take genuinely different code paths, not the same outcome.
  });
});
