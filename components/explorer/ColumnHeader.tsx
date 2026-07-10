import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const TABLE_HEADER_CELL_CLASS =
  "px-3 py-2.5 text-left text-[10.5px] font-medium whitespace-nowrap uppercase tracking-wide text-radar-light-muted dark:text-radar-muted";

/** Shared, explicit width for the Actions column's header (`<th>`) and every row's action cell (`<td>`) — a table cell's width is only reliably fixed when both share the same class, since `table-layout: auto` otherwise resolves it from content. Sized for the "View" button (49px) plus even breathing room on each side. */
export const ACTION_COLUMN_CLASS = "w-20";

type ColumnHeaderProps = {
  label: string;
  align?: "left" | "right";
  srOnly?: boolean;
  className?: string;
  children?: ReactNode;
};

/** A static, non-sortable column label — docs/explorer/04 §10. */
export function ColumnHeader({ label, align = "left", srOnly, className, children }: ColumnHeaderProps) {
  return (
    <th scope="col" className={cn(TABLE_HEADER_CELL_CLASS, align === "right" && "text-right", className)}>
      {srOnly ? <span className="sr-only">{label}</span> : (children ?? label)}
    </th>
  );
}
