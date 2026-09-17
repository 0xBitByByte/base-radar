"use client";

/**
 * V4-HISTORY-004 (Phase 7) — React binding for `components/wallet/
 * walletReplaySession.ts`. `useSyncExternalStore`, the same primitive
 * `useWalletHistory()`/`useAccount()` already use for an outside-React
 * source of truth. `getServerSnapshot` returns `null` (reference-stable,
 * matching every other hook here's own convention) — Replay is never
 * active during a server render, so this can never cause a hydration
 * mismatch.
 */

import { useSyncExternalStore } from "react";

import { getActiveReplayTimestamp, subscribeToReplaySession } from "@/components/wallet/walletReplaySession";

function getServerReplaySnapshot(): string | null {
  return null;
}

/** The real timestamp Replay is currently showing, anywhere in the app — `null` when Replay isn't active. */
export function useWalletReplaySession(): string | null {
  return useSyncExternalStore(subscribeToReplaySession, getActiveReplayTimestamp, getServerReplaySnapshot);
}
