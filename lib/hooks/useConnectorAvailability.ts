"use client";

/**
 * V3-WALLET-001C — a UI-layer-only "is this wallet's extension actually
 * present" hint for the connect picker, entirely separate from
 * `lib/wallet/config.ts`'s real connector detection: this never feeds into
 * `connect()` or any connector's own provider resolution, it only decides
 * whether `WalletButton.tsx` labels a row "Installed"/"Not Installed."
 * Getting this wrong in an edge case (a wallet that injects late, or an
 * unusual multi-provider setup) degrades to an honest "Not Installed"
 * label on a wallet that could still actually connect — never the reverse,
 * and never a crash, since the real connect flow doesn't consult this at
 * all.
 *
 * Same `useSyncExternalStore` shape `useRelativeTime.ts` already
 * established for this exact class of problem ("the real value only
 * exists client-side, never guess it during SSR/first paint"):
 * `getServerSnapshot` returns `null` for both the server render and the
 * client's matching first render (nothing for React to diff during
 * hydration), then `subscribe` actively notifies on the next tick, forcing
 * a re-read of the real value — no `useEffect`+`setState`, so no
 * cascading-render lint concern either.
 */

import { useSyncExternalStore } from "react";

function isFlagPresent(flags: string | string[] | undefined): boolean {
  if (!flags) return false;
  const ethereum = (window as { ethereum?: Record<string, unknown> }).ethereum;
  if (!ethereum) return false;

  const candidates = Array.isArray(ethereum.providers)
    ? (ethereum.providers as Record<string, unknown>[])
    : [ethereum];
  const flagList = Array.isArray(flags) ? flags : [flags];

  return candidates.some((provider) => flagList.some((flag) => Boolean(provider?.[flag])));
}

function subscribe(onStoreChange: () => void): () => void {
  const timer = setTimeout(onStoreChange, 0);
  return () => clearTimeout(timer);
}

function getServerSnapshot(): boolean | null {
  return null;
}

/** `true`/`false` once known, `null` before the client has mounted. Pass `undefined` for a connector this hint doesn't apply to (see `CONNECTOR_METADATA`'s own doc comment) — always resolves to `null`, so callers can treat "no opinion" and "not yet known" identically. */
export function useConnectorAvailability(providerFlag: string | string[] | undefined): boolean | null {
  return useSyncExternalStore(subscribe, () => (providerFlag ? isFlagPresent(providerFlag) : null), getServerSnapshot);
}
