import Link from "next/link";
import { ExternalLink, Info, Link2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { GLASS_TILE_SURFACE } from "@/components/ui/glassStyles";
import { GlowBadge, type GlowBadgeColor } from "@/components/ui/GlowBadge";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { ConfidenceBar } from "@/components/alerts/ConfidenceBar";
import type { WorkspaceClaim } from "@/lib/ai-workspace/types";

/**
 * PR-090.01 (AI Workspace — Evidence Dashboard) — the one new presentation
 * component this slice adds. Built because no existing card
 * (`IntelligenceCard`, `ProjectOpportunityCard`, `ProjectHighlightCard`)
 * shows evidence, source attribution, and an honest limitation together —
 * each was built for its own denser, narrower context. Every value
 * rendered here is a direct read of an already-composed `WorkspaceClaim`
 * (see `lib/ai-workspace/compose.ts`) — no calculation happens in this
 * file. Reuses `GLASS_TILE_SURFACE`, `GlowBadge`, `RelativeTime`, and
 * `ConfidenceBar` verbatim rather than styling anything from scratch.
 */

const ORIGIN_LABEL: Record<WorkspaceClaim["origin"], string> = {
  "ai-intelligence": "AI Intelligence Engine",
  "daily-brief": "Daily Brief",
};

const ORIGIN_COLOR: Record<WorkspaceClaim["origin"], GlowBadgeColor> = {
  "ai-intelligence": "accent",
  "daily-brief": "primary",
};

const CONFIDENCE_LEVEL_LABEL: Record<string, string> = {
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
  "very-high": "Very high confidence",
};

function ConfidenceDisplay({ confidence }: { confidence: WorkspaceClaim["confidence"] }) {
  if (!confidence) {
    return <p className="text-[11px] text-radar-light-muted dark:text-radar-muted">Confidence not available for this finding.</p>;
  }
  if (confidence.kind === "score") {
    return <ConfidenceBar confidence={confidence.value} className="w-40" />;
  }
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold text-radar-light-text dark:text-radar-white">{CONFIDENCE_LEVEL_LABEL[confidence.level] ?? confidence.level}</span>
      <span className="text-[11px] text-radar-light-muted dark:text-radar-muted">{confidence.rationale}</span>
    </div>
  );
}

export function EvidenceClaimCard({ claim }: { claim: WorkspaceClaim }) {
  return (
    <li className={cn("flex flex-col gap-3 p-4", GLASS_TILE_SURFACE)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <GlowBadge color={ORIGIN_COLOR[claim.origin]}>{ORIGIN_LABEL[claim.origin]}</GlowBadge>
          <GlowBadge color="muted">{claim.category}</GlowBadge>
        </div>
        <time dateTime={claim.generatedAt} className="shrink-0 text-[10.5px] whitespace-nowrap text-radar-light-muted dark:text-radar-muted">
          <RelativeTime iso={claim.generatedAt} />
        </time>
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-radar-light-text dark:text-radar-white">{claim.headline}</h3>
        <p className="text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">{claim.summary}</p>
      </div>

      {claim.projects.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {claim.projects.map((project) =>
            project.slug ? (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.slug}`}
                className="rounded-full border border-radar-light-border px-2 py-0.5 text-[10.5px] font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
              >
                {project.name}
              </Link>
            ) : (
              <span key={project.id} className="rounded-full border border-radar-light-border px-2 py-0.5 text-[10.5px] font-medium text-radar-light-muted dark:border-white/10 dark:text-radar-muted">
                {project.name}
              </span>
            )
          )}
        </div>
      )}

      <ConfidenceDisplay confidence={claim.confidence} />

      {claim.evidence.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-radar-light-border pt-3 dark:border-white/10">
          <span className="text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
            Supporting Evidence ({claim.evidence.length})
          </span>
          <ul className="flex flex-col gap-1.5">
            {claim.evidence.map((item) => (
              <li key={item.id} className="flex flex-col gap-0.5 text-xs">
                <span className="text-radar-light-text dark:text-radar-white">{item.detail}</span>
                <span className="flex flex-wrap items-center gap-1 text-[10.5px] text-radar-light-muted dark:text-radar-muted">
                  <span className="font-medium">{item.label}</span>
                  {item.sourceLabel && <span>· {item.sourceLabel}</span>}
                  {item.occurredAt && (
                    <span>
                      · <RelativeTime iso={item.occurredAt} />
                    </span>
                  )}
                  {item.url && (
                    <>
                      ·{" "}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 font-medium text-radar-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-accent"
                      >
                        View evidence
                        <ExternalLink className="size-2.5" aria-hidden="true" />
                      </a>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {claim.sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-radar-light-border pt-3 dark:border-white/10">
          <Link2 className="size-3 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
          <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">Sources:</span>
          {claim.sources.map((source, i) =>
            source.url ? (
              <a key={i} href={source.url} target="_blank" rel="noopener noreferrer" className="text-[10.5px] font-medium text-radar-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-accent">
                {source.label}
              </a>
            ) : (
              <span key={i} className="text-[10.5px] font-medium text-radar-light-text dark:text-radar-white">
                {source.label}
              </span>
            )
          )}
        </div>
      )}

      {claim.limitation && (
        <div className="flex items-start gap-1.5 rounded-lg bg-radar-light-surface p-2 text-[10.5px] text-radar-light-muted dark:bg-white/5 dark:text-radar-muted">
          <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          <span>{claim.limitation}</span>
        </div>
      )}
    </li>
  );
}
