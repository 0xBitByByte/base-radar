import { formatLabel } from "@/components/explorer/format";
import { getChainBrand } from "@/lib/branding/chains";
import { cn } from "@/lib/utils";

type ChainBadgeProps = {
  chain: string;
  size?: "sm" | "default";
  /** Renders icon + label with no border/background/padding of its own, so a consumer that already provides its own chrome (e.g. `Topbar`'s `NetworkBadge` pill) doesn't end up with a pill nested inside a pill. Mirrors `MetricItem`'s existing `bare` prop — same reasoning, same name. */
  bare?: boolean;
  className?: string;
};

/**
 * A chain's official logo + official brand color, always paired with its
 * name as text — color/logo are a decorative accent, never the only way
 * the chain is conveyed, so contrast never depends on a third-party brand
 * hue. This is the one visual signal in Explorer that represents network
 * identity — deliberately distinct from `ProjectCategoryChips`' plain
 * neutral taxonomy pills, which carry no brand color or logo by design.
 * Falls back to a neutral, undecorated pill for any chain id not yet in
 * `CHAIN_BRANDING` (e.g. a future chain the Project Registry adds before
 * this registry catches up) rather than throwing or rendering nothing.
 */
export function ChainBadge({ chain, size = "default", bare, className }: ChainBadgeProps) {
  const brand = getChainBrand(chain);
  const compact = size === "sm";
  const sizeClass = bare ? "gap-1" : compact ? "gap-1 px-1.5 py-0.5 text-[10px]" : "gap-1.5 px-2 py-0.5 text-[10.5px]";
  const iconSizeClass = compact ? "size-3" : "size-3.5";

  if (!brand) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center rounded-full font-medium",
          sizeClass,
          bare
            ? "text-radar-light-muted dark:text-radar-muted"
            : "border border-radar-light-border bg-radar-light-surface text-radar-light-muted dark:border-white/10 dark:bg-white/[0.02] dark:text-radar-muted",
          className
        )}
      >
        {formatLabel(chain)}
      </span>
    );
  }

  const Icon = brand.Icon;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full font-medium text-radar-light-text dark:text-radar-white",
        sizeClass,
        !bare && "border",
        className
      )}
      style={bare ? undefined : { backgroundColor: `${brand.color}1A`, borderColor: `${brand.color}4D` }}
    >
      <Icon className={cn(iconSizeClass, "shrink-0")} />
      {brand.label}
    </span>
  );
}
