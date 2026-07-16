import type { Metadata } from "next";
import type { ReactNode } from "react";

import { getLiveTicker } from "@/lib/data/aggregate";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://base-radar.vercel.app"),
  title: {
    default: "Base Radar",
    template: "%s | Base Radar",
  },
  description: "AI-powered intelligence for the Base ecosystem.",
};

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