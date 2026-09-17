"use client";

import Link from "next/link";
import {
  Bell,
  Check,
  Circle,
  Compass,
  Star,
  Wallet,
  Zap,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { GLASS_SURFACE_STATIC } from "@/components/ui/glassStyles";
import { usePersonalizedDashboard } from "@/lib/hooks/usePersonalizedDashboard";
import { useWallet } from "@/lib/hooks/useWallet";
import { useWatchlists } from "@/lib/hooks/useWatchlists";

type OnboardingItem = {
  key: string;
  icon: LucideIcon;
  label: string;
  done: boolean;
  href?: string;
  comingSoon?: boolean;
};

/**
 * A lightweight, non-modal onboarding nudge (PR-049 requirement 4) — not a
 * new persistence layer. Visibility and per-item completion are both read
 * straight off application state that already exists (Watchlist contents,
 * whether notifications are flowing) rather than any new tracking: no
 * localStorage key, no preference, no dismiss state. "Explore Projects" has
 * no corresponding real state to check (this app has no page-visit
 * tracking) — it renders as always-available rather than a fabricated
 * checkmark. "Create Automation" stays Coming Soon forever, since that
 * feature isn't real yet; it's excluded from the completion signal below
 * for the same reason. "Connect Wallet" (V3-WALLET-001) is real now — its
 * `done` reads `useWallet().isConnected` like every other real item here.
 */
export function GettingStartedCard() {
  const { activeWatchlist } = useWatchlists();
  const { hasNotifications } = usePersonalizedDashboard();
  const { isConnected: isWalletConnected } = useWallet();

  const hasWatchlistProjects = (activeWatchlist?.projectIds.length ?? 0) > 0;

  if (hasWatchlistProjects) return null;

  const items: OnboardingItem[] = [
    {
      key: "explore",
      icon: Compass,
      label: "Explore Projects",
      done: true,
      href: "/dashboard/projects",
    },
    {
      key: "watchlist",
      icon: Star,
      label: "Create your first Watchlist",
      done: hasWatchlistProjects,
      href: "/dashboard/watchlists",
    },
    {
      key: "wallet",
      icon: Wallet,
      label: "Connect Wallet",
      done: isWalletConnected,
    },
    {
      key: "notifications",
      icon: Bell,
      label: "Enable Notifications",
      done: hasNotifications,
      href: "/dashboard/settings/notifications",
    },
    {
      key: "automation",
      icon: Zap,
      label: "Create Automation",
      done: false,
      comingSoon: true,
      href: "/dashboard/automation",
    },
  ];

  return (
    <div className={cn("flex flex-col gap-3 p-5", GLASS_SURFACE_STATIC)}>
      <div>
        <h2 className="text-sm font-semibold text-radar-light-text dark:text-radar-white">Getting Started</h2>
        <p className="text-xs text-radar-light-muted dark:text-radar-muted">
          A few quick steps to unlock the full Base Radar experience.
        </p>
      </div>

      <ul className="flex flex-wrap gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const content = (
            <>
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full",
                  item.done
                    ? "bg-radar-success text-white"
                    : "border border-radar-light-border text-transparent dark:border-white/15"
                )}
              >
                {item.done ? <Check className="size-3" aria-hidden="true" /> : <Circle className="size-1.5 fill-current" aria-hidden="true" />}
              </span>
              <Icon className="size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
              <span
                className={cn(
                  "text-xs font-medium",
                  item.done
                    ? "text-radar-light-muted line-through dark:text-radar-muted"
                    : "text-radar-light-text dark:text-radar-white"
                )}
              >
                {item.label}
              </span>
              {item.comingSoon && (
                <GlowBadge color="muted" className="px-1.5 py-0 text-[9px] uppercase tracking-wide">
                  Coming Soon
                </GlowBadge>
              )}
            </>
          );

          const rowClassName =
            "flex items-center gap-2 rounded-xl border border-radar-light-border bg-radar-light-surface/60 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]";

          return (
            <li key={item.key}>
              {item.href ? (
                <Link
                  href={item.href}
                  className={cn(
                    rowClassName,
                    "outline-none transition-colors hover:border-radar-primary/30 hover:bg-radar-light-card focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:hover:bg-white/[0.06]"
                  )}
                >
                  {content}
                </Link>
              ) : (
                <span className={cn(rowClassName, "opacity-70")}>{content}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
