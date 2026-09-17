import { describe, expect, it } from "vitest";

import { computeFindingKey, findNewRiskClaims, findWatchlistRiskClaims } from "@/lib/ai-watch/evaluate";
import type { WorkspaceClaim, WorkspaceSection, WorkspaceView } from "@/lib/ai-workspace/types";

function makeClaim(overrides: Partial<WorkspaceClaim> = {}): WorkspaceClaim {
  return {
    id: "claim:1",
    origin: "ai-intelligence",
    category: "security",
    headline: "Headline",
    summary: "Summary",
    confidence: { kind: "level", level: "high", rationale: "rationale", evidenceCount: 1 },
    evidence: [],
    sources: [{ label: "DefiLlama" }],
    projects: [{ id: "aerodrome", name: "Aerodrome Finance", slug: "aerodrome-finance" }],
    generatedAt: "2026-09-01T00:00:00.000Z",
    limitation: null,
    ...overrides,
  };
}

function makeSection(id: "ai-intelligence" | "daily-brief", claims: WorkspaceClaim[]): WorkspaceSection {
  return { id, title: id, description: "", claims, emptyReason: `No ${id} findings yet.` };
}

function makeView(aiClaims: WorkspaceClaim[] = [], briefClaims: WorkspaceClaim[] = []): WorkspaceView {
  return { sections: [makeSection("ai-intelligence", aiClaims), makeSection("daily-brief", briefClaims)], generatedAt: "2026-09-01T00:00:00.000Z" };
}

describe("findWatchlistRiskClaims — the exact real Risk categories AI Ask already reads, never a new risk concept", () => {
  it("includes an AI Intelligence 'security' claim for a watched project", () => {
    const claim = makeClaim({ category: "security", projects: [{ id: "aerodrome", name: "Aerodrome Finance", slug: "aerodrome-finance" }] });
    const result = findWatchlistRiskClaims(makeView([claim], []), ["aerodrome"]);
    expect(result).toEqual([claim]);
  });

  it("includes a Daily Brief 'Risk' claim for a watched project", () => {
    const claim = makeClaim({ origin: "daily-brief", category: "Risk", projects: [{ id: "aerodrome", name: "Aerodrome Finance", slug: "aerodrome-finance" }] });
    const result = findWatchlistRiskClaims(makeView([], [claim]), ["aerodrome"]);
    expect(result).toEqual([claim]);
  });

  it("excludes a real Risk claim for a project NOT in the Watchlist", () => {
    const claim = makeClaim({ category: "security", projects: [{ id: "unwatched-project", name: "Unwatched", slug: "unwatched" }] });
    const result = findWatchlistRiskClaims(makeView([claim], []), ["aerodrome"]);
    expect(result).toEqual([]);
  });

  it("excludes a non-Risk category claim even for a watched project — never widens the definition of 'Risk'", () => {
    const opportunity = makeClaim({ origin: "daily-brief", category: "Opportunity", projects: [{ id: "aerodrome", name: "Aerodrome Finance", slug: "aerodrome-finance" }] });
    const defi = makeClaim({ category: "defi", projects: [{ id: "aerodrome", name: "Aerodrome Finance", slug: "aerodrome-finance" }] });
    const result = findWatchlistRiskClaims(makeView([defi], [opportunity]), ["aerodrome"]);
    expect(result).toEqual([]);
  });

  it("an empty Watchlist yields zero claims, never a fabricated match", () => {
    const claim = makeClaim({ category: "security", projects: [{ id: "aerodrome", name: "Aerodrome Finance", slug: "aerodrome-finance" }] });
    const result = findWatchlistRiskClaims(makeView([claim], []), []);
    expect(result).toEqual([]);
  });

  it("a claim naming multiple projects matches if ANY of them is watched", () => {
    const claim = makeClaim({ category: "security", projects: [{ id: "unwatched", name: "Unwatched", slug: null }, { id: "aerodrome", name: "Aerodrome Finance", slug: "aerodrome-finance" }] });
    const result = findWatchlistRiskClaims(makeView([claim], []), ["aerodrome"]);
    expect(result).toEqual([claim]);
  });
});

