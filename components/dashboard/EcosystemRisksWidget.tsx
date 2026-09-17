"use client";

import { ShieldAlert } from "lucide-react";

import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { ProjectSignalRow } from "@/components/brief/ProjectSignalRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { buildTopRisks } from "@/lib/brief/sections";
import { useEcosystemIntelligenceAlerts } from "@/lib/hooks/useEcosystemIntelligenceAlerts";
import type { ProjectLogoEntry } from "@/lib/branding/resolveProjectLogos";

/**
 * PR-085.02 — the ecosystem-wide "Risks" panel, and the first "Risks"
 * section this pipeline has ever had at ANY scope (`lib/brief/sections.ts`
 * previously had `buildSecurityHighlights()` — `security-risk` only — but
 * no counterpart for the broader `decline` narrative). Reuses the new
 * `buildTopRisks()` fed by `useEcosystemIntelligenceAlerts()`, the same
 * ecosystem-wide alert set `EcosystemOpportunitiesWidget` reads — one
 * shared client-side store, two different narrative-filtered views of it.
 */
export function EcosystemRisksWidget({ logoMap }: { logoMap: Record<string, ProjectLogoEntry> }) {
  const alerts = useEcosystemIntelligenceAlerts();
  const risks = buildTopRisks(alerts);

  return (
    <WidgetCard icon={<ShieldAlert className="size-5" aria-hidden="true" />} title="Risks" subtitle="Ecosystem-wide, not just your Watchlist" accent="danger">
      {risks.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No risk signals right now" description="Real signals appear here once the ecosystem alert feed resolves." />
      ) : (
        <ul className="flex flex-col gap-3">
          {risks.map((risk) => (
            <ProjectSignalRow key={risk.projectId} signal={risk} logoMap={logoMap} />
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
