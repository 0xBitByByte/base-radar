"use client";

/**
 * PR-090.05 (AI Executive Reports) — the one hook the report UI reads
 * through. Builds the exact same `WorkspaceView` AI Workspace itself
 * renders (`buildWorkspaceView()`, unchanged) and reuses `useSmartCollections()`
 * verbatim for the Smart-Collections-derived sections — never a second
 * data path for either. Gated by the same hard stale-data check
 * `useAIWatch`/`useSmartCollections` already established
 * (`useAlertRefreshStatus()`): every report reports `"checking"`/
 * `"unavailable"` with zero sections while that status isn't `"ready"`,
 * never a fabricated result over stale/absent data.
 */

import { useMemo } from "react";

import { useAlertRefreshStatus } from "@/lib/hooks/useAlertRefreshStatus";
import { useDailyBrief } from "@/lib/hooks/useDailyBrief";
import { useSmartCollections } from "@/lib/hooks/useSmartCollections";
import { buildWorkspaceView } from "@/lib/ai-workspace/compose";
import { buildAllExecutiveReports, buildUnavailableReport } from "@/lib/executive-reports/compose";
import { REPORT_TYPES } from "@/lib/executive-reports/types";
import type { ExecutiveReport, ReportStatus } from "@/lib/executive-reports/types";
import type { DailyIntelligenceBriefing } from "@/lib/ai-intelligence/generator/briefing";
import type { SmartCollectionResult } from "@/lib/smart-collections/types";

export function useExecutiveReports(initialBriefing: DailyIntelligenceBriefing | null, serverSmartCollections: SmartCollectionResult[]): ExecutiveReport[] {
  const dailyBrief = useDailyBrief();
  const alertRefreshStatus = useAlertRefreshStatus();
  const smartCollections = useSmartCollections(serverSmartCollections);

  const status: ReportStatus = alertRefreshStatus === "ready" ? "ready" : alertRefreshStatus === "loading" ? "checking" : "unavailable";

  const workspaceView = useMemo(() => buildWorkspaceView(initialBriefing, dailyBrief), [initialBriefing, dailyBrief]);

  return useMemo(() => {
    const generatedAt = new Date().toISOString();
    if (status !== "ready") return REPORT_TYPES.map((id) => buildUnavailableReport(id, status, generatedAt));
    return buildAllExecutiveReports({ workspaceView, dailyBrief, smartCollections }, generatedAt);
  }, [status, workspaceView, dailyBrief, smartCollections]);
}
