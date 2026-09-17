import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useAIWorkspaceAsk } from "@/lib/hooks/useAIWorkspaceAsk";
import type { WorkspaceClaim, WorkspaceView } from "@/lib/ai-workspace/types";

function makeClaim(overrides: Partial<WorkspaceClaim> = {}): WorkspaceClaim {
  return {
    id: "claim:1",
    origin: "ai-intelligence",
    category: "defi",
    headline: "Headline",
    summary: "Summary",
    confidence: null,
    evidence: [{ id: "sig:1", label: "Liquidity Signal", detail: "detail", occurredAt: null, sourceLabel: "DefiLlama" }],
    sources: [{ label: "DefiLlama" }],
    projects: [],
    generatedAt: "2026-09-01T00:00:00.000Z",
    limitation: null,
    ...overrides,
  };
}

const EMPTY_VIEW: WorkspaceView = {
  sections: [
    { id: "ai-intelligence", title: "AI Intelligence Briefs", description: "", claims: [], emptyReason: "No AI Intelligence briefs yet." },
    { id: "daily-brief", title: "Daily Brief Findings", description: "", claims: [], emptyReason: "No Daily Brief findings yet." },
  ],
  generatedAt: "2026-09-01T00:00:00.000Z",
};

describe("useAIWorkspaceAsk — the fixed six-question catalog", () => {
  it("starts with zero turns and exposes all six fixed questions", () => {
    const { result } = renderHook(() => useAIWorkspaceAsk(EMPTY_VIEW));
    expect(result.current.turns).toEqual([]);
    expect(result.current.questions).toHaveLength(6);
  });
});

describe("useAIWorkspaceAsk — a selected question appends one session-only turn", () => {
  it("asking a question appends exactly one turn with the real response", () => {
    const { result } = renderHook(() => useAIWorkspaceAsk(EMPTY_VIEW));
    act(() => result.current.ask("importantFindings"));
    expect(result.current.turns).toHaveLength(1);
    expect(result.current.turns[0].response.questionId).toBe("importantFindings");
  });

  it("asking twice appends two turns, in the order asked", () => {
    const { result } = renderHook(() => useAIWorkspaceAsk(EMPTY_VIEW));
    act(() => result.current.ask("recentChanges"));
    act(() => result.current.ask("topRisks"));
    expect(result.current.turns.map((t) => t.response.questionId)).toEqual(["recentChanges", "topRisks"]);
  });
});

describe("useAIWorkspaceAsk — clearing the conversation removes turns", () => {
  it("clearConversation empties turns, and a fresh ask() after clearing still works", () => {
    const { result } = renderHook(() => useAIWorkspaceAsk(EMPTY_VIEW));
    act(() => result.current.ask("importantFindings"));
    act(() => result.current.clearConversation());
    expect(result.current.turns).toEqual([]);
    act(() => result.current.ask("topRisks"));
    expect(result.current.turns).toHaveLength(1);
  });
});

describe("useAIWorkspaceAsk — uses the canonical WorkspaceView passed in, never a duplicate data path", () => {
  it("a cited claim in the response is the exact same object reference from the view this hook was given", () => {
    const claim = makeClaim();
    const view: WorkspaceView = { ...EMPTY_VIEW, sections: [{ ...EMPTY_VIEW.sections[0], claims: [claim] }, EMPTY_VIEW.sections[1]] };
    const { result } = renderHook(() => useAIWorkspaceAsk(view));
    act(() => result.current.ask("evidenceToReviewFirst"));
    expect(result.current.turns[0].response.citedClaims[0]).toBe(claim);
  });
});
