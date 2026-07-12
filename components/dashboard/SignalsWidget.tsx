import { Radio } from "lucide-react";

import type { Signal, SignalKind, WithSource } from "@/lib/data/types";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlowBadge, type GlowBadgeColor } from "@/components/ui/GlowBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";

type SignalsWidgetProps = {
  data: WithSource<Signal[]>;
  lastUpdated: string;
};

const KIND_LABEL: Record<SignalKind, string> = {
  buy: "Buy",
  watch: "Watch",
  momentum: "Momentum",
  "new-listing": "New Listing",
};

const KIND_BADGE_COLOR: Record<SignalKind, GlowBadgeColor> = {
  buy: "success",
  watch: "muted",
  momentum: "warning",
  "new-listing": "accent",
};

const KIND_BAR_COLOR: Record<SignalKind, string> = {
  buy: "bg-radar-success",
  watch: "bg-radar-muted",
  momentum: "bg-radar-orange",
  "new-listing": "bg-radar-accent",
};

export function SignalsWidget({ data, lastUpdated }: SignalsWidgetProps) {
  return (
    <WidgetCard
      icon={<Radio className="size-5" aria-hidden="true" />}
      title="Signals"
      subtitle="Buy, watch and momentum alerts"
      accent="orange"
      source={data.source}
      lastUpdated={lastUpdated}
    >
      {data.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No active signals"
          description="Buy, watch and momentum alerts will appear here as they fire."
        />
      ) : (
        <div className="flex flex-col gap-3.5">
          {data.map((signal) => (
            <div key={signal.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-radar-light-text dark:text-radar-white">
                  {signal.project}
                </span>
                <GlowBadge color={KIND_BADGE_COLOR[signal.kind]} className="px-1.5 py-0 text-[10px]">
                  {KIND_LABEL[signal.kind]}
                </GlowBadge>
              </div>
              <ProgressBar
                value={signal.strength}
                showValue={false}
                colorClassName={KIND_BAR_COLOR[signal.kind]}
              />
              <p className="text-[11px] text-radar-light-muted dark:text-radar-muted">{signal.note}</p>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
