"use client";

import { usePathname } from "next/navigation";
import { ChevronRight, Menu, Sparkles, Bell, GitCompare, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLiveNetworkStatus } from "@/lib/hooks/useLiveNetworkStatus";
import { SearchBar } from "@/components/dashboard/SearchBar";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

type TopbarProps = {
  onOpenMobileNav: () => void;
};

function useBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
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
    <div className="hidden items-center gap-2 rounded-lg border border-radar-light-border px-2.5 py-1.5 text-xs font-medium text-radar-light-text lg:flex dark:border-white/10 dark:text-radar-muted">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-radar-success opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-radar-success" />
      </span>
      Base
      {status && (
        <span className="text-radar-light-muted dark:text-radar-muted/70">
          · {status.gasGwei.toFixed(3)} gwei
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
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-radar-light-muted outline-none transition-colors hover:bg-slate-900/5 focus-visible:ring-2 focus-visible:ring-radar-primary/50 lg:hidden dark:text-radar-muted dark:hover:bg-white/5"
      >
        <Menu className="size-5" />
      </button>

      <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-sm lg:flex">
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

      <SearchBar className="hidden max-w-sm flex-1 sm:flex" />

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          aria-label="Compare projects"
          className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-radar-light-text outline-none transition-colors hover:bg-slate-900/5 focus-visible:ring-2 focus-visible:ring-radar-primary/50 lg:flex dark:text-radar-muted dark:hover:bg-white/5"
        >
          <GitCompare className="size-4" />
          Compare
        </button>

        <button
          type="button"
          aria-label="AI summary"
          className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-radar-purple outline-none transition-colors hover:bg-radar-purple/10 focus-visible:ring-2 focus-visible:ring-radar-purple/50 lg:flex"
        >
          <Sparkles className="size-4" />
          AI Summary
        </button>

        <button
          type="button"
          aria-label="View notifications"
          className="relative flex size-9 items-center justify-center rounded-lg text-radar-light-muted outline-none transition-colors hover:bg-slate-900/5 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5"
        >
          <Bell className="size-[18px]" />
          <span className="absolute top-2 right-2 size-1.5 rounded-full bg-radar-accent" />
        </button>

        <button
          type="button"
          aria-label="Connect wallet"
          className="hidden items-center gap-2 rounded-lg border border-radar-light-border px-3 py-1.5 text-sm font-medium text-radar-light-text outline-none transition-colors hover:bg-slate-900/5 focus-visible:ring-2 focus-visible:ring-radar-primary/50 sm:flex dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
        >
          <Wallet className="size-4" />
          Connect Wallet
        </button>

        <ThemeToggle variant="icon" className="hidden sm:flex" />

        <UserMenu />
      </div>
    </header>
  );
}
