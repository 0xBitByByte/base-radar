import { Check, Sparkles } from "lucide-react";

import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { VerificationLevelBadge } from "@/components/explorer/VerificationLevelBadge";
import { LifecycleBadge } from "@/components/explorer/LifecycleBadge";
import { formatLabel } from "@/components/explorer/format";
import { GlowBadge, type GlowBadgeColor } from "@/components/ui/GlowBadge";
import { formatRelativeTime } from "@/lib/data/format";
import { cn } from "@/lib/utils";
import type { DiscoverySource, RegistryLifecycleState, VerificationLevel } from "@/data/projects/enums";
import type { DashboardEvidenceSummaryItem, DashboardSourceAttribution } from "@/lib/ai-intelligence/dashboard-adapter";
import type { ProjectIntelligenceHighlight } from "@/lib/ai-intelligence/project-adapter";

type ProfileIntelligencePanelProps = {
  registry: {
    verificationLevel: VerificationLevel | undefined;
    lifecycleState: RegistryLifecycleState | undefined;
    discoverySource: DiscoverySource | undefined;
    qualityScore: number | undefined;
  };
  latest: ProjectIntelligenceHighlight | undefined;
  related: ProjectIntelligenceHighlight[];
  evidenceSummary: DashboardEvidenceSummaryItem[];
  sources: DashboardSourceAttribution[];
};

const IMPACT_COLOR: Record<ProjectIntelligenceHighlight["impact"], GlowBadgeColor> = {
  informational: "muted",
  moderate: "primary",
  significant: "warning",
  critical: "danger",
};

const CONFIDENCE_COLOR: Record<ProjectIntelligenceHighlight["confidenceLevel"], GlowBadgeColor> = {
  low: "muted",
  medium: "primary",
  high: "success",
  "very-high": "success",
};

/**
 * PR-043 — the Project Profile's window into PR-037's registry model and
 * PR-040/041's AI Intelligence Engine, fed by `getProjectAIIntelligence()`
 * (`lib/data/aggregate.ts`). Every sub-section below independently
 * disappears when its own data is absent — this whole panel renders
 * `null` when NEITHER real registry metadata NOR any real brief exists
 * for this project, which is the honest, current reality for every seed
 * project today (see docs/PROJECT_INTELLIGENCE_INTEGRATION.md). No
 * placeholder, no "No Intelligence" text, ever.
 */
export function ProfileIntelligencePanel({
  registry,
  latest,
  related,
  evidenceSummary,
  sources,
}: ProfileIntelligencePanelProps) {
  const hasRegistryMetadata =
    registry.verificationLevel !== undefined ||
    registry.lifecycleState !== undefined ||
    registry.discoverySource !== undefined ||
    registry.qualityScore !== undefined;

  if (!hasRegistryMetadata && !latest) return null;

  return (
    <ProfileSectionCard id="intelligence-panel" title="Project Intelligence" icon={Sparkles} className="gap-5">
      {hasRegistryMetadata && (
        <div className="flex flex-wrap items-center gap-2">
          <VerificationLevelBadge level={registry.verificationLevel} />
          <LifecycleBadge state={registry.lifecycleState} />
          {registry.discoverySource && (
            <GlowBadge color="muted">Discovered via {formatLabel(registry.discoverySource)}</GlowBadge>
          )}
          {registry.qualityScore !== undefined && (
            <GlowBadge color="muted">Quality Score {Math.round(registry.qualityScore)}/100</GlowBadge>
          )}
        </div>
      )}

      {latest && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
            Latest Intelligence
          </span>
          <p className="text-sm font-medium text-radar-light-text dark:text-radar-white">{latest.headline}</p>
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">{latest.summary}</p>
          <div className="flex flex-wrap items-center gap-2">
            <GlowBadge color={IMPACT_COLOR[latest.impact]}>{formatLabel(latest.impact)} impact</GlowBadge>
            <GlowBadge color={CONFIDENCE_COLOR[latest.confidenceLevel]}>
              {formatLabel(latest.confidenceLevel)} confidence
            </GlowBadge>
            <span className="text-[11px] text-radar-light-muted/70 dark:text-radar-muted/50">
              {formatRelativeTime(latest.timestamp)}
            </span>
          </div>
        </div>
      )}

      {evidenceSummary.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
            Supporting Evidence
          </span>
          <ul className="flex flex-col gap-1.5">
            {evidenceSummary.map((item) => (
              <li
                key={item.label}
                className="flex items-start gap-2.5 text-xs text-radar-light-muted dark:text-radar-muted"
              >
                <span
                  className="mt-1 size-1 shrink-0 rounded-full bg-radar-light-muted/60 dark:bg-radar-muted/60"
                  aria-hidden="true"
                />
                {item.count} {item.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {sources.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
            Sources
          </span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {sources.map((source) =>
              source.url ? (
                <a
                  key={source.name}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-radar-light-text underline-offset-2 hover:underline dark:text-radar-white"
                >
                  <Check className="size-3.5 shrink-0 text-radar-success" aria-hidden="true" />
                  {source.name}
                </a>
              ) : (
                <span
                  key={source.name}
                  className="flex items-center gap-1.5 text-xs text-radar-light-text dark:text-radar-white"
                >
                  <Check className="size-3.5 shrink-0 text-radar-success" aria-hidden="true" />
                  {source.name}
                </span>
              )
            )}
          </div>
        </div>
      )}

      {related.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
            Related Intelligence
          </span>
          <ul className="flex flex-col gap-2">
            {related.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border border-radar-light-border bg-radar-light-surface p-3",
                  "dark:border-white/10 dark:bg-white/[0.02]"
                )}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-radar-primary/10 text-radar-primary dark:text-radar-accent">
                  <Sparkles className="size-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-radar-light-text dark:text-radar-white">
                    {item.headline}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <GlowBadge color={IMPACT_COLOR[item.impact]} className="px-1.5 py-0.5 text-[9.5px]">
                      {formatLabel(item.impact)}
                    </GlowBadge>
                    <GlowBadge color={CONFIDENCE_COLOR[item.confidenceLevel]} className="px-1.5 py-0.5 text-[9.5px]">
                      {formatLabel(item.confidenceLevel)}
                    </GlowBadge>
                  </div>
                </div>
                <span className="shrink-0 text-[11px] text-radar-light-muted dark:text-radar-muted">
                  {formatRelativeTime(item.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ProfileSectionCard>
  );
}
