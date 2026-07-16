"use client";

/**
 * Client-side "hooks" layer sitting between UI and services, per the
 * UI -> Hooks -> Services -> Providers architecture: components never call
 * `lib/providers/*` directly for anything that needs to refresh on an
 * interval — they call a hook, and the hook owns the polling lifecycle.
 *
 * Built on `usePolling` (PR12.2) — same public signature and return shape
 * as before, now additionally pausing while the tab is hidden and, when
 * `initial` is passed (Dashboard's `MarketWidgetLive`, Project Profile's
 * `ProfileNetworkLive`), skipping the redundant immediate poll right after
 * an SSR-streamed value.
 */

import { getBaseNetworkStatus } from "@/lib/providers/base/service";
import type { NetworkStatus } from "@/lib/providers/base/service";
import { usePolling } from "@/lib/hooks/usePolling";

export type LiveNetworkStatus = NetworkStatus;

const DEFAULT_POLL_MS = 45_000;

export function useLiveNetworkStatus(pollMs: number = DEFAULT_POLL_MS, initial?: LiveNetworkStatus) {
  const { data, updatedAt } = usePolling<LiveNetworkStatus>(
    async () => {
      const result = await getBaseNetworkStatus();
      return result.ok ? result.data : null;
    },
    pollMs,
    { initial }
  );

  return { status: data, updatedAt };
}
