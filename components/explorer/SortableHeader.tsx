import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { TABLE_HEADER_CELL_CLASS } from "@/components/explorer/ColumnHeader";
import { toggleSort, type SortField, type SortState } from "@/components/explorer/sort";
import { cn } from "@/lib/utils";

type SortableHeaderProps = {
  field: SortField;
  label: string;
  align?: "left" | "right";
  sort: SortState;
  onSortChange: (next: SortState) => void;
  /** Extra `<th>` classes — used once, by `ExplorerTableHeader`, to pin the Name column. */
  className?: string;
};

/**
 * A `ColumnHeader` variant that sorts on click and reverses direction on a
 * second click (docs/explorer/03 §9) — writes into the same shared `sort`
 * state `ExplorerSort` owns; there is never a second sort state. Exposes
 * its direction via `aria-sort`, not only the icon (docs/explorer/03 §20).
 */
export function SortableHeader({ field, label, align = "left", sort, onSortChange, className }: SortableHeaderProps) {
  const isActive = sort.field === field;
  const ariaSort = isActive ? (sort.direction === "asc" ? "ascending" : "descending") : "none";

  const Icon = isActive ? (sort.direction === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={cn(TABLE_HEADER_CELL_CLASS, align === "right" && "min-w-20 text-right", className)}
    >
      <button
        type="button"
        onClick={() => onSortChange(toggleSort(sort, field))}
        className={cn(
          "inline-flex items-center gap-1 rounded outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50",
          isActive ? "text-radar-primary" : "text-radar-light-muted hover:text-radar-light-text dark:text-radar-muted dark:hover:text-radar-white"
        )}
      >
        <Icon className="size-3 shrink-0" aria-hidden="true" />
        {label}
      </button>
    </th>
  );
}
