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
import { formatRelativeTime } from "@/lib/data/format";
import type { ActivityEvent, ActivityKind, WithSource } from "@/lib/data/types";
import { WidgetCard } from "@/components/dashboard/WidgetCard";

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

export function ActivityFeed({ data, lastUpdated }: ActivityFeedProps) {
  return (
    <WidgetCard
      icon={<Repeat className="size-5" aria-hidden="true" />}
      title="Activity Feed"
      subtitle="Live signal across Base"
      accent="accent"
      source={data.source}
      lastUpdated={lastUpdated}
      className="sm:col-span-2 xl:col-span-1"
    >
      <ol className="flex flex-col gap-3">
        {data.slice(0, 6).map((event) => {
          const Icon = KIND_ICON[event.kind];
          return (
            <li key={event.id} className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
                  KIND_COLOR[event.kind]
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-radar-light-text dark:text-radar-white">
                  {event.title}
                </p>
                <p className="truncate text-[11px] text-radar-light-muted dark:text-radar-muted">
                  {event.detail}
                </p>
              </div>
              <time
                dateTime={event.timestamp}
                className="shrink-0 text-[11px] whitespace-nowrap text-radar-light-muted dark:text-radar-muted"
              >
                {formatRelativeTime(event.timestamp)}
              </time>
            </li>
          );
        })}
      </ol>
    </WidgetCard>
  );
}
