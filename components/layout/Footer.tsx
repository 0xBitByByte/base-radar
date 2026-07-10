import type { ReactNode } from "react";
import Link from "next/link";
import { Send } from "lucide-react";

import { cn } from "@/lib/utils";
import { FOOTER_LINK_GROUPS, SITE } from "@/constants/site";
import { GithubMark, XMark, DiscordMark, LinktreeMark } from "@/components/ui/BrandIcons";
import { Tooltip } from "@/components/ui/Tooltip";
import { SOCIAL_BRANDING } from "@/lib/branding/socials";
import { BaseRadarLogo } from "@/components/branding/BaseRadarLogo";

type CommunityLink = {
  label: string;
  ariaLabel: string;
  href: string;
  icon: ReactNode;
  hoverClassName: string;
};

/** GitHub/X's neutral hover is defined locally, not in the shared registry — the Footer is dark-only, unlike `Sidebar`'s theme-aware version of the same hover, so the two legitimately differ; only the brand-color hovers below (Discord/Telegram/Linktree) are genuinely identical across both consumers and worth centralizing. */
const NEUTRAL_HOVER_CLASS = "hover:bg-white/10 hover:text-white";

const COMMUNITY_LINKS: CommunityLink[] = [
  {
    label: "GitHub",
    ariaLabel: "Visit Base Radar GitHub",
    href: SITE.social.github,
    icon: <GithubMark className="size-4" />,
    hoverClassName: NEUTRAL_HOVER_CLASS,
  },
  {
    label: "X (Twitter)",
    ariaLabel: "Follow Base Radar on X",
    href: SITE.social.x,
    icon: <XMark className="size-4" />,
    hoverClassName: NEUTRAL_HOVER_CLASS,
  },
  {
    label: "Discord",
    ariaLabel: "Join Base Radar on Discord",
    href: SITE.social.discord,
    icon: <DiscordMark className="size-4" />,
    hoverClassName: SOCIAL_BRANDING.discord.hoverClassName ?? "",
  },
  {
    label: "Telegram",
    ariaLabel: "Join Base Radar Telegram",
    href: SITE.social.telegram,
    icon: <Send className="size-4" />,
    hoverClassName: SOCIAL_BRANDING.telegram.hoverClassName ?? "",
  },
  {
    label: "Linktree",
    ariaLabel: "Visit Base Radar Linktree",
    href: SITE.social.linktree,
    icon: <LinktreeMark className="size-4" />,
    hoverClassName: SOCIAL_BRANDING.linktree.hoverClassName ?? "",
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-radar-bg">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-6">
          <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-radar-primary/10">
                <BaseRadarLogo size={18} />
              </span>
              <span className="text-sm font-semibold text-radar-white">{SITE.name}</span>
            </div>
            <p className="max-w-xs text-sm text-radar-muted">{SITE.tagline}</p>
          </div>

          {FOOTER_LINK_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-3">
              <span className="text-xs font-semibold tracking-wider text-radar-white/80 uppercase">
                {group.title}
              </span>
              <ul className="flex flex-col gap-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-radar-muted transition-colors hover:text-radar-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold tracking-wider text-radar-white/80 uppercase">
              Community
            </span>
            <div className="flex items-center gap-1 -ml-2">
              {COMMUNITY_LINKS.map((link) => (
                <Tooltip key={link.label} content={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.ariaLabel}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg text-radar-muted outline-none transition-all duration-200",
                      "hover:scale-110 hover:shadow-[0_0_14px_-3px_currentColor] motion-reduce:hover:scale-100",
                      "focus-visible:ring-2 focus-visible:ring-radar-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-radar-bg",
                      link.hoverClassName
                    )}
                  >
                    {link.icon}
                  </a>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/5 pt-8">
          <p className="text-center text-xs text-radar-muted sm:text-left">
            © {year} {SITE.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
