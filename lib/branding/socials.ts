import { MessagesSquare, Newspaper, Vote } from "lucide-react";

import {
  BaseScanMark,
  CoinGeckoMark,
  DefiLlamaMark,
  DiscordMark,
  DocsMark,
  FarcasterMark,
  GithubMark,
  LinkedInMark,
  LinktreeMark,
  MediumMark,
  MirrorMark,
  RedditMark,
  TelegramMark,
  WebsiteMark,
  XMark,
  YoutubeMark,
} from "@/components/ui/BrandIcons";
import { SITE } from "@/constants/site";
import type { BrandIconComponent, SocialBrand, SocialPlatform } from "@/lib/branding/types";

/**
 * Display metadata for every external link platform this registry supports.
 * Every platform with a real, recognizable brand mark uses one (`BrandIcons`)
 * rather than a generic lucide substitute (PR-050 Req 2 — "never use a
 * generic globe/link icon when a platform-specific icon exists"). `website`
 * and `docs` aren't branded platforms (no company owns "documentation" or
 * "the web"), so there's no logo to be faithful to — PR-078B review pass
 * still upgraded both from plain lucide outlines (`Globe`/`BookOpen`) to
 * filled, colored glyphs (`WebsiteMark`/`DocsMark`) for the same "reads as
 * a real icon, not a wireframe" bar the branded marks meet. `blog`/`forum`/
 * `governance` stay on generic lucide icons for the same "not a branded
 * platform" reason, just without a custom replacement yet.
 * Farcaster isn't in PR8A's named platform list but is real, existing
 * project data (`Community.socials.farcaster`) that `QuickViewCommunity`
 * already rendered pre-PR8A — included so that link has a home here too,
 * instead of staying on a separate, un-migrated path. Linktree is Base
 * Radar's own site-wide community link (`constants/site.ts`
 * `SITE.social.linktree`) — not a per-project social field, but the same
 * "one place per platform" principle applies.
 *
 * `hoverClassName` is set only for platforms whose brand color was
 * previously hardcoded independently in both `Sidebar.tsx` and
 * `Footer.tsx` (Discord/Telegram/Linktree) — centralizing it here removes
 * that duplication. GitHub/X intentionally have no `hoverClassName`: each
 * consumer's neutral hover treatment differs slightly by design (Sidebar
 * supports both themes, Footer is dark-only), so unifying them would force
 * an identical treatment onto two legitimately different contexts.
 *
 * `coingecko`/`defillama`/`explorer` (PR13.7 Goal 1) aren't social
 * platforms — they're data-source/explorer links the Project Profile Hero
 * renders in the same icon row. `reddit`/`youtube` have no `SocialLinks`
 * schema field at all (no project in the registry has ever populated one)
 * — the Hero always renders them disabled ("Not available") rather than
 * omitting them, per Goal 1's "never hide icons" rule.
 */
export const SOCIAL_BRANDING: Record<SocialPlatform, SocialBrand> = {
  website: { label: "Website", Icon: WebsiteMark },
  docs: { label: "Docs", Icon: DocsMark },
  github: { label: "GitHub", Icon: GithubMark },
  discord: { label: "Discord", Icon: DiscordMark, hoverClassName: "hover:bg-[#5865F2]/10 hover:text-[#5865F2]" },
  telegram: { label: "Telegram", Icon: TelegramMark, hoverClassName: "hover:bg-[#26A5E4]/10 hover:text-[#26A5E4]" },
  x: { label: "X (Twitter)", Icon: XMark, hoverClassName: "hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2]" },
  medium: { label: "Medium", Icon: MediumMark },
  mirror: { label: "Mirror", Icon: MirrorMark },
  farcaster: { label: "Farcaster", Icon: FarcasterMark, hoverClassName: "hover:bg-[#855DCD]/10 hover:text-[#855DCD]" },
  linktree: { label: "Linktree", Icon: LinktreeMark, hoverClassName: "hover:bg-[#43E55E]/10 hover:text-[#43E55E]" },
  blog: { label: "Blog", Icon: Newspaper },
  forum: { label: "Forum", Icon: MessagesSquare },
  linkedin: { label: "LinkedIn", Icon: LinkedInMark, hoverClassName: "hover:bg-[#0A66C2]/10 hover:text-[#0A66C2]" },
  governance: { label: "Governance", Icon: Vote },
  coingecko: { label: "CoinGecko", Icon: CoinGeckoMark, hoverClassName: "hover:bg-[#8DC63F]/10 hover:text-[#8DC63F]" },
  defillama: { label: "DefiLlama", Icon: DefiLlamaMark },
  explorer: { label: "BaseScan", Icon: BaseScanMark },
  reddit: { label: "Reddit", Icon: RedditMark, hoverClassName: "hover:bg-[#FF4500]/10 hover:text-[#FF4500]" },
  youtube: { label: "YouTube", Icon: YoutubeMark, hoverClassName: "hover:bg-[#FF0000]/10 hover:text-[#FF0000]" },
};

export type SocialNavLink = {
  label: string;
  ariaLabel: string;
  href: string;
  Icon: BrandIconComponent;
  hoverClassName: string;
};

/**
 * The Base Radar-wide social row (`Sidebar`, `Footer`) — every field but
 * the neutral GitHub/X hover was already duplicated identically between
 * the two consumers, so it's built once here. `neutralHoverClassName` stays
 * a parameter rather than living in the registry: Sidebar is theme-aware
 * and Footer is dark-only, a real, intentional difference the two callers
 * still control themselves.
 */
export function buildSocialNavLinks(neutralHoverClassName: string): SocialNavLink[] {
  return [
    {
      label: "GitHub",
      ariaLabel: "Visit Base Radar GitHub",
      href: SITE.social.github,
      Icon: GithubMark,
      hoverClassName: neutralHoverClassName,
    },
    {
      label: "X (Twitter)",
      ariaLabel: "Follow Base Radar on X",
      href: SITE.social.x,
      Icon: XMark,
      hoverClassName: neutralHoverClassName,
    },
    {
      label: "Discord",
      ariaLabel: "Join Base Radar on Discord",
      href: SITE.social.discord,
      Icon: DiscordMark,
      hoverClassName: SOCIAL_BRANDING.discord.hoverClassName ?? "",
    },
    {
      label: "Telegram",
      ariaLabel: "Join Base Radar Telegram",
      href: SITE.social.telegram,
      Icon: TelegramMark,
      hoverClassName: SOCIAL_BRANDING.telegram.hoverClassName ?? "",
    },
    {
      label: "Linktree",
      ariaLabel: "Visit Base Radar Linktree",
      href: SITE.social.linktree,
      Icon: LinktreeMark,
      hoverClassName: SOCIAL_BRANDING.linktree.hoverClassName ?? "",
    },
  ];
}
