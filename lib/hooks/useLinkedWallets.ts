"use client";

/**
 * React binding for `lib/auth/session.ts`'s Linked Wallets calls
 * (PR-093.05, Connected Accounts). Deliberately local `useState`, not
 * `useSyncExternalStore` like `useAuthSession`/`useAccount`: linked
 * wallets are only ever read by `ConnectedAccountsSection`, a single
 * consumer, so there's no cross-component cache to keep in sync — the
 * shared-store machinery those hooks need would be unused weight here.
 *
 * `enabled` gates the initial fetch — the caller passes `auth.status ===
 * "authenticated"`, since a Guest has no server-side linked wallets to
 * fetch at all.
 */

import { useCallback, useEffect, useState } from "react";

import { fetchLinkedWallets, unlinkWallet as unlinkWalletRequest, type LinkedWallet } from "@/lib/auth/session";
import { performWalletLink, type SignMessageFn } from "@/lib/auth/linkWallet";

const EMPTY_LINKED_WALLETS: LinkedWallet[] = [];

export function useLinkedWallets(enabled: boolean) {
  const [linkedWallets, setLinkedWallets] = useState<LinkedWallet[]>([]);
  const [loading, setLoading] = useState(enabled);

  // `setLoading(true)` lives inside this callback, not inline in the effect
  // body below — the same shape `usePortfolio.ts`'s own `load()` already
  // establishes for "an effect kicks off a real async fetch."
  const load = useCallback(async (cancelledRef: { current: boolean }) => {
    setLoading(true);
    const wallets = await fetchLinkedWallets();
    if (!cancelledRef.current) {
      setLinkedWallets(wallets);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Nothing to fetch while disabled — no state to reset here either;
    // the return value below already reports the honest disabled shape
    // (empty, not loading) without this effect touching state for it.
    if (!enabled) return;

    const cancelledRef = { current: false };
    // `load` sets `loading` synchronously before its own first `await` —
    // calling it directly here would make this effect body itself
    // synchronously trigger a `setState`. `queueMicrotask` defers that to
    // the next microtask, the same "never a same-tick setState at the top
    // of an effect" shape `usePortfolio.ts`'s own `load()` already
    // established for this exact class of problem.
    queueMicrotask(() => void load(cancelledRef));
    return () => {
      cancelledRef.current = true;
    };
  }, [enabled, load]);

  const link = useCallback(async (address: string, signMessageAsync: SignMessageFn) => {
    const wallets = await performWalletLink(address, signMessageAsync);
    setLinkedWallets(wallets);
    return wallets;
  }, []);

  const unlink = useCallback(async (address: string) => {
    const wallets = await unlinkWalletRequest(address);
    setLinkedWallets(wallets);
    return wallets;
  }, []);

  return {
    linkedWallets: enabled ? linkedWallets : EMPTY_LINKED_WALLETS,
    loading: enabled && loading,
    link,
    unlink,
  };
}
