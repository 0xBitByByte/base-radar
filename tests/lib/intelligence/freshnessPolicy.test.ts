import { describe, expect, it } from "vitest";

import {
  deriveScoreFreshness,
  formatFreshnessLabel,
  FRESHNESS_CLASSES,
  resolveFreshness,
} from "@/lib/intelligence/freshnessPolicy";

/**
 * PR-098.07 — Intelligence Freshness & Refresh Strategy. Deterministic
 * fixtures for the task's required scenarios: fresh data, stale data,
 * "provider failure" (never-fetched => unavailable), cache-hit-style exact
 * boundary behavior, and the Radar Score / evidence-freshness relationship.
 */

const NOW = new Date("2026-01-01T00:30:00.000Z").getTime();
const CLASS = FRESHNESS_CLASSES.tokenPrice; // ttlMs: 120_000, staleWindowMs: 360_000

function isoMinutesAgo(minutes: number): string {
  return new Date(NOW - minutes * 60_000).toISOString();
}

describe("resolveFreshness — fresh data", () => {
  it("is fresh at age 0", () => {
    const result = resolveFreshness(new Date(NOW).toISOString(), "tokenPrice", NOW);
    expect(result.state).toBe("fresh");
    expect(result.ageMs).toBe(0);
  });

  it("is fresh right up to (inclusive of) the class TTL", () => {
    const fetchedAt = new Date(NOW - CLASS.ttlMs).toISOString();
    expect(resolveFreshness(fetchedAt, "tokenPrice", NOW).state).toBe("fresh");
  });
});

describe("resolveFreshness — stale data", () => {
  it("is stale just past the TTL", () => {
    const fetchedAt = new Date(NOW - CLASS.ttlMs - 1).toISOString();
    expect(resolveFreshness(fetchedAt, "tokenPrice", NOW).state).toBe("stale");
  });

  it("is stale right up to (inclusive of) the stale window", () => {
    const fetchedAt = new Date(NOW - CLASS.staleWindowMs).toISOString();
    expect(resolveFreshness(fetchedAt, "tokenPrice", NOW).state).toBe("stale");
  });
});

describe("resolveFreshness — refresh boundary (hard expiry)", () => {
  it("becomes unavailable exactly one millisecond past the stale window — never silently shown as current past this point", () => {
    const fetchedAt = new Date(NOW - CLASS.staleWindowMs - 1).toISOString();
    const result = resolveFreshness(fetchedAt, "tokenPrice", NOW);
    expect(result.state).toBe("unavailable");
    // updatedAt/ageMs are still returned even when hard-expired, so a
    // caller could say "last seen N ago" if it chose to.
    expect(result.updatedAt).toBe(fetchedAt);
    expect(result.ageMs).toBe(CLASS.staleWindowMs + 1);
  });
});

describe("resolveFreshness — provider failure (never fetched)", () => {
  it("is unavailable with a null updatedAt/ageMs when fetchedAt is null", () => {
    expect(resolveFreshness(null, "tokenPrice", NOW)).toEqual({ state: "unavailable", updatedAt: null, ageMs: null });
  });

  it("is unavailable for a malformed timestamp, never throws", () => {
    expect(resolveFreshness("not-a-date", "tokenPrice", NOW)).toEqual({ state: "unavailable", updatedAt: null, ageMs: null });
  });
});

describe("resolveFreshness — every class is internally consistent", () => {
  it.each(Object.entries(FRESHNESS_CLASSES))("%s: staleWindowMs > ttlMs > 0", (_id, config) => {
    expect(config.ttlMs).toBeGreaterThan(0);
    expect(config.staleWindowMs).toBeGreaterThan(config.ttlMs);
  });
});

describe("formatFreshnessLabel — UI-safe copy", () => {
  it('reads "Updated just now" under a minute', () => {
    expect(formatFreshnessLabel(resolveFreshness(new Date(NOW - 10_000).toISOString(), "tokenPrice", NOW))).toBe("Updated just now");
  });

  it('reads "Updated 4 min ago" for a fresh 4-minute-old value in a class whose TTL allows it', () => {
    const freshness = resolveFreshness(isoMinutesAgo(4), "tvl", NOW); // tvl ttlMs = 12min
    expect(freshness.state).toBe("fresh");
    expect(formatFreshnessLabel(freshness)).toBe("Updated 4 min ago");
  });

  it("flags a stale reading in the label without exposing implementation details (no TTL numbers, no provider names)", () => {
    const freshness = resolveFreshness(isoMinutesAgo(3), "tokenPrice", NOW); // past the 2min TTL, within the 6min stale window
    expect(freshness.state).toBe("stale");
    const label = formatFreshnessLabel(freshness);
    expect(label).toBe("Updated 3 min ago — may be outdated");
    expect(label).not.toMatch(/ttl|cache|coingecko|ms\b/i);
  });

  it('reads "Not available" for unavailable data, with no age claim', () => {
    expect(formatFreshnessLabel(resolveFreshness(null, "tokenPrice", NOW))).toBe("Not available");
    expect(formatFreshnessLabel(resolveFreshness(isoMinutesAgo(120), "tokenPrice", NOW))).toBe("Not available");
  });
});

describe("deriveScoreFreshness — Radar Score / evidence-freshness relationship", () => {
  it("is unavailable when no dimensions were used at all", () => {
    expect(deriveScoreFreshness([])).toBe("unavailable");
  });

  it("is fresh only when every used dimension is fresh", () => {
    expect(deriveScoreFreshness(["fresh", "fresh", "fresh"])).toBe("fresh");
  });

  it("becomes stale the moment any used dimension is stale — never silently presented as current", () => {
    expect(deriveScoreFreshness(["fresh", "stale", "fresh"])).toBe("stale");
  });

  it("a single stale dimension among many is enough to flag the whole score", () => {
    expect(deriveScoreFreshness(["fresh", "fresh", "fresh", "fresh", "fresh", "fresh", "stale"])).toBe("stale");
  });
});
