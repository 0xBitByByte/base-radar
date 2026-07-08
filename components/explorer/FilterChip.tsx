"use client";

import { X } from "lucide-react";

import { GlowBadge } from "@/components/ui/GlowBadge";

type FilterChipProps = {
  label: string;
  onRemove: () => void;
};

/** One active filter value, individually removable — docs/explorer/04-component-specification.md §8. Stateless. */
export function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <GlowBadge color="primary" className="gap-1 border-radar-primary/50 bg-radar-primary/15 pr-1.5 font-semibold">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="flex size-4 items-center justify-center rounded-full outline-none transition-colors hover:bg-radar-primary/20 focus-visible:ring-2 focus-visible:ring-radar-primary/50"
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </GlowBadge>
  );
}
