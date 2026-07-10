import { BookOpen, FileText, Globe, MessageCircle, PenLine, Send } from "lucide-react";

import { DiscordMark, GithubMark, LinktreeMark, XMark } from "@/components/ui/BrandIcons";
import { SITE } from "@/constants/site";
import type { BrandIconComponent, SocialBrand, SocialPlatform } from "@/lib/branding/types";

/**
 * Display metadata for every external link platform `SocialLink` supports.
 * Real brand marks are used where this codebase already has one
 * (`BrandIcons`: GitHub, Discord, X, Linktree); everything else gets a
 * generic, representative icon rather than a fabricated logo — the same
 * choice this codebase already made for Telegram (lucide's `Send`) before
 * this registry existed. Farcaster isn't in PR8A's named platform list but
 * is real, existing project data (`Community.socials.farcaster`) that
 * `QuickViewCommunity` already rendered pre-PR8A — included so that link
 * has a home here too, instead of staying on a separate, un-migrated path.
 * Linktree is Base Radar's own site-wide community link (`constants/site.ts`
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
 */
export const SOCIAL_BRANDING: Record<SocialPlatform, SocialBrand> = {
  website: { label: "Website", Icon: Globe },
  docs: { label: "Docs", Icon: BookOpen },
  github: { label: "GitHub", Icon: GithubMark },
  discord: { label: "Discord", Icon: DiscordMark, hoverClassName: "hover:bg-[#5865F2]/10 hover:text-[#5865F2]" },
  telegram: { label: "Telegram", Icon: Send, hoverClassName: "hover:bg-[#26A5E4]/10 hover:text-[#26A5E4]" },
  x: { label: "X (Twitter)", Icon: XMark },
  medium: { label: "Medium", Icon: FileText },
  mirror: { label: "Mirror", Icon: PenLine },
  farcaster: { label: "Farcaster", Icon: MessageCircle },
  linktree: { label: "Linktree", Icon: LinktreeMark, hoverClassName: "hover:bg-[#43E660]/10 hover:text-[#43E660]" },
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
      Icon: Send,
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
