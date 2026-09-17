/**
 * V4-FUTURE-002 (Feature 6 — Guided Portfolio Review) — domain types. This
 * feature never stores portfolio data of its own: `ReviewState` persists
 * ONLY review progress metadata (which step, when it started, when it
 * finished) — every step's actual content is read live, at render time,
 * from the same already-built objects every other Wallet surface reads
 * from (`PortfolioIntelligence`, `PortfolioAI`, `WalletAnalytics`, etc.).
 */

export type ReviewStepId = "health" | "risk" | "diversification" | "automation" | "analytics" | "history" | "recommendations" | "summary";

export type ReviewStepMeta = {
  id: ReviewStepId;
  title: string;
  description: string;
};

export type ReviewState = {
  currentStepIndex: number;
  /** Real fact only — a step the user has actually visited via Next/Jump/Finish, never inferred. */
  completedStepIds: ReviewStepId[];
  /** Set the first time the review is opened or resumed after being reset; `null` before the user has ever started one. */
  startedAt: string | null;
  /** Set only when the user reaches Summary and explicitly finishes; `null` for an in-progress or never-started review. */
  completedAt: string | null;
};
