"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, Check, Coins, Fish, Fuel, Globe, Landmark, RefreshCw, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/data/format";
import { useNowTick } from "@/lib/hooks/useNowTick";
import type { BriefTone, IntelligenceBrief as IntelligenceBriefData, WithSource } from "@/lib/data/types";
import type { DashboardEvidenceSummaryItem, DashboardSourceAttribution } from "@/lib/ai-intelligence/dashboard-adapter";
import { WidgetCard } from "@/components/dashboard/WidgetCard";

const TONE_ICON_BG: Record<BriefTone, string> = {
  positive: "bg-radar-success/10 text-radar-success",
  negative: "bg-radar-danger/10 text-radar-danger",
  neutral: "bg-radar-light-muted/10 text-radar-light-muted dark:bg-white/5 dark:text-radar-muted",
};

/**
 * Every `IntelligenceBriefPoint` is free-form generated text with no
 * category field (`lib/data/types.ts`) — so the icon is derived by
 * keyword-matching, reusing the same icon choices `ActivityFeed`/
 * `WhaleActivityWidget` already use for the same real-world concepts
 * (Fish=whale, Landmark=governance), so the same idea always looks the same
 * across the dashboard.
 */
function briefPointIcon(text: string): LucideIcon {
  if (/\bAI\b/.test(text) || /artificial intelligence|machine learning/i.test(text)) return Bot;
  if (/\bTVL\b/.test(text) || /total value locked/i.test(text)) return Coins;
  if (/\bgas\b/i.test(text) || /\bgwei\b/i.test(text)) return Fuel;
  if (/whale/i.test(text)) return Fish;
  if (/governance|proposal|\bvote(d|s|ing)?\b|\bdao\b/i.test(text)) return Landmark;
  return Globe;
}

type IntelligenceBriefProps = {
  data: WithSource<IntelligenceBriefData>;
  /** PR-042 — real evidence counts backing the currently-displayed brief (e.g. "3 Registry Updates"). Omitted/empty hides this section entirely — never an empty heading. */
  evidenceSummary?: DashboardEvidenceSummaryItem[];
  /** PR-042 — real contributing sources for the currently-displayed brief. Omitted/empty hides this section entirely. */
  sources?: DashboardSourceAttribution[];
  /** PR-047 — passthrough for grid placement (e.g. `lg:col-span-2` beside the compact Portfolio panel). Purely layout; never affects content. */
  className?: string;
};

export function IntelligenceBrief({ data, evidenceSummary, sources, className }: IntelligenceBriefProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);
  const wasPending = useRef(false);
  const now = useNowTick(1000);

  useEffect(() => {
    if (wasPending.current && !isPending) setRefreshedAt(Date.now());
    wasPending.current = isPending;
  }, [isPending]);

  // `router.refresh()` re-runs every Server Component on this route, not
  // just this widget — there is no per-widget refetch primitive in this
  // architecture (no backend services may be added). This is the same
  // mechanism `WidgetCard`'s own default "Refresh data" menu action already
  // uses; this button just makes it explicit and gives it its own
  // ticking feedback, rather than adding a second data path.
  function handleRefresh() {
    startTransition(() => router.refresh());
  }

  const refreshLabel = (() => {
    if (isPending) return "Refreshing…";
    if (refreshedAt === null) return null;
    const seconds = Math.round((now - refreshedAt) / 1000);
    if (seconds < 5) return "Updated just now";
    if (seconds < 60) return `Updated ${seconds} sec ago`;
    return `Updated ${Math.round(seconds / 60)} min ago`;
  })();

  return (
    <WidgetCard
      icon={<Sparkles className="size-5" aria-hidden="true" />}
      title="Base Intelligence Brief"
      subtitle="AI-generated summary of Base ecosystem activity"
      accent="purple"
      source={data.source}
      className={className}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              data.source === "live" ? "bg-radar-success" : "bg-radar-light-muted dark:bg-radar-muted"
            )}
            aria-hidden="true"
          />
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">
            {data.source === "live"
              ? "Live — reflects real-time activity across the Base ecosystem."
              : "No ecosystem activity to summarize right now — this updates automatically as new signals appear. Create a Watchlist for insights personalized to your own projects."}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isPending}
          aria-label="Refresh Intelligence Brief"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-radar-light-border px-2 py-1 text-[11px] font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface hover:text-radar-light-text disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-muted dark:hover:bg-white/5 dark:hover:text-radar-white"
        >
          <RefreshCw className={cn("size-3.5", isPending && "animate-spin")} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <ul className="flex flex-col gap-2.5">
        {data.points.map((point) => {
          const Icon = briefPointIcon(point.text);
          return (
            <li
              key={point.id}
              className="flex items-start gap-2.5 text-sm text-radar-light-text dark:text-radar-white"
            >
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md",
                  TONE_ICON_BG[point.tone]
                )}
              >
                <Icon className="size-3" aria-hidden="true" />
              </span>
              {point.text}
            </li>
          );
        })}
      </ul>

      {evidenceSummary && evidenceSummary.length > 0 && (
        <ul className="flex flex-col gap-1.5 border-t border-radar-light-border/60 pt-3 dark:border-white/5">
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
      )}

      {sources && sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-radar-light-border/60 pt-3 dark:border-white/5">
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
      )}

      <p className="text-[11px] text-radar-light-muted/70 dark:text-radar-muted/50">
        {refreshLabel ?? `Generated ${formatRelativeTime(data.generatedAt)}`}
      </p>
    </WidgetCard>
  );
}
