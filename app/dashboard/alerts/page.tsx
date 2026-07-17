import type { Metadata } from "next";

import { AlertsPageClient } from "@/components/alerts/AlertsPageClient";

export const metadata: Metadata = {
  title: "Alerts",
  description: "Governance, release, TVL, and on-chain activity alerts across the Base Radar registry.",
};

/**
 * Alert Engine Foundation (PR15.0) — this route renders entirely
 * client-side (`AlertsPageClient`): no server fetch, no provider call, no
 * Suspense boundary. Alerts are local mock data (`lib/alerts/mock.ts`)
 * today; a future PR wiring this up to real alert generation only changes
 * what `lib/alerts/service.ts` resolves, never this page.
 */
export default function AlertsPage() {
  return <AlertsPageClient />;
}
