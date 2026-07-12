"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { HeaderLogo } from "@/components/branding/HeaderLogo";
import { cn } from "@/lib/utils";
import { DASHBOARD_NAV_GROUPS, DASHBOARD_SETTINGS_ITEM, APP_VERSION } from "@/constants/dashboard";
import { SidebarItem } from "@/components/dashboard/SidebarItem";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Tooltip } from "@/components/ui/Tooltip";
import { buildSocialNavLinks } from "@/lib/branding/socials";
import { useStartNavigation } from "@/components/dashboard/NavigationOverlay";

/** GitHub/X's neutral hover class is defined locally, not in the shared registry — Sidebar supports both themes while `Footer` is dark-only, so the two legitimately differ; only the brand-color hovers (Discord/Telegram/Linktree) are shared, via `buildSocialNavLinks`. */
const NEUTRAL_HOVER_CLASS =
  "hover:bg-radar-light-text/5 hover:text-radar-light-text dark:hover:bg-white/10 dark:hover:text-white";

const SOCIAL_LINKS = buildSocialNavLinks(NEUTRAL_HOVER_CLASS);

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
  const startNavigation = useStartNavigation();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const navigateTo = (href: string) => {
    startNavigation(href);
    onNavigate?.();
  };

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <Link
        href="/dashboard"
        onClick={() => navigateTo("/dashboard")}
        aria-label="Base Radar dashboard home"
        className="group rounded-xl px-2 pb-6 outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-radar-light-bg dark:focus-visible:ring-offset-radar-bg"
      >
        <HeaderLogo height={32} className="transition-transform duration-200 ease-out group-hover:scale-105" />
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
                  onClick={() => navigateTo(item.href)}
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
          onClick={() => navigateTo(DASHBOARD_SETTINGS_ITEM.href)}
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
                <social.Icon className="size-4" />
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
