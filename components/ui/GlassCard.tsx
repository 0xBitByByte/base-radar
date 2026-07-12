import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type GlassCardProps = ComponentProps<"div"> & {
  glow?: boolean;
};

export function GlassCard({ className, glow = false, children, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-3xl border border-radar-light-border bg-gradient-to-b from-radar-light-card/80 to-radar-light-surface/60 shadow-[0_1px_2px_rgba(16,34,58,0.04)] backdrop-blur-xl",
        "dark:border-radar-border dark:bg-gradient-to-b dark:from-radar-elevated/70 dark:to-radar-card/70 dark:shadow-[0_1px_2px_rgba(0,0,0,0.2)]",
        glow && "shadow-[0_0_50px_-10px_rgba(var(--color-radar-primary-rgb),0.12)] dark:shadow-[0_0_50px_-10px_rgba(var(--color-radar-primary-rgb),0.15)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
