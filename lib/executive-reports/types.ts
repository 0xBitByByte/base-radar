/**
 * PR-090.05 (AI Executive Reports) — the shared report model every one of
 * the six report surfaces uses. Deliberately reuses `WorkspaceClaim`
 * (`lib/ai-workspace/types.ts`) for every evidence-backed finding — a
 * report never invents a second evidence/source/confidence/limitation
 * shape, and every claim it cites renders through the exact same
 * `EvidenceClaimCard` AI Workspace already uses. `SmartCollectionMatch`
 * (`lib/smart-collections/types.ts`) is reused the same way for sections
 * that draw on Smart Collections' own real criteria — never a second
 * "why this project qualifies" computation.
 */

import type { DailyBrief } from "@/lib/brief/types";
import type { SmartCollectionResult } from "@/lib/smart-collections/types";
import type { SmartCollectionMatch } from "@/lib/smart-collections/types";
import type { WorkspaceClaim, WorkspaceView } from "@/lib/ai-workspace/types";

/**
 * Every report builder's ONE input — the same already-composed
 * `WorkspaceView` AI Workspace itself renders, the same `DailyBrief`
 * `useDailyBrief()` already exposes, and the same merged 10-result array
 * `useSmartCollections()` already produces. No report recomputes any of
 * these; each just selects and regroups fields that already exist.
 */
export type ExecutiveReportInput = {
  workspaceView: WorkspaceView;
  dailyBrief: DailyBrief | null;
  smartCollections: SmartCollectionResult[];
};

export const REPORT_TYPES = ["daily-brief", "weekly", "monthly", "market-outlook", "ecosystem", "opportunity"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

/** A plain, real, already-computed statistic — never a claim needing evidence/sources of its own (e.g. "Average Confidence: 62%"). */
export type ReportMetric = { label: string; value: string };

/** A real, honest, explicitly-itemized gap — e.g. "no persisted historical intelligence" — never hidden, never silently worked around. */
export type ReportLimitation = { label: string; detail: string };

export type ReportSection = {
  id: string;
  title: string;
  description: string;
  /** Evidence-backed findings, reusing AI Workspace's own claim shape verbatim. */
  claims: WorkspaceClaim[];
  /** Real Smart Collections matches, reusing that engine's own evaluators verbatim — never a second "why it qualifies" computation. */
  collectionMatches: SmartCollectionMatch[];
  /** Plain real statistics with no per-item evidence of their own. */
  metrics: ReportMetric[];
  /** Shown only when `claims`, `collectionMatches`, and `metrics` are all empty — a real, specific reason, never a generic "nothing here." */
  emptyReason: string;
};

export type ReportStatus = "ready" | "checking" | "unavailable";

export type ExecutiveReport = {
  id: ReportType;
  title: string;
  /** One real sentence naming what this report is and what it draws from — e.g. "Generated from the latest available Base Radar intelligence." Never implies real-time monitoring or a scheduled run. */
  subtitle: string;
  /** `"checking"`/`"unavailable"` when this report depends on client-only Alert Engine data that hasn't loaded or failed — `sections` is always `[]` in either state, never a stale or fabricated result. */
  status: ReportStatus;
  generatedAt: string;
  /** A deterministic, template-composed paragraph — never invented, always describing the real sections below. Explicitly labeled as generated interpretation, not raw observation — see `AI_GENERATED_NOTICE` in `compose.ts`. */
  executiveSummary: string;
  sections: ReportSection[];
  /** Mean real confidence across every claim/match that carries one — `null` when nothing real exists to average. */
  averageConfidence: number | null;
  limitations: ReportLimitation[];
};
