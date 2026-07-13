"use client";

import { Suspense, useState, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";

import type { LiveTicker, WithSource } from "@/lib/data/types";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileSidebar } from "@/components/dashboard/MobileSidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { LiveStatusBarAsync } from "@/components/dashboard/LiveStatusBarAsync";
import { WidgetSkeleton } from "@/components/dashboard/WidgetSkeleton";

type DashboardLayoutProps = {
  children: ReactNode;
  /**
   * Passed unresolved (PR9.3.4 §3) — Sidebar/Topbar below render immediately
   * regardless of how long the ticker's provider calls take; only the
   * `LiveStatusBarAsync` strip suspends on it, behind its own boundary.
   */
  tickerPromise: Promise<WithSource<LiveTicker>>;
  /**
   * Reserved for the future Intelligence Rail (breaking news, whale alerts,
   * governance, GitHub releases, AI insights, new launches, watchlist
   * activity). Desktop-only by design; hidden on tablet/mobile. No page
   * passes this yet, so today's layout renders identically — but any future
   * page can opt in without DashboardLayout changing again.
   */
  intelligenceRail?: ReactNode;
};

export function DashboardLayout({ children, tickerPromise, intelligenceRail }: DashboardLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
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
          <div className="absolute top-0 left-1/2 size-[50rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-radar-primary/10 blur-3xl dark:bg-radar-primary/20" />
        </div>

        <div className="mx-auto flex max-w-[1600px]">
          <Sidebar />

          <div className="relative flex min-h-dvh min-w-0 flex-1 flex-col">
            <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
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
  );
}
