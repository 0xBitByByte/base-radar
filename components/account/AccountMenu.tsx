"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Menu } from "@base-ui/react/menu";
import { Cloud, LogOut, Settings, Sparkles, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAccount } from "@/lib/hooks/useAccount";
import { useAuthSession } from "@/lib/hooks/useAuthSession";
import { AccountAvatar } from "@/components/account/AccountAvatar";

/**
 * Closed by default and opened only by an explicit menu click — never part
 * of the initial paint — so its code (and the three further dialogs it
 * itself imports) is deferred out of every dashboard route's initial JS via
 * `next/dynamic`, rather than bundled unconditionally through `Topbar` →
 * `AccountMenu` (PR-006). `ssr: false` is correct here since it has
 * nothing to render on the server — it starts closed.
 *
 * V3-PROFILE-002 — `AccountProfileDialog` is gone; "Profile" below now
 * navigates to the dedicated `/dashboard/profile` page instead of opening a
 * modal, so there is nothing left here to dynamically import for it.
 */
const SyncStatusCard = dynamic(
  () => import("@/components/sync/SyncStatusCard").then((mod) => mod.SyncStatusCard),
  { ssr: false }
);

const MENU_ITEM_CLASS =
  "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-radar-light-text outline-none transition-colors data-[highlighted]:bg-radar-light-surface data-[highlighted]:text-radar-light-text dark:text-radar-muted dark:data-[highlighted]:bg-white/5 dark:data-[highlighted]:text-radar-white";

/**
 * The Account Layer's Topbar entry point (PR23 Part 1) — replaces the
 * previous placeholder `UserMenu` (hardcoded "RK" initials, dead links to
 * `/dashboard/settings`, a non-functional "Sign out"). Reads/writes
 * `useAccount()` only; no provider access, no network call.
 *
 * "Preferences" links to `/dashboard/settings/notifications` — this app
 * has no single settings hub page yet (building one is out of scope for
 * an account-layer PR), and Notification Preferences was this app's
 * original, most general-purpose settings entry point. "Personalization"
 * gets its own direct shortcut alongside it since it's a distinct,
 * actively-developed system (watchlists, import/export) worth surfacing
 * on its own.
 *
 * "Cloud Sync" (PR23 Part 2) now opens the read-only `SyncStatusCard`
 * dialog instead of being a disabled placeholder — it still has no real
 * backend behind it, so the dialog only ever displays local Sync Layer
 * state (`useSyncStatus()`).
 */
export function AccountMenu() {
  const { account, signOut: signOutLocalAccount } = useAccount();
  const { signOut: signOutSession } = useAuthSession();
  const [syncStatusOpen, setSyncStatusOpen] = useState(false);
  // Once true, stays true — mounting the dialog only from its first
  // requested open (rather than unconditionally like `open` alone would)
  // is what actually defers its dynamic-imported chunk past initial page
  // load; never resetting to `false` afterward preserves its own closing
  // transition on every subsequent close.
  const [syncStatusEverOpened, setSyncStatusEverOpened] = useState(false);

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          aria-label="Open account menu"
          className="flex shrink-0 items-center gap-2 rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-radar-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-radar-light-bg dark:focus-visible:ring-offset-radar-bg"
        >
          <AccountAvatar account={account} />
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner side="bottom" align="end" sideOffset={10}>
            <Menu.Popup
              className={cn(
                "min-w-[240px] rounded-2xl border border-radar-light-border bg-radar-light-card/95 p-1.5 shadow-xl backdrop-blur-xl outline-none dark:border-white/10 dark:bg-radar-card/95",
                "transition-[opacity,transform] duration-150 motion-reduce:transition-none",
                "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
              )}
            >
              <div className="flex items-center gap-2.5 px-2.5 py-2">
                <AccountAvatar account={account} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-radar-light-text dark:text-radar-white">
                    {account.name}
                  </p>
                  <p className="truncate text-xs text-radar-light-muted dark:text-radar-muted">
                    {account.isGuest ? "Guest account" : `@${account.username}`}
                  </p>
                </div>
              </div>

              <div className="my-1 h-px bg-radar-light-border dark:bg-white/10" />

              <Menu.LinkItem render={<Link href="/dashboard/profile" />} closeOnClick className={MENU_ITEM_CLASS}>
                <User className="size-4" aria-hidden="true" />
                Profile
              </Menu.LinkItem>

              <Menu.LinkItem
                render={<Link href="/dashboard/settings/notifications" />}
                closeOnClick
                className={MENU_ITEM_CLASS}
              >
                <Settings className="size-4" aria-hidden="true" />
                Preferences
              </Menu.LinkItem>

              <Menu.LinkItem
                render={<Link href="/dashboard/settings/personalization" />}
                closeOnClick
                className={MENU_ITEM_CLASS}
              >
                <Sparkles className="size-4" aria-hidden="true" />
                Personalization
              </Menu.LinkItem>

              <div className="my-1 h-px bg-radar-light-border dark:bg-white/10" />

              <Menu.Item
                onClick={() => {
                  setSyncStatusEverOpened(true);
                  setSyncStatusOpen(true);
                }}
                className={MENU_ITEM_CLASS}
              >
                <Cloud className="size-4" aria-hidden="true" />
                Cloud Sync
              </Menu.Item>

              {/*
                Bug fix (Guest + Sign Out) — a Guest has no real session
                (`account.isGuest`, the same real signal the "Guest
                account"/"@username" label above already switches on), so
                Sign Out had nothing to actually revoke: clicking it called
                `/api/auth/signout` with no session cookie (a real,
                documented no-op) and reset the local Account Layer profile
                to a fresh Guest record — a real action, but with no
                visible effect for someone already Guest, which read as
                "Sign Out doesn't work." `WalletAuthRow` (`ProfilePage.tsx`)
                already gates its own Sign Out the same way
                (`auth.status === "authenticated"`); this brings
                `AccountMenu` in line with that same, already-established
                pattern rather than inventing a new one.
              */}
              {!account.isGuest && (
                <>
                  <div className="my-1 h-px bg-radar-light-border dark:bg-white/10" />

                  <Menu.Item
                    onClick={() => {
                      // Bug 3 (Authentication Flow) — this previously called only
                      // `useAccount().signOut()`, which resets the local,
                      // no-network Account Layer profile back to a fresh Guest
                      // record but never touches the real, server-side session
                      // (`useAuthSession()`, backed by `/api/auth/signout`'s real
                      // `revokeSession()`). Confirmed live: clicking this left
                      // `/api/auth/session` reporting `authenticated` with the
                      // same account, unchanged — a real session that was never
                      // revoked, not merely a UI that failed to update. Both
                      // calls now run: the real session is revoked first, then
                      // the local profile resets, matching `WalletAuthRow`'s
                      // now-identical fix in `ProfilePage.tsx`.
                      void (async () => {
                        await signOutSession();
                        await signOutLocalAccount();
                      })();
                    }}
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-radar-danger outline-none transition-colors data-[highlighted]:bg-radar-danger/10"
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    Sign Out
                  </Menu.Item>
                </>
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      {syncStatusEverOpened && <SyncStatusCard open={syncStatusOpen} onOpenChange={setSyncStatusOpen} />}
    </>
  );
}
