"use client";

import { useEffect, useState, type ReactNode } from "react";
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
   * Reserved for the future Intelligence Rail (breaking news, whale alerts,
   * governance, GitHub releases, AI insights, new launches, watchlist
   * activity). Desktop-only by design; hidden on tablet/mobile. No page
   * passes this yet, so today's layout renders identically — but any future
   * page can opt in without DashboardLayout changing again.
   */
  intelligenceRail?: ReactNode;
};

/**
 * Vercel-incident follow-up — `tickerPromise`/`liveProjectsPromise` used to
 * arrive as PROPS, started server-side by `app/dashboard/layout.tsx`. That
 * layout wraps every `/dashboard/*` route, so a server-side `no-store`
 * fetch there forced the ENTIRE dashboard (not just the six public project
 * routes) into per-request dynamic rendering — see that file's own doc
 * comment. Both values are fetched here instead, via the two small Route
 * Handlers this same change adds (`app/api/dashboard/ticker`,
 * `app/api/dashboard/live-projects`).
 *
 * Deliberately plain `useState<T | null>` + `useEffect`, matching this
 * codebase's own established pattern for CLIENT-originated data
 * (`usePortfolio.ts`), not the previous `use()`/`<Suspense>` pattern —
 * that pattern only ever worked here because the promise was started
 * server-side (part of the same render pass Suspense could stream around).
 * Two real problems were hit trying to keep it for a client-originated
 * fetch, both confirmed by an actual failed production build, not
 * theorized: (1) `DashboardLayout` is `"use client"`, but Next still
 * server-renders client components for their initial HTML — calling
 * `fetch("/api/...")` (a relative URL, no implicit base outside a browser)
 * during that server render threw `TypeError: Failed to parse URL`. (2)
 * Replacing the eager fetch with a promise that starts `new Promise(() =>
 * {})` (never resolves) and only becomes real inside `useEffect` avoided
 * that crash but then hung the build's own prerender/page-data-collection
 * pass instead (`Failed to build .../page ... because it took more than 60
 * seconds`) — that pass needs a determinate result per route, not a
 * Suspense boundary that can legitimately stay pending forever. A plain
 * `null` default sidesteps both: nothing async happens during any
 * server-rendered pass at all, and the real `fetch()` only ever runs after
 * this component has actually mounted in a browser.
 */
function useDashboardLiveData() {
  const [ticker, setTicker] = useState<WithSource<LiveTicker> | null>(null);
  const [liveProjects, setLiveProjects] = useState<LiveProject[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard/ticker")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setTicker(data);
      })
      .catch(() => {});
    fetch("/api/dashboard/live-projects")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setLiveProjects(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Empty deps — this dashboard shell mounts once per session; there is
    // no input this effect needs to re-run on.
  }, []);

  return { ticker, liveProjects };
}

export function DashboardLayout({ children, intelligenceRail }: DashboardLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { ticker, liveProjects } = useDashboardLiveData();

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
              <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} liveProjects={liveProjects} />
              {ticker ? <LiveStatusBarAsync ticker={ticker} /> : <WidgetSkeleton className="h-10 rounded-none border-x-0 border-t-0" />}
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
