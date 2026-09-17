import { describe, expect, it } from "vitest";

import { computeAiRatingGrade } from "@/lib/intelligence/scorecard";

/**
 * Regression-pins the exact thresholds `buildHealthScorecard`'s AI Rating
 * tile relied on inline before this milestone extracted them — behavior
 * must not change, only where the logic lives.
 */
describe("computeAiRatingGrade", () => {
  it("grades the blended Health/Confidence average at each real boundary", () => {
    expect(computeAiRatingGrade(90, 90)).toBe("A+");
    expect(computeAiRatingGrade(80, 80)).toBe("A");
    expect(computeAiRatingGrade(70, 70)).toBe("B+");
    expect(computeAiRatingGrade(60, 60)).toBe("B");
    expect(computeAiRatingGrade(50, 50)).toBe("C");
    expect(computeAiRatingGrade(0, 0)).toBe("D");
  });

  it("blends two different scores rather than requiring them equal", () => {
    // (100 + 80) / 2 = 90 -> A+
    expect(computeAiRatingGrade(100, 80)).toBe("A+");
    // (40 + 20) / 2 = 30 -> D
    expect(computeAiRatingGrade(40, 20)).toBe("D");
  });

  it("falls just short of a boundary on the lower grade", () => {
    expect(computeAiRatingGrade(89, 89)).toBe("A");
    expect(computeAiRatingGrade(49, 49)).toBe("D");
  });
});
