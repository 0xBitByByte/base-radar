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
 * promotional lockup.
 */
export function ProviderBadge({ provider, showLabel = true, className }: ProviderBadgeProps) {
  const { label, Icon } = PROVIDER_BRANDING[provider];

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      {Icon && <Icon className="size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />}
      {showLabel && <span className="truncate">{label}</span>}
    </span>
  );
}
