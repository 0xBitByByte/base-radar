import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type IntelligenceBadgeProps = {
  /** `"full"` renders the icon + "AI Intelligence" label (section headers, widget titles). `"icon"` renders just the sparkle (Sidebar's additive indicator, where space is tight). */
  variant?: "full" | "icon";
  className?: string;
};

/**
 * The one reusable "this is AI-derived, not a raw alert" marker — reused
 * across the Alerts page's Intelligence section header, the Dashboard's AI
 * Intelligence widget title, and the Sidebar's additive sparkle indicator,
 * so all three read as the same feature rather than three different visual
 * languages. Color reuses `radar-purple` — already this codebase's
 * established "AI" accent (`Topbar.tsx`'s existing "AI Summary" button uses
 * the same token), not a new one.
 */
export function IntelligenceBadge({ variant = "full", className }: IntelligenceBadgeProps) {
  if (variant === "icon") {
    return (
      <span
        className={cn("flex items-center justify-center text-radar-purple", className)}
        role="img"
        aria-label="AI Intelligence available"
      >
        <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border border-radar-purple/30 bg-radar-purple/10 px-2 py-0.5 text-[10.5px] font-semibold text-radar-purple",
        className
      )}
    >
      <Sparkles className="size-3 shrink-0" aria-hidden="true" />
      AI Intelligence
    </span>
  );
}
