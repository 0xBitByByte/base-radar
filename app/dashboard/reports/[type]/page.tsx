import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCurrentDailyIntelligenceBriefing, getRawWhaleEvents } from "@/lib/data/aggregate";
import { getLiveProjects } from "@/lib/projects/service";
import { evaluateServerCollections } from "@/lib/smart-collections/aggregate";
import { REPORT_TYPES, type ReportType } from "@/lib/executive-reports/types";
import { ReportDetailView } from "@/components/reports/ReportDetailView";

type ReportPageProps = { params: Promise<{ type: string }> };

function isReportType(type: string): type is ReportType {
  return (REPORT_TYPES as readonly string[]).includes(type);
}

const REPORT_TITLES: Record<ReportType, string> = {
  "daily-brief": "Daily Brief",
  weekly: "Weekly Report",
  monthly: "Monthly Report",
  "market-outlook": "Market Outlook",
  ecosystem: "Ecosystem Report",
  opportunity: "Opportunity Report",
};

export async function generateMetadata({ params }: ReportPageProps): Promise<Metadata> {
  const { type } = await params;
  if (!isReportType(type)) return { title: "AI Executive Reports" };
  return { title: REPORT_TITLES[type] };
}

/** Same data-loading pattern as the index route (`../page.tsx`) and every existing `/dashboard/collections/[id]`-style dedicated route in this app — a dedicated route independently awaits the same real, `cache()`-wrapped sources rather than sharing in-memory state across requests. */
export default async function ExecutiveReportDetailPage({ params }: ReportPageProps) {
  const { type } = await params;
  if (!isReportType(type)) notFound();

  const [initialBriefing, liveProjects, whaleEvents] = await Promise.all([getCurrentDailyIntelligenceBriefing(), getLiveProjects(), getRawWhaleEvents()]);
  const serverSmartCollections = evaluateServerCollections(liveProjects, whaleEvents, new Date().toISOString());
  return <ReportDetailView reportType={type} initialBriefing={initialBriefing} serverSmartCollections={serverSmartCollections} />;
}
