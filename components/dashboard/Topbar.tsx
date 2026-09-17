"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Menu, GitCompare } from "lucide-react";

import { cn } from "@/lib/utils";
import { useCompare } from "@/lib/hooks/useCompare";
import { usePersonalizationPreferences } from "@/lib/hooks/usePersonalizationPreferences";
import { useSyncStatus } from "@/lib/hooks/useSyncStatus";
import { useWatchlists } from "@/lib/hooks/useWatchlists";
import { formatGwei } from "@/lib/data/format";
import type { LiveProject } from "@/lib/projects/types";
import { ChainBadge } from "@/components/branding/ChainBadge";
import { useSharedNetworkStatus } from "@/components/dashboard/NetworkStatusProvider";
import { NotificationDrawer } from "@/components/notifications/NotificationDrawer";
import { AccountMenu } from "@/components/account/AccountMenu";
import { SYNC_STATE_DISPLAY } from "@/components/sync/meta";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Tooltip } from "@/components/ui/Tooltip";
import { WalletButton } from "@/components/wallet/WalletButton";
import { WatchlistSelector } from "@/components/watchlists/WatchlistSelector";

/**
 * PR-097.02 (Bundle Optimization) — this import previously bundled
 * `SyncStatusCard` (and its own further imports) into every dashboard
 * route's initial JS unconditionally, defeating the exact same lazy-load
 * `AccountMenu.tsx` already achieves for the identical component: with
 * *any* static import of a module present anywhere in the bundle graph,
 * a bundler has no reason to split it out, no matter how many other call
 * sites already import it dynamically. Aligning this call site with
 * `AccountMenu.tsx`'s existing, already-proven `next/dynamic({ssr:false})`
 * pattern (never dead code — it opens on a real user click, never part
 * of the initial paint) recovers the code-splitting win both call sites
 * were always meant to have.
 */
const SyncStatusCard = dynamic(
  () => import("@/components/sync/SyncStatusCard").then((mod) => mod.SyncStatusCard),
  { ssr: false }
);

/**
 * PR-097.02 (Bundle Optimization) — the Command Palette (its own Dialog,
 * search index wiring, and keyboard-shortcut listener — `useCommandPalette()`)
 * starts closed and is opened only by a real ⌘K/Ctrl+K keypress or a real
 * click, never part of the initial paint, yet was still bundled into every
 * dashboard route's initial JS via a plain static import — an always-
 * loaded, rarely-opened overlay, exactly the shape `SyncStatusCard`
 * (above) and `AccountMenu.tsx` already establish the fix for. `ssr:
 * false` is correct here for the same reason: it renders nothing
 * server-relevant while closed.
 */
const CommandPalette = dynamic(
  () => import("@/components/command/CommandPalette").then((mod) => mod.CommandPalette),
  { ssr: false }
);

type TopbarProps = {
  onOpenMobileNav: () => void;
  /** Universal Project Card, PR-8 — forwarded unresolved to `CommandPalette`; see `app/dashboard/layout.tsx`. */
  liveProjectsPromise: Promise<LiveProject[]>;
};

/**
 * PR23 Part 2 — a compact, always-visible read of the local Sync Layer's
 * current state (`useSyncStatus()` only; no provider access, no network
 * call). Clicking it opens the same read-only `SyncStatusCard` the
 * Account Menu's Cloud Sync item opens.
 */
