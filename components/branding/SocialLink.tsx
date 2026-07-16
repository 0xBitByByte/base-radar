import { SOCIAL_BRANDING } from "@/lib/branding/socials";
import { cn } from "@/lib/utils";
import type { SocialPlatform } from "@/lib/branding/types";

type SocialLinkProps = {
  platform: SocialPlatform;
  href: string;
  label?: string;
  showLabel?: boolean;
  className?: string;
};

const BASE_LINK_CLASS =
  "flex items-center gap-1.5 rounded-lg border border-radar-light-border px-2.5 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white";

/** Platforms without a distinctive brand `hoverClassName` (`lib/branding/socials.ts`) fall back to this neutral treatment — unchanged from before PR12.1c. */
const NEUTRAL_HOVER_CLASS = "hover:bg-radar-light-surface dark:hover:bg-white/5";

/**
 * One external identity/community link — website, docs, or a social
 * platform — always opened safely (`rel="noopener noreferrer"`, enforced
 * here rather than left to every call site to remember). The single
 * implementation `QuickViewCommunity`'s social row now uses instead of a
 * locally hand-rolled anchor; Sidebar/Footer (site-wide, not project,
 * links) are a natural follow-up migration but sit outside this PR's
 * Explorer-scoped pass. PR12.1c Req 5.8: applies each platform's own
 * `hoverClassName` (already defined in the registry for Discord/Telegram/
 * Linktree, extended here for X/Farcaster/LinkedIn) instead of a single
 * generic gray hover for every platform.
 */
export function SocialLink({ platform, href, label, showLabel = true, className }: SocialLinkProps) {
  const brand = SOCIAL_BRANDING[platform];
  const Icon = brand.Icon;
  const text = label ?? brand.label;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(BASE_LINK_CLASS, brand.hoverClassName ?? NEUTRAL_HOVER_CLASS, className)}
    >
      {Icon && <Icon className="size-3.5" aria-hidden="true" />}
      {showLabel && text}
    </a>
  );
}
