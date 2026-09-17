/**
 * V4-AI-CHAT-001 — the fixed catalog of 14 questions this engine answers,
 * verbatim from the brief. `sources` names which real modules back each
 * answer — shown in the panel so it's never ambiguous that this is
 * structured data lookup, not free-form reasoning.
 */

import type { AIChatQuestion, AIChatQuestionId } from "@/lib/ai-chat/types";

export const AI_CHAT_QUESTIONS: Record<AIChatQuestionId, AIChatQuestion> = {
  healthChange: { id: "healthChange", prompt: "Why did my Health change?", sources: ["Wallet Analytics — Trends", "Portfolio Intelligence — Health Breakdown"] },
  confidenceLow: { id: "confidenceLow", prompt: "Why is my Confidence low?", sources: ["Portfolio Intelligence — Confidence"] },
  biggestRisk: { id: "biggestRisk", prompt: "What is my biggest risk?", sources: ["Portfolio AI — Insights", "Portfolio Intelligence — Warnings"] },
  diversification: { id: "diversification", prompt: "How diversified am I?", sources: ["Portfolio Intelligence — Quality & Allocation"] },
  recentChanges: { id: "recentChanges", prompt: "What changed recently?", sources: ["Wallet Analytics — Timeline"] },
  whatImproved: { id: "whatImproved", prompt: "What improved?", sources: ["Wallet Analytics — Evolution & Trends"] },
  whatWorsened: { id: "whatWorsened", prompt: "What became worse?", sources: ["Wallet Analytics — Evolution & Trends"] },
  largestHolding: { id: "largestHolding", prompt: "What is my largest holding?", sources: ["Portfolio Intelligence — Largest Holding"] },
  fingerprintChange: { id: "fingerprintChange", prompt: "Why did my fingerprint change?", sources: ["Wallet History", "Portfolio Intelligence — Fingerprint"] },
  improveFirst: { id: "improveFirst", prompt: "What should I improve first?", sources: ["Portfolio AI — Overview"] },
  thisMonth: { id: "thisMonth", prompt: "What happened this month?", sources: ["Historical Reports — Last 30 Days"] },
  portfolioEvolution: { id: "portfolioEvolution", prompt: "How has my portfolio evolved?", sources: ["Wallet Analytics — Evolution", "Milestones & Personal Bests"] },
  topRecommendation: { id: "topRecommendation", prompt: "Which recommendation matters most?", sources: ["Portfolio AI — Actions"] },
  automationTriggered: { id: "automationTriggered", prompt: "Why was an automation triggered?", sources: ["Wallet Automation — Results"] },
};
