import {
  Fish,
  GitPullRequestArrow,
  Landmark,
  Droplets,
  Repeat,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { RelativeTime } from "@/components/shared/RelativeTime";
import type { ActivityEvent, ActivityKind, WithSource } from "@/lib/data/types";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { GLASS_TILE_SURFACE } from "@/components/ui/glassStyles";

type ActivityFeedProps = {
  data: WithSource<ActivityEvent[]>;
  lastUpdated: string;
};

const KIND_ICON: Record<ActivityKind, LucideIcon> = {
  whale: Fish,
  "github-release": GitPullRequestArrow,
  governance: Landmark,
  "new-pool": Droplets,
  "large-swap": Repeat,
  "contract-verification": ShieldCheck,
};

const KIND_COLOR: Record<ActivityKind, string> = {
  whale: "bg-radar-orange/10 text-radar-orange",
  "github-release": "bg-radar-purple/10 text-radar-purple",
  governance: "bg-radar-primary/10 text-radar-primary",
  "new-pool": "bg-radar-accent/10 text-radar-accent",
  "large-swap": "bg-radar-success/10 text-radar-success",
  "contract-verification": "bg-radar-success/10 text-radar-success",
};

const KIND_LABEL: Record<ActivityKind, string> = {
  whale: "Whale Transfer",
  "github-release": "GitHub Release",
  governance: "Governance",
  "new-pool": "New Pool",
  "large-swap": "Large Swap",
  "contract-verification": "Contract Verified",
};

export function ActivityFeed({ data, lastUpdated }: ActivityFeedProps) {
  return (
    <WidgetCard
      icon={<Repeat className="size-5" aria-hidden="true" />}
      title="Activity Feed"
      subtitle="Recent whale, governance, and dev events across Base"
      accent="accent"
      source={data.source}
      lastUpdated={lastUpdated}
      className="gap-3 p-4 sm:p-5"
    >
      {data.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No activity yet"
          description="Whale transfers, releases, governance, and pool events across Base will appear here as they happen."
        />
      ) : (
        <ol className="flex flex-col gap-2">
          {data.slice(0, 6).map((event) => {
            const Icon = KIND_ICON[event.kind];
            return (
              <li
                key={event.id}
                className={cn(
                  // Same tile-scale row treatment `WatchlistWidget.tsx`/
                  // `AIProjectsWidget.tsx`/`PairCard.tsx` already
                  // established for this glass system's dense-list rows.
                  "flex items-start gap-3 p-2 transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-radar-primary/40 hover:shadow-[0_8px_24px_-12px_rgba(var(--color-radar-primary-rgb),0.18)] motion-reduce:hover:translate-y-0 dark:hover:border-white/25",
                  GLASS_TILE_SURFACE
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
                    KIND_COLOR[event.kind]
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-xs font-semibold text-radar-light-text dark:text-radar-white">
                      {event.title}
                    </p>
                    <span className="shrink-0 rounded-full bg-radar-light-surface px-1.5 py-0.5 text-[9.5px] font-medium text-radar-light-muted dark:bg-white/5 dark:text-radar-muted">
                      {KIND_LABEL[event.kind]}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-radar-light-muted dark:text-radar-muted">
                    {event.detail}
                  </p>
                </div>
                <time
                  dateTime={event.timestamp}
                  className="shrink-0 text-[11px] whitespace-nowrap text-radar-light-muted dark:text-radar-muted"
                >
                  <RelativeTime iso={event.timestamp} />
                </time>
              </li>
            );
          })}
        </ol>
      )}
    </WidgetCard>
  );
}
