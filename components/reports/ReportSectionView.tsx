import { BookOpenCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ReportSection } from "@/lib/executive-reports/types";
import { EvidenceClaimCard } from "@/components/ai-workspace/EvidenceClaimCard";
import { SmartCollectionMatchRow } from "@/components/collections/SmartCollectionMatchRow";
import { GLASS_TILE_SURFACE } from "@/components/ui/glassStyles";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * PR-090.05 (AI Executive Reports) — one report section. Renders `claims`
 * via the exact same `EvidenceClaimCard` AI Workspace uses, and
 * `collectionMatches` via the exact same `SmartCollectionMatchRow` Smart
 * Collections uses — never a second evidence design for either. `metrics`
 * (plain real statistics with no per-item evidence) get a small labeled
 * grid, the one genuinely new — but trivial — presentation this feature
 * adds.
 */
export function ReportSectionView({ section }: { section: ReportSection }) {
  const isEmpty = section.claims.length === 0 && section.collectionMatches.length === 0 && section.metrics.length === 0;

  return (
    <section aria-labelledby={`${section.id}-heading`} className="flex flex-col gap-3">
      <div>
        <h3 id={`${section.id}-heading`} className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
          {section.title}
        </h3>
        <p className="mt-0.5 text-xs text-radar-light-muted dark:text-radar-muted">{section.description}</p>
      </div>

      {isEmpty ? (
        <EmptyState icon={BookOpenCheck} title="Nothing here yet." description={section.emptyReason} />
      ) : (
        <div className="flex flex-col gap-3">
          {section.metrics.length > 0 && (
            <dl className={cn("grid grid-cols-2 gap-3 p-3 sm:grid-cols-3", GLASS_TILE_SURFACE)}>
              {section.metrics.map((metric) => (
                <div key={metric.label} className="flex flex-col gap-0.5">
                  <dt className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">{metric.label}</dt>
                  <dd className="text-sm font-semibold text-radar-light-text dark:text-radar-white">{metric.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {section.claims.length > 0 && (
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2" aria-label={`${section.title} findings`}>
              {section.claims.map((claim) => (
                <EvidenceClaimCard key={claim.id} claim={claim} />
              ))}
            </ul>
          )}

          {section.collectionMatches.length > 0 && (
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2" aria-label={`${section.title} projects`}>
              {section.collectionMatches.map((match) => (
                <SmartCollectionMatchRow key={match.projectId} match={match} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
