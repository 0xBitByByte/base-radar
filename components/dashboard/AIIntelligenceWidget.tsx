"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { NarrativeBadge } from "@/components/alerts/NarrativeBadge";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelativeTime } from "@/lib/data/format";
import { useIntelligenceAlerts } from "@/lib/hooks/useIntelligenceAlerts";

const TOP_COUNT = 3;

/**
 * Compact Dashboard preview of the AI Intelligence Engine — the top 3
 * highest-scored `IntelligenceAlert`s (already sorted by
 * `lib/alerts/intelligence/engine.ts`'s `buildIntelligenceAlerts`, so this
 * only ever slices, never re-sorts). Fully client-driven, no server-fetched
 * `data` prop: `useIntelligenceAlerts()` reads the same Alert Engine store
 * every other alert surface subscribes to, seeded empty on the server and
 * hydrated once `refreshAlerts()` resolves in the browser, same as the
 * Alerts page itself.
 */
export function AIIntelligenceWidget() {
  const intelligenceAlerts = useIntelligenceAlerts();
  const topAlerts = intelligenceAlerts.slice(0, TOP_COUNT);

  return (
    <WidgetCard
      icon={<Sparkles className="size-5" aria-hidden="true" />}
      title="AI Intelligence"
      subtitle="Top signals across your Watchlist"
      accent="purple"
    >
      {topAlerts.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No meaningful intelligence detected."
          description="AI-derived reads will appear here once your watched projects have scoreable signals."
        />
      ) : (
        <div className="flex flex-col gap-3.5">
          {topAlerts.map((alert) => (
            <div key={alert.id} className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="truncate text-xs font-semibold text-radar-light-text dark:text-radar-white">
                  {alert.headline}
                </p>
                <div className="flex items-center gap-1.5">
                  <NarrativeBadge narrative={alert.narrative} />
                  <span className="text-[10.5px] text-radar-light-muted dark:text-radar-muted">
                    {alert.confidence}% confidence
                  </span>
                </div>
              </div>
              <span className="shrink-0 text-[10.5px] whitespace-nowrap text-radar-light-muted dark:text-radar-muted">
                {formatRelativeTime(alert.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}

      <Link
        href="/dashboard/alerts"
        className="flex items-center gap-1 self-start text-xs font-medium text-radar-primary outline-none transition-colors hover:text-radar-primary/80 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-accent dark:hover:text-radar-accent/80"
      >
        View all in Alerts
        <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
      </Link>
    </WidgetCard>
  );
}
