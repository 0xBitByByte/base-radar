"use client";

/**
 * Client-side "hooks" layer sitting between UI and services, per the
 * UI -> Hooks -> Services -> Providers architecture: components never call
 * `lib/data/providers/*` directly for anything that needs to refresh on an
 * interval — they call a hook, and the hook owns the polling lifecycle.
 */

import { useEffect, useState } from "react";

import { getBaseNetworkStatus } from "@/lib/data/providers/baseRpc";

export type LiveNetworkStatus = {
  gasGwei: number;
  blockHeight: number;
  txCountLatestBlock: number;
  estimatedTps: number;
  chainId: number;
};

const DEFAULT_POLL_MS = 45_000;

export function useLiveNetworkStatus(pollMs: number = DEFAULT_POLL_MS) {
  const [status, setStatus] = useState<LiveNetworkStatus | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const next = await getBaseNetworkStatus();
      if (!cancelled && next) {
        setStatus(next);
        setUpdatedAt(Date.now());
      }
    }

    poll();
    const interval = setInterval(poll, pollMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollMs]);

  return { status, updatedAt };
}
