"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Send, ArrowLeft } from "lucide-react";

import { BaseRadarLogo } from "@/components/branding/BaseRadarLogo";
import { cn } from "@/lib/utils";
import { DASHBOARD_NAV_GROUPS, DASHBOARD_SETTINGS_ITEM, APP_VERSION } from "@/constants/dashboard";
import { SITE } from "@/constants/site";
import { SidebarItem } from "@/components/dashboard/SidebarItem";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Tooltip } from "@/components/ui/Tooltip";
import { GithubMark, DiscordMark, XMark, LinktreeMark } from "@/components/ui/BrandIcons";
import { SOCIAL_BRANDING } from "@/lib/branding/socials";

type SocialLink = {
  label: string;
  ariaLabel: string;
  href: string;
  icon: ReactNode;
  hoverClassName: string;
};

/** GitHub/X's neutral hover class is defined locally, not in the shared registry — Sidebar supports both themes while `Footer` is dark-only, so the two legitimately differ; only the brand-color hovers below (Discord/Telegram/Linktree) are genuinely identical across both consumers and worth centralizing. */
const NEUTRAL_HOVER_CLASS =
  "hover:bg-radar-light-text/5 hover:text-radar-light-text dark:hover:bg-white/10 dark:hover:text-white";

const SOCIAL_LINKS: SocialLink[] = [
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

function SidebarSectionLabel({ children }: { children: string }) {
  return (
    <p className="px-3 pt-4 pb-1.5 text-[10.5px] font-semibold tracking-[0.12em] text-radar-light-muted uppercase first:pt-0 dark:text-radar-muted/60">
      {children}
    </p>
  );
}

type SidebarNavProps = {
  onNavigate?: () => void;
  className?: string;
};

export function SidebarNav({ onNavigate, className }: SidebarNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <Link
        href="/dashboard"
        onClick={onNavigate}
        aria-label="Base Radar dashboard home"
        className="group flex items-center gap-3 rounded-xl px-2 pb-6 outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-radar-light-bg dark:focus-visible:ring-offset-radar-bg"
      >
        <span className="flex size-10 items-center justify-center rounded-xl border border-radar-light-border bg-radar-primary/10 transition-colors group-hover:bg-radar-primary/20 dark:border-white/10">
          <BaseRadarLogo size={22} />
        </span>
        <span className="flex flex-col leading-none">
          <span className="text-sm font-bold tracking-wide text-radar-light-text dark:text-radar-white">
            BASE
          </span>
          <span className="text-sm font-bold tracking-wide text-radar-primary dark:text-radar-accent">
            RADAR
          </span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col overflow-y-auto" aria-label="Main">
        {DASHBOARD_NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <SidebarSectionLabel>{group.title}</SidebarSectionLabel>
            <div className="flex flex-col gap-1">
              {group.items.map((item) => (
                <SidebarItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={<item.icon className="size-[18px]" />}
                  active={isActive(item.href)}
                  onClick={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}

        <SidebarSectionLabel>System</SidebarSectionLabel>
        <SidebarItem
          href={DASHBOARD_SETTINGS_ITEM.href}
          label={DASHBOARD_SETTINGS_ITEM.label}
          icon={<DASHBOARD_SETTINGS_ITEM.icon className="size-[18px]" />}
          active={isActive(DASHBOARD_SETTINGS_ITEM.href)}
          onClick={onNavigate}
        />
      </nav>

      <div className="mt-4 flex flex-col gap-4 border-t border-radar-light-border pt-5 dark:border-white/10">
        <ThemeToggle />

        <Tooltip content="Back to the marketing site">
          <Link
            href="/"
            onClick={onNavigate}
            className="group flex items-center gap-1.5 self-start rounded-lg px-3 py-1.5 text-xs font-medium text-radar-light-muted outline-none transition-colors duration-150 hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-radar-light-bg dark:text-radar-muted dark:hover:text-radar-white dark:focus-visible:ring-offset-radar-bg"
          >
            <ArrowLeft
              className="size-3.5 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5"
              aria-hidden="true"
            />
            Website
          </Link>
        </Tooltip>

        <div className="flex items-center gap-1 px-1">
          {SOCIAL_LINKS.map((social) => (
            <Tooltip key={social.label} content={social.label}>
              <a
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.ariaLabel}
                onClick={onNavigate}
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg text-radar-light-muted outline-none transition-all duration-200",
                  "hover:scale-110 hover:shadow-[0_0_14px_-3px_currentColor] motion-reduce:hover:scale-100",
                  "focus-visible:ring-2 focus-visible:ring-radar-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-radar-light-bg",
                  "dark:text-radar-muted dark:focus-visible:ring-offset-radar-bg",
                  social.hoverClassName
                )}
              >
                {social.icon}
              </a>
            </Tooltip>
          ))}
        </div>

        <p className="px-3 text-xs text-radar-light-muted dark:text-radar-muted/70">{APP_VERSION}</p>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 border-r border-radar-light-border bg-radar-light-card/80 px-4 py-6 backdrop-blur-xl lg:flex dark:border-white/10 dark:bg-radar-bg/60">
      <SidebarNav className="w-full" />
    </aside>
  );
}