describe("computeFindingKey — a stable, content-derived identity, never `id`/timestamp/confidence", () => {
  it("two claims that are the SAME real condition, regenerated with a different id/timestamp/confidence (exactly what a full reload does to this app's demo data), produce the SAME key", () => {
    const first = makeClaim({ id: "brief:decline:aerodrome:2026-09-01T00:00:00.000Z", generatedAt: "2026-09-01T00:00:00.000Z", confidence: { kind: "score", value: 82 } });
    const second = makeClaim({ id: "brief:decline:aerodrome:2026-09-08T00:00:00.000Z", generatedAt: "2026-09-08T00:00:00.000Z", confidence: { kind: "score", value: 92 } });
    expect(computeFindingKey(first)).toBe(computeFindingKey(second));
  });

  it("a different headline (a genuinely different finding) produces a different key", () => {
    const a = makeClaim({ headline: "Aerodrome Finance has a security-relevant event to review" });
    const b = makeClaim({ headline: "Aerodrome Finance TVL dropped sharply" });
    expect(computeFindingKey(a)).not.toBe(computeFindingKey(b));
  });

  it("a different category produces a different key, even for the same project and headline", () => {
    const a = makeClaim({ origin: "daily-brief", category: "Risk" });
    const b = makeClaim({ origin: "daily-brief", category: "Security" });
    expect(computeFindingKey(a)).not.toBe(computeFindingKey(b));
  });

  it("a different project produces a different key", () => {
    const a = makeClaim({ projects: [{ id: "aerodrome", name: "Aerodrome Finance", slug: "aerodrome-finance" }] });
    const b = makeClaim({ projects: [{ id: "aave", name: "Aave", slug: "aave" }] });
    expect(computeFindingKey(a)).not.toBe(computeFindingKey(b));
  });

  it("the same set of projects in a different order produces the same key", () => {
    const a = makeClaim({ projects: [{ id: "aerodrome", name: "Aerodrome Finance", slug: "aerodrome-finance" }, { id: "aave", name: "Aave", slug: "aave" }] });
    const b = makeClaim({ projects: [{ id: "aave", name: "Aave", slug: "aave" }, { id: "aerodrome", name: "Aerodrome Finance", slug: "aerodrome-finance" }] });
    expect(computeFindingKey(a)).toBe(computeFindingKey(b));
  });
});

describe("findNewRiskClaims — pure diff over the stable finding key, never re-fires on an already-seen finding, never invents a new one", () => {
  it("a claim not in the seen set is genuinely new", () => {
    const claim = makeClaim({ headline: "A brand new finding" });
    const result = findNewRiskClaims([claim], new Set());
    expect(result).toEqual([claim]);
  });

  it("SAME FINDING ACROSS RELOAD: a claim representing the same real condition, but with a fresh id/timestamp/confidence (simulating a full reload), is excluded — never a duplicate notification", () => {
    const beforeReload = makeClaim({ id: "brief:risk:aerodrome:2026-09-01T00:00:00.000Z", confidence: { kind: "score", value: 82 } });
    const afterReload = makeClaim({ id: "brief:risk:aerodrome:2026-09-08T00:00:00.000Z", confidence: { kind: "score", value: 92 } });
    const seenKeys = new Set([computeFindingKey(beforeReload)]);
    const result = findNewRiskClaims([afterReload], seenKeys);
    expect(result).toEqual([]);
  });

  it("GENUINELY NEW FINDING: a claim whose content key was never seen produces a real notification", () => {
    const alreadySeen = makeClaim({ headline: "Existing finding" });
    const genuinelyNew = makeClaim({ headline: "A brand new, different finding" });
    const seenKeys = new Set([computeFindingKey(alreadySeen)]);
    const result = findNewRiskClaims([genuinelyNew], seenKeys);
    expect(result).toEqual([genuinelyNew]);
  });

  it("DIFFERENT FINDING: a claim for the same project but a materially different headline is treated as new, never suppressed by an unrelated prior finding", () => {
    const priorFinding = makeClaim({ headline: "Aerodrome Finance has a security-relevant event to review" });
    const differentFinding = makeClaim({ headline: "Aerodrome Finance TVL dropped sharply" });
    const seenKeys = new Set([computeFindingKey(priorFinding)]);
    const result = findNewRiskClaims([differentFinding], seenKeys);
    expect(result).toEqual([differentFinding]);
  });

  it("MULTIPLE NEW FINDINGS: each genuinely new claim is returned, and each already-seen claim is excluded, independently", () => {
    const seen = makeClaim({ headline: "Already seen finding" });
    const newOne = makeClaim({ id: "new:1", headline: "New finding one" });
    const newTwo = makeClaim({ id: "new:2", headline: "New finding two", projects: [{ id: "aave", name: "Aave", slug: "aave" }] });
    const seenKeys = new Set([computeFindingKey(seen)]);
    const result = findNewRiskClaims([seen, newOne, newTwo], seenKeys);
    expect(result).toEqual([newOne, newTwo]);
  });

  it("mixed input: only the genuinely new claim is returned", () => {
    const seen = makeClaim({ headline: "Seen finding" });
    const fresh = makeClaim({ headline: "Fresh finding" });
    const result = findNewRiskClaims([seen, fresh], new Set([computeFindingKey(seen)]));
    expect(result).toEqual([fresh]);
  });

  it("empty current claims: never fabricates a finding out of an empty input", () => {
    expect(findNewRiskClaims([], new Set())).toEqual([]);
  });
});
