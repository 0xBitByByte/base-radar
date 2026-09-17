import { describe, expect, it } from "vitest";

import { buildChatTranscriptFilename, buildChatTranscriptMarkdown } from "@/lib/ai-chat/export";
import type { ConversationTurn } from "@/lib/hooks/useAIChat";

function turn(overrides: Partial<ConversationTurn["response"]> & { askedAt: string }): ConversationTurn {
  const { askedAt, ...responseOverrides } = overrides;
  return {
    askedAt,
    response: { questionId: "healthChange", question: "Why did my Health change?", answered: true, answer: "Health score moved from 40 to 70.", facts: [], sources: [], ...responseOverrides },
  };
}

describe("buildChatTranscriptMarkdown", () => {
  it("EMPTY CONVERSATION: a real, honest transcript with no turns, never a crash", () => {
    const md = buildChatTranscriptMarkdown([], "2026-09-06T12:00:00.000Z");
    expect(md).toContain("Base Radar — Wallet AI Chat Transcript");
    expect(md).toContain("No questions were asked");
  });

  it("renders a real turn's exact question and answer, verbatim", () => {
    const md = buildChatTranscriptMarkdown([turn({ askedAt: "2026-09-06T12:00:00.000Z" })], "2026-09-06T12:05:00.000Z");
    expect(md).toContain("## Why did my Health change?");
    expect(md).toContain("Health score moved from 40 to 70.");
  });

  it("renders real facts as a bullet list, only when facts exist", () => {
    const md = buildChatTranscriptMarkdown([turn({ askedAt: "2026-09-06T12:00:00.000Z", facts: [{ label: "Health Trend", value: "Improving" }] })]);
    expect(md).toContain("- **Health Trend:** Improving");
  });

  it("omits the facts section entirely when there are none", () => {
    const md = buildChatTranscriptMarkdown([turn({ askedAt: "2026-09-06T12:00:00.000Z", facts: [] })]);
    expect(md).not.toContain("**");
  });

  it("renders real sources when present", () => {
    const md = buildChatTranscriptMarkdown([turn({ askedAt: "2026-09-06T12:00:00.000Z", sources: ["Wallet Analytics — Trends"] })]);
    expect(md).toContain("Wallet Analytics — Trends");
  });

  it("multiple turns render in the real order given, oldest first", () => {
    const t1 = turn({ askedAt: "2026-09-06T12:00:00.000Z", question: "First question?" });
    const t2 = turn({ askedAt: "2026-09-06T12:01:00.000Z", question: "Second question?" });
    const md = buildChatTranscriptMarkdown([t1, t2]);
    expect(md.indexOf("First question?")).toBeLessThan(md.indexOf("Second question?"));
  });

  it("DETERMINISM: identical turns produce an identical transcript", () => {
    const turns = [turn({ askedAt: "2026-09-06T12:00:00.000Z" })];
    expect(buildChatTranscriptMarkdown(turns, "2026-09-06T12:05:00.000Z")).toBe(buildChatTranscriptMarkdown(turns, "2026-09-06T12:05:00.000Z"));
  });
});

describe("buildChatTranscriptFilename", () => {
  it("is deterministic for the same real timestamp, down to the minute", () => {
    expect(buildChatTranscriptFilename("2026-09-06T12:05:00.000Z")).toBe(buildChatTranscriptFilename("2026-09-06T12:05:00.000Z"));
  });

  it("ends in .md", () => {
    expect(buildChatTranscriptFilename("2026-09-06T12:05:00.000Z")).toMatch(/\.md$/);
  });
});
