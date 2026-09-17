import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ExplainButton } from "@/components/wallet/NotificationExplanationPanel";
import type { NotificationExplanation } from "@/lib/notification-explain/types";

const EXPLANATION: NotificationExplanation = {
  resultId: "automation:wallet-rule:health:1",
  headline: "Health Score Changed",
  reason: "Health score moved from 40 to 70.",
  supportingEvidence: ["Health score moved from 40 to 70 across 3 snapshots."],
  refs: { historySnapshotTimestamp: "2026-09-01T00:00:00.000Z", analyticsTrendMetric: "health", reportPeriod: "30d", chatQuestionId: "healthChange", automationResultId: "automation:wallet-rule:health:1" },
  relatedRecommendation: { recommendationId: "add-stablecoins", title: "Add stablecoins", isPrimary: true, refs: { historySnapshotTimestamp: null, analyticsTrendMetric: null, reportPeriod: null, chatQuestionId: null, automationResultId: null } },
  suggestedQuestions: [
    { id: "healthChange", prompt: "Why did my Health change?" },
    { id: "recentChanges", prompt: "What changed recently?" },
  ],
  nextAction: { action: "Add stablecoins", reason: "Stablecoin exposure is only 12%." },
  confidence: "medium",
};

describe("ExplainButton / NotificationExplanationPanel", () => {
  it("opens the panel with the real headline/reason/evidence on click", async () => {
    const user = userEvent.setup();
    render(<ExplainButton explanation={EXPLANATION} />);

    await user.click(screen.getByRole("button", { name: /Explain/ }));

    expect(screen.getByText("Health Score Changed")).toBeInTheDocument();
    expect(screen.getByText("Health score moved from 40 to 70.")).toBeInTheDocument();
    expect(screen.getByText("Health score moved from 40 to 70 across 3 snapshots.")).toBeInTheDocument();
  });

  it("shows real references, the related recommendation, next action, and confidence", async () => {
    const user = userEvent.setup();
    render(<ExplainButton explanation={EXPLANATION} />);
    await user.click(screen.getByRole("button", { name: /Explain/ }));

    expect(screen.getByText("health")).toBeInTheDocument(); // Related Analytics
    expect(screen.getByText("Last 30 Days")).toBeInTheDocument(); // Related Report
    expect(screen.getAllByText("Add stablecoins").length).toBeGreaterThanOrEqual(1); // Related Recommendation AND Next Action title
    expect(screen.getByText(/Stablecoin exposure is only 12%/)).toBeInTheDocument();
    expect(screen.getByText("Medium Confidence")).toBeInTheDocument();
  });

  it("clicking a suggested question calls onAskQuestion with the real question id — never free text or a new chat turn built here", async () => {
    const user = userEvent.setup();
    const onAskQuestion = vi.fn();
    render(<ExplainButton explanation={EXPLANATION} onAskQuestion={onAskQuestion} />);
    await user.click(screen.getByRole("button", { name: /Explain/ }));

    await user.click(screen.getByRole("button", { name: "Why did my Health change?" }));
    expect(onAskQuestion).toHaveBeenCalledWith("healthChange");
  });

  it("suggested-question buttons are disabled when no onAskQuestion is supplied — never silently do nothing", async () => {
    const user = userEvent.setup();
    render(<ExplainButton explanation={EXPLANATION} />);
    await user.click(screen.getByRole("button", { name: /Explain/ }));
    expect(screen.getByRole("button", { name: "Why did my Health change?" })).toBeDisabled();
  });

  it("omits Supporting Evidence / Related Recommendation / Next Action sections entirely when the explanation genuinely has none", async () => {
    const user = userEvent.setup();
    const empty: NotificationExplanation = {
      resultId: "automation:wallet-rule:health:1",
      headline: "Health Score Changed",
      reason: "Health score moved from 40 to 70.",
      supportingEvidence: [],
      refs: { historySnapshotTimestamp: null, analyticsTrendMetric: null, reportPeriod: null, chatQuestionId: null, automationResultId: null },
      relatedRecommendation: null,
      suggestedQuestions: [{ id: "recentChanges", prompt: "What changed recently?" }],
      nextAction: null,
      confidence: "unknown",
    };
    render(<ExplainButton explanation={empty} />);
    await user.click(screen.getByRole("button", { name: /Explain/ }));

    expect(screen.queryByText("Supporting Evidence")).not.toBeInTheDocument();
    expect(screen.queryByText("Related Recommendation")).not.toBeInTheDocument();
    expect(screen.queryByText("Next Action")).not.toBeInTheDocument();
    expect(screen.getByText("Confidence Unknown")).toBeInTheDocument();
  });

  describe("V4-FUTURE-001F Explainability Timeline", () => {
    it("no Timeline section when none is supplied — the timeline prop is genuinely optional", async () => {
      const user = userEvent.setup();
      render(<ExplainButton explanation={EXPLANATION} />);
      await user.click(screen.getByRole("button", { name: /Explain/ }));
      expect(screen.queryByText("Timeline")).not.toBeInTheDocument();
    });

    it("renders every real stage's title and feature, greying out unreached ones informationally (no navigation)", async () => {
      const user = userEvent.setup();
      render(
        <ExplainButton
          explanation={EXPLANATION}
          timeline={[
            { stage: "automation", title: "Automation fired", feature: "Wallet Automation", timestamp: "2026-09-01T00:00:00.000Z", reached: true },
            { stage: "analytics", title: "Analytics trend updated", feature: "Wallet Analytics", timestamp: "2026-09-01T00:00:00.000Z", reached: true },
            { stage: "history", title: "History snapshot stored", feature: "Wallet History", timestamp: null, reached: false },
            { stage: "report", title: "Report included it", feature: "Historical Reports", timestamp: null, reached: false },
            { stage: "digest", title: "Monthly Digest referenced it", feature: "Monthly Digest", timestamp: null, reached: false },
            { stage: "aiChat", title: "AI Chat can explain it", feature: "AI Chat", timestamp: null, reached: false },
          ]}
        />
      );
      await user.click(screen.getByRole("button", { name: /Explain/ }));

      expect(screen.getByText("Timeline")).toBeInTheDocument();
      expect(screen.getByText("Automation fired")).toBeInTheDocument();
      expect(screen.getByText("Analytics trend updated")).toBeInTheDocument();
      expect(screen.getByText("History snapshot stored")).toBeInTheDocument();
      expect(screen.getByText(/Wallet Automation/)).toBeInTheDocument();
      expect(screen.getByText("AI Chat can explain it")).toBeInTheDocument();
      // informational only — never rendered as a link/button
      expect(screen.queryByRole("link", { name: /Automation fired/ })).not.toBeInTheDocument();
    });
  });
});
