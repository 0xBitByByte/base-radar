import type { ReactNode } from "react";

import { getLiveTicker } from "@/lib/data/aggregate";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export default function DashboardRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const tickerPromise = getLiveTicker();

  return (
    <DashboardLayout tickerPromise={tickerPromise}>
      {children}
    </DashboardLayout>
  );
}