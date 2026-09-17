import { describe, expect, it } from "vitest";

import { downsampleSparkline } from "@/lib/data/downsample";
import type { SparklinePoint } from "@/lib/data/types";

function points(count: number): SparklinePoint[] {
  return Array.from({ length: count }, (_, i) => ({ t: i, v: i }));
}

describe("downsampleSparkline (PR-097.01 — H2 chart downsampling)", () => {
  it("returns the real, untouched array when already at or under the cap — never pads or resamples data that didn't need it", () => {
    const input = points(300);
    expect(downsampleSparkline(input, 300)).toBe(input); // same reference — proven no-op
  });

  it("returns the real, untouched array when well under the cap", () => {
    const input = points(10);
    expect(downsampleSparkline(input, 300)).toEqual(input);
  });

  it("reduces a genuinely oversized series to at or near the real cap", () => {
    const input = points(1000);
    const result = downsampleSparkline(input, 300);
    expect(result).not.toBeNull();
    expect(result!.length).toBeLessThanOrEqual(301); // stride rounding can land one over; never far over
    expect(result!.length).toBeGreaterThan(250); // never over-aggressively thinned
  });

  it("always keeps the real first point", () => {
    const input = points(1000);
    const result = downsampleSparkline(input, 300)!;
    expect(result[0]).toEqual(input[0]);
  });

  it("always keeps the real last point — an 'ALL' period chart must still show its true current value, never an approximated one", () => {
    const input = points(1000);
    const result = downsampleSparkline(input, 300)!;
    expect(result[result.length - 1]).toEqual(input[input.length - 1]);
  });

  it("preserves real chronological order — never reorders or duplicates points", () => {
    const input = points(777);
    const result = downsampleSparkline(input, 100)!;
    for (let i = 1; i < result.length; i++) {
      expect(result[i].t).toBeGreaterThan(result[i - 1].t);
    }
  });

  it("a genuinely null series (malformed/missing provider data) stays a real null — never coerced into a fabricated empty array", () => {
    expect(downsampleSparkline(null, 300)).toBeNull();
  });

  it("an honestly empty real series stays an honestly empty array", () => {
    expect(downsampleSparkline([], 300)).toEqual([]);
  });

  it("a series exactly one point over the cap still reduces, not a silent no-op boundary bug", () => {
    const input = points(301);
    const result = downsampleSparkline(input, 300)!;
    expect(result.length).toBeLessThan(301);
  });
});
