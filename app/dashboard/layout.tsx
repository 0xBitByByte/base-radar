import type { Metadata } from "next";
import type { ReactNode } from "react";

import { getLiveTicker } from "@/lib/data/aggregate";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your intelligence hub for the Base ecosystem.",
};

/**
 * Not `async` (PR9.3.4 §2/§3) — awaiting `getLiveTicker()` here used to
 * block Sidebar/Topbar/everything under `/dashboard/*` on 4 provider calls
 * before any of it could paint. Passing the promise straight through instead
 * lets `DashboardLayout` render its shell immediately and stream only the
 * live-ticker strip in behind its own `<Suspense>` boundary.
 */
export default function DashboardRouteLayout({ children }: { children: ReactNode }) {
  const tickerPromise = getLiveTicker();

  return <DashboardLayout tickerPromise={tickerPromise}>{children}</DashboardLayout>;
}