function SyncStatusIndicator({ onOpen }: { onOpen: () => void }) {
  const { syncStatus } = useSyncStatus();
  const display = SYNC_STATE_DISPLAY[syncStatus];
  const Icon = display.icon;

  return (
    <Tooltip content={`Sync status: ${display.label}`}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Sync status: ${display.label}. Open sync details.`}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-radar-light-border px-2 py-1.5 text-xs font-medium whitespace-nowrap outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:hover:bg-white/5"
      >
        <Icon className={cn("size-3.5", display.textClass, display.spin && "animate-spin motion-reduce:animate-none")} aria-hidden="true" />
        <span className={cn("hidden sm:inline", display.textClass)}>{display.label}</span>
      </button>
    </Tooltip>
  );
}

function NetworkBadge() {
  const { status } = useSharedNetworkStatus();

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

export function Topbar({ onOpenMobileNav, liveProjectsPromise }: TopbarProps) {
  const { watchlists, activeWatchlist, setActiveWatchlist } = useWatchlists();
  const { preferences } = usePersonalizationPreferences();
  const { syncStatus } = useSyncStatus();
  const { count: compareCount } = useCompare();
  const [syncStatusOpen, setSyncStatusOpen] = useState(false);

  // PR-086.05 — the generic route-derived breadcrumb this header used to
  // render inline (`useBreadcrumb()`, a slug-titlecase guess) is removed
  // entirely, not just conditionally suppressed. By this point every route
  // that has real hierarchy (a specific project and its sub-routes) already
  // renders its own accurate, page-owned breadcrumb in the page body — that
  // component is "the breadcrumb rendered directly below the Topbar" this
  // header should defer to — and every flat top-level page (Dashboard,
  // Explorer root, Watchlists, Alerts, Automation, Settings, Notifications)
  // was confirmed to want no breadcrumb at all. With no remaining route
  // that needed this header's own copy, keeping an always-empty hook and an
  // always-`display:none` `<nav>` around was dead weight, not a real
  // fallback — removed rather than left inert.
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-radar-primary/[0.18] bg-radar-light-card/45 px-4 shadow-[0_8px_24px_-16px_rgba(16,34,58,0.35)] backdrop-blur-2xl sm:px-6 lg:px-10 dark:border-white/10 dark:bg-radar-bg/45 dark:shadow-[0_8px_24px_-16px_rgba(0,0,0,0.6)]">
      {/* PR22 Part 2: announces active-watchlist changes to assistive tech —
          a visually-hidden region whose text mirrors the current
          `activeWatchlist`, so switching via `WatchlistSelector` (here or on
          `/dashboard/watchlists`) is announced without a manual event/effect. */}
      <div aria-live="polite" className="sr-only">
        {activeWatchlist ? `Active watchlist: ${activeWatchlist.name}` : "No active watchlist"}
      </div>

      {/* PR23 Part 2: announces Sync Layer status changes (e.g. going
          offline) to assistive tech, mirroring the watchlist announcer
          above. */}
      <div aria-live="polite" className="sr-only">
        Sync status: {SYNC_STATE_DISPLAY[syncStatus].label}
      </div>

      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Open navigation menu"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 lg:hidden dark:text-radar-muted dark:hover:bg-white/5"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <NetworkBadge />
      <SyncStatusIndicator onOpen={() => setSyncStatusOpen(true)} />

      {/* Priority order under space pressure (highest to lowest): Search,
          Connect Wallet, Compare, Notifications, Theme, User. Three
          custom-width tiers below `lg` split what's otherwise one Tailwind
          `lg` breakpoint into "tablet" (1024–1279, Compare goes icon-only),
          "laptop" (1280–1439, everything shows a label again but
          tightened), and "desktop" (1440+, full comfort) — `xl`/
          `min-[1440px]` are arbitrary variants scoped to this file only,
          not a change to the app's shared breakpoint tokens. */}
      <CommandPalette
        className="hidden min-w-0 max-w-[220px] flex-1 sm:flex xl:max-w-xs min-[1440px]:max-w-sm"
        liveProjectsPromise={liveProjectsPromise}
      />

      {/* PR22 Part 3: `showWatchlistSelectorInTopbar` is purely a Topbar
          display preference — Dashboard personalization keeps filtering by
          the active watchlist even when this is off, since the selector is
          only one of several ways to change it (`/dashboard/watchlists`
          always has one). */}
      {preferences.showWatchlistSelectorInTopbar && watchlists.length > 0 && (
        <WatchlistSelector
          watchlists={watchlists}
          activeWatchlist={activeWatchlist}
          onSelect={setActiveWatchlist}
          // V1-FIX-026 — widened from 150/180px: the trigger now also
          // renders a "Watchlist:" qualifier (see WatchlistSelector's own
          // doc comment), which needs room alongside the name. Values
          // chosen from live measurement against "Infrastructure" (the
          // longest real default watchlist name): 220px gives it zero
          // truncation at `xl`; 205px keeps the `lg` tier's name-truncation
          // point at least as generous as it was pre-change (was ~76px of
          // name budget at the old 150px cap; is ~81px now), rather than
          // regressing it, matching this row's existing "controls compress
          // gracefully at narrower widths" pattern (see the priority-order
          // comment above). CommandPalette (this row's other flexible
          // sibling) has ample slack to absorb the increase — its own
          // max-w-xs/max-w-sm caps stay far below its `flex-1` allocation
          // at these breakpoints.
          className="hidden max-w-[205px] shrink-0 lg:flex xl:max-w-[220px]"
        />
      )}

      <div className="ml-auto flex items-center gap-1 sm:gap-1.5 xl:gap-1 min-[1440px]:gap-2">
        {/* PR-086.04 — this previously had no `onClick` at all (a real
            "looks fully interactive, silently does nothing" bug —
            confirmed via audit: no route, no modal, no handler existed
            anywhere in the codebase) and none of the disabled treatment
            the rest of the app already uses for genuinely not-yet-built
            actions, so it shipped `disabled` + `cursor-not-allowed` +
            reduced opacity instead. PR-091 (Compare Platform) wires it for
            real: a plain link to `/dashboard/compare`, always enabled
            (clicking with 0/1 selected still lands on that route's own
            honest empty state, not a dead end) — with a real, live count
            badge from `useCompare()` once at least one project is
            selected. */}
        <Tooltip content={compareCount > 0 ? `Compare ${compareCount} selected project${compareCount === 1 ? "" : "s"}` : "Compare projects"}>
          <Link
            href="/dashboard/compare"
            aria-label={compareCount > 0 ? `Compare, ${compareCount} project${compareCount === 1 ? "" : "s"} selected` : "Compare projects"}
            className="relative hidden items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 lg:flex xl:px-2.5 min-[1440px]:px-2.5 dark:text-radar-muted dark:hover:bg-white/5 dark:hover:text-radar-white"
          >
            <GitCompare className="size-4" aria-hidden="true" />
            <span className="hidden xl:inline">Compare</span>
            {compareCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-radar-primary px-1 text-[10px] font-semibold tabular-nums text-white dark:bg-radar-accent dark:text-radar-bg">
                {compareCount}
              </span>
            )}
          </Link>
        </Tooltip>

        {/* Bug 2 — the "AI Summary" control that used to sit here was a
            permanently-`disabled` "coming soon" stub with no route, modal,
            or data source behind it anywhere in this codebase (confirmed by
            investigation, matching the exact "looks interactive, does
            nothing" shape `PR-086.04`'s comment on `Compare` above already
            documents as a real bug class in this file). It couldn't be
            clicked, so it never provided any value, and its intended
            "what it means / why it matters" role (distinct from Executive
            Summary's "what is happening" and AI Command Center's "what I
            should do") has no real implementation to keep — removed rather
            than dressed up with a better label for a feature that isn't
            built. Reintroduce it here, built for real, if that role is ever
            implemented. */}

        <NotificationDrawer />

        <div className="hidden sm:block">
          <WalletButton />
        </div>

        <ThemeToggle variant="icon" className="hidden shrink-0 sm:flex" />

        <AccountMenu />
      </div>

      <SyncStatusCard open={syncStatusOpen} onOpenChange={setSyncStatusOpen} />
    </header>
  );
}
