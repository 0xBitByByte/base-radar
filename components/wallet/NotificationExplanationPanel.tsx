"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Bot, Calendar, Clock, FileText, HelpCircle, History, Info, LineChart, Sparkles, Target, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import type { NotificationExplanation } from "@/lib/notification-explain/types";
import type { ExplainabilityTimelineNode, ExplainabilityTimelineStage } from "@/lib/notification-explain/timeline";
import { REPORT_PERIOD_LABEL } from "@/components/wallet/walletReportEngine";
import { TREND_CONFIDENCE_CLASS, TREND_CONFIDENCE_LABEL } from "@/components/wallet/walletAnalyticsMeta";
import { RelativeTime } from "@/components/shared/RelativeTime";

/**
 * V4-FUTURE-001 (Notification Explainability, Phase 6) — "Explain" button +
 * panel. Reuses the exact `Dialog.Root`/`Dialog.Trigger`/`Dialog.Portal`
 * chrome `WalletHistorySections.tsx`'s own `ExportHistoryButton`/
 * `ClearHistoryButton` already established — no new dialog styling
 * invented. Every value rendered here is a direct read of an already-built
 * `NotificationExplanation` — no calculation happens in this file.
 * `onAskQuestion` is optional and wired by the caller to the SAME
 * `useAIChat().ask()` the Wallet page's own chat panel already uses —
 * "do not create new conversation logic" (Phase 5).
 *
 * V4-FUTURE-001F — `timeline` is an optional, already-built
 * `ExplainabilityTimelineNode[]` (`lib/notification-explain/timeline.ts`),
 * rendered as a compact vertical lifecycle view — informational only, no
 * navigation, no new correlation performed in this file.
 */

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1 text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
        {icon}
        {label}
      </span>
      <div className="text-xs text-radar-light-text dark:text-radar-white">{children}</div>
    </div>
  );
}

const STAGE_ICON: Record<ExplainabilityTimelineStage, React.ReactNode> = {
  automation: <Zap className="size-3 shrink-0" aria-hidden="true" />,
  analytics: <LineChart className="size-3 shrink-0" aria-hidden="true" />,
  history: <History className="size-3 shrink-0" aria-hidden="true" />,
  report: <FileText className="size-3 shrink-0" aria-hidden="true" />,
  digest: <Calendar className="size-3 shrink-0" aria-hidden="true" />,
  aiChat: <Bot className="size-3 shrink-0" aria-hidden="true" />,
};

