"use client";

import { Target } from "lucide-react";

import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { ProjectSignalRow } from "@/components/brief/ProjectSignalRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { buildTopOpportunities } from "@/lib/brief/sections";
import { useEcosystemIntelligenceAlerts } from "@/lib/hooks/useEcosystemIntelligenceAlerts";
import type { ProjectLogoEntry } from "@/lib/branding/resolveProjectLogos";

/**
 * PR-085.02 — the ecosystem-wide counterpart to `BriefWidget`'s Watchlist-
 * scoped Opportunities section: same `buildTopOpportunities()` pure builder
 * (`lib/brief/sections.ts`), fed `useEcosystemIntelligenceAlerts()` (every
 * registry project, not just watched ones) instead of `useIntelligenceAlerts()`.
 * No new scoring, no new narrative classification — one different input
 * array into the exact same, already-shipped function.
 */
export function EcosystemOpportunitiesWidget({ logoMap }: { logoMap: Record<string, ProjectLogoEntry> }) {
  const alerts = useEcosystemIntelligenceAlerts();
  const opportunities = buildTopOpportunities(alerts);

  return (
    <WidgetCard icon={<Target className="size-5" aria-hidden="true" />} title="Opportunities" subtitle="Ecosystem-wide, not just your Watchlist" accent="success">
      {opportunities.length === 0 ? (
        <EmptyState icon={Target} title="No opportunity signals right now" description="Real signals appear here once the ecosystem alert feed resolves." />
      ) : (
        <ul className="flex flex-col gap-3">
          {opportunities.map((opportunity) => (
            <ProjectSignalRow key={opportunity.projectId} signal={opportunity} logoMap={logoMap} />
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
