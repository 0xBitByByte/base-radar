"use client";

import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SearchableItem } from "@/lib/search/types";

type CommandItemProps = {
  item: SearchableItem;
  active: boolean;
  onSelect: (item: SearchableItem) => void;
  onHover: () => void;
};

/** One row in the palette's results list — a Command, Project, Timeline event, Notification, Automation result, Portfolio, or Daily Brief entry, all sharing the same `SearchableItem` shape (PR21 Part 2). `role="option"`/`aria-selected` pair with `CommandResults`' `role="listbox"` and the input's `aria-activedescendant`. */
export function CommandItem({ item, active, onSelect, onHover }: CommandItemProps) {
  const Icon = item.icon;

  return (
    <button
      id={`command-item-${item.id}`}
      type="button"
      role="option"
      aria-selected={active}
      onClick={() => onSelect(item)}
      onMouseEnter={onHover}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm outline-none transition-colors",
        "text-radar-light-text dark:text-radar-white",
        active
          ? "bg-radar-light-surface ring-1 ring-inset ring-radar-primary/30 dark:bg-white/5"
          : "hover:bg-radar-light-surface dark:hover:bg-white/5"
      )}
    >
      <Icon className="size-4 shrink-0 text-radar-primary dark:text-radar-accent" aria-hidden="true" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{item.title}</span>
        <span className="truncate text-xs text-radar-light-muted dark:text-radar-muted">{item.description}</span>
      </span>
      <ChevronRight className="size-3.5 shrink-0 opacity-40" aria-hidden="true" />
    </button>
  );
}
