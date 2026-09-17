"use client";

import { BookOpen, Calendar, Download, Flag, MapPin, RotateCcw, Target, TrendingDown, TrendingUp, Trophy as TrophyIcon } from "lucide-react";

import { cn, downloadTextFile } from "@/lib/utils";
import type { PortfolioStory } from "@/lib/portfolio-story/types";
import { buildPortfolioStoryFilename, buildPortfolioStoryHtml, buildPortfolioStoryMarkdown, buildPortfolioStoryText, type PortfolioStoryExportFormat } from "@/lib/portfolio-story";
import { GLASS_CARD_SURFACE } from "@/components/ui/glassStyles";
import { EmptyState } from "@/components/ui/EmptyState";
import { RelativeTime } from "@/components/shared/RelativeTime";

/**
 * V4-FUTURE-002 (Feature 5 — Portfolio Story Mode) — a read-only curated
 * narrative view over an already-built `PortfolioStory`. Every value here
 * is a direct read of `story`'s own fields — no calculation happens in this
 * file, matching this feature's own "pure presentation" scope. Reuses the
 * same `SectionCard`/export-button conventions `WalletReportView.tsx`/
 * `WalletMonthlyDigestView.tsx` already established.
 */

const USD_FORMAT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const TONE_DOT_CLASS: Record<string, string> = {
  positive: "bg-radar-success",
  attention: "bg-radar-warning",
  neutral: "bg-radar-light-muted dark:bg-radar-muted",
};

