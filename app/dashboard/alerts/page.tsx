import type { Metadata } from "next";

import { AlertsPageClient } from "@/components/alerts/AlertsPageClient";
import { getProjectLogoMap } from "@/lib/branding/resolveProjectLogos";

export const metadata: Metadata = {
  title: "Alerts",
  description: "Governance, release, TVL, and on-chain activity alerts across the Base Radar registry.",
};

/**
 * Alert Engine Foundation (PR15.0) — this route still renders its alerts
 * entirely client-side (`AlertsPageClient`): no server fetch, no provider
 * call, no Suspense boundary. Alerts are local mock data
 * (`lib/alerts/mock.ts`) today; a future PR wiring this up to real alert
 * generation only changes what `lib/alerts/service.ts` resolves, never this
 * page.
 *
 * Project Logo System — the one exception: `getProjectLogoMap()` needs an
 * async server call, so it's fetched here and passed down as a prop.
 */
export default async function AlertsPage() {
  const logoMap = await getProjectLogoMap();
  return <AlertsPageClient logoMap={logoMap} />;
}
