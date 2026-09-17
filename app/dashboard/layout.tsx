import type { ReactNode } from "react";

import { getLiveTicker } from "@/lib/data/aggregate";
import { getLiveProjects } from "@/lib/projects/service";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export default function DashboardRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const tickerPromise = getLiveTicker();
  // Universal Project Card, PR-8 — same unresolved-Promise pattern as
  // `tickerPromise` above: passed down through DashboardLayout/Topbar/
  // CommandPalette, consumed only by the small `CommandResultsAsync`
  // boundary (mirroring `LiveStatusBarAsync`) that actually needs it, so
  // no other part of the dashboard shell waits on it.
  const liveProjectsPromise = getLiveProjects();

  return (
    <DashboardLayout tickerPromise={tickerPromise} liveProjectsPromise={liveProjectsPromise}>
      {children}
    </DashboardLayout>
  );
}