import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { WalletRelatedActivityPanel } from "@/components/wallet/WalletRelatedActivityPanel";
import { buildCrossFeatureIndexes } from "@/lib/cross-feature/indexes";
import type { CrossFeatureIntelligence } from "@/lib/cross-feature/types";

function makeCrossFeature(overrides: Partial<CrossFeatureIntelligence> = {}): CrossFeatureIntelligence {
  const events = overrides.events ?? [];
  const recommendations = overrides.recommendations ?? [];
  return { events, recommendations, timeline: overrides.timeline ?? [], latestStory: overrides.latestStory ?? null, indexes: buildCrossFeatureIndexes(events, recommendations) };
}

describe("WalletRelatedActivityPanel", () => {
  it("EMPTY: shows an honest empty state, no crash", () => {
    render(<WalletRelatedActivityPanel crossFeature={makeCrossFeature()} />);
    expect(screen.getByText("Nothing correlated yet.")).toBeInTheDocument();
  });

  it("renders a real correlated event's headline and its real reference badges", () => {
    render(
      <WalletRelatedActivityPanel
        crossFeature={makeCrossFeature({
          events: [
            {
              id: "event:recovery:risk:2026-08-20",
              topic: "risk",
              label: "Recovered from High Risk",
              timestamp: "2026-08-20T00:00:00.000Z",
              tone: "positive",
              headline: "Risk improved from 80 to 30.",
              refs: { historySnapshotTimestamp: "2026-08-20T00:00:00.000Z", analyticsTrendMetric: "risk", reportPeriod: "30d", chatQuestionId: "biggestRisk", automationResultId: "automation:1" },
            },
          ],
        })}
      />
    );

    expect(screen.getByText("Recovered from High Risk")).toBeInTheDocument();
    expect(screen.getByText("Risk improved from 80 to 30.")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("Analytics: risk")).toBeInTheDocument();
    expect(screen.getByText("Report: Last 30 Days")).toBeInTheDocument();
    expect(screen.getByText("Ask AI: What is my biggest risk?")).toBeInTheDocument();
    expect(screen.getByText("Automation")).toBeInTheDocument();
  });

  it("only renders badges for refs that are genuinely real — a null ref never shows a badge", () => {
    render(
      <WalletRelatedActivityPanel
        crossFeature={makeCrossFeature({
          events: [
            {
              id: "event:1",
              topic: "diversification",
              label: "Diversification improved",
              timestamp: "2026-08-20T00:00:00.000Z",
              tone: "positive",
              headline: "Diversification improved.",
              refs: { historySnapshotTimestamp: null, analyticsTrendMetric: "diversification", reportPeriod: null, chatQuestionId: null, automationResultId: null },
            },
          ],
        })}
      />
    );

    expect(screen.getByText("Analytics: diversification")).toBeInTheDocument();
    expect(screen.queryByText("History")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Report:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Ask AI:/)).not.toBeInTheDocument();
    expect(screen.queryByText("Automation")).not.toBeInTheDocument();
  });

  it("shows the real total correlated-moment count from the timeline", () => {
    render(
      <WalletRelatedActivityPanel
        crossFeature={makeCrossFeature({
          events: [{ id: "event:1", topic: "health", label: "Health improved", timestamp: "2026-08-20T00:00:00.000Z", tone: "positive", headline: "Health improved.", refs: { historySnapshotTimestamp: null, analyticsTrendMetric: null, reportPeriod: null, chatQuestionId: null, automationResultId: null } }],
          timeline: [{ id: "t1", timestamp: "2026-08-20T00:00:00.000Z", headline: "h", tone: "neutral", sources: ["history"] }],
        })}
      />
    );
    expect(screen.getByText(/1 correlated moment/)).toBeInTheDocument();
  });
});
