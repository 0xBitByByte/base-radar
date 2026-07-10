import { ChainBadge } from "@/components/branding/ChainBadge";
import { ChainListTooltip } from "@/components/branding/ChainListTooltip";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { Tooltip } from "@/components/ui/Tooltip";
import { getDisplayChains } from "@/lib/branding/chains";
import { cn } from "@/lib/utils";

type ChainBadgeGroupProps = {
  chains: string[];
  size?: "sm" | "default";
  /** Caps how many chains render as individual badges before the rest collapse into a "+N" indicator. Omit to always show every chain (Quick View's behavior — it has room for the full list). Grid/Table pass an explicit cap sized to their available width. */
  max?: number;
  className?: string;
};

/**
 * A project's full `chains` array, rendered consistently everywhere
 * Explorer shows chain identity — Grid, Table, Quick View, and any future
 * consumer (e.g. Project Profile) — instead of each screen reimplementing
 * its own "how many chains fit, what happens to the rest" logic. Never
 * truncates to a single "primary" chain: a project deployed on six chains
 * is genuinely deployed on six chains, and showing only one misrepresents
 * it. Overflow ("+N") is always hoverable — its tooltip shows every
 * supported chain (`all`), not just the hidden remainder, so Base never
 * appears to "disappear" just because it's already visible as its own
 * badge. Always Base-first (`getDisplayChains`) — Base Radar never
 * displays chains in raw API/registry array order.
 */
export function ChainBadgeGroup({ chains, size = "default", max, className }: ChainBadgeGroupProps) {
  const { visible, hidden, all } = getDisplayChains(chains, max);

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {visible.map((chain) => (
        <ChainBadge key={chain} chain={chain} size={size} />
      ))}
      {hidden.length > 0 && (
        <Tooltip content={<ChainListTooltip chains={all} />}>
          <GlowBadge
            color="muted"
            tabIndex={0}
            className={cn(
              "cursor-default outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50",
              size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[10.5px]"
            )}
          >
            +{hidden.length}
          </GlowBadge>
        </Tooltip>
      )}
    </div>
  );
}
