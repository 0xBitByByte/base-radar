import { Layers, Plus } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

type WatchlistEmptyProps = {
  onCreate: () => void;
};

/** Shown only when every watchlist has been deleted — reuses the shared `EmptyState` primitive, same as every other feature's empty state this session. */
export function WatchlistEmpty({ onCreate }: WatchlistEmptyProps) {
  return (
    <EmptyState
      icon={Layers}
      title="No watchlists yet."
      description="Create a watchlist to start organizing projects into your own collections."
      action={
        <button
          type="button"
          onClick={onCreate}
          className="flex items-center gap-1.5 rounded-lg border border-radar-light-border px-3 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Create Watchlist
        </button>
      }
      className="py-16"
    />
  );
}
