import Link from "next/link";

import { ConfidenceBar } from "@/components/alerts/ConfidenceBar";
import { NarrativeBadge } from "@/components/alerts/NarrativeBadge";
import { SeverityBadge } from "@/components/alerts/SeverityBadge";
import { SignalPills } from "@/components/alerts/SignalPills";
import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { getProject } from "@/data/projects/helpers";
import { formatRelativeTime } from "@/lib/data/format";
import type { IntelligenceAlert } from "@/lib/alerts/intelligence/types";

type IntelligenceCardProps = {
  alert: IntelligenceAlert;
};

/**
 * One project's rolled-up AI Intelligence read. Compact by design — a
 * headline, a 2-line-clamped summary, and scannable stats (confidence,
 * score, contributing signals, related alert count) rather than the
 * paragraph-per-fact layout raw `AlertCard`s use, per the PR brief's "avoid
 * long paragraphs" / "reduce noise" goals. Links to the project's Profile
 * page (the one real place to go deeper) using the same stretched-link
 * pattern `AlertCard` already establishes.
 */
export function IntelligenceCard({ alert }: IntelligenceCardProps) {
  const project = getProject(alert.projectId);

  return (
    <li className="group relative flex flex-col gap-3 rounded-xl border border-radar-light-border bg-radar-light-card p-4 transition-colors hover:bg-radar-light-surface dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]">
      {project && (
        <Link
          href={`/dashboard/projects/${project.slug}`}
          aria-label={`${alert.headline}. View ${alert.projectName}'s Project Profile.`}
          className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50"
        />
      )}

      <div className="relative z-[1] flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="flex max-w-[160px] items-center gap-1.5 rounded-full border border-radar-light-border bg-radar-light-surface px-2 py-0.5 text-[10.5px] font-medium text-radar-light-text dark:border-white/10 dark:bg-white/[0.03] dark:text-radar-white">
            <ProjectLogo logoUrl={project?.logoUrl} name={alert.projectName} size={14} />
            <span className="truncate">{alert.projectName}</span>
          </span>
          <NarrativeBadge narrative={alert.narrative} />
          <SeverityBadge severity={alert.severity} />
        </div>
        <span className="shrink-0 text-[10.5px] whitespace-nowrap text-radar-light-muted dark:text-radar-muted">
          {formatRelativeTime(alert.timestamp)}
        </span>
      </div>

      <div className="relative z-[1] flex flex-col gap-1">
        <p className="line-clamp-1 text-sm font-semibold text-radar-light-text dark:text-radar-white">
          {alert.headline}
        </p>
        <p className="line-clamp-2 text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
          {alert.summary}
        </p>
      </div>

      <div className="relative z-[1] flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <SignalPills signals={alert.signals} />
          <span className="text-[10.5px] text-radar-light-muted dark:text-radar-muted">
            {alert.relatedAlertIds.length} related alert{alert.relatedAlertIds.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <ConfidenceBar confidence={alert.confidence} className="w-28" />
          <div className="flex flex-col items-end">
            <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">Score</span>
            <span className="text-lg font-semibold text-radar-light-text dark:text-radar-white">{alert.score}</span>
          </div>
        </div>
      </div>
    </li>
  );
}
