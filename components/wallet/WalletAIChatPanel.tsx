"use client";

import { AlertTriangle, Bot, Download, Sparkles, Trash2, User, Wallet } from "lucide-react";

import { cn, downloadTextFile } from "@/lib/utils";
import type { UseAIChatResult } from "@/lib/hooks/useAIChat";
import { buildChatTranscriptFilename, buildChatTranscriptMarkdown } from "@/lib/ai-chat/export";
import { GLASS_CARD_SURFACE } from "@/components/ui/glassStyles";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * V4-AI-CHAT-001 (Phase 6) — the AI Chat panel. Conversation only: no
 * markdown editor, no free-text input anywhere in this file — every
 * message the user "sends" is a click on one of `suggestedQuestions`
 * (structured prompts in, structured `AIChatResponse` out). This is NOT an
 * LLM chat UI; it deliberately looks like one (question/answer bubbles) so
 * the interaction is familiar, while every answer underneath is a
 * deterministic lookup — see `lib/ai-chat/engine.ts`.
 *
 * Bug fix — this panel used to collapse every "no data" reason into one
 * generic "Connect a wallet" message, which was actively WRONG for a
 * connected wallet whose holdings were merely still loading, had errored,
 * or genuinely had no holdings — telling an already-connected user to
 * "connect a wallet" makes no sense and was the second half of the
 * observed bug (`useAIChat.ts`'s own doc comment covers the first half).
 * `walletStatus`, when supplied by the caller (only `/dashboard/wallet`
 * has the real connection/loading/error facts to supply it), selects the
 * PRECISE reason. Omitted entirely (or `"ready"`), this falls back to the
 * original `chat.hasData` check — unchanged for any caller that doesn't
 * pass it.
 */

export type AIChatWalletStatus = { kind: "disconnected" } | { kind: "loading" } | { kind: "error"; message: string } | { kind: "no-holdings" } | { kind: "ready" };

const STATUS_EMPTY_STATE: Record<Exclude<AIChatWalletStatus["kind"], "ready">, { icon: typeof Bot; title: string; description: string }> = {
  disconnected: { icon: Bot, title: "No wallet data yet", description: "Connect a wallet to ask questions about your portfolio." },
  loading: { icon: Wallet, title: "Loading your wallet data…", description: "AI Chat will be ready as soon as your holdings finish loading." },
  error: { icon: AlertTriangle, title: "Couldn't load wallet data", description: "" },
  "no-holdings": { icon: Wallet, title: "No holdings to analyze", description: "This wallet has no ETH or tokens on Base yet — nothing for AI Chat to summarize." },
};

function SectionCard({ title, icon, children, className }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 p-6", GLASS_CARD_SURFACE, className)}>
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold text-radar-light-text dark:text-radar-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function WalletAIChatPanel({ chat, walletStatus, className }: { chat: UseAIChatResult; walletStatus?: AIChatWalletStatus; className?: string }) {
  if (walletStatus && walletStatus.kind !== "ready") {
    const { icon, title, description } = STATUS_EMPTY_STATE[walletStatus.kind];
    return (
      <SectionCard title="Ask AI About Your Wallet" icon={<Bot className="size-4 text-radar-purple" aria-hidden="true" />} className={className}>
        <EmptyState icon={icon} title={title} description={walletStatus.kind === "error" ? walletStatus.message : description} />
      </SectionCard>
    );
  }

  if (!chat.hasData) {
    return (
      <SectionCard title="Ask AI About Your Wallet" icon={<Bot className="size-4 text-radar-purple" aria-hidden="true" />} className={className}>
        <EmptyState icon={Bot} title="No wallet data yet" description="Connect a wallet to ask questions about your portfolio." />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Ask AI About Your Wallet" icon={<Bot className="size-4 text-radar-purple" aria-hidden="true" />} className={className}>
      {chat.turns.length === 0 ? (
        <p className="text-xs text-radar-light-muted dark:text-radar-muted">Pick a question below to get started — every answer is built directly from your real portfolio data.</p>
      ) : (
        <div className="flex flex-col gap-4" role="log" aria-label="Conversation">
          {chat.turns.map((turn, i) => (
            <div key={`${turn.response.questionId}-${turn.askedAt}-${i}`} className="flex flex-col gap-2">
              <div className="flex items-start justify-end gap-2">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-radar-primary/10 px-3 py-2 text-xs font-medium text-radar-light-text dark:bg-radar-accent/10 dark:text-radar-white">{turn.response.question}</div>
                <User className="mt-1 size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
              </div>
              <div className="flex items-start gap-2">
                <Bot className="mt-1 size-4 shrink-0 text-radar-purple" aria-hidden="true" />
                <div className="flex max-w-[85%] flex-col gap-1.5 rounded-2xl rounded-tl-sm bg-radar-light-surface px-3 py-2 text-xs dark:bg-white/5">
                  <p className="text-radar-light-text dark:text-radar-white">{turn.response.answer}</p>
                  {turn.response.facts.length > 0 && (
                    <ul className="flex flex-col gap-0.5 border-t border-radar-light-border pt-1.5 dark:border-white/10">
                      {turn.response.facts.map((fact) => (
                        <li key={fact.label} className="flex justify-between gap-2 text-[10.5px] text-radar-light-muted dark:text-radar-muted">
                          <span className="font-medium">{fact.label}</span>
                          <span className="text-right">{fact.value}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {turn.response.sources.length > 0 && (
                    <p className="text-[10px] text-radar-light-muted/70 dark:text-radar-muted/70">Source: {turn.response.sources.join(", ")}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {chat.suggestedQuestions.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-radar-light-border pt-3 dark:border-white/10">
          <span className="flex items-center gap-1 text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">
            <Sparkles className="size-3 shrink-0" aria-hidden="true" />
            Suggested Questions
          </span>
          <div className="flex flex-wrap gap-1.5">
            {chat.suggestedQuestions.map((question) => (
              <button
                key={question.id}
                type="button"
                onClick={() => chat.ask(question.id)}
                className="rounded-full border border-radar-light-border px-2.5 py-1 text-[11px] font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
              >
                {question.prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {chat.turns.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const generatedAt = new Date().toISOString();
              downloadTextFile(buildChatTranscriptFilename(generatedAt), buildChatTranscriptMarkdown(chat.turns, generatedAt), "text/markdown");
            }}
            className="flex items-center gap-1.5 self-start text-[10.5px] font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:text-radar-accent"
          >
            <Download className="size-3 shrink-0" aria-hidden="true" />
            Export Conversation
          </button>
          <button
            type="button"
            onClick={chat.clearConversation}
            className="flex items-center gap-1.5 self-start text-[10.5px] font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-danger focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted"
          >
            <Trash2 className="size-3 shrink-0" aria-hidden="true" />
            Clear Conversation
          </button>
        </div>
      )}
    </SectionCard>
  );
}
