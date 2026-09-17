import type { ReviewStepMeta } from "@/lib/guided-review/types";

/**
 * V4-FUTURE-002 (Feature 6) — the fixed 8-step order. Each step surfaces
 * information an existing Wallet section already computes and renders
 * elsewhere (`GuidedPortfolioReview.tsx` maps each id straight to that
 * existing component) — no step here implies a new calculation.
 */
export const REVIEW_STEPS: ReviewStepMeta[] = [
  { id: "health", title: "Current Health", description: "Your portfolio's overall health score and its real inputs." },
  { id: "risk", title: "Risk", description: "Concentration risk and the real factors behind your risk score." },
  { id: "diversification", title: "Diversification", description: "How your holdings are spread across assets and protocols." },
  { id: "automation", title: "Automation", description: "Your active wallet automation rules and their last real trigger." },
  { id: "analytics", title: "Analytics", description: "Real trends and the executive summary Analytics already built." },
  { id: "history", title: "History", description: "Your stored snapshot history, reports, digest, and story." },
  { id: "recommendations", title: "Recommendations", description: "Real, already-ranked recommendations — nothing re-ranked here." },
  { id: "summary", title: "Summary", description: "A recap of what this review covered." },
];

export function reviewStepIndex(id: ReviewStepMeta["id"]): number {
  return REVIEW_STEPS.findIndex((step) => step.id === id);
}
