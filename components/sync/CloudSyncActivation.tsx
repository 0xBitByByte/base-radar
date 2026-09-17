"use client";

import { useCloudSyncActivation } from "@/lib/hooks/useCloudSyncActivation";

/**
 * PR-093.06 (Ongoing Cloud Sync) — mounted once, globally, in
 * `app/layout.tsx` (the same "server layout composes a small client
 * component directly" shape `WalletProvider`/`SplashScreen` already use
 * there) so Cloud Sync activates/deactivates correctly on every page, not
 * just Profile. Renders nothing — exists only to run
 * `useCloudSyncActivation()`'s effect for the whole app.
 */
export function CloudSyncActivation() {
  useCloudSyncActivation();
  return null;
}
