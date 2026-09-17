import type { Metadata } from "next";

import { getCurrentDailyIntelligenceBriefing } from "@/lib/data/aggregate";
import { AIWorkspaceView } from "@/components/ai-workspace/AIWorkspaceView";

export const metadata: Metadata = {
  title: "AI Workspace",
  description: "A read-only evidence dashboard for what Base Radar currently believes about the Base ecosystem, and why.",
};

/**
 * PR-090.01 (AI Workspace — Evidence Dashboard). Awaits
 * `getCurrentDailyIntelligenceBriefing()` — the SAME `cache()`-wrapped
 * call `app/dashboard/projects/[slug]/ai/page.tsx` already makes (via
 * `getProjectAIIntelligence()`) — exactly once, server-side, then hands it
 * to a Client Component. No new provider call, no new generation run; a
 * second render of the same request-scoped cached value.
 */
export default async function AIWorkspacePage() {
  const briefing = await getCurrentDailyIntelligenceBriefing();
  return <AIWorkspaceView initialBriefing={briefing} />;
}
