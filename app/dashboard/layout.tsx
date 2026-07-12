import type { Metadata } from "next";
import type { ReactNode } from "react";

import { getLiveTicker } from "@/lib/data/aggregate";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your intelligence hub for the Base ecosystem.",
};

export default async function DashboardRouteLayout({ children }: { children: ReactNode }) {
  const ticker = await getLiveTicker();

  return <DashboardLayout ticker={ticker}>{children}</DashboardLayout>;
}
