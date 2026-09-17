"use client";

import { Bot, Clock, Compass, GitCompare, History, LineChart, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CrossFeatureIntelligence } from "@/lib/cross-feature/types";
import { AI_CHAT_QUESTIONS } from "@/lib/ai-chat/questions";
import { REPORT_PERIOD_LABEL } from "@/components/wallet/walletReportEngine";
import { GLASS_CARD_SURFACE } from "@/components/ui/glassStyles";
import { EmptyState } from "@/components/ui/EmptyState";
import { RelativeTime } from "@/components/shared/RelativeTime";

/**
 * V4-INTELLIGENCE-003 (Phase 7) — the "Related Activity" panel: a compact,
 * read-only view of `CrossFeatureIntelligence.events`, each already-real
 * `CorrelatedEvent.headline` (copied verbatim from `AnalyticsHighlight.reason`)
 * plus its real `refs` shown as informational badges. These badges are
 * facts, not links — this layer's own "No routing logic. Only references"
 * rule (Phase 6) — so this panel never navigates anywhere itself; it
 * reuses the exact `SectionCard`/badge/`RelativeTime` conventions every
 * other Wallet panel this session already established, per "reuse existing
 * components, do not redesign."
 */

function SectionCard({ title, icon, children, className }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 p-6", GLASS_CARD_SURFACE, className)}>
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold text-radar-light-text dark:text-radar-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function RefBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1 rounded-full border border-radar-light-border bg-radar-light-surface px-2 py-0.5 text-[10.5px] font-medium text-radar-light-muted dark:border-white/10 dark:bg-white/5 dark:text-radar-muted">
      {icon}
      {label}
    </span>
  );
}

const MAX_EVENTS_SHOWN = 5;

export function WalletRelatedActivityPanel({ crossFeature, className }: { crossFeature: CrossFeatureIntelligence; className?: string }) {
  const events = crossFeature.events.slice(0, MAX_EVENTS_SHOWN);

  if (events.length === 0) {
    return (
      <SectionCard title="Related Activity" icon={<Compass className="size-4 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />} className={className}>
        <EmptyState icon={Compass} title="Nothing correlated yet." description="Related Activity connects real changes across History, Analytics, Reports, and Automation as they accumulate." />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Related Activity" icon={<Compass className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />} className={className}>
      <ul className="flex flex-col divide-y divide-radar-light-border dark:divide-white/10">
        {events.map((event) => (
          <li key={event.id} className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-radar-light-text dark:text-radar-white">{event.label}</span>
              <time dateTime={event.timestamp} className="shrink-0 text-[10.5px] text-radar-light-muted dark:text-radar-muted">
                <RelativeTime iso={event.timestamp} />
              </time>
            </div>
            <p className="text-xs text-radar-light-muted dark:text-radar-muted">{event.headline}</p>
            <div className="flex flex-wrap gap-1">
              {event.refs.historySnapshotTimestamp && <RefBadge icon={<History className="size-2.5 shrink-0" aria-hidden="true" />} label="History" />}
              {event.refs.analyticsTrendMetric && <RefBadge icon={<LineChart className="size-2.5 shrink-0" aria-hidden="true" />} label={`Analytics: ${event.refs.analyticsTrendMetric}`} />}
              {event.refs.reportPeriod && <RefBadge icon={<Clock className="size-2.5 shrink-0" aria-hidden="true" />} label={`Report: ${REPORT_PERIOD_LABEL[event.refs.reportPeriod]}`} />}
              {event.refs.chatQuestionId && <RefBadge icon={<Bot className="size-2.5 shrink-0" aria-hidden="true" />} label={`Ask AI: ${AI_CHAT_QUESTIONS[event.refs.chatQuestionId].prompt}`} />}
              {event.refs.automationResultId && <RefBadge icon={<Zap className="size-2.5 shrink-0" aria-hidden="true" />} label="Automation" />}
            </div>
          </li>
        ))}
      </ul>
      {crossFeature.timeline.length > 0 && (
        <p className="flex items-center gap-1 border-t border-radar-light-border pt-2.5 text-[10.5px] text-radar-light-muted dark:border-white/10 dark:text-radar-muted">
          <GitCompare className="size-3 shrink-0" aria-hidden="true" />
          {crossFeature.timeline.length} correlated moment{crossFeature.timeline.length === 1 ? "" : "s"} across every module.
        </p>
      )}
    </SectionCard>
  );
}
