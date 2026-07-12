import { getChainBrand } from "@/lib/branding/chains";
import { cn } from "@/lib/utils";

type ChainListTooltipProps = {
  chains: string[];
};

/** Muted/neutral color for anything without a brand match — a future chain not yet in the registry, or (defensively) an unrecognized id. */
const FALLBACK_LABEL_CLASS = "text-radar-light-muted dark:text-radar-muted";

/** Shown in place of a raw, unformatted chain id for anything not yet in the registry — clearer to a viewer than guessing at a made-up display name for an id we don't recognize. */
const FALLBACK_LABEL = "Unknown Network";

/**
 * The rich content rendered inside `RichTooltip`'s `variant="list"` slot for
 * every chain overflow ("+N") indicator — Grid, Table, and Quick View all
 * hover the same `ChainBadgeGroup` trigger, so building this once here means
 * all three automatically get one consistent chain list, not three
 * hand-rolled ones. Only ever the scrollable rows — the "Supported Chains"
 * header and the bleed-past-padding wrapper are `RichTooltip`'s job now, not
 * this component's (see `ChainBadgeGroup`'s call site).
 */
export function ChainListTooltip({ chains }: ChainListTooltipProps) {
  // No trigger in this codebase opens this with an empty list today (the
  // one call site guards with `hidden.length > 0`), but a reusable
  // component shouldn't render an empty scroll region if some future
  // caller ever does.
  if (chains.length === 0) return null;

  return (
    <>
      {/* Scrolls independently of the header once the list is long enough
          to risk pushing the tooltip off-screen (a hypothetical future
          project on 10+ chains) — every row stays a uniform 40px whether
          visible or scrolled to. Divider/border opacity kept deliberately
          faint (5% dark / 60% of the light border token) — present for
          rhythm, not a visual competitor to the rows themselves. */}
      <div className="max-h-80 divide-y divide-radar-light-border/60 overflow-y-auto border-t border-radar-light-border/60 dark:divide-white/5 dark:border-white/5">
        {chains.map((chain, index) => {
          const brand = getChainBrand(chain);
          const label = brand?.label ?? FALLBACK_LABEL;
          const Icon = brand?.Icon;
          const isBase = brand?.id === "base";

          return (
            // `key` includes the index: a defensively-deduplicated future
            // caller aside, `chains` is never expected to repeat an id,
            // but two unrecognized ids would otherwise collide on the
            // fallback icon/label alone.
            <div key={`${chain}-${index}`} className="flex items-center gap-3 px-4 py-2.5">
              {Icon ? (
                <Icon className="size-5 shrink-0" />
              ) : (
                <span
                  aria-hidden="true"
                  className="size-5 shrink-0 rounded-full bg-radar-light-border dark:bg-white/10"
                />
              )}
              {/* Name + secondary descriptor share one row (horizontal, not
                  stacked) so the tooltip stays compact — `shortLabel` is
                  registry data, never invented here, and simply doesn't
                  render for any chain that doesn't have one (unrecognized
                  ids show logo + name only). Base carries slightly more
                  weight (600 vs. 500) — this app's own chain, a subtle,
                  not shouted, distinction from the rest of the list. */}
              <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
                <span
                  className={cn(
                    "break-words text-sm",
                    isBase ? "font-semibold" : "font-medium",
                    !brand && FALLBACK_LABEL_CLASS
                  )}
                  style={brand ? { color: brand.color } : undefined}
                >
                  {label}
                </span>
                {brand?.shortLabel && (
                  <span className="shrink-0 text-[10px] font-normal text-radar-light-muted dark:text-radar-muted">
                    {brand.shortLabel}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