function ExplainabilityTimelineView({ nodes }: { nodes: ExplainabilityTimelineNode[] }) {
  return (
    <ol className="flex flex-col gap-2.5 border-l border-radar-light-border pl-3 dark:border-white/10">
      {nodes.map((node) => (
        <li key={node.stage} className={cn("flex items-start gap-2", !node.reached && "opacity-40")}>
          <span className={cn("mt-0.5 shrink-0", node.reached ? "text-radar-primary dark:text-radar-accent" : "text-radar-light-muted dark:text-radar-muted")}>{STAGE_ICON[node.stage]}</span>
          <div className="flex min-w-0 flex-col">
            <span className="text-xs font-medium text-radar-light-text dark:text-radar-white">{node.title}</span>
            <span className="text-[10.5px] text-radar-light-muted dark:text-radar-muted">
              {node.feature}
              {node.timestamp && (
                <>
                  {" · "}
                  <RelativeTime iso={node.timestamp} />
                </>
              )}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ExplainButton({
  explanation,
  timeline,
  onAskQuestion,
}: {
  explanation: NotificationExplanation;
  timeline?: ExplainabilityTimelineNode[];
  onAskQuestion?: (questionId: NotificationExplanation["suggestedQuestions"][number]["id"]) => void;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger
        onClick={(e) => e.stopPropagation()}
        render={
          <button
            type="button"
            className="relative z-[1] flex items-center gap-1 rounded-full border border-radar-light-border px-2 py-0.5 text-[10.5px] font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface hover:text-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-muted dark:hover:bg-white/5 dark:hover:text-radar-accent"
          />
        }
      >
        <HelpCircle className="size-3 shrink-0" aria-hidden="true" />
        Explain
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-40 bg-radar-bg/40 backdrop-blur-sm dark:bg-black/60",
            "transition-opacity duration-200 motion-reduce:transition-none",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
          )}
        />
        <Dialog.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-y-auto rounded-2xl border border-radar-light-border bg-radar-light-card p-5 shadow-2xl outline-none dark:border-white/10 dark:bg-radar-card",
            "transition-[opacity,transform] duration-200 motion-reduce:transition-none",
            "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
          )}
        >
          <Dialog.Title className="text-sm font-semibold text-radar-light-text dark:text-radar-white">{explanation.headline}</Dialog.Title>
          <Dialog.Description className="text-xs text-radar-light-muted dark:text-radar-muted">{explanation.reason}</Dialog.Description>

          {explanation.supportingEvidence.length > 0 && (
            <Row icon={<Info className="size-3 shrink-0" aria-hidden="true" />} label="Supporting Evidence">
              <ul className="flex flex-col gap-1">
                {explanation.supportingEvidence.map((fact, i) => (
                  <li key={i}>{fact}</li>
                ))}
              </ul>
            </Row>
          )}

          <div className="flex flex-wrap gap-3">
            {explanation.refs.historySnapshotTimestamp && <Row icon={<Clock className="size-3 shrink-0" aria-hidden="true" />} label="Related History">Real snapshot on record</Row>}
            {explanation.refs.analyticsTrendMetric && <Row icon={<LineChart className="size-3 shrink-0" aria-hidden="true" />} label="Related Analytics">{explanation.refs.analyticsTrendMetric}</Row>}
            {explanation.refs.reportPeriod && <Row icon={<Sparkles className="size-3 shrink-0" aria-hidden="true" />} label="Related Report">{REPORT_PERIOD_LABEL[explanation.refs.reportPeriod]}</Row>}
          </div>

          {explanation.relatedRecommendation && (
            <Row icon={<Target className="size-3 shrink-0" aria-hidden="true" />} label="Related Recommendation">
              {explanation.relatedRecommendation.title}
            </Row>
          )}

          {explanation.nextAction && (
            <Row icon={<Target className="size-3 shrink-0" aria-hidden="true" />} label="Next Action">
              <span className="font-medium">{explanation.nextAction.action}</span>
              {explanation.nextAction.reason && <span className="text-radar-light-muted dark:text-radar-muted"> — {explanation.nextAction.reason}</span>}
            </Row>
          )}

          <Row icon={<HelpCircle className="size-3 shrink-0" aria-hidden="true" />} label="Confidence">
            <span className={TREND_CONFIDENCE_CLASS[explanation.confidence]}>{TREND_CONFIDENCE_LABEL[explanation.confidence]}</span>
          </Row>

          {explanation.suggestedQuestions.length > 0 && (
            <Row icon={<Bot className="size-3 shrink-0" aria-hidden="true" />} label="Ask AI">
              <div className="flex flex-wrap gap-1.5">
                {explanation.suggestedQuestions.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    disabled={!onAskQuestion}
                    onClick={() => onAskQuestion?.(q.id)}
                    className="rounded-full border border-radar-light-border px-2.5 py-1 text-[11px] font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
                  >
                    {q.prompt}
                  </button>
                ))}
              </div>
            </Row>
          )}

          {timeline && timeline.length > 0 && (
            <Row icon={<Clock className="size-3 shrink-0" aria-hidden="true" />} label="Timeline">
              <ExplainabilityTimelineView nodes={timeline} />
            </Row>
          )}

          <Dialog.Close className="mt-1 self-end rounded-lg px-3 py-1.5 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface dark:text-radar-muted dark:hover:bg-white/5">
            Close
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
