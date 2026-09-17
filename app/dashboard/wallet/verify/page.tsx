import type { Metadata } from "next";

import { getRawWhaleEvents } from "@/lib/data/aggregate";
import { getLiveProjects } from "@/lib/projects/service";
import { evaluateServerCollections } from "@/lib/smart-collections/aggregate";
import { WalletVerificationHarnessPage } from "@/components/wallet/dev/WalletVerificationHarnessPage";

export const metadata: Metadata = {
  title: "Wallet Verification Harness",
  robots: { index: false, follow: false },
};

/**
 * V4-FUTURE-002A (Phase 2) — a developer-only route, unlinked from any
 * navigation (matching `/dashboard/wallet/review`'s own "no sidebar entry"
 * precedent). Not deleted after use, unlike the session's earlier
 * *-preview-temp routes — this one is meant to persist so a future
 * connected-wallet QA session can reach it directly.
 *
 * PR-092 final verification pass — gained the same real server-side fetch
 * `app/dashboard/wallet/page.tsx` already has, for the identical reason:
 * PR-092.03 (Held Projects Intelligence) and PR-092.04 (Portfolio
 * Monitoring) need the real project registry/Smart Collections/whale data
 * to render anything meaningful, and this harness previously had no way to
 * exercise either without a real wallet extension (unavailable in this
 * sandbox).
 */
export default async function WalletVerificationHarnessRoute() {
  const [liveProjects, whaleEvents] = await Promise.all([getLiveProjects(), getRawWhaleEvents()]);
  const serverCollections = evaluateServerCollections(liveProjects, whaleEvents, new Date().toISOString());
  return <WalletVerificationHarnessPage liveProjects={liveProjects} whaleEvents={whaleEvents} serverCollections={serverCollections} />;
}
