"use client";

import { usePathname } from "next/navigation";
import { ChevronRight, Menu, Sparkles, GitCompare, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLiveNetworkStatus } from "@/lib/hooks/useLiveNetworkStatus";
import { formatGwei } from "@/lib/data/format";
import { ChainBadge } from "@/components/branding/ChainBadge";
import { NotificationDrawer } from "@/components/notifications/NotificationDrawer";
import { CommandPalette } from "@/components/command/CommandPalette";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Tooltip } from "@/components/ui/Tooltip";

type TopbarProps = {
  onOpenMobileNav: () => void;
};

function useBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // The Project Profile page (`/dashboard/projects/[slug]`) renders its own
  // `ProfileBreadcrumb` — a real, clickable Dashboard/Projects/<project name>
  // trail built from the actual fetched project, not this hook's generic
  // slug-titlecase guess. Showing both at once would put two breadcrumb
  // trails on screen for the same route, so this one steps aside there.
  const isProjectProfileRoute = segments[0] === "dashboard" && segments[1] === "projects" && segments.length === 3;
  if (isProjectProfileRoute) return [];

  return segments.map((segment, i) => ({
    label: segment
      .split("-")
      .map((word) => word[0]?.toUpperCase() + word.slice(1))
      .join(" "),
    href: "/" + segments.slice(0, i + 1).join("/"),
  }));
}

function NetworkBadge() {
  const { status } = useLiveNetworkStatus();

  return (
    <div className="hidden shrink-0 items-center gap-2 rounded-lg border border-radar-light-border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-radar-light-text lg:flex dark:border-white/10 dark:text-radar-muted">
      <span className="relative flex size-1.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-radar-success opacity-75 motion-reduce:animate-none" />
        <span className="relative inline-flex size-1.5 rounded-full bg-radar-success" />
      </span>
      <ChainBadge chain="base" size="sm" bare />
      {status && (
        <span className="whitespace-nowrap text-radar-light-muted dark:text-radar-muted/70">
          · {formatGwei(status.gasGwei)}
        </span>
      )}
    </div>
  );
}

export function Topbar({ onOpenMobileNav }: TopbarProps) {
  const breadcrumb = useBreadcrumb();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-radar-light-border bg-radar-light-card/80 px-4 backdrop-blur-xl sm:px-6 lg:px-10 dark:border-white/10 dark:bg-radar-bg/60">
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Open navigation menu"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 lg:hidden dark:text-radar-muted dark:hover:bg-white/5"
      >
        <Menu className="size-5" />
      </button>

      <nav aria-label="Breadcrumb" className={cn("hidden items-center gap-1.5 text-sm lg:flex", breadcrumb.length === 0 && "lg:hidden")}>
        {breadcrumb.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && (
              <ChevronRight
                className="size-3.5 text-radar-light-muted dark:text-radar-muted/50"
                aria-hidden="true"
              />
            )}
            <span
              className={cn(
                i === breadcrumb.length - 1
                  ? "font-semibold text-radar-light-text dark:text-radar-white"
                  : "text-radar-light-muted dark:text-radar-muted"
              )}
            >
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>

      <NetworkBadge />

      {/* Priority order under space pressure (highest to lowest): Search,
          Connect Wallet, Compare, AI Summary, Notifications, Theme, User.
          Three custom-width tiers below `lg` split what's otherwise one
          Tailwind `lg` breakpoint into "tablet" (1024–1279, Compare/AI
          Summary go icon-only), "laptop" (1280–1439, everything shows a
          label again but tightened), and "desktop" (1440+, full comfort) —
          `xl`/`min-[1440px]` are arbitrary variants scoped to this file
          only, not a change to the app's shared breakpoint tokens. */}
      <CommandPalette className="hidden min-w-0 max-w-[220px] flex-1 sm:flex xl:max-w-xs min-[1440px]:max-w-sm" />

      <div className="ml-auto flex items-center gap-1 sm:gap-1.5 xl:gap-1 min-[1440px]:gap-2">
        <Tooltip content="Compare projects">
          <button
            type="button"
            aria-label="Compare projects"
            className="hidden items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 lg:flex xl:px-2.5 min-[1440px]:px-2.5 dark:text-radar-muted dark:hover:bg-white/5"
          >
            <GitCompare className="size-4" />
            <span className="hidden xl:inline">Compare</span>
          </button>
        </Tooltip>

        <Tooltip content="AI summary">
          <button
            type="button"
            aria-label="AI summary"
            className="hidden items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-radar-purple outline-none transition-colors hover:bg-radar-purple/10 focus-visible:ring-2 focus-visible:ring-radar-purple/50 lg:flex xl:px-2.5 min-[1440px]:px-2.5"
          >
            <Sparkles className="size-4" />
            <span className="hidden xl:inline">AI Summary</span>
          </button>
        </Tooltip>

        <NotificationDrawer />

        <Tooltip content="Connect wallet">
          <button
            type="button"
            aria-label="Connect wallet"
            className="hidden shrink-0 items-center gap-2 rounded-lg border border-radar-light-border px-2.5 py-1.5 text-sm font-medium whitespace-nowrap text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 sm:flex xl:px-3 min-[1440px]:px-3 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
          >
            <Wallet className="size-4" />
            <span>Connect Wallet</span>
          </button>
        </Tooltip>

        <ThemeToggle variant="icon" className="hidden shrink-0 sm:flex" />

        <UserMenu />
      </div>
    </header>
  );
}
