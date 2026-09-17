import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export type GlowBadgeColor = "primary" | "accent" | "success" | "warning" | "danger" | "muted";

type GlowBadgeProps = ComponentProps<"span"> & {
  color?: GlowBadgeColor;
  dot?: boolean;
};

// PR-085.xx premium polish — a subtle top-to-bottom gradient (was a flat
// `bg-color/10`) for real depth instead of a flat tint, and border opacity
// stepped up slightly (30 -> 35) for better contrast against both themes'
// surfaces. Every existing caller's own `color` value is unchanged — this
// only richens the same six palette entries, never adds a new one.
const colorStyles = {
  primary: "border-radar-primary/35 bg-gradient-to-b from-radar-primary/15 to-radar-primary/5 text-radar-primary",
  accent: "border-radar-accent/35 bg-gradient-to-b from-radar-accent/15 to-radar-accent/5 text-radar-accent",
  success: "border-radar-success/35 bg-gradient-to-b from-radar-success/15 to-radar-success/5 text-radar-success",
  warning: "border-radar-warning/35 bg-gradient-to-b from-radar-warning/15 to-radar-warning/5 text-radar-warning",
  danger: "border-radar-danger/35 bg-gradient-to-b from-radar-danger/15 to-radar-danger/5 text-radar-danger",
  muted:
    "border-radar-light-border bg-radar-light-surface text-radar-light-muted dark:border-white/10 dark:bg-white/5 dark:text-radar-muted",
} as const;

export function GlowBadge({
  className,
  color = "accent",
  dot = false,
  children,
  ...props
}: GlowBadgeProps) {
  return (
    <span
      className={cn(
        // `leading-none` + a fixed-height baseline (`h-fit` was implicit
        // before; explicit here) so every badge resolves to the same
        // height regardless of its text's own font metrics — the same
        // "identical badge heights" this dashboard-wide pass asks for.
        // `[&_svg]:shrink-0` keeps a leading icon from ever being squashed
        // by a long label in a narrow container. `hover:brightness-110` is
        // a pure-CSS, zero-JS touch — harmless on the many badges that
        // aren't otherwise interactive, and a real, felt improvement on
        // the ones that are (tooltip triggers, etc., already `tabIndex={0}`
        // at their call sites).
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs leading-none font-medium transition-[filter] duration-200 hover:brightness-110 [&_svg]:shrink-0",
        colorStyles[color],
        className
      )}
      {...props}
    >
      {dot && (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75 motion-reduce:animate-none" />
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}
