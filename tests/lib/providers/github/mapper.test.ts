import { describe, expect, it } from "vitest";

import { mapCommitActivity, mapDeveloperCadence } from "@/lib/providers/github/mapper";
import type { RawCommitActivityWeek } from "@/lib/providers/github/client";

/**
 * PR-102 — 26-week sustained development cadence regression tests, at the
 * source: this is where the raw `stats/commit_activity` weekly-bucket array
 * becomes `{ activeWeeks, windowWeeks, cadencePct }`. Every downstream
 * consumer (`mergeGithub`, `normalizeDeveloperActivity`, Radar Score) inherits
 * correctness from this one place.
 */

const WEEK_SECONDS = 7 * 24 * 60 * 60;

/** Builds `count` consecutive complete weekly buckets ending exactly `endWeeksAgo` weeks before `nowMs`, alternating active/inactive per `activePattern` (defaults to all-active). */
function weeksEnding(nowMs: number, endWeeksAgo: number, count: number, activePattern: (i: number) => boolean = () => true): RawCommitActivityWeek[] {
  const nowSeconds = Math.floor(nowMs / 1000);
  const currentWeekStart = nowSeconds - (nowSeconds % WEEK_SECONDS);
  const lastCompleteWeekStart = currentWeekStart - endWeeksAgo * WEEK_SECONDS;
  return Array.from({ length: count }, (_, i) => {
    const weeksBack = count - 1 - i;
    return {
      week: lastCompleteWeekStart - weeksBack * WEEK_SECONDS,
      total: activePattern(i) ? 3 : 0,
      days: [0, 0, 0, 0, 0, 0, 0],
    };
  });
}

describe("mapDeveloperCadence (PR-102)", () => {
  const NOW = new Date("2026-09-17T00:00:00Z").getTime();

  it("26/26 active weeks — full sustained cadence", () => {
    const weeks = weeksEnding(NOW, 1, 26);
    const cadence = mapDeveloperCadence(weeks, NOW);
    expect(cadence).toEqual({ activeWeeks: 26, windowWeeks: 26, cadencePct: 100 });
  });

  it("13/26 active weeks — partial, alternating cadence", () => {
    const weeks = weeksEnding(NOW, 1, 26, (i) => i % 2 === 0);
    const cadence = mapDeveloperCadence(weeks, NOW);
    expect(cadence).toEqual({ activeWeeks: 13, windowWeeks: 26, cadencePct: 50 });
  });

  it("0/26 active weeks — real evidence of zero cadence, not null", () => {
    const weeks = weeksEnding(NOW, 1, 26, () => false);
    const cadence = mapDeveloperCadence(weeks, NOW);
    expect(cadence).toEqual({ activeWeeks: 0, windowWeeks: 26, cadencePct: 0 });
  });

  it("exactly one active week among 26 — never rewards volume, just presence", () => {
    const weeks = weeksEnding(NOW, 1, 26, (i) => i === 0);
    const cadence = mapDeveloperCadence(weeks, NOW);
    expect(cadence?.activeWeeks).toBe(1);
    // A week with 200 commits and a week with 1 commit both count as exactly one active week.
    const heavyWeeks = weeks.map((w, i) => (i === 0 ? { ...w, total: 200 } : w));
    expect(mapDeveloperCadence(heavyWeeks, NOW)).toEqual(cadence);
  });

  it("excludes the still-in-progress current week from both the numerator and the denominator", () => {
    const complete = weeksEnding(NOW, 1, 26); // 26 real complete weeks, all active
    const nowSeconds = Math.floor(NOW / 1000);
    const currentWeekStart = nowSeconds - (nowSeconds % WEEK_SECONDS);
    const inProgressWeek: RawCommitActivityWeek = { week: currentWeekStart, total: 0, days: [0, 0, 0, 0, 0, 0, 0] };
    const withInProgress = [...complete, inProgressWeek];

    const withoutCurrent = mapDeveloperCadence(complete, NOW);
    const withCurrent = mapDeveloperCadence(withInProgress, NOW);
    // The in-progress week's real 0 must not dilute the 100% cadence of the 26 complete weeks behind it.
    expect(withCurrent).toEqual(withoutCurrent);
    expect(withCurrent?.windowWeeks).toBe(26);
  });

  it("insufficient history (fewer than 26 complete weeks) uses the real available window, never a phantom 26", () => {
    const weeks = weeksEnding(NOW, 1, 10); // repo only has 10 weeks of real history
    const cadence = mapDeveloperCadence(weeks, NOW);
    expect(cadence).toEqual({ activeWeeks: 10, windowWeeks: 10, cadencePct: 100 });
  });

  it("caps the window at 26 even when more history is available — older weeks are dropped, not averaged in", () => {
    // 40 weeks of history, only the most recent 26 active, rest inactive.
    const weeks = weeksEnding(NOW, 1, 40, (i) => i >= 14); // last 26 of 40 are active
    const cadence = mapDeveloperCadence(weeks, NOW);
    expect(cadence).toEqual({ activeWeeks: 26, windowWeeks: 26, cadencePct: 100 });
  });

  it("missing GitHub data (empty weeks array) is null, never a fabricated 0%", () => {
    expect(mapDeveloperCadence([], NOW)).toBeNull();
  });

  it("only-in-progress-week data (no complete weeks yet) is null, never a fabricated 0%", () => {
    const nowSeconds = Math.floor(NOW / 1000);
    const currentWeekStart = nowSeconds - (nowSeconds % WEEK_SECONDS);
    const onlyInProgress: RawCommitActivityWeek[] = [{ week: currentWeekStart, total: 5, days: [0, 0, 0, 0, 0, 0, 0] }];
    expect(mapDeveloperCadence(onlyInProgress, NOW)).toBeNull();
  });

  it("is deterministic — identical input and `nowMs` always produce an identical result", () => {
    const weeks = weeksEnding(NOW, 1, 26, (i) => i % 3 === 0);
    const a = mapDeveloperCadence(weeks, NOW);
    const b = mapDeveloperCadence(weeks, NOW);
    expect(a).toEqual(b);
  });
});

describe("mapCommitActivity — cadence integration (PR-102)", () => {
  const NOW = new Date("2026-09-17T00:00:00Z").getTime();

  it("carries a real cadence alongside the existing recency/volume evidence, unaffected by rate-limited (empty) GitHub responses", () => {
    expect(mapCommitActivity("base/repo", [], NOW)).toBeNull(); // existing empty-response contract preserved
  });

  it("attaches mapDeveloperCadence's own output verbatim onto CommitActivity.cadence", () => {
    const weeks = weeksEnding(NOW, 1, 26);
    const activity = mapCommitActivity("base/repo", weeks, NOW);
    expect(activity?.cadence).toEqual(mapDeveloperCadence(weeks, NOW));
  });
});
