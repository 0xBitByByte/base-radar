"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radar, BookOpen, Send, ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { DASHBOARD_NAV_GROUPS, DASHBOARD_SETTINGS_ITEM, APP_VERSION } from "@/constants/dashboard";
import { SidebarItem } from "@/components/dashboard/SidebarItem";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Tooltip } from "@/components/ui/Tooltip";

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.77.11 3.06.74.8 1.19 1.83 1.19 3.09 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.07.78 2.15 0 1.55-.01 2.8-.01 3.18 0 .31.2.67.8.56C20.21 21.38 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function DiscordMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.32 5.37a18.6 18.6 0 0 0-4.6-1.43.07.07 0 0 0-.08.04c-.2.36-.42.82-.57 1.19a17.2 17.2 0 0 0-5.14 0 12 12 0 0 0-.58-1.19.08.08 0 0 0-.08-.04c-1.6.28-3.14.76-4.6 1.43a.07.07 0 0 0-.03.03C1.86 9.6 1.15 13.7 1.5 17.76a.08.08 0 0 0 .03.05 18.8 18.8 0 0 0 5.63 2.85.08.08 0 0 0 .08-.03c.43-.6.82-1.23 1.15-1.9a.07.07 0 0 0-.04-.1 12.4 12.4 0 0 1-1.77-.85.07.07 0 0 1 0-.12c.12-.09.24-.18.35-.27a.07.07 0 0 1 .08 0c3.7 1.69 7.7 1.69 11.37 0a.07.07 0 0 1 .08 0c.12.1.23.18.35.27a.07.07 0 0 1 0 .12c-.56.33-1.16.6-1.77.85a.07.07 0 0 0-.04.1c.34.67.73 1.3 1.15 1.9a.08.08 0 0 0 .08.03 18.7 18.7 0 0 0 5.64-2.85.08.08 0 0 0 .03-.04c.42-4.7-.7-8.77-2.96-12.37a.06.06 0 0 0-.03-.03ZM8.68 15.3c-1.11 0-2.03-1.02-2.03-2.28 0-1.25.9-2.28 2.03-2.28 1.14 0 2.05 1.04 2.03 2.28 0 1.26-.9 2.28-2.03 2.28Zm6.66 0c-1.11 0-2.02-1.02-2.02-2.28 0-1.25.89-2.28 2.02-2.28 1.14 0 2.05 1.04 2.03 2.28 0 1.26-.89 2.28-2.03 2.28Z" />
    </svg>
  );
}

function XMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

type SocialLink = {
  label: string;
  href: string;
  icon: ReactNode;
  hoverClassName: string;
};

const SOCIAL_LINKS: SocialLink[] = [
  {
    label: "GitHub",
    href: "#",
    icon: <GithubMark className="size-4" />,
    hoverClassName:
      "hover:bg-radar-light-text/5 hover:text-radar-light-text dark:hover:bg-white/10 dark:hover:text-white",
  },
  {
    label: "Discord",
    href: "#",
    icon: <DiscordMark className="size-4" />,
    hoverClassName: "hover:bg-[#5865F2]/10 hover:text-[#5865F2]",
  },
  {
    label: "X (Twitter)",
    href: "#",
    icon: <XMark className="size-4" />,
    hoverClassName:
      "hover:bg-radar-light-text/5 hover:text-radar-light-text dark:hover:bg-white/10 dark:hover:text-white",
  },
  {
    label: "Documentation",
    href: "#",
    icon: <BookOpen className="size-4" />,
    hoverClassName: "hover:bg-radar-primary/10 hover:text-radar-primary",
  },
  {
    label: "Telegram",
    href: "#",
    icon: <Send className="size-4" />,
    hoverClassName: "hover:bg-[#26A5E4]/10 hover:text-[#26A5E4]",
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
        <span className="flex size-10 items-center justify-center rounded-xl border border-radar-light-border bg-radar-primary/10 text-radar-primary transition-colors group-hover:bg-radar-primary/20 dark:border-white/10 dark:text-radar-accent">
          <Radar className="size-5" />
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
                aria-label={social.label}
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
