import { describe, expect, it } from "vitest";

import { buildCrossFeatureIndexes } from "@/lib/cross-feature/indexes";
import type { CorrelatedEvent, FeatureRefs, RecommendationCorrelation } from "@/lib/cross-feature/types";

const EMPTY_REFS: FeatureRefs = { historySnapshotTimestamp: null, analyticsTrendMetric: null, reportPeriod: null, chatQuestionId: null, automationResultId: null };

function makeEvent(overrides: Partial<CorrelatedEvent> & { id: string }): CorrelatedEvent {
  return { topic: "health", label: "Health improved", timestamp: "2026-09-01T00:00:00.000Z", tone: "positive", headline: "Health improved.", refs: EMPTY_REFS, ...overrides };
}

function makeRecommendation(overrides: Partial<RecommendationCorrelation> & { recommendationId: string }): RecommendationCorrelation {
  return { title: "Diversify", isPrimary: false, refs: EMPTY_REFS, ...overrides };
}

describe("buildCrossFeatureIndexes — IDENTITY (no duplicated source objects)", () => {
  it("eventByAutomationId returns the exact SAME object reference as the source array entry", () => {
    const event = makeEvent({ id: "event:1", refs: { ...EMPTY_REFS, automationResultId: "automation:1" } });
    const indexes = buildCrossFeatureIndexes([event], []);
    expect(indexes.eventByAutomationId.get("automation:1")).toBe(event);
  });

  it("recommendationByAutomationId and recommendationById both return the exact SAME object reference", () => {
    const recommendation = makeRecommendation({ recommendationId: "rec:1", refs: { ...EMPTY_REFS, automationResultId: "automation:1" } });
    const indexes = buildCrossFeatureIndexes([], [recommendation]);
    expect(indexes.recommendationByAutomationId.get("automation:1")).toBe(recommendation);
    expect(indexes.recommendationById.get("rec:1")).toBe(recommendation);
  });

  it("eventByTopic returns the exact SAME object references, in original order", () => {
    const a = makeEvent({ id: "event:1", topic: "health" });
    const b = makeEvent({ id: "event:2", topic: "health" });
    const indexes = buildCrossFeatureIndexes([a, b], []);
    expect(indexes.eventByTopic.get("health")).toEqual([a, b]);
    expect(indexes.eventByTopic.get("health")?.[0]).toBe(a);
    expect(indexes.eventByTopic.get("health")?.[1]).toBe(b);
  });

  it("eventByHighlight returns the exact SAME object reference, keyed by the event's own real id", () => {
    const event = makeEvent({ id: "event:recovery:risk:2026-09-01" });
    const indexes = buildCrossFeatureIndexes([event], []);
    expect(indexes.eventByHighlight.get("event:recovery:risk:2026-09-01")).toBe(event);
  });
});

describe("buildCrossFeatureIndexes — behavior matches Array.prototype.find()'s 'first match' semantics", () => {
  it("eventByAutomationId keeps the FIRST event when two real events share an automationResultId, exactly like .find() would", () => {
    const first = makeEvent({ id: "event:1", topic: "health", refs: { ...EMPTY_REFS, automationResultId: "automation:1" } });
    const second = makeEvent({ id: "event:2", topic: "risk", refs: { ...EMPTY_REFS, automationResultId: "automation:1" } });
    const indexes = buildCrossFeatureIndexes([first, second], []);
    expect(indexes.eventByAutomationId.get("automation:1")).toBe(first);
    // sanity: this is exactly what .find() would have returned
    expect([first, second].find((e) => e.refs.automationResultId === "automation:1")).toBe(first);
  });

  it("recommendationByAutomationId keeps the FIRST recommendation on a duplicate automationResultId", () => {
    const first = makeRecommendation({ recommendationId: "rec:1", refs: { ...EMPTY_REFS, automationResultId: "automation:1" } });
    const second = makeRecommendation({ recommendationId: "rec:2", refs: { ...EMPTY_REFS, automationResultId: "automation:1" } });
    const indexes = buildCrossFeatureIndexes([], [first, second]);
    expect(indexes.recommendationByAutomationId.get("automation:1")).toBe(first);
  });
});

describe("buildCrossFeatureIndexes — MISSING / EMPTY", () => {
  it("an event with no real automationResultId is never indexed by it", () => {
    const event = makeEvent({ id: "event:1", refs: EMPTY_REFS });
    const indexes = buildCrossFeatureIndexes([event], []);
    expect(indexes.eventByAutomationId.size).toBe(0);
  });

  it("genuinely empty input produces genuinely empty (but real) maps", () => {
    const indexes = buildCrossFeatureIndexes([], []);
    expect(indexes.eventByAutomationId.size).toBe(0);
    expect(indexes.recommendationByAutomationId.size).toBe(0);
    expect(indexes.recommendationById.size).toBe(0);
    expect(indexes.eventByTopic.size).toBe(0);
    expect(indexes.eventByHighlight.size).toBe(0);
  });

  it("a lookup for a real id that genuinely isn't indexed returns undefined, never a fabricated match", () => {
    const indexes = buildCrossFeatureIndexes([], []);
    expect(indexes.eventByAutomationId.get("automation:does-not-exist")).toBeUndefined();
  });
});

describe("buildCrossFeatureIndexes — DETERMINISM", () => {
  it("identical input produces indexes with identical, deep-equal contents", () => {
    const event = makeEvent({ id: "event:1", refs: { ...EMPTY_REFS, automationResultId: "automation:1" } });
    const a = buildCrossFeatureIndexes([event], []);
    const b = buildCrossFeatureIndexes([event], []);
    expect(a.eventByAutomationId.get("automation:1")).toBe(b.eventByAutomationId.get("automation:1"));
  });
});
