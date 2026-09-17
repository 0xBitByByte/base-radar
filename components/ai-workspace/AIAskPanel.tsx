"use client";

import { Bot, Sparkles, Trash2, User } from "lucide-react";

import { cn } from "@/lib/utils";
import type { UseAIWorkspaceAskResult } from "@/lib/hooks/useAIWorkspaceAsk";
import { EvidenceClaimCard } from "@/components/ai-workspace/EvidenceClaimCard";
import { GLASS_CARD_SURFACE } from "@/components/ui/glassStyles";

/**
 * PR-090.02 (AI Ask) — deliberately looks like a chat UI (question/answer
 * bubbles) for a familiar interaction, while every answer underneath is a
 * deterministic lookup over the AI Workspace's own already-composed
 * `WorkspaceView` (see `lib/ai-workspace/ask/engine.ts`). No free-text
 * input anywhere in this file — every "message" is a click on one of the
 * six fixed `ask.questions`. Cited claims render via the exact same
 * `EvidenceClaimCard` the sections above use, so an AI Ask answer can never
 * show evidence/sources/confidence/limitations that look or behave
 * differently from the rest of the workspace.
 */
export function AIAskPanel({ ask, className }: { ask: UseAIWorkspaceAskResult; className?: string }) {
  return (
    <section aria-labelledby="ai-ask-heading" className={cn("flex flex-col gap-4 p-6", GLASS_CARD_SURFACE, className)}>
      <div>
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-radar-purple" aria-hidden="true" />
          <h2 id="ai-ask-heading" className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
            AI Ask
          </h2>
        </div>
        <p className="mt-0.5 text-xs text-radar-light-muted dark:text-radar-muted">
          Deterministic, evidence-based answers built from the findings above — not a live chat assistant. Pick a question to get started.
        </p>
      </div>

      {ask.turns.length > 0 && (
        <div className="flex flex-col gap-4" role="log" aria-label="AI Ask conversation">
          {ask.turns.map((turn, i) => (
            <div key={`${turn.response.questionId}-${turn.askedAt}-${i}`} className="flex flex-col gap-2">
              <div className="flex items-start justify-end gap-2">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-radar-primary/10 px-3 py-2 text-xs font-medium text-radar-light-text dark:bg-radar-accent/10 dark:text-radar-white">
                  {turn.response.question}
                </div>
                <User className="mt-1 size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
              </div>
              <div className="flex items-start gap-2">
                <Bot className="mt-1 size-4 shrink-0 text-radar-purple" aria-hidden="true" />
                <div className="flex max-w-[92%] flex-col gap-2">
                  <div className="rounded-2xl rounded-tl-sm bg-radar-light-surface px-3 py-2 text-xs text-radar-light-text dark:bg-white/5 dark:text-radar-white">{turn.response.summary}</div>
                  {turn.response.groups && turn.response.groups.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {turn.response.groups.map((group) => (
                        <div key={group.label} className="flex flex-col gap-1.5">
                          <span className="text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">{group.label}</span>
                          <ul className="flex flex-col gap-2">
                            {group.claims.map((claim) => (
                              <EvidenceClaimCard key={claim.id} claim={claim} />
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    turn.response.citedClaims.length > 0 && (
                      <ul className="flex flex-col gap-2">
                        {turn.response.citedClaims.map((claim) => (
                          <EvidenceClaimCard key={claim.id} claim={claim} />
                        ))}
                      </ul>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5 border-t border-radar-light-border pt-3 dark:border-white/10">
        <span className="flex items-center gap-1 text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">
          <Sparkles className="size-3 shrink-0" aria-hidden="true" />
          Ask a Question
        </span>
        <div className="flex flex-wrap gap-1.5">
          {ask.questions.map((question) => (
            <button
              key={question.id}
              type="button"
              onClick={() => ask.ask(question.id)}
              className="rounded-full border border-radar-light-border px-2.5 py-1 text-[11px] font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
            >
              {question.prompt}
            </button>
          ))}
        </div>
      </div>

      {ask.turns.length > 0 && (
        <button
          type="button"
          onClick={ask.clearConversation}
          className="flex items-center gap-1.5 self-start text-[10.5px] font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-danger focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted"
        >
          <Trash2 className="size-3 shrink-0" aria-hidden="true" />
          Clear Conversation
        </button>
      )}
    </section>
  );
}
