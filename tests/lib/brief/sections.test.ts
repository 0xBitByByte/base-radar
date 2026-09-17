import { describe, expect, it } from "vitest";

import { buildTopInsight, buildTopOpportunities, buildTopRisks } from "@/lib/brief/sections";
import type { IntelligenceAlert, NarrativeType } from "@/lib/alerts/intelligence/types";

function alert(overrides: Partial<IntelligenceAlert> & { narrative: NarrativeType }): IntelligenceAlert {
  return {
    id: `intelligence:${overrides.projectId ?? "test"}`,
    projectId: "test",
    projectName: "Test Project",
    severity: "info",
    confidence: 70,
    headline: "Test headline",
    summary: "Test summary",
    signals: [],
    categories: [],
    score: 50,
    relatedAlertIds: [],
    timestamp: new Date().toISOString(),
    reasoning: "Test reasoning",
    nextStep: "Test next step",
    ...overrides,
  };
}

describe("buildTopRisks", () => {
  it("selects only decline/security-risk narratives, mirroring buildTopOpportunities's growth/accumulation/development-active selection", () => {
    const alerts: IntelligenceAlert[] = [
      alert({ projectId: "a", narrative: "decline", score: 80 }),
      alert({ projectId: "b", narrative: "security-risk", score: 90 }),
      alert({ projectId: "c", narrative: "growth", score: 95 }),
      alert({ projectId: "d", narrative: "governance-active", score: 85 }),
      alert({ projectId: "e", narrative: "stable", score: 60 }),
    ];

    const risks = buildTopRisks(alerts);
    expect(risks.map((r) => r.projectId).sort()).toEqual(["a", "b"]);

    const opportunities = buildTopOpportunities(alerts);
    expect(opportunities.map((o) => o.projectId)).toEqual(["c"]);
  });

  it("sorts by score descending and caps at 3", () => {
    const alerts: IntelligenceAlert[] = [
      alert({ projectId: "low", narrative: "decline", score: 10 }),
      alert({ projectId: "high", narrative: "security-risk", score: 90 }),
      alert({ projectId: "mid", narrative: "decline", score: 50 }),
      alert({ projectId: "fourth", narrative: "decline", score: 40 }),
    ];

    const risks = buildTopRisks(alerts);
    expect(risks).toHaveLength(3);
    expect(risks.map((r) => r.projectId)).toEqual(["high", "mid", "fourth"]);
  });

  it("returns an empty array — never fabricated — when no risk narratives are present", () => {
    const alerts: IntelligenceAlert[] = [alert({ projectId: "a", narrative: "growth" }), alert({ projectId: "b", narrative: "stable" })];
    expect(buildTopRisks(alerts)).toEqual([]);
  });

  it("carries the real alert's own headline/summary/score/confidence/narrative/timestamp, never re-derived", () => {
    const source = alert({
      projectId: "x",
      projectName: "X Protocol",
      narrative: "decline",
      headline: "X is declining",
      summary: "Real declining summary",
      score: 77,
      confidence: 65,
    });
    const [risk] = buildTopRisks([source]);
    expect(risk).toMatchObject({
      projectId: "x",
      projectName: "X Protocol",
      headline: "X is declining",
      reason: "Real declining summary",
      score: 77,
      confidence: 65,
      narrative: "decline",
    });
  });
});

describe("buildTopInsight", () => {
  it("picks the single highest-scored alert across every narrative, not just opportunity/risk narratives", () => {
    const alerts: IntelligenceAlert[] = [
      alert({ projectId: "a", narrative: "growth", score: 60 }),
      alert({ projectId: "b", narrative: "stable", score: 95 }),
      alert({ projectId: "c", narrative: "security-risk", score: 80 }),
    ];
    expect(buildTopInsight(alerts)?.projectId).toBe("b");
  });

  it("returns null — never a fabricated placeholder — when there are no alerts", () => {
    expect(buildTopInsight([])).toBeNull();
  });

  it("returns the real IntelligenceAlert itself, unreduced — including signals/reasoning/nextStep", () => {
    const source = alert({
      projectId: "x",
      projectName: "X Protocol",
      narrative: "growth",
      headline: "X is growing",
      summary: "Real growth summary",
      score: 92,
      confidence: 81,
      signals: [{ category: "tvl", label: "TVL change", weight: 10, direction: 1, sourceAlertId: "src-1" }],
      reasoning: "Real reasoning",
      nextStep: "Real next step",
    });
    expect(buildTopInsight([source])).toMatchObject({
      projectId: "x",
      projectName: "X Protocol",
      headline: "X is growing",
      summary: "Real growth summary",
      score: 92,
      confidence: 81,
      narrative: "growth",
      signals: [{ label: "TVL change" }],
      reasoning: "Real reasoning",
      nextStep: "Real next step",
    });
  });
});
