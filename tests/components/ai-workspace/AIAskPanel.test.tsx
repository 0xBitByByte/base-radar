import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AIAskPanel } from "@/components/ai-workspace/AIAskPanel";
import type { UseAIWorkspaceAskResult } from "@/lib/hooks/useAIWorkspaceAsk";
import type { AskResponse } from "@/lib/ai-workspace/ask/types";
import type { WorkspaceClaim } from "@/lib/ai-workspace/types";

const QUESTIONS = [
  { id: "importantFindings" as const, prompt: "What are the most important findings right now?" },
  { id: "recentChanges" as const, prompt: "What changed recently?" },
];

function makeAsk(overrides: Partial<UseAIWorkspaceAskResult> = {}): UseAIWorkspaceAskResult {
  return {
    turns: [],
    ask: vi.fn(),
    clearConversation: vi.fn(),
    questions: QUESTIONS,
    ...overrides,
  };
}

function makeClaim(overrides: Partial<WorkspaceClaim> = {}): WorkspaceClaim {
  return {
    id: "claim:1",
    origin: "ai-intelligence",
    category: "defi",
    headline: "Aerodrome TVL rose 18% over 24h",
    summary: "A real, evidence-backed summary.",
    confidence: { kind: "level", level: "high", rationale: "Derived from 3 supporting signals.", evidenceCount: 3 },
    evidence: [],
    sources: [{ label: "DefiLlama" }],
    projects: [],
    generatedAt: "2026-09-08T00:00:00.000Z",
    limitation: null,
    ...overrides,
  };
}

const SAMPLE_RESPONSE: AskResponse = {
  questionId: "importantFindings",
  question: "What are the most important findings right now?",
  summary: "1 finding stands out right now, in Base Radar's own priority order:",
  citedClaims: [makeClaim()],
};

describe("AIAskPanel — deterministic labeling, never implies a live assistant", () => {
  it("labels itself deterministic and evidence-based, not a live chat assistant", () => {
    render(<AIAskPanel ask={makeAsk()} />);
    expect(screen.getByRole("heading", { name: "AI Ask" })).toBeInTheDocument();
    expect(screen.getByText(/Deterministic, evidence-based answers/)).toBeInTheDocument();
    expect(screen.getByText(/not a live chat assistant/)).toBeInTheDocument();
  });
});

