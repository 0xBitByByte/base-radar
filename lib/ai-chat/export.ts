/**
 * V4-FUTURE-001 (Chat Export) — pure text formatting over an already-real
 * conversation. Every line here is a direct read of an already-built
 * `AIChatResponse` (`question`/`answer`/`facts`/`sources`) — no question is
 * re-asked, no fact is recomputed. Mirrors the same "reshape already-real
 * data into a flat, exportable row" restraint `lib/wallet-analytics/export.ts`'s
 * `AnalyticsExportRow` already established for Analytics — this is that
 * same idea applied to a chat transcript instead of a metrics table.
 *
 * Markdown primitives (`mdHeading`/`mdBullet`/`mdItalic`/`formatExportedAtLine`)
 * are shared with `lib/report-export/` via `lib/export/markdown.ts` — see
 * that file's own doc comment for why it exists as its own module.
 */

import { EXPORT_DATE_FORMAT, exportFilenameStamp, formatExportedAtLine, mdBullet, mdHeading, mdItalic } from "@/lib/export/markdown";
import type { ConversationTurn } from "@/lib/hooks/useAIChat";

/** A real, deterministic Markdown transcript — same conversation in, same string out. `turns` is used in the order given (oldest first, matching how a real conversation reads top to bottom). */
export function buildChatTranscriptMarkdown(turns: ConversationTurn[], generatedAt: string = new Date().toISOString()): string {
  const lines: string[] = [mdHeading(1, "Base Radar — Wallet AI Chat Transcript"), "", formatExportedAtLine(generatedAt), ""];

  if (turns.length === 0) {
    lines.push(mdItalic("No questions were asked in this conversation."));
    return lines.join("\n");
  }

  for (const turn of turns) {
    const { response } = turn;
    lines.push(mdHeading(2, response.question), "", EXPORT_DATE_FORMAT.format(new Date(turn.askedAt)), "", response.answer, "");

    if (response.facts.length > 0) {
      for (const fact of response.facts) {
        lines.push(mdBullet(fact.label, fact.value));
      }
      lines.push("");
    }

    if (response.sources.length > 0) {
      lines.push(mdItalic(`Source: ${response.sources.join(", ")}`), "");
    }
  }

  return lines.join("\n").trimEnd() + "\n";
}

/** A real, deterministic filename — same conversation, same name (down to the minute), never a random suffix. */
export function buildChatTranscriptFilename(generatedAt: string = new Date().toISOString()): string {
  return `base-radar-wallet-chat-${exportFilenameStamp(generatedAt)}.md`;
}
