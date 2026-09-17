"use client";

import { AlertTriangle, Check, Radar, Trash2, Undo2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { UseAIWatchResult } from "@/lib/hooks/useAIWatch";
import { EvidenceClaimCard } from "@/components/ai-workspace/EvidenceClaimCard";
import { NotificationBadge } from "@/components/notifications/NotificationBadge";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { GLASS_CARD_SURFACE } from "@/components/ui/glassStyles";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * PR-090.03 (AI Watch — Stage 1) — the one fixed watch this slice ships:
 * "notify me if a Watchlist project's Risk category gains a new finding."
 * Genuinely reuses the Notification Center's own conventions rather than
 * inventing a second design: `NotificationBadge` for the priority pill (a
 * type-generic component, not coupled to Notification Center's closed
 * Timeline-derived type union — see this module's own architecture note in
 * `lib/ai-watch/types.ts`), the same mark-read/unread icon pattern
 * `NotificationItem` uses, and `EvidenceClaimCard` for every fired alert's
 * actual evidence — never a second evidence presentation.
 *
 * Every state below is honest about what actually happened: "checking"
 * while the Alert Engine's one-shot refresh is still in flight, an explicit
 * "can't check right now" when it failed (never a silent skip, never a
 * fabricated result), and "AI Watch checks your saved watch when you open
 * AI Workspace" — never "monitors" or "in real time," since nothing here
 * runs without this page open (PR-090.03 Discovery's own trust-copy
 * requirement).
 */
export function AIWatchPanel({ watch, className }: { watch: UseAIWatchResult; className?: string }) {
  return (
    <section aria-labelledby="ai-watch-heading" className={cn("flex flex-col gap-4 p-6", GLASS_CARD_SURFACE, className)}>
      <div>
        <div className="flex items-center gap-2">
          <Radar className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />
          <h2 id="ai-watch-heading" className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
            AI Watch
          </h2>
        </div>
        <p className="mt-0.5 text-xs text-radar-light-muted dark:text-radar-muted">
          Notify me if a Watchlist project&apos;s Risk category gains a new finding. AI Watch checks your saved watch when you open AI Workspace — it doesn&apos;t run in the background.
        </p>
      </div>

      {!watch.enabled ? (
        <div className="flex flex-col gap-3">
          <EmptyState
            icon={Radar}
            title={watch.exists ? "Watch is off" : "No watch yet"}
            description={watch.exists ? "Turn it back on to resume checking your Watchlist for new Risk findings on your next visit." : "Turn it on to start checking your Watchlist for new Risk findings on your next visit."}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={watch.enable}
              className="self-start rounded-full bg-radar-primary px-3 py-1.5 text-[11px] font-semibold text-white outline-none transition-colors hover:bg-radar-primary/90 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:bg-radar-accent dark:text-radar-dark dark:hover:bg-radar-accent/90"
            >
              Turn on AI Watch
            </button>
            {watch.exists && (
              <button
                type="button"
                onClick={watch.remove}
                className="flex items-center gap-1.5 text-[10.5px] font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-danger focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted"
              >
                <Trash2 className="size-3 shrink-0" aria-hidden="true" />
                Remove Watch
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {watch.status === "checking" && (
            <div className="flex flex-col gap-2" role="status" aria-label="Checking AI Watch">
              <div className="h-16 animate-pulse rounded-xl bg-radar-light-surface dark:bg-white/5" />
            </div>
          )}

          {watch.status === "unavailable" && (
            <EmptyState
              icon={AlertTriangle}
              title="Can't check right now"
              description="The Alert Engine's data didn't load this visit. AI Watch never checks against stale or missing data — try again on your next visit."
            />
          )}

          {watch.status === "ready" && watch.watchlistProjectCount === 0 && (
            <EmptyState icon={Radar} title="No Watchlist projects yet" description="Add a project to your Watchlist to start watching it for new Risk findings." />
          )}

          {watch.status === "ready" && watch.watchlistProjectCount > 0 && watch.alerts.length === 0 && (
            <EmptyState icon={Radar} title="Nothing new yet" description="No new Risk findings for your Watchlist as of your last visit. AI Watch will keep checking each time you open AI Workspace." />
          )}

          {watch.status === "ready" && watch.alerts.length > 0 && (
            // Plain `div`s with list roles, not `<ul>`/`<li>` — `EvidenceClaimCard`'s own root element is already an `<li>` (for the sections above, each inside their own `<ul>`), so nesting it inside a second `<li>` here would be invalid, non-conforming HTML (a real hydration error caught during browser QA).
            <div className="flex flex-col gap-3" role="list" aria-label="AI Watch alerts">
              {watch.alerts.map((alert) => (
                <div key={alert.id} role="listitem" className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {!alert.isRead && <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-radar-primary dark:bg-radar-accent" />}
                      <span className="text-[10.5px] font-semibold text-radar-light-text dark:text-radar-white">New Risk finding</span>
                      <NotificationBadge priority="high" />
                    </div>
                    <div className="flex items-center gap-2">
                      <time dateTime={alert.firstSeenAt} className="text-[10.5px] whitespace-nowrap text-radar-light-muted dark:text-radar-muted">
                        First noticed <RelativeTime iso={alert.firstSeenAt} />
                      </time>
                      {alert.isRead ? (
                        <button
                          type="button"
                          onClick={() => watch.markUnread(alert.id)}
                          aria-label="Mark as unread"
                          className="flex size-6 shrink-0 items-center justify-center rounded-full text-radar-light-muted outline-none transition-colors hover:bg-radar-light-border hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/10 dark:hover:text-radar-white"
                        >
                          <Undo2 className="size-3.5" aria-hidden="true" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => watch.markRead(alert.id)}
                          aria-label="Mark as read"
                          className="flex size-6 shrink-0 items-center justify-center rounded-full text-radar-light-muted outline-none transition-colors hover:bg-radar-light-border hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/10 dark:hover:text-radar-white"
                        >
                          <Check className="size-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                  <EvidenceClaimCard claim={alert.claim} />
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 border-t border-radar-light-border pt-3 dark:border-white/10">
            <button
              type="button"
              onClick={watch.disable}
              className="text-[10.5px] font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:text-radar-white"
            >
              Turn off AI Watch
            </button>
            <button
              type="button"
              onClick={watch.remove}
              className="flex items-center gap-1.5 text-[10.5px] font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-danger focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted"
            >
              <Trash2 className="size-3 shrink-0" aria-hidden="true" />
              Remove Watch
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
