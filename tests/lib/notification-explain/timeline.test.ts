import { describe, expect, it } from "vitest";

import { buildExplainabilityTimeline } from "@/lib/notification-explain/timeline";
import type { AutomationResult } from "@/lib/automation/types";
import type { CorrelatedEvent, CrossFeatureIntelligence, FeatureRefs } from "@/lib/cross-feature/types";
import { buildCrossFeatureIndexes } from "@/lib/cross-feature/indexes";

function makeResult(overrides: Partial<AutomationResult> = {}): AutomationResult {
  return {
    id: "automation:wallet-rule:health:1",
    ruleId: "wallet-rule:health",
    notificationId: "n1",
    title: "Health Score Changed",
    summary: "Health score moved from 40 to 70.",
    status: "triggered",
    triggeredAt: "2026-09-01T00:00:00.000Z",
    projectId: null,
    projectName: null,
    priority: "medium",
    link: "/dashboard/wallet",
    metadata: { source: "wallet-automation" },
    ...overrides,
  };
}

const EMPTY_REFS: FeatureRefs = { historySnapshotTimestamp: null, analyticsTrendMetric: null, reportPeriod: null, chatQuestionId: null, automationResultId: null };
function makeCrossFeature(overrides: Partial<CrossFeatureIntelligence> = {}): CrossFeatureIntelligence {
  const events = overrides.events ?? [];
  const recommendations = overrides.recommendations ?? [];
  return { events, recommendations, timeline: overrides.timeline ?? [], latestStory: overrides.latestStory ?? null, indexes: buildCrossFeatureIndexes(events, recommendations) };
}

function makeEvent(refs: Partial<FeatureRefs>, timestamp = "2026-09-01T00:00:00.000Z"): CorrelatedEvent {
  return { id: "event:1", topic: "health", label: "Health improved", timestamp, tone: "positive", headline: "Health improved.", refs: { ...EMPTY_REFS, automationResultId: "automation:wallet-rule:health:1", ...refs } };
}

describe("buildExplainabilityTimeline — ORDERING", () => {
  it("always returns exactly the 6 real stages, in the fixed pipeline order", () => {
    const nodes = buildExplainabilityTimeline(makeResult(), makeCrossFeature());
    expect(nodes.map((n) => n.stage)).toEqual(["automation", "analytics", "history", "report", "digest", "aiChat"]);
  });

  it("the order never changes based on which stages are reached", () => {
    const fullyReached = makeCrossFeature({ events: [makeEvent({ analyticsTrendMetric: "health", historySnapshotTimestamp: "2026-09-01T00:00:00.000Z", reportPeriod: "30d", chatQuestionId: "healthChange" })] });
    const nodes = buildExplainabilityTimeline(makeResult(), fullyReached);
    expect(nodes.map((n) => n.stage)).toEqual(["automation", "analytics", "history", "report", "digest", "aiChat"]);
  });
});

describe("buildExplainabilityTimeline — MISSING STAGES / PARTIAL TIMELINES", () => {
  it("'automation' is always reached — a real AutomationResult always fired", () => {
    const nodes = buildExplainabilityTimeline(makeResult(), makeCrossFeature());
    expect(nodes.find((n) => n.stage === "automation")?.reached).toBe(true);
  });

  it("every other stage is honestly unreached when there is no matching CorrelatedEvent at all", () => {
    const nodes = buildExplainabilityTimeline(makeResult(), makeCrossFeature());
    for (const stage of ["analytics", "history", "report", "digest", "aiChat"] as const) {
      const node = nodes.find((n) => n.stage === stage)!;
      expect(node.reached).toBe(false);
      expect(node.timestamp).toBeNull();
    }
  });

  it("a PARTIAL timeline: only the refs that genuinely exist are marked reached", () => {
    const crossFeature = makeCrossFeature({ events: [makeEvent({ analyticsTrendMetric: "health", historySnapshotTimestamp: null, reportPeriod: null, chatQuestionId: null })] });
    const nodes = buildExplainabilityTimeline(makeResult(), crossFeature);
    expect(nodes.find((n) => n.stage === "analytics")?.reached).toBe(true);
    expect(nodes.find((n) => n.stage === "history")?.reached).toBe(false);
    expect(nodes.find((n) => n.stage === "report")?.reached).toBe(false);
    expect(nodes.find((n) => n.stage === "digest")?.reached).toBe(false);
    expect(nodes.find((n) => n.stage === "aiChat")?.reached).toBe(false);
  });

  it("a matched event with a real timestamp propagates that real timestamp to every reached stage", () => {
    const crossFeature = makeCrossFeature({ events: [makeEvent({ analyticsTrendMetric: "health", historySnapshotTimestamp: "2026-08-20T00:00:00.000Z" }, "2026-08-25T00:00:00.000Z")] });
    const nodes = buildExplainabilityTimeline(makeResult(), crossFeature);
    expect(nodes.find((n) => n.stage === "analytics")?.timestamp).toBe("2026-08-25T00:00:00.000Z");
    expect(nodes.find((n) => n.stage === "history")?.timestamp).toBe("2026-08-25T00:00:00.000Z");
  });

  it("no matched event at all: the automation stage still reports the real result.triggeredAt", () => {
    const nodes = buildExplainabilityTimeline(makeResult({ triggeredAt: "2026-09-03T00:00:00.000Z" }), makeCrossFeature());
    expect(nodes.find((n) => n.stage === "automation")?.timestamp).toBe("2026-09-03T00:00:00.000Z");
  });
});

describe("buildExplainabilityTimeline — COMPLETE PROVENANCE CHAIN (V4-FUTURE-002G)", () => {
  it("when every real ref exists, every one of the 6 stages reports reached:true with a real, shared timestamp", () => {
    const fullyReached = makeCrossFeature({ events: [makeEvent({ analyticsTrendMetric: "health", historySnapshotTimestamp: "2026-09-01T00:00:00.000Z", reportPeriod: "30d", chatQuestionId: "healthChange" })] });
    const nodes = buildExplainabilityTimeline(makeResult(), fullyReached);
    for (const node of nodes) {
      expect(node.reached).toBe(true);
      expect(node.timestamp).toBe("2026-09-01T00:00:00.000Z");
    }
  });
});

describe("buildExplainabilityTimeline — DUPLICATES / NO FABRICATED LINKS", () => {
  it("'report' and 'digest' stages share the exact SAME real refs.reportPeriod signal — never two independently-fabricated confirmations", () => {
    const crossFeature = makeCrossFeature({ events: [makeEvent({ reportPeriod: "30d" })] });
    const nodes = buildExplainabilityTimeline(makeResult(), crossFeature);
    const report = nodes.find((n) => n.stage === "report")!;
    const digest = nodes.find((n) => n.stage === "digest")!;
    expect(report.reached).toBe(digest.reached);
    expect(report.reached).toBe(true);
  });

  it("no duplicate stage entries — each of the 6 real stages appears exactly once", () => {
    const nodes = buildExplainabilityTimeline(makeResult(), makeCrossFeature());
    expect(new Set(nodes.map((n) => n.stage)).size).toBe(6);
  });
});

describe("buildExplainabilityTimeline — DETERMINISM", () => {
  it("identical inputs produce an identical, deep-equal timeline", () => {
    const crossFeature = makeCrossFeature({ events: [makeEvent({ analyticsTrendMetric: "health", reportPeriod: "30d" })] });
    const result = makeResult();
    const a = buildExplainabilityTimeline(result, crossFeature);
    const b = buildExplainabilityTimeline(result, crossFeature);
    expect(a).toEqual(b);
  });
});