describe("AIAskPanel — suggested-question buttons only, no free text", () => {
  it("renders one button per fixed question, with its real prompt text", () => {
    render(<AIAskPanel ask={makeAsk()} />);
    expect(screen.getByRole("button", { name: "What are the most important findings right now?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "What changed recently?" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("clicking a question button calls ask() with the real question id", async () => {
    const user = userEvent.setup();
    const ask = vi.fn();
    render(<AIAskPanel ask={makeAsk({ ask })} />);
    await user.click(screen.getByRole("button", { name: "What changed recently?" }));
    expect(ask).toHaveBeenCalledWith("recentChanges");
    expect(ask).toHaveBeenCalledTimes(1);
  });
});

describe("AIAskPanel — conversation turns, session-only", () => {
  it("no turns yet: no conversation log", () => {
    render(<AIAskPanel ask={makeAsk()} />);
    expect(screen.queryByRole("log")).not.toBeInTheDocument();
  });

  it("a real turn renders the question, the summary, and its cited claim (via the same EvidenceClaimCard the sections use)", () => {
    render(<AIAskPanel ask={makeAsk({ turns: [{ response: SAMPLE_RESPONSE, askedAt: "2026-09-08T00:00:00.000Z" }] })} />);
    const log = screen.getByRole("log", { name: "AI Ask conversation" });
    expect(within(log).getByText("What are the most important findings right now?")).toBeInTheDocument();
    expect(within(log).getByText("1 finding stands out right now, in Base Radar's own priority order:")).toBeInTheDocument();
    expect(within(log).getByText("Aerodrome TVL rose 18% over 24h")).toBeInTheDocument();
    expect(within(log).getByText("DefiLlama")).toBeInTheDocument();
  });

  it("a turn with an honest empty answer (no cited claims) renders the summary with no fabricated evidence card", () => {
    const emptyResponse: AskResponse = { questionId: "recentChanges", question: "What changed recently?", summary: "Nothing has been recorded yet to describe as a recent change.", citedClaims: [] };
    render(<AIAskPanel ask={makeAsk({ turns: [{ response: emptyResponse, askedAt: "2026-09-08T00:00:00.000Z" }] })} />);
    expect(screen.getByText("Nothing has been recorded yet to describe as a recent change.")).toBeInTheDocument();
    expect(screen.queryByText("Supporting Evidence")).not.toBeInTheDocument();
  });

  it("'Clear Conversation' only appears once there's a real turn, and calls clearConversation()", async () => {
    const user = userEvent.setup();
    const clearConversation = vi.fn();
    render(<AIAskPanel ask={makeAsk({ turns: [{ response: SAMPLE_RESPONSE, askedAt: "2026-09-08T00:00:00.000Z" }], clearConversation })} />);
    await user.click(screen.getByRole("button", { name: /Clear Conversation/ }));
    expect(clearConversation).toHaveBeenCalledTimes(1);
  });

  it("no 'Clear Conversation' button when there are no turns yet", () => {
    render(<AIAskPanel ask={makeAsk()} />);
    expect(screen.queryByRole("button", { name: /Clear Conversation/ })).not.toBeInTheDocument();
  });
});

describe("AIAskPanel — confidence-integrity: two non-comparable models render as visibly separate labeled groups", () => {
  const aiClaim = makeClaim({ id: "ai:1", headline: "AI Intelligence high-confidence finding" });
  const briefClaim = makeClaim({ id: "brief:1", origin: "daily-brief", headline: "Daily Brief high-score finding", confidence: { kind: "score", value: 88 } });

  const GROUPED_RESPONSE: AskResponse = {
    questionId: "strongestConfidence",
    question: "Which findings have high confidence?",
    summary: "AI Intelligence Briefs and Daily Brief findings each use their own real confidence model — shown below as two separate groups, never combined into one ranking.",
    citedClaims: [aiClaim, briefClaim],
    groups: [
      { label: "AI Intelligence confidence", claims: [aiClaim] },
      { label: "Daily Brief confidence", claims: [briefClaim] },
    ],
  };

  it("renders each group under its own real label, never one flattened list", () => {
    render(<AIAskPanel ask={makeAsk({ turns: [{ response: GROUPED_RESPONSE, askedAt: "2026-09-08T00:00:00.000Z" }] })} />);
    const log = screen.getByRole("log", { name: "AI Ask conversation" });
    expect(within(log).getByText("AI Intelligence confidence")).toBeInTheDocument();
    expect(within(log).getByText("Daily Brief confidence")).toBeInTheDocument();
    expect(within(log).getByText("AI Intelligence high-confidence finding")).toBeInTheDocument();
    expect(within(log).getByText("Daily Brief high-score finding")).toBeInTheDocument();
  });

  it("the summary states the models are shown separately, never implying equivalence", () => {
    render(<AIAskPanel ask={makeAsk({ turns: [{ response: GROUPED_RESPONSE, askedAt: "2026-09-08T00:00:00.000Z" }] })} />);
    expect(screen.getByText(/each use their own real confidence model/)).toBeInTheDocument();
    expect(screen.getByText(/never combined into one ranking/)).toBeInTheDocument();
  });

  it("only one group has data: renders only that labeled group, not an empty second one", () => {
    const oneGroupResponse: AskResponse = {
      questionId: "strongestConfidence",
      question: "Which findings have high confidence?",
      summary: "Only AI Intelligence confidence findings currently qualify. Shown using its own real confidence model — never combined with the other, which has no data right now.",
      citedClaims: [aiClaim],
      groups: [{ label: "AI Intelligence confidence", claims: [aiClaim] }],
    };
    render(<AIAskPanel ask={makeAsk({ turns: [{ response: oneGroupResponse, askedAt: "2026-09-08T00:00:00.000Z" }] })} />);
    const log = screen.getByRole("log", { name: "AI Ask conversation" });
    expect(within(log).getByText("AI Intelligence confidence")).toBeInTheDocument();
    expect(within(log).queryByText("Daily Brief confidence")).not.toBeInTheDocument();
  });

  it("a response with no groups (every other question) still renders the plain flat citedClaims list, unaffected", () => {
    render(<AIAskPanel ask={makeAsk({ turns: [{ response: SAMPLE_RESPONSE, askedAt: "2026-09-08T00:00:00.000Z" }] })} />);
    const log = screen.getByRole("log", { name: "AI Ask conversation" });
    expect(within(log).getByText("Aerodrome TVL rose 18% over 24h")).toBeInTheDocument();
    expect(within(log).queryByText("AI Intelligence confidence")).not.toBeInTheDocument();
  });
});
