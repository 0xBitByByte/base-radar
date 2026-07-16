import type { ComponentType } from "react";

/** A lucide icon or one of this codebase's inline brand marks (`components/ui/BrandIcons.tsx`) — both accept `{ className }` and render an `<svg>`. */
export type BrandIconComponent = ComponentType<{ className?: string }>;

export type ChainBrand = {
  id: string;
  label: string;
  /** Official brand color, hex — drives the badge's background wash/border tint. Body text always stays in the app's own neutral tokens, so contrast never depends on a third-party brand hue. */
  color: string;
  /** The chain's simplified official logomark (`components/branding/ChainIcons.tsx`) — carries its own brand coloring, not `currentColor`. */
  Icon: BrandIconComponent;
  /** Broad network classification (`"L1"` | `"L2"` | `"sidechain"`) — registry metadata for future consumers; not currently rendered anywhere. */
  networkType?: string;
  /** A short (1-3 word) secondary descriptor — e.g. `"Layer 2"`, `"PoS Chain"`, `"C-Chain"` — rendered next to the chain name in `ChainListTooltip`. Omitted entirely (not a placeholder) for any chain without one, so unrecognized/future chains simply show logo + name. */
  shortLabel?: string;
  /** A slightly longer descriptor for future richer surfaces (e.g. a Project Profile page) — not rendered by `ChainListTooltip` today. */
  description?: string;
  /** EIP-155 numeric chain id (e.g. `8453` for Base). Omitted for non-EVM chains (Solana) rather than filled with an invented number. Not rendered anywhere yet — future-ready registry metadata only. */
  chainId?: number;
  /** The chain's native gas/currency symbol (e.g. `"ETH"`, `"AVAX"`). Not rendered anywhere yet. */
  nativeCurrency?: string;
  /** Same broad L1/L2/sidechain classification as `networkType`, kept as a separate field per the registry spec this was requested under — not rendered anywhere yet. */
  layer?: string;
  /** The chain's parent ecosystem/settlement layer (e.g. Base and Arbitrum both roll up to `"Ethereum"`). Not rendered anywhere yet. */
  ecosystem?: string;
  /** The chain's primary public block explorer. Not rendered anywhere yet. */
  explorerUrl?: string;
};

export type ProviderBrand = {
  label: string;
  Icon: BrandIconComponent | null;
  /** One sentence describing what this provider actually supplies — rendered by `ProviderBadge`'s info tooltip. */
  description: string;
};

export type SocialPlatform =
  | "website"
  | "docs"
  | "github"
  | "discord"
  | "telegram"
  | "x"
  | "medium"
  | "mirror"
  | "farcaster"
  | "linktree"
  | "blog"
  | "forum"
  | "linkedin"
  | "governance";

export type SocialBrand = {
  label: string;
  Icon: BrandIconComponent | null;
  /** Tailwind hover classes carrying this platform's official brand color (e.g. Discord's blurple) — the literal string lives here once so every consumer (Sidebar, Footer, ...) shares it instead of each hardcoding its own copy. Omitted for platforms that use a generic neutral hover instead of a brand-specific one. */
  hoverClassName?: string;
};
