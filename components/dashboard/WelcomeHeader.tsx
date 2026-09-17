"use client";

/**
 * Bug fix (Sign Out) — `{getGreeting()}, RK` was a hardcoded literal,
 * never wired to any real account/session state. It had nothing to do
 * with authentication itself (the real sign-out flow — `/api/auth/
 * signout`, session revocation, cookie clearing — was confirmed live to
 * already work correctly) but reading "RK" still displayed after a real
 * sign-out made the page look like it hadn't logged the user out. Now a
 * real client component reading `useAccount()` (the same
 * `useSyncExternalStore` source `AccountMenu`/`AccountAvatar` already
 * use), so the greeting reflects the real current account and updates on
 * the same tick as every other account-aware surface — including on
 * sign-out, with no new wiring beyond this file.
 */

import { useAccount } from "@/lib/hooks/useAccount";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function WelcomeHeader() {
  const { account } = useAccount();

  return (
    <div>
      {/* UX Polish — Dashboard Hero & Visual Hierarchy (Phase 1). Was `text-2xl`/
          `sm:text-3xl`, the single largest text on the dashboard — bigger than
          `ExecutiveSummaryStrip`'s heading and body copy (both `text-sm`) even
          though the greeting itself carries no information. Sized down so the
          greeting reads as supporting context above the real content, not the
          page's primary focal point; still the first thing on the page and
          still visually a heading, just no longer competing with it. */}
      <h1 className="text-lg font-semibold tracking-tight text-radar-light-text sm:text-xl dark:text-radar-white">
        {getGreeting()}, {account.name}
      </h1>
      <p className="mt-1 text-sm text-radar-light-muted dark:text-radar-muted">
        Here&apos;s what&apos;s happening across Base today.
      </p>
    </div>
  );
}
