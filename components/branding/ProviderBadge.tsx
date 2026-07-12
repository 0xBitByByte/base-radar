import { RichTooltip } from "@/components/ui/RichTooltip";
import { Tooltip } from "@/components/ui/Tooltip";
import { PROVIDER_BRANDING } from "@/lib/branding/providers";
import { cn } from "@/lib/utils";
import type { ProviderName } from "@/lib/providers/common/types";

type ProviderBadgeProps = {
  provider: ProviderName;
  showLabel?: boolean;
  className?: string;
};

/**
 * A provider's icon (+ optional label) — the single source `ProviderIndicator`
 * (Quick View's Sources section) composes instead of hand-rolling its own
 * label lookup. Deliberately subtle: icons stay muted-toned, never a
 * bright per-provider brand color — this is attribution, not a
 * promotional lockup. Hovering explains what the provider actually supplies,
 * sourced from the same registry entry, never a one-off sentence per call site.
 */
export function ProviderBadge({ provider, showLabel = true, className }: ProviderBadgeProps) {
  const { label, Icon, description } = PROVIDER_BRANDING[provider];

  return (
    <Tooltip content={<RichTooltip icon={Icon ?? undefined} title={label} description={description} />}>
      <span
        tabIndex={0}
        aria-label={showLabel ? undefined : label}
        className={cn(
          "inline-flex min-w-0 items-center gap-1.5 rounded outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50",
          className
        )}
      >
        {Icon && <Icon className="size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />}
        {showLabel && <span className="truncate">{label}</span>}
      </span>
    </Tooltip>
  );
}