function SectionCard({ title, icon, children, className }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 p-5", GLASS_CARD_SURFACE, className)}>
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-xs font-semibold text-radar-light-text dark:text-radar-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function SnapshotLine({ snapshot }: { snapshot: { date: string; value: number | null; health: number | null } }) {
  return (
    <p className="text-xs text-radar-light-text dark:text-radar-white">
      {snapshot.value !== null && <span className="font-medium">{USD_FORMAT.format(snapshot.value)}</span>}
      {snapshot.health !== null && <span className="text-radar-light-muted dark:text-radar-muted"> · health {snapshot.health}</span>}
      <time dateTime={snapshot.date} className="ml-1.5 text-radar-light-muted dark:text-radar-muted">
        (<RelativeTime iso={snapshot.date} />)
      </time>
    </p>
  );
}

const EXPORT_FORMATS: { format: PortfolioStoryExportFormat; label: string; mimeType: string; build: (story: PortfolioStory, generatedAt: string) => string }[] = [
  { format: "markdown", label: "Markdown", mimeType: "text/markdown", build: buildPortfolioStoryMarkdown },
  { format: "text", label: "Text", mimeType: "text/plain", build: buildPortfolioStoryText },
  { format: "html", label: "HTML", mimeType: "text/html", build: buildPortfolioStoryHtml },
];

function ExportStoryButtons({ story }: { story: PortfolioStory }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Export story">
      <span className="flex items-center gap-1 text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">
        <Download className="size-3 shrink-0" aria-hidden="true" />
        Export Story
      </span>
      {EXPORT_FORMATS.map(({ format, label, mimeType, build }) => (
        <button
          key={format}
          type="button"
          onClick={() => {
            const generatedAt = new Date().toISOString();
            downloadTextFile(buildPortfolioStoryFilename(format, generatedAt), build(story, generatedAt), mimeType);
          }}
          className="rounded-full border border-radar-light-border px-2.5 py-1 text-[11px] font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function WalletPortfolioStoryView({ story, className }: { story: PortfolioStory | null; className?: string }) {
  if (!story) {
    return (
      <SectionCard title="Portfolio Story" icon={<BookOpen className="size-4 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />} className={className}>
        <EmptyState icon={BookOpen} title="No story yet." description="Your portfolio's story builds up once real history accumulates." />
      </SectionCard>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <SectionCard title="Portfolio Story" icon={<BookOpen className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />}>
        {story.introduction && <p className="text-xs text-radar-light-text dark:text-radar-white">{story.introduction}</p>}
        <ExportStoryButtons story={story} />
      </SectionCard>

      <SectionCard title="Where You Started" icon={<MapPin className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />}>
        {story.whereYouStarted ? <SnapshotLine snapshot={story.whereYouStarted} /> : <p className="text-xs text-radar-light-muted dark:text-radar-muted">No starting snapshot recorded yet.</p>}
      </SectionCard>

      <SectionCard title="Key Turning Points" icon={<Flag className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />}>
        {story.keyTurningPoints.length === 0 ? (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">Nothing correlated yet.</p>
        ) : (
          <ol className="flex flex-col gap-2 border-l border-radar-light-border pl-3 dark:border-white/10">
            {story.keyTurningPoints.map((moment, i) => (
              <li key={`${moment.timestamp}-${i}`} className="flex flex-col gap-0.5 text-xs">
                <span className="flex items-center gap-1.5 text-[10.5px] text-radar-light-muted dark:text-radar-muted">
                  <span className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT_CLASS[moment.tone] ?? TONE_DOT_CLASS.neutral)} aria-hidden="true" />
                  <time dateTime={moment.timestamp}>
                    <RelativeTime iso={moment.timestamp} />
                  </time>
                </span>
                <span className="text-radar-light-text dark:text-radar-white">{moment.headline}</span>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SectionCard title="Biggest Improvement" icon={<TrendingUp className="size-4 text-radar-success" aria-hidden="true" />}>
          {story.biggestImprovement ? (
            <p className="text-xs text-radar-light-text dark:text-radar-white">
              {story.biggestImprovement.label} {story.biggestImprovement.summary}
            </p>
          ) : (
            <p className="text-xs text-radar-light-muted dark:text-radar-muted">No improvement recorded yet.</p>
          )}
        </SectionCard>
        <SectionCard title="Biggest Decline" icon={<TrendingDown className="size-4 text-radar-danger" aria-hidden="true" />}>
          {story.biggestDecline ? (
            <p className="text-xs text-radar-light-text dark:text-radar-white">
              {story.biggestDecline.label} {story.biggestDecline.summary}
            </p>
          ) : (
            <p className="text-xs text-radar-light-muted dark:text-radar-muted">No decline recorded yet.</p>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Recoveries" icon={<RotateCcw className="size-4 text-radar-success" aria-hidden="true" />}>
        {story.recoveries.length === 0 ? (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">No recoveries recorded yet.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-xs">
            {story.recoveries.map((r, i) => (
              <li key={`${r.category}-${r.recoveryDate}-${i}`} className="flex justify-between gap-2">
                <span className="text-radar-light-text dark:text-radar-white">
                  {r.label}: {r.before.value} → {r.after.value}
                </span>
                <time dateTime={r.recoveryDate} className="text-radar-light-muted dark:text-radar-muted">
                  <RelativeTime iso={r.recoveryDate} />
                </time>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Milestones" icon={<TrophyIcon className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />}>
        {story.milestones.length === 0 ? (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">No milestones yet.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-xs">
            {story.milestones.map((h) => (
              <li key={h.dedupeKey} className="text-radar-light-text dark:text-radar-white">
                {h.title}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Current Position" icon={<Calendar className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />}>
        {story.currentPosition ? <SnapshotLine snapshot={story.currentPosition} /> : <p className="text-xs text-radar-light-muted dark:text-radar-muted">No current snapshot recorded yet.</p>}
      </SectionCard>

      <SectionCard title="Next Recommended Action" icon={<Target className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />}>
        {story.nextRecommendedAction ? (
          <div className="flex flex-col gap-0.5 text-xs">
            <span className="font-medium text-radar-light-text dark:text-radar-white">{story.nextRecommendedAction.action}</span>
            {story.nextRecommendedAction.reason && <span className="text-radar-light-muted dark:text-radar-muted">{story.nextRecommendedAction.reason}</span>}
          </div>
        ) : (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">No action identified yet.</p>
        )}
      </SectionCard>
    </div>
  );
}
