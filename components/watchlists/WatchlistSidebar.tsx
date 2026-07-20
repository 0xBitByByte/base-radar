"use client";

import { Plus } from "lucide-react";

import type { PersonalWatchlist } from "@/lib/personalization/types";
import { WatchlistCard } from "@/components/watchlists/WatchlistCard";

type WatchlistSidebarProps = {
  watchlists: PersonalWatchlist[];
  activeWatchlistId: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSetActive: (id: string) => void;
  onEdit: (watchlist: PersonalWatchlist) => void;
  onCreate: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
};

function moveWithinGroup(group: PersonalWatchlist[], id: string, direction: -1 | 1): string[] {
  const ids = group.map((watchlist) => watchlist.id);
  const index = ids.indexOf(id);
  const targetIndex = index + direction;
  if (index === -1 || targetIndex < 0 || targetIndex >= ids.length) return ids;
  [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];
  return ids;
}

/**
 * The master list of every watchlist — pinned first, then the rest, each
 * group preserving its own stored order. "Move Up"/"Move Down" reorder
 * within a watchlist's own group (pinned or not) and translate back into a
 * full reordering via `onReorder`, so pinned watchlists always stay first
 * as an invariant of this grouping, not something callers must maintain.
 */
export function WatchlistSidebar({
  watchlists,
  activeWatchlistId,
  selectedId,
  onSelect,
  onSetActive,
  onEdit,
  onCreate,
  onDuplicate,
  onDelete,
  onTogglePin,
  onReorder,
}: WatchlistSidebarProps) {
  const pinned = watchlists.filter((watchlist) => watchlist.pinned);
  const rest = watchlists.filter((watchlist) => !watchlist.pinned);

  function handleMove(id: string, direction: -1 | 1) {
    const target = watchlists.find((watchlist) => watchlist.id === id);
    if (!target) return;
    const group = target.pinned ? pinned : rest;
    const otherGroup = target.pinned ? rest : pinned;
    const reorderedGroupIds = moveWithinGroup(group, id, direction);
    const otherGroupIds = otherGroup.map((watchlist) => watchlist.id);
    onReorder(target.pinned ? [...reorderedGroupIds, ...otherGroupIds] : [...otherGroupIds, ...reorderedGroupIds]);
  }

  function renderGroup(group: PersonalWatchlist[]) {
    return group.map((watchlist, index) => (
      <WatchlistCard
        key={watchlist.id}
        watchlist={watchlist}
        active={watchlist.id === activeWatchlistId}
        selected={watchlist.id === selectedId}
        onSelect={() => onSelect(watchlist.id)}
        onSetActive={() => onSetActive(watchlist.id)}
        onEdit={() => onEdit(watchlist)}
        onDuplicate={() => onDuplicate(watchlist.id)}
        onDelete={() => onDelete(watchlist.id)}
        onTogglePin={() => onTogglePin(watchlist.id)}
        onMoveUp={() => handleMove(watchlist.id, -1)}
        onMoveDown={() => handleMove(watchlist.id, 1)}
        canMoveUp={index > 0}
        canMoveDown={index < group.length - 1}
      />
    ));
  }

  return (
    <nav aria-label="Watchlists" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-radar-light-text dark:text-radar-white">Your Watchlists</h2>
        <button
          type="button"
          onClick={onCreate}
          aria-label="Create a new watchlist"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-radar-primary outline-none transition-colors hover:bg-radar-primary/10 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-accent dark:hover:bg-radar-accent/10"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          New
        </button>
      </div>

      <div className="flex flex-col gap-1">
        {pinned.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="px-2.5 text-[10.5px] font-semibold tracking-[0.1em] text-radar-light-muted uppercase dark:text-radar-muted/60">
              Pinned
            </p>
            {renderGroup(pinned)}
          </div>
        )}
        {rest.length > 0 && (
          <div className="flex flex-col gap-1">
            {pinned.length > 0 && (
              <p className="px-2.5 pt-3 text-[10.5px] font-semibold tracking-[0.1em] text-radar-light-muted uppercase dark:text-radar-muted/60">
                All Watchlists
              </p>
            )}
            {renderGroup(rest)}
          </div>
        )}
      </div>
    </nav>
  );
}
