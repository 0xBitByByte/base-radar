import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { BrandIconComponent } from "@/lib/branding/types";

export type RichTooltipAccent = "primary" | "success" | "warning" | "danger" | "muted";

type RichTooltipProps = {
  /** A lucide icon or one of this codebase's inline brand marks (`components/ui/BrandIcons.tsx`) — both satisfy this shape. */
  icon?: BrandIconComponent;
  title?: string;
  description?: ReactNode;
  accent?: RichTooltipAccent;
  footer?: ReactNode;
  children?: ReactNode;
  /** "list" is the one structural exception — Chain's full-bleed, scrollable, per-row-icon list needs its own layout, not a title+description paragraph. See `ChainListTooltip`. */
  variant?: "text" | "list";
};

const ACCENT_CLASS: Record<RichTooltipAccent, string> = {
  primary: "text-radar-primary dark:text-radar-accent",
  success: "text-radar-success",
  warning: "text-radar-warning",
  danger: "text-radar-danger",
  muted: "text-radar-light-muted dark:text-radar-muted",
};

/**
 * The one shared content wrapper rendered inside every informational
 * `Tooltip`'s `content` prop — Health/Confidence (`ScoreBadge`), Verification
 * (`VerificationBadge`), every metric info icon including GitHub Stars
 * (`MetricItem`), and Provider (`ProviderBadge`) all compose this instead of
 * hand-building their own title/description/divider markup, so every
 * informational tooltip in the app shares identical spacing, typography,
 * and footer/divider treatment — Quick View, Grid, and Table included,
 * since they all render the same component instance, not lookalikes.
 */
export function RichTooltip({
  icon: Icon,
  title,
  description,
  accent = "muted",
  footer,
  children,
  variant = "text",
}: RichTooltipProps) {
  if (variant === "list") {
    return (
      <div className="-mx-3 w-max min-w-[220px] max-w-64 overflow-hidden rounded-lg">
        {title && (
          <div className="px-4 pb-3 text-xs font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
            {title}
          </div>
        )}
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {title && (
        <p className="flex items-center gap-1.5 font-semibold">
          {Icon && <Icon className={cn("size-3.5 shrink-0", ACCENT_CLASS[accent])} aria-hidden="true" />}
          {title}
        </p>
      )}
      {description && <p>{description}</p>}
      {children}
      {footer && (
        <p className="mt-0.5 border-t border-radar-light-border/60 pt-1 text-[11px] text-radar-light-muted/70 dark:border-white/5 dark:text-radar-muted/50">
          {footer}
        </p>
      )}
    </div>
  );
}
