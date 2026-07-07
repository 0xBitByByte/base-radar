import { Coins, Eye, FolderKanban, Star, TrendingUp, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/data/format";
import type { WatchlistItem, WatchlistItemKind, WithSource } from "@/lib/data/types";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { EmptyState } from "@/components/ui/EmptyState";

const KIND_ICON: Record<WatchlistItemKind, LucideIcon> = {
  project: FolderKanban,
  wallet: Wallet,
  token: Coins,
  narrative: TrendingUp,
};

type WatchlistWidgetProps = {
  data: WithSource<WatchlistItem[]>;
  lastUpdated: string;
};

export function WatchlistWidget({ data, lastUpdated }: WatchlistWidgetProps) {
  return (
    <WidgetCard
      icon={<Star className="size-5" aria-hidden="true" />}
      title="Watchlist"
      subtitle="Pinned projects, wallets, tokens and narratives"
      accent="primary"
      source={data.source}
      lastUpdated={lastUpdated}
    >
      {data.length === 0 ? (
        <EmptyState
          icon={Eye}
          title="Nothing pinned yet"
          description="Star a project, wallet, token or narrative to track it here."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {data.map((item) => {
            const Icon = KIND_ICON[item.kind];
            return (
              <li key={item.id} className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-radar-light-surface text-radar-light-muted dark:bg-white/5 dark:text-radar-muted">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-radar-light-text dark:text-radar-white">
                    {item.label}
                  </p>
                  <p className="truncate text-[11px] text-radar-light-muted dark:text-radar-muted">
                    {item.sublabel}
                  </p>
                </div>
                {item.changePct24h !== undefined && (
                  <span
                    className={cn(
                      "shrink-0 text-xs font-medium",
                      item.changePct24h >= 0 ? "text-radar-success" : "text-radar-danger"
                    )}
                  >
                    {formatPercent(item.changePct24h)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
