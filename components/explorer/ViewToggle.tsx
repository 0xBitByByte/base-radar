import { LayoutGrid, Table2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type ExplorerView = "grid" | "table";

type ViewToggleProps = {
  value: ExplorerView;
  onChange: (value: ExplorerView) => void;
};

const BUTTON_CLASS =
  "flex size-8 shrink-0 items-center justify-center rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50";
const ACTIVE_CLASS = "bg-radar-primary/10 text-radar-primary";
const INACTIVE_CLASS =
  "text-radar-light-muted hover:text-radar-light-text dark:text-radar-muted dark:hover:text-radar-white";

/** Two-option Grid/Table switch (docs/explorer/04 §7) — the only new Toolbar state PR5 introduces. */
export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="View"
      className="flex items-center gap-1 rounded-xl border border-radar-light-border bg-radar-light-surface p-1 dark:border-white/10 dark:bg-white/5"
    >
      <button
        type="button"
        aria-pressed={value === "grid"}
        onClick={() => onChange("grid")}
        className={cn(BUTTON_CLASS, value === "grid" ? ACTIVE_CLASS : INACTIVE_CLASS)}
      >
        <LayoutGrid className="size-4" aria-hidden="true" />
        <span className="sr-only">Grid view</span>
      </button>
      <button
        type="button"
        aria-pressed={value === "table"}
        onClick={() => onChange("table")}
        className={cn(BUTTON_CLASS, value === "table" ? ACTIVE_CLASS : INACTIVE_CLASS)}
      >
        <Table2 className="size-4" aria-hidden="true" />
        <span className="sr-only">Table view</span>
      </button>
    </div>
  );
}
