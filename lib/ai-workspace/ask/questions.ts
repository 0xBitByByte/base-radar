/**
 * PR-090.02 (AI Ask) — the fixed question catalog. Six questions were
 * proposed for this slice; five map onto `WorkspaceClaim` fields exactly as
 * worded. `strongestOpportunities` is worded without "evidence-backed" —
 * the only real "Opportunity" tag in the workspace model is the Daily
 * Brief's own category label, and `composeOpportunityClaim()` (see
 * `lib/ai-workspace/compose.ts`) honestly gives those claims `evidence: []`
 * (per-signal evidence isn't retained at that tier). Keeping the word
 * "evidence-backed" in the prompt would have implied a guarantee this
 * engine cannot honor for that data; the answer itself still surfaces each
 * claim's real confidence score, sources, and limitation note.
 *
 * `strongestConfidence`'s prompt was corrected from "...the strongest
 * confidence?" to "...high confidence?" (PR-090.02 correction) — the
 * original wording implied one comparable ranking, but the real answer
 * spans two non-comparable confidence models (AI Intelligence's
 * categorical level, Daily Brief's numeric score) that this engine must
 * never merge or rank against each other. "High confidence" asks the same
 * real question without implying a single scale.
 */

import type { AskQuestion, AskQuestionId } from "@/lib/ai-workspace/ask/types";

export const ASK_QUESTIONS: Record<AskQuestionId, AskQuestion> = {
  importantFindings: { id: "importantFindings", prompt: "What are the most important findings right now?" },
  strongestOpportunities: { id: "strongestOpportunities", prompt: "Which projects have the strongest opportunities right now?" },
  topRisks: { id: "topRisks", prompt: "What are the highest-priority risks or concerns?" },
  recentChanges: { id: "recentChanges", prompt: "What changed recently?" },
  strongestConfidence: { id: "strongestConfidence", prompt: "Which findings have high confidence?" },
  evidenceToReviewFirst: { id: "evidenceToReviewFirst", prompt: "What evidence should I review first?" },
};
