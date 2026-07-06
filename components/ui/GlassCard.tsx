import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type GlassCardProps = ComponentProps<"div"> & {
  glow?: boolean;
};

export function GlassCard({ className, glow = false, children, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-3xl border border-white/10 bg-radar-card/60 backdrop-blur-xl",
        glow && "shadow-[0_0_60px_-15px_var(--color-radar-primary)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
