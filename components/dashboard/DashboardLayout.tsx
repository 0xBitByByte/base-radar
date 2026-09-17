"use client";

import { Suspense, useState, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";

import type { LiveTicker, WithSource } from "@/lib/data/types";
import type { LiveProject } from "@/lib/projects/types";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileSidebar } from "@/components/dashboard/MobileSidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { LiveStatusBarAsync } from "@/components/dashboard/LiveStatusBarAsync";
import { WidgetSkeleton } from "@/components/dashboard/WidgetSkeleton";
import { NetworkStatusProvider } from "@/components/dashboard/NetworkStatusProvider";

type DashboardLayoutProps = {
  children: ReactNode;
  /**
   * Passed unresolved (PR9.3.4 §3) — Sidebar/Topbar below render immediately
   * regardless of how long the ticker's provider calls take; only the
   * `LiveStatusBarAsync` strip suspends on it, behind its own boundary.
   */
  tickerPromise: Promise<WithSource<LiveTicker>>;
  /**
   * Universal Project Card, PR-8 — same unresolved-Promise pattern as
   * `tickerPromise` immediately above. Forwarded to `Topbar` → `CommandPalette`,
   * whose own `CommandResultsAsync` boundary is the only thing that
   * actually suspends on it.
   */
  liveProjectsPromise: Promise<LiveProject[]>;
  /**
   * Reserved for the future Intelligence Rail (breaking news, whale alerts,
   * governance, GitHub releases, AI insights, new launches, watchlist
   * activity). Desktop-only by design; hidden on tablet/mobile. No page
   * passes this yet, so today's layout renders identically — but any future
   * page can opt in without DashboardLayout changing again.
   */
  intelligenceRail?: ReactNode;
};

export function DashboardLayout({ children, tickerPromise, liveProjectsPromise, intelligenceRail }: DashboardLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    // PR-107 — mounted once, here, wrapping both `Topbar` and `{children}`
    // below (the only two subtrees that ever consume shared network
    // status), so the whole `/dashboard/*` segment shares exactly one Base
    // RPC polling loop — see `NetworkStatusProvider.tsx`'s own doc comment.
    <NetworkStatusProvider>
      <MotionConfig reducedMotion="user">
        <div className="relative min-h-dvh bg-radar-light-bg text-radar-light-text dark:bg-radar-bg dark:text-radar-white">
          <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
            <div
              className="absolute inset-0 opacity-[0.05] dark:opacity-[0.07]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
                backgroundSize: "48px 48px",
                maskImage:
                  "radial-gradient(ellipse 70% 50% at 50% 0%, black 30%, transparent 100%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse 70% 50% at 50% 0%, black 30%, transparent 100%)",
              }}
            />
            {/* PR-086.02 — `backdrop-blur` on every glass surface (cards, nav
                chrome, modal scrims) only reads as visible glass when there's
                real color/texture behind it to blur; a flat, nearly-uniform
                page background makes blur invisible regardless of how strong
                it is. These ambient glows exist purely to give the glass
                surfaces something to blur against — ecosystem-wide, since
                every `/dashboard/*` route (including Project Details) shares
                this one layout. The immediate parent is `fixed inset-0`
                (viewport-locked, confirmed via computed styles before this
                edit), so every blob below is positioned in `%` relative to
                the *viewport*, not the scrolled page — page content scrolls
                past this fixed backdrop the way clouds pass a window, rather
                than the blobs needing to "reach" further down a long page. */}
            <div className="absolute top-[-15%] left-[-10%] size-[45rem] rounded-full bg-radar-primary/[0.16] blur-3xl dark:bg-radar-primary/25" />
            <div className="absolute top-[-5%] right-[-15%] size-[38rem] rounded-full bg-radar-accent/[0.12] blur-3xl dark:bg-radar-accent/20" />
            <div className="absolute bottom-[-20%] left-[15%] size-[42rem] rounded-full bg-radar-primary/[0.09] blur-3xl dark:bg-radar-primary/[0.16]" />
          </div>

          <div className="mx-auto flex max-w-[1600px]">
            <Sidebar />

            <div className="relative flex min-h-dvh min-w-0 flex-1 flex-col">
              <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} liveProjectsPromise={liveProjectsPromise} />
              <Suspense fallback={<WidgetSkeleton className="h-10 rounded-none border-x-0 border-t-0" />}>
                <LiveStatusBarAsync tickerPromise={tickerPromise} />
              </Suspense>
              <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10">{children}</main>
            </div>

            {intelligenceRail && (
              <aside className="hidden w-80 shrink-0 border-l border-radar-light-border px-4 py-8 xl:block dark:border-white/10">
                {intelligenceRail}
              </aside>
            )}
          </div>

          <MobileSidebar open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
        </div>
      </MotionConfig>
    </NetworkStatusProvider>
  );
}
