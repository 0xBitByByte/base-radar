"use client";

import { Progress } from "@base-ui/react/progress";

import { cn } from "@/lib/utils";

type ProgressBarProps = {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  colorClassName?: string;
  className?: string;
};

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  colorClassName = "bg-radar-primary",
  className,
}: ProgressBarProps) {
  return (
    <Progress.Root value={value} max={max} className={cn("flex flex-col gap-1", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-[11px] text-radar-light-muted dark:text-radar-muted">
          {label ? <Progress.Label>{label}</Progress.Label> : <span />}
          {showValue && <Progress.Value />}
        </div>
      )}
      <Progress.Track className="relative h-1.5 w-full overflow-hidden rounded-full bg-radar-light-surface dark:bg-white/10">
        <Progress.Indicator
          className={cn(
            "h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none",
            colorClassName
          )}
        />
      </Progress.Track>
    </Progress.Root>
  );
}
