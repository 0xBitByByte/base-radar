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
      {/* `container={document.body}` overrides Base UI's default portal-
          container resolution, which otherwise walks up to the nearest
          ANCESTOR floating-element portal (e.g. `QuickViewDrawer`'s
          `Dialog.Portal`) and nests inside it instead of mounting fresh at
          `document.body`. That matters because `Dialog.Popup` carries a
          Tailwind v4 `translate-x-*` utility — compiled to the native CSS
          `translate` property, which (like `transform`) establishes a new
          containing block for `position: fixed` descendants even at
          `translate: 0px`. A tooltip nested inside that portal is
          contained by the drawer's own transformed, `overflow-y-auto`
          box instead of the real viewport, so it renders clipped/
          mispositioned regardless of z-index. Forcing `document.body`
          here guarantees every tooltip always escapes to a true,
          untransformed containing block, whether it's used inside a
          Dialog or not. */}
      <TooltipPrimitive.Portal container={typeof document !== "undefined" ? document.body : undefined}>
        {/* Three distinct fixes, all required:
            1. `collisionBoundary="clipping-ancestors"` — Base UI's default
               collision check only avoids the true browser viewport edges,
               with no idea that a scrollable ancestor (the Table's own
               `overflow-auto` wrapper, Quick View's scrollable content
               area) has its OWN sticky header painted inside it. Scoping
               the boundary to the nearest clipping ancestor means "is
               there enough room above" is checked against THAT
               container's real edge (right where its sticky header
               sits), not the whole viewport.
            2. `collisionAvoidance={{ align: "none" }}` — Base UI's default
               `align="center"` positioning makes its internal middleware
               order `shift()` BEFORE `flip()` (see
               `useAnchorPositioning.js`), both operating on the main
               (vertical) axis. This is Floating UI's own documented
               shift-vs-flip conflict: `shift` can "resolve" an overflow by
               sliding the popup within the SAME side instead of ever
               reaching `flip`'s side-switching logic, which is exactly why
               `side="top"` never became `bottom` even with zero room
               above. Setting `align: "none"` disables `shift` entirely
               (Base UI ties main- and cross-axis shift to the same
               setting), leaving `flip` as the sole, unobstructed decision-
               maker for which side to render on — placement stays fully
               automatic, it just isn't preempted anymore.
            3. `className="z-[100]"` HERE, not on `Popup` — proven via live
               runtime inspection (real hover + DevTools computed styles):
               Base UI applies `position: absolute` (from Floating UI's
               `floatingStyles`) to THIS element, the Positioner — not to
               `Popup`, which stays `position: static`. A `z-index` only
               has any effect on a positioned element; the `z-[100]`
               previously on `Popup` was silently inert (`position: static`
               ignores z-index per the CSS spec), so the Positioner painted
               at its default `z-index: auto`, which loses to the sticky
               table header's real `position: sticky; z-index: 10`
               regardless of DOM order. Moving the class to the element
               that's actually positioned makes it take effect. */}
        <TooltipPrimitive.Positioner
          side="top"
          sideOffset={8}
          collisionBoundary="clipping-ancestors"
          collisionAvoidance={{ align: "none" }}
          className="z-[100]"
        >
          <TooltipPrimitive.Popup
            className={cn(
              "max-w-64 rounded-lg border border-radar-light-border bg-radar-light-card px-3 py-1.5 text-xs font-medium text-radar-light-text shadow-lg",
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
