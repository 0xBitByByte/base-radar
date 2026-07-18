/**
 * Stage 6 of the pipeline — deterministic prose generation. Every function
 * here is a template filled in with real, already-computed values (a real
 * project name, real signal labels, real counts) — the "sounds like AI"
 * effect comes from varying the template by the real detected narrative,
 * never from an LLM call. Matches the same "real data in, plain-English
 * text out" rule `lib/intelligence/report.ts`'s thesis-building already
 * follows.
 */

import type { IntelligenceSignal, NarrativeType } from "@/lib/alerts/intelligence/types";

const NARRATIVE_HEADLINE: Record<NarrativeType, (projectName: string) => string> = {
  growth: (name) => `${name} appears to be entering a growth cycle`,
  decline: (name) => `${name} is showing signs of a slowdown`,
  "governance-active": (name) => `${name}'s governance is active right now`,
  "security-risk": (name) => `${name} has a security-relevant event to review`,
  accumulation: (name) => `${name} is seeing notable on-chain accumulation`,
  "development-active": (name) => `${name}'s development activity has picked up`,
  stable: (name) => `${name} is holding steady`,
};

/** Comma-joined with "and" before the last item — the one place this codebase already does this (`lib/intelligence/report.ts`'s clause assembly) reused here, not reinvented. */
function joinWithAnd(items: string[]): string {
  if (items.length === 0) return "no notable signals";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function describeSignals(signals: IntelligenceSignal[]): string {
  const labels = Array.from(new Set(signals.map((signal) => signal.label.toLowerCase())));
  return joinWithAnd(labels);
}

export function buildHeadline(projectName: string, narrative: NarrativeType): string {
  return NARRATIVE_HEADLINE[narrative](projectName);
}

/** One sentence: the headline plus what real signals drove it — the exact shape the PR brief's own worked example follows ("...driven by increasing TVL, governance participation and development activity"). */
export function buildSummary(projectName: string, narrative: NarrativeType, signals: IntelligenceSignal[]): string {
  const headline = buildHeadline(projectName, narrative);
  if (signals.length === 0) return `${headline}.`;
  return `${headline}, driven by ${describeSignals(signals)}.`;
}

/** A short, factual justification — real counts only, never a fabricated rationale. */
export function buildReasoning(signals: IntelligenceSignal[]): string {
  if (signals.length === 0) return "No scoreable signals were found in the current alert window.";
  const distinctCategories = new Set(signals.map((signal) => signal.category)).size;
  return `${signals.length} real signal${signals.length === 1 ? "" : "s"} across ${distinctCategories} categor${distinctCategories === 1 ? "y" : "ies"} in the current alert window.`;
}
