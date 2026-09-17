import { describe, expect, it } from "vitest";

import { askWorkspaceQuestion } from "@/lib/ai-workspace/ask/engine";
import { ASK_QUESTION_IDS } from "@/lib/ai-workspace/ask/types";
import type { WorkspaceClaim, WorkspaceSection, WorkspaceView } from "@/lib/ai-workspace/types";

function makeClaim(overrides: Partial<WorkspaceClaim> = {}): WorkspaceClaim {
  return {
    id: "claim:1",
    origin: "ai-intelligence",
    category: "defi",
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

const EMPTY_VIEW = makeView();

describe("askWorkspaceQuestion — every fixed question id maps to a real deterministic builder", () => {
  it.each(ASK_QUESTION_IDS)("%s returns a response for its own real question id, never 'Unknown question'", (id) => {
    const response = askWorkspaceQuestion(id, EMPTY_VIEW);
    expect(response.questionId).toBe(id);
    expect(response.question).not.toBe("Unknown question");
  });

  it("an unrecognized id honestly reports 'Unknown question' rather than fabricating an answer", () => {
    const response = askWorkspaceQuestion("notARealQuestion", EMPTY_VIEW);
    expect(response.question).toBe("Unknown question");
    expect(response.citedClaims).toEqual([]);
  });
});

describe("importantFindings — populated canonical input produces cited facts/sources", () => {
  it("cites the real claims from both sections, in the engine's own order, up to 3", () => {
    const ai = makeClaim({ id: "ai:1", headline: "AI finding" });
    const brief = makeClaim({ id: "brief:1", origin: "daily-brief", category: "Opportunity", headline: "Brief finding" });
    const response = askWorkspaceQuestion("importantFindings", makeView([ai], [brief]));
    expect(response.citedClaims).toEqual([ai, brief]);
    expect(response.citedClaims[0]).toBe(ai);
    expect(response.summary).toContain("2 findings");
  });

  it("missing canonical data produces an honest unavailable answer, never a fabricated finding", () => {
    const response = askWorkspaceQuestion("importantFindings", EMPTY_VIEW);
    expect(response.citedClaims).toEqual([]);
    expect(response.summary).toContain("doesn't have any findings recorded yet");
  });
});

describe("strongestOpportunities — only real 'Opportunity'-category claims, never a fabricated evidence claim", () => {
  it("includes an Opportunity-category Daily Brief claim, excludes a Security one", () => {
    const opportunity = makeClaim({ id: "opp:1", origin: "daily-brief", category: "Opportunity", confidence: { kind: "score", value: 74 } });
    const security = makeClaim({ id: "sec:1", origin: "daily-brief", category: "Security" });
    const response = askWorkspaceQuestion("strongestOpportunities", makeView([], [opportunity, security]));
    expect(response.citedClaims).toEqual([opportunity]);
  });

  it("no evidence is fabricated for a claim that genuinely has none — the answer says so plainly", () => {
    const opportunity = makeClaim({ id: "opp:1", origin: "daily-brief", category: "Opportunity", evidence: [] });
    const response = askWorkspaceQuestion("strongestOpportunities", makeView([], [opportunity]));
    expect(response.citedClaims[0].evidence).toEqual([]);
    expect(response.summary).toContain("doesn't retain per-signal evidence");
  });

  it("missing data: an honest unavailable answer", () => {
    const response = askWorkspaceQuestion("strongestOpportunities", EMPTY_VIEW);
    expect(response.citedClaims).toEqual([]);
    expect(response.summary).toContain("No opportunity findings are on record yet");
  });

  describe("trust-copy correction — ordering wording accurately reflects the canonical source, never conflating score with confidence", () => {
    it("states the real ordering: the Daily Brief's existing Alert Engine priority order (buildTopOpportunities() sorts by alert.score, not by the claim's separate confidence value)", () => {
      const opportunity = makeClaim({ id: "opp:1", origin: "daily-brief", category: "Opportunity", confidence: { kind: "score", value: 74 } });
      const response = askWorkspaceQuestion("strongestOpportunities", makeView([], [opportunity]));
      expect(response.summary).toContain("Daily Brief's existing Alert Engine priority order");
    });

    it("never claims a confidence-based ranking", () => {
      const opportunity = makeClaim({ id: "opp:1", origin: "daily-brief", category: "Opportunity", confidence: { kind: "score", value: 74 } });
      const response = askWorkspaceQuestion("strongestOpportunities", makeView([], [opportunity]));
      expect(response.summary).not.toContain("confidence score");
    });

    it("selection and source order are unchanged: claims are still cited verbatim, in the section's own existing order, never re-sorted by this wording fix", () => {
      const first = makeClaim({ id: "opp:1", origin: "daily-brief", category: "Opportunity", confidence: { kind: "score", value: 40 } });
      const second = makeClaim({ id: "opp:2", origin: "daily-brief", category: "Opportunity", confidence: { kind: "score", value: 90 } });
      const response = askWorkspaceQuestion("strongestOpportunities", makeView([], [first, second]));
      expect(response.citedClaims).toEqual([first, second]);
      expect(response.citedClaims[0]).toBe(first);
      expect(response.citedClaims[1]).toBe(second);
    });

    it("the honest per-signal-evidence limitation is preserved verbatim", () => {
      const opportunity = makeClaim({ id: "opp:1", origin: "daily-brief", category: "Opportunity" });
      const response = askWorkspaceQuestion("strongestOpportunities", makeView([], [opportunity]));
      expect(response.summary).toContain("Base Radar doesn't retain per-signal evidence at this tier");
    });
  });
});

describe("topRisks — complete risk coverage: AI Intelligence security claims + Daily Brief Risk claims (decline AND security-risk), never re-scored", () => {
  it("includes an AI Intelligence 'security' claim and a Daily Brief 'Risk' claim, excludes an unrelated category", () => {
    const aiSecurity = makeClaim({ id: "ai-sec:1", category: "security" });
    const briefRisk = makeClaim({ id: "brief-risk:1", origin: "daily-brief", category: "Risk" });
    const unrelated = makeClaim({ id: "defi:1", category: "defi" });
    const response = askWorkspaceQuestion("topRisks", makeView([aiSecurity, unrelated], [briefRisk]));
    expect(response.citedClaims).toEqual([aiSecurity, briefRisk]);
  });

  it("a Daily Brief 'decline'-narrative risk claim appears in the risk answer — the exact gap this correction closes", () => {
    const declineRisk = makeClaim({ id: "decline:1", origin: "daily-brief", category: "Risk", headline: "Declining confidence on Aerodrome", confidence: { kind: "score", value: 58 } });
    const response = askWorkspaceQuestion("topRisks", makeView([], [declineRisk]));
    expect(response.citedClaims).toEqual([declineRisk]);
    expect(response.summary).not.toContain("no risks");
  });

  it("a Daily Brief 'security-risk'-narrative risk claim remains included", () => {
    const securityRiskClaim = makeClaim({ id: "sec-risk:1", origin: "daily-brief", category: "Risk", headline: "Contract concern on Aerodrome" });
    const response = askWorkspaceQuestion("topRisks", makeView([], [securityRiskClaim]));
    expect(response.citedClaims).toEqual([securityRiskClaim]);
  });

  it("a Daily Brief 'Security' HIGHLIGHT claim (the old, narrower source) is no longer double-counted here — Risk claims are the sole Daily Brief risk source for this question", () => {
    const securityHighlight = makeClaim({ id: "sec-highlight:1", origin: "daily-brief", category: "Security" });
    const response = askWorkspaceQuestion("topRisks", makeView([], [securityHighlight]));
    expect(response.citedClaims).toEqual([]);
  });

  it("never claims 'no risks or concerns are recorded' when the AI Intelligence source alone has relevant data", () => {
    const aiSecurity = makeClaim({ id: "ai-sec:1", category: "security" });
    const response = askWorkspaceQuestion("topRisks", makeView([aiSecurity], []));
    expect(response.summary).not.toContain("No risks or concerns are currently recorded");
  });

  it("never claims 'no risks or concerns are recorded' when the Daily Brief Risk source alone has relevant data", () => {
    const briefRisk = makeClaim({ id: "brief-risk:1", origin: "daily-brief", category: "Risk" });
    const response = askWorkspaceQuestion("topRisks", makeView([], [briefRisk]));
    expect(response.summary).not.toContain("No risks or concerns are currently recorded");
  });

  it("missing data from BOTH canonical sources: an honest 'no risks or concerns are recorded' answer", () => {
    const response = askWorkspaceQuestion("topRisks", EMPTY_VIEW);
    expect(response.citedClaims).toEqual([]);
    expect(response.summary).toContain("No risks or concerns are currently recorded");
  });
});

describe("recentChanges — real generatedAt timestamps, sorted, never fabricated freshness", () => {
  it("orders claims from both sections by their own real generatedAt, newest first", () => {
    const older = makeClaim({ id: "old:1", generatedAt: "2026-08-01T00:00:00.000Z" });
    const newer = makeClaim({ id: "new:1", origin: "daily-brief", generatedAt: "2026-09-05T00:00:00.000Z" });
    const response = askWorkspaceQuestion("recentChanges", makeView([older], [newer]));
    expect(response.citedClaims).toEqual([newer, older]);
  });

  it("missing data: an honest unavailable answer", () => {
    const response = askWorkspaceQuestion("recentChanges", EMPTY_VIEW);
    expect(response.citedClaims).toEqual([]);
  });
});

describe("strongestConfidence ('Which findings have high confidence?') — each origin's own real confidence model, kept in visibly separate groups, never merged/ranked/normalized", () => {
  it("the question wording asks about 'high confidence', never the old 'strongest confidence' phrasing", () => {
    const response = askWorkspaceQuestion("strongestConfidence", EMPTY_VIEW);
    expect(response.question).toBe("Which findings have high confidence?");
    expect(response.question).not.toContain("strongest confidence");
  });

  it("includes a 'high'/'very-high' level AI Intelligence claim, excludes a 'medium' one, in an 'AI Intelligence confidence' group", () => {
    const highConfidence = makeClaim({ id: "high:1", confidence: { kind: "level", level: "very-high", rationale: "r", evidenceCount: 2 } });
    const mediumConfidence = makeClaim({ id: "medium:1", confidence: { kind: "level", level: "medium", rationale: "r", evidenceCount: 1 } });
    const response = askWorkspaceQuestion("strongestConfidence", makeView([highConfidence, mediumConfidence], []));
    expect(response.groups).toEqual([{ label: "AI Intelligence confidence", claims: [highConfidence] }]);
  });

  it("includes the top-scored Daily Brief claims, sorted only within their own group, in a 'Daily Brief confidence' group", () => {
    const low = makeClaim({ id: "score-low", origin: "daily-brief", confidence: { kind: "score", value: 40 } });
    const high = makeClaim({ id: "score-high", origin: "daily-brief", confidence: { kind: "score", value: 90 } });
    const response = askWorkspaceQuestion("strongestConfidence", makeView([], [low, high]));
    expect(response.groups).toEqual([{ label: "Daily Brief confidence", claims: [high, low] }]);
  });

  it("both models present: renders as two separate labeled groups, never one flattened/ranked list, and citedClaims is just their concatenation", () => {
    const highConfidence = makeClaim({ id: "high:1", confidence: { kind: "level", level: "high", rationale: "r", evidenceCount: 2 } });
    const highScore = makeClaim({ id: "score:1", origin: "daily-brief", confidence: { kind: "score", value: 85 } });
    const response = askWorkspaceQuestion("strongestConfidence", makeView([highConfidence], [highScore]));
    expect(response.groups).toHaveLength(2);
    expect(response.groups?.[0]).toEqual({ label: "AI Intelligence confidence", claims: [highConfidence] });
    expect(response.groups?.[1]).toEqual({ label: "Daily Brief confidence", claims: [highScore] });
    expect(response.citedClaims).toEqual([highConfidence, highScore]);
    expect(response.summary).toContain("two separate groups");
  });

  it("no cross-model score, rank, or equivalence is ever calculated: a Daily Brief score of 40 is never compared against or ranked relative to an AI Intelligence level", () => {
    const mediumLevel = makeClaim({ id: "level:1", confidence: { kind: "level", level: "medium", rationale: "r", evidenceCount: 1 } });
    const lowScore = makeClaim({ id: "score:1", origin: "daily-brief", confidence: { kind: "score", value: 10 } });
    const response = askWorkspaceQuestion("strongestConfidence", makeView([mediumLevel], [lowScore]));
    // Neither claim qualifies for its own group (medium is below the high/very-high bar; no floor filters Daily Brief scores) — so a genuinely low Daily Brief score still surfaces in its own group, honestly, never compared against the AI Intelligence claim it excluded.
    expect(response.groups).toEqual([{ label: "Daily Brief confidence", claims: [lowScore] }]);
  });

  it("a claim with null confidence is never included and never assigned a fabricated value", () => {
    const noConfidence = makeClaim({ id: "none:1", confidence: null });
    const response = askWorkspaceQuestion("strongestConfidence", makeView([noConfidence], []));
    expect(response.citedClaims).toEqual([]);
    expect(response.groups).toBeUndefined();
  });

  it("only the AI Intelligence group has data: shows only that group, with accurate wording naming it", () => {
    const highConfidence = makeClaim({ id: "high:1", confidence: { kind: "level", level: "high", rationale: "r", evidenceCount: 2 } });
    const response = askWorkspaceQuestion("strongestConfidence", makeView([highConfidence], []));
    expect(response.groups).toEqual([{ label: "AI Intelligence confidence", claims: [highConfidence] }]);
    expect(response.summary).toContain("AI Intelligence confidence");
    expect(response.summary).not.toContain("Daily Brief confidence findings currently qualify");
  });

  it("only the Daily Brief group has data: shows only that group, with accurate wording naming it", () => {
    const scored = makeClaim({ id: "score:1", origin: "daily-brief", confidence: { kind: "score", value: 77 } });
    const response = askWorkspaceQuestion("strongestConfidence", makeView([], [scored]));
    expect(response.groups).toEqual([{ label: "Daily Brief confidence", claims: [scored] }]);
    expect(response.summary).toContain("Daily Brief confidence");
  });

  it("missing data from both models: the honest unavailable answer, no groups", () => {
    const response = askWorkspaceQuestion("strongestConfidence", EMPTY_VIEW);
    expect(response.citedClaims).toEqual([]);
    expect(response.groups).toBeUndefined();
    expect(response.summary).toContain("No findings currently carry a confidence value");
  });
});

describe("evidenceToReviewFirst — only claims with real, non-empty evidence, never a Daily Brief claim (which always has none)", () => {
  it("cites AI Intelligence claims that carry real evidence", () => {
    const withEvidence = makeClaim({ id: "ev:1", evidence: [{ id: "sig:1", label: "Liquidity Signal", detail: "detail", occurredAt: null, sourceLabel: "DefiLlama" }] });
    const withoutEvidence = makeClaim({ id: "no-ev:1", evidence: [] });
    const response = askWorkspaceQuestion("evidenceToReviewFirst", makeView([withEvidence, withoutEvidence], []));
    expect(response.citedClaims).toEqual([withEvidence]);
    expect(response.summary).toContain("1 cited evidence item");
  });

  it("a Daily Brief claim is never cited here even if it somehow carried an evidence array — this question only trusts AI Intelligence's guaranteed-evidence invariant", () => {
    const briefWithEvidence = makeClaim({ id: "brief:1", origin: "daily-brief", evidence: [{ id: "sig:1", label: "x", detail: "y", occurredAt: null, sourceLabel: null }] });
    const response = askWorkspaceQuestion("evidenceToReviewFirst", makeView([], [briefWithEvidence]));
    expect(response.citedClaims).toEqual([]);
  });

  it("missing data: an honest unavailable answer naming the real reason", () => {
    const response = askWorkspaceQuestion("evidenceToReviewFirst", EMPTY_VIEW);
    expect(response.citedClaims).toEqual([]);
    expect(response.summary).toContain("no cited evidence to review yet");
  });
});

describe("no answer fabricates confidence, source, evidence, or freshness", () => {
  it("every cited claim is the exact same object reference from the input view — never cloned, re-derived, or mutated", () => {
    const claim = makeClaim({ id: "identity:1" });
    const view = makeView([claim], []);
    const response = askWorkspaceQuestion("importantFindings", view);
    expect(response.citedClaims[0]).toBe(claim);
  });
});
