import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export type GlowBadgeColor = "primary" | "accent" | "success" | "warning" | "danger" | "muted";

type GlowBadgeProps = ComponentProps<"span"> & {
  color?: GlowBadgeColor;
  dot?: boolean;
};

const colorStyles = {
  primary: "border-radar-primary/30 bg-radar-primary/10 text-radar-primary",
  accent: "border-radar-accent/30 bg-radar-accent/10 text-radar-accent",
  success: "border-radar-success/30 bg-radar-success/10 text-radar-success",
  warning: "border-radar-warning/30 bg-radar-warning/10 text-radar-warning",
  danger: "border-radar-danger/30 bg-radar-danger/10 text-radar-danger",
  muted: "border-white/10 bg-white/5 text-radar-muted",
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
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        colorStyles[color],
        className
      )}
      {...props}
    >
      {dot && (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}
