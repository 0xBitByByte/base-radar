import { ArrowDownLeft, ArrowUpRight, Fish } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCompactCurrency } from "@/lib/data/format";
import type { WhaleEvent, WithSource } from "@/lib/data/types";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { GlowBadge } from "@/components/ui/GlowBadge";

type WhaleActivityWidgetProps = {
  data: WithSource<WhaleEvent[]>;
  lastUpdated: string;
};

export function WhaleActivityWidget({ data, lastUpdated }: WhaleActivityWidgetProps) {
  return (
    <WidgetCard
      icon={<Fish className="size-5" aria-hidden="true" />}
      title="Whale Activity"
      subtitle="Large transfers and smart money"
      accent="orange"
      source={data.source}
      lastUpdated={lastUpdated}
    >
      <ul className="flex flex-col gap-3">
        {data.map((event) => (
          <li key={event.id} className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                event.direction === "in"
                  ? "bg-radar-success/10 text-radar-success"
                  : "bg-radar-danger/10 text-radar-danger"
              )}
            >
              {event.direction === "in" ? (
                <ArrowDownLeft className="size-4" aria-hidden="true" />
              ) : (
                <ArrowUpRight className="size-4" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-radar-light-text dark:text-radar-white">
                {event.label}
              </p>
              <p className="truncate text-[11px] text-radar-light-muted dark:text-radar-muted">
                {event.wallet} · {event.minutesAgo}m ago
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-xs font-semibold tabular-nums text-radar-light-text dark:text-radar-white">
                {formatCompactCurrency(event.amountUsd)}
              </span>
              {event.isSmartMoney && (
                <GlowBadge color="warning" className="px-1.5 py-0 text-[10px]">
                  Smart money
                </GlowBadge>
              )}
            </div>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}
