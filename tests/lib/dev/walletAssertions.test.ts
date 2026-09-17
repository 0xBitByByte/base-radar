import { describe, expect, it } from "vitest";

import { runWalletAssertions } from "@/lib/dev/walletAssertions";
import { buildWalletVerificationFixtures, makeAnalyticsSnapshot, makeAutomationResult, makeRealisticHistory, makeWalletAnalytics } from "@/lib/dev/walletFixtures";

describe("runWalletAssertions — the default fixtures are genuinely clean", () => {
  it("produces zero assertions for buildWalletVerificationFixtures()'s own default output", () => {
    expect(runWalletAssertions(buildWalletVerificationFixtures())).toEqual([]);
  });
});

describe("runWalletAssertions — duplicate notifications", () => {
  it("detects two AutomationResults sharing the same id", () => {
    const bundle = buildWalletVerificationFixtures({ automationResults: [makeAutomationResult({ id: "automation:dup:1" }), makeAutomationResult({ id: "automation:dup:1" })] });
    const findings = runWalletAssertions(bundle);
    expect(findings.some((f) => f.category === "duplicate-notifications" && f.severity === "error")).toBe(true);
  });

  it("detects the same rule firing twice at the identical timestamp under two different ids", () => {
    const bundle = buildWalletVerificationFixtures({
      automationResults: [
        makeAutomationResult({ id: "automation:a", ruleId: "wallet-rule:health", triggeredAt: "2026-08-10T00:00:00.000Z" }),
        makeAutomationResult({ id: "automation:b", ruleId: "wallet-rule:health", triggeredAt: "2026-08-10T00:00:00.000Z" }),
      ],
    });
    const findings = runWalletAssertions(bundle);
    expect(findings.some((f) => f.category === "duplicate-notifications" && f.severity === "warning")).toBe(true);
  });

  it("does NOT flag two different real notifications with different timestamps", () => {
    const bundle = buildWalletVerificationFixtures({
      automationResults: [makeAutomationResult({ id: "automation:a", triggeredAt: "2026-08-01T00:00:00.000Z" }), makeAutomationResult({ id: "automation:b", triggeredAt: "2026-08-10T00:00:00.000Z" })],
    });
    expect(runWalletAssertions(bundle).some((f) => f.category === "duplicate-notifications")).toBe(false);
  });
});

describe("runWalletAssertions — duplicated highlights", () => {
  it("detects two highlights sharing the same dedupeKey", () => {
    const analytics = makeWalletAnalytics({
      highlights: [
        { type: "milestone", priority: "important", stars: 4, title: "A", reason: "r", supportingMetric: null, topic: "value", dedupeKey: "same-key" },
        { type: "recovery", priority: "positive", stars: 3, title: "B", reason: "r", supportingMetric: null, topic: "risk", dedupeKey: "same-key" },
      ],
    });
    const bundle = buildWalletVerificationFixtures({ analytics });
    const findings = runWalletAssertions(bundle);
    expect(findings.some((f) => f.category === "duplicated-highlights" && f.severity === "error")).toBe(true);
  });
});

describe("runWalletAssertions — replay inconsistencies", () => {
  it("detects two snapshots at the identical timestamp", () => {
    const history = [makeAnalyticsSnapshot({ timestamp: "2026-08-01T00:00:00.000Z" }), makeAnalyticsSnapshot({ timestamp: "2026-08-01T00:00:00.000Z" })];
    const bundle = buildWalletVerificationFixtures({ history, analytics: makeWalletAnalytics({ snapshotCount: 2 }) });
    const findings = runWalletAssertions(bundle);
    expect(findings.some((f) => f.category === "replay-inconsistency")).toBe(true);
  });

  it("detects history that isn't in ascending order", () => {
    const history = [makeAnalyticsSnapshot({ timestamp: "2026-08-10T00:00:00.000Z" }), makeAnalyticsSnapshot({ timestamp: "2026-08-01T00:00:00.000Z" })];
    const bundle = buildWalletVerificationFixtures({ history, analytics: makeWalletAnalytics({ snapshotCount: 2 }) });
    const findings = runWalletAssertions(bundle);
    expect(findings.some((f) => f.category === "replay-inconsistency")).toBe(true);
  });

  it("does NOT flag genuinely ascending, unique-timestamp history", () => {
    const bundle = buildWalletVerificationFixtures({ history: makeRealisticHistory() });
    expect(runWalletAssertions(bundle).some((f) => f.category === "replay-inconsistency")).toBe(false);
  });
});

describe("runWalletAssertions — report/story divergence", () => {
  it("detects a story built from a different report than the one being compared", () => {
    const bundle = buildWalletVerificationFixtures();
    const mismatchedReportAll = bundle.reportAll ? { ...bundle.reportAll, overview: { ...bundle.reportAll.overview, lastSnapshotDate: "2020-01-01T00:00:00.000Z" } } : null;
    const findings = runWalletAssertions({ ...bundle, reportAll: mismatchedReportAll });
    expect(findings.some((f) => f.category === "report-story-divergence")).toBe(true);
  });
});

describe("runWalletAssertions — digest/report mismatch", () => {
  it("detects a digest built from a different report than the one being compared", () => {
    const bundle = buildWalletVerificationFixtures();
    const mismatchedReport30d = bundle.report30d ? { ...bundle.report30d, overview: { ...bundle.report30d.overview, snapshotCount: 999 } } : null;
    const findings = runWalletAssertions({ ...bundle, report30d: mismatchedReport30d });
    expect(findings.some((f) => f.category === "digest-report-mismatch")).toBe(true);
  });
});

describe("runWalletAssertions — broken feature references", () => {
  it("detects a CrossFeature event referencing an automationResultId that doesn't exist", () => {
    const bundle = buildWalletVerificationFixtures();
    const brokenEvents = bundle.crossFeature.events.length > 0 ? bundle.crossFeature.events : [{ id: "event:synthetic", topic: "health", label: "l", timestamp: "2026-08-10T00:00:00.000Z", tone: "positive" as const, headline: "h", refs: { historySnapshotTimestamp: null, analyticsTrendMetric: null, reportPeriod: null, chatQuestionId: null, automationResultId: "automation:does-not-exist" } }];
    const withBrokenRef = brokenEvents.map((e) => ({ ...e, refs: { ...e.refs, automationResultId: "automation:does-not-exist" } }));
    const findings = runWalletAssertions({ ...bundle, crossFeature: { ...bundle.crossFeature, events: withBrokenRef } });
    expect(findings.some((f) => f.category === "broken-feature-reference")).toBe(true);
  });

  it("does NOT flag null refs — a genuinely absent reference is never a broken one", () => {
    const bundle = buildWalletVerificationFixtures();
    const eventsWithNullRefs = [{ id: "event:1", topic: "health", label: "l", timestamp: "2026-08-10T00:00:00.000Z", tone: "positive" as const, headline: "h", refs: { historySnapshotTimestamp: null, analyticsTrendMetric: null, reportPeriod: null, chatQuestionId: null, automationResultId: null } }];
    const findings = runWalletAssertions({ ...bundle, crossFeature: { ...bundle.crossFeature, events: eventsWithNullRefs } });
    expect(findings.some((f) => f.category === "broken-feature-reference")).toBe(false);
  });
});
