import { TokenLogo } from "@/components/branding/TokenLogo";
import { cn } from "@/lib/utils";

type TokenPairClusterProps = {
  /** This project's own real token image (`market.imageUrl`) — omitted/`null` falls back to `TokenLogo`'s own honest initials badge, never a fabricated image. */
  primaryLogoUrl?: string | null;
  primarySymbol: string | null;
  /** Token Logo System — the secondary/quote token's one canonical resolved logo, by contract address or known symbol (`lib/branding/resolveTokenLogo.ts`) — the same URL every page resolves for this symbol, never a different valid image depending on which page asked. `null`/omitted falls back to `TokenLogo`'s honest initials badge, never a fabricated image. */
  secondaryLogoUrl?: string | null;
  secondarySymbol: string | null;
  className?: string;
};

/**
 * PR-089/PR-090 — the one shared "identify both assets in a pair at a
 * glance" cluster: every place this app shows a trading pair (Featured
 * Pools, the standalone Pool Explorer — both via `PairCard`, its only
 * consumer today) renders through this component instead of each owning a
 * copy of the overlap math, so the visual language can never drift between
 * them the way `PairCard`'s own layout once drifted from the Pool
 * Explorer's (see `PoolCardGrid`'s doc comment on that history).
 *
 * PR-090 — a second, evidence-driven overlap reduction after PR-089's first
 * pass (22px/4px offset, ~42% of the secondary covered) was still judged
 * too heavy against a real DexScreener/Uniswap/GeckoTerminal reference: both
 * tokens need to read as independently recognizable, not just "less
 * overlapped than before." Primary grew 32→32px (kept — already within the
 * approved 32–36px band), secondary 24→28px (mid the approved 26–30px
 * band), horizontal offset 22→28px. At these sizes the primary covers
 * exactly 4px of the secondary's 28px width — 14% covered, 86% visible,
 * inside the requested 80–90% band. Vertical offset kept at 4px (still
 * "slight"). Container grew to 56×32 to fit without clipping; `group-hover`
 * (not a self-contained hover) drives the scale, so any future consumer
 * needs its own ancestor `group` class, exactly like `PairCard`'s `<li>`
 * already provides.
 *
 * PR-086.03 — nudged to the top of PR-090's own already-approved bands
 * (32–36px primary, 26–30px secondary): primary 32→36px, secondary 28→30px.
 * The doc comment at the time claimed this preserved "~14% covered/86%
 * visible," but that arithmetic was wrong — the offset stayed at 30px
 * (unchanged from PR-090's 28px + a same-size nudge that didn't account
 * for the larger icons), which at these sizes actually overlapped 6 of the
 * secondary's 30px width (36 - 30 = 6), i.e. 20% covered / 80% visible —
 * the bare edge of, not centered in, the requested band, and the real
 * cause of "hidden behind overlap" live feedback (PR-086.04).
 *
 * PR-086.04 — corrected offset (30px → 33px) with the arithmetic actually
 * verified this time: primary right edge at 38, secondary left edge at 33,
 * overlap = 38 - 33 = 5px of the secondary's 31px width = 16.1% covered,
 * 83.9% visible — inside the requested 80–85% band with real margin, not
 * sitting on its boundary. Primary/secondary also nudged 36→38px/30→31px
 * (a small, deliberately non-"giant" bump, still balanced against each
 * other) per the explicit "increase icon size slightly if needed."
 */
export function TokenPairCluster({ primaryLogoUrl = null, primarySymbol, secondaryLogoUrl = null, secondarySymbol, className }: TokenPairClusterProps) {
  return (
    <div
      className={cn("relative shrink-0 transition-transform duration-300 ease-out group-hover:scale-[1.04]", className)}
      style={{ width: 64, height: 40 }}
    >
      <TokenLogo
        logoUrl={primaryLogoUrl}
        symbol={primarySymbol}
        size={38}
        className="absolute top-0 left-0 z-10 ring-2 ring-radar-light-card dark:ring-radar-card"
      />
      {/* PR-086.06 — `TokenLogo`'s own symbol-fallback badge is now always a
          solid white circle + dark text in both themes (its previous
          dark-mode fallback was a near-transparent overlay that disappeared
          against a dark card), so this call no longer needs to override its
          color/border classes to get that look — only the positioning,
          shadow, and ring this icon needs on top of that default remain. */}
      <TokenLogo
        logoUrl={secondaryLogoUrl}
        symbol={secondarySymbol}
        size={31}
        className="absolute top-1 left-[33px] z-0 shadow-[0_1px_4px_rgba(0,0,0,0.25)] ring-2 ring-radar-light-card dark:ring-radar-card"
      />
    </div>
  );
}
