"use client";

import { CheckCircle2, ChevronDown, ChevronUp, Copy, MoreHorizontal, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { Menu } from "@base-ui/react/menu";

import { cn } from "@/lib/utils";
import type { PersonalWatchlist } from "@/lib/personalization/types";
import { WATCHLIST_COLOR_CLASSES, WATCHLIST_ICON_COMPONENTS } from "@/components/watchlists/meta";

type WatchlistCardProps = {
  watchlist: PersonalWatchlist;
  active: boolean;
  selected: boolean;
  onSelect: () => void;
  onSetActive: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

/**
 * One watchlist's row — icon, name, description, project count, pin/active
 * indicators, and an action menu (Rename/Duplicate/Set Active/Pin/Delete).
 * Rendered by `WatchlistSidebar` for every watchlist in `useWatchlists()`.
 * Reorder is two buttons (Move Up/Down) rather than drag-and-drop, keeping
 * this dependency-free and fully keyboard-operable.
 */
export function WatchlistCard({
  watchlist,
  active,
  selected,
  onSelect,
  onSetActive,
  onEdit,
  onDuplicate,
  onDelete,
  onTogglePin,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: WatchlistCardProps) {
  const Icon = WATCHLIST_ICON_COMPONENTS[watchlist.icon];
  const colorClasses = WATCHLIST_COLOR_CLASSES[watchlist.color];

  return (
    <div
      className={cn(
        "group flex items-center gap-2.5 rounded-xl border px-2.5 py-2.5 transition-colors",
        selected
          ? "border-radar-primary/40 bg-radar-light-surface dark:border-radar-accent/40 dark:bg-white/5"
          : "border-transparent hover:bg-radar-light-surface dark:hover:bg-white/5"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50 rounded-lg"
      >
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", colorClasses.bg)}>
          <Icon className={cn("size-4", colorClasses.text)} aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-radar-light-text dark:text-radar-white">{watchlist.name}</span>
            {watchlist.pinned && <Pin className="size-3 shrink-0 fill-current text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />}
            {active && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-radar-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-radar-success">
                <CheckCircle2 className="size-2.5" aria-hidden="true" />
                Active
              </span>
            )}
          </span>
          <span className="truncate text-xs text-radar-light-muted dark:text-radar-muted">
            {watchlist.projectIds.length} {watchlist.projectIds.length === 1 ? "project" : "projects"}
          </span>
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 has-[[data-open]]:opacity-100">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={!canMoveUp}
          aria-label={`Move "${watchlist.name}" up`}
          className="flex size-7 items-center justify-center rounded-lg text-radar-light-muted outline-none transition-colors hover:bg-radar-light-card focus-visible:ring-2 focus-visible:ring-radar-primary/50 disabled:pointer-events-none disabled:opacity-30 dark:text-radar-muted dark:hover:bg-white/10"
        >
          <ChevronUp className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={!canMoveDown}
          aria-label={`Move "${watchlist.name}" down`}
          className="flex size-7 items-center justify-center rounded-lg text-radar-light-muted outline-none transition-colors hover:bg-radar-light-card focus-visible:ring-2 focus-visible:ring-radar-primary/50 disabled:pointer-events-none disabled:opacity-30 dark:text-radar-muted dark:hover:bg-white/10"
        >
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </button>

        <Menu.Root>
          <Menu.Trigger
            aria-label={`Actions for "${watchlist.name}"`}
            className="flex size-7 items-center justify-center rounded-lg text-radar-light-muted outline-none transition-colors hover:bg-radar-light-card focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/10"
          >
            <MoreHorizontal className="size-3.5" aria-hidden="true" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner side="bottom" align="end" sideOffset={6}>
              <Menu.Popup
                className={cn(
                  "min-w-[180px] rounded-2xl border border-radar-light-border bg-radar-light-card/95 p-1.5 shadow-xl backdrop-blur-xl outline-none dark:border-white/10 dark:bg-radar-card/95",
                  "transition-[opacity,transform] duration-150 motion-reduce:transition-none",
                  "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
                )}
              >
                {!active && (
                  <Menu.Item
                    onClick={onSetActive}
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-radar-light-text outline-none transition-colors data-[highlighted]:bg-radar-light-surface dark:text-radar-muted dark:data-[highlighted]:bg-white/5 dark:data-[highlighted]:text-radar-white"
                  >
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    Set Active
                  </Menu.Item>
                )}
                <Menu.Item
                  onClick={onEdit}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-radar-light-text outline-none transition-colors data-[highlighted]:bg-radar-light-surface dark:text-radar-muted dark:data-[highlighted]:bg-white/5 dark:data-[highlighted]:text-radar-white"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                  Rename / Edit
                </Menu.Item>
                <Menu.Item
                  onClick={onTogglePin}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-radar-light-text outline-none transition-colors data-[highlighted]:bg-radar-light-surface dark:text-radar-muted dark:data-[highlighted]:bg-white/5 dark:data-[highlighted]:text-radar-white"
                >
                  {watchlist.pinned ? <PinOff className="size-4" aria-hidden="true" /> : <Pin className="size-4" aria-hidden="true" />}
                  {watchlist.pinned ? "Unpin" : "Pin"}
                </Menu.Item>
                <Menu.Item
                  onClick={onDuplicate}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-radar-light-text outline-none transition-colors data-[highlighted]:bg-radar-light-surface dark:text-radar-muted dark:data-[highlighted]:bg-white/5 dark:data-[highlighted]:text-radar-white"
                >
                  <Copy className="size-4" aria-hidden="true" />
                  Duplicate
                </Menu.Item>
                <div className="my-1 h-px bg-radar-light-border dark:bg-white/10" />
                <Menu.Item
                  onClick={onDelete}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-radar-danger outline-none transition-colors data-[highlighted]:bg-radar-danger/10"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Delete
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
    </div>
  );
}
