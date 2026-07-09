"use client";

import type { ReactNode } from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { cn } from "@/lib/utils";

type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      {/* `display: contents` here previously made this element generate no
          box of its own — `getBoundingClientRect()` on a `contents` element
          resolves to `{0,0,0,0}`, so the Positioner anchored every tooltip
          to the viewport's top-left corner instead of the trigger. `inline-flex`
          gives the Positioner a real rect to anchor against, sized tightly to
          the trigger content with no stray inline-baseline whitespace. */}
      <TooltipPrimitive.Trigger
        delay={150}
        render={<span className={cn("inline-flex items-center", className)} />}
      >
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side="top" sideOffset={8}>
          <TooltipPrimitive.Popup
            className={cn(
              "z-50 max-w-64 rounded-lg border border-radar-light-border bg-radar-light-card px-3 py-1.5 text-xs font-medium text-radar-light-text shadow-lg",
              "dark:border-white/10 dark:bg-radar-card dark:text-radar-white",
              "transition-[opacity,transform] duration-150 motion-reduce:transition-none",
              "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
            )}
          >
            {content}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
