"use client";

/**
 * V3-WALLET-001 — the one shared wallet layer every component reads
 * through; nothing outside this hook (and `WalletProvider.tsx`, which only
 * mounts the provider) ever imports `wagmi` directly, the same "components
 * never call the underlying layer directly, always via a hook" convention
 * `useAutomationRules.ts`/`useWatchlists.ts` already establish for their
 * own layers.
 *
 * Named `useWallet`, not `useAccount` — `lib/hooks/useAccount.ts` already
 * owns that name for this app's local guest/profile identity system (a
 * completely unrelated concept: a display name and avatar, no crypto
 * wallet involved). Wagmi's own hook of the same name is imported here
 * under an alias to avoid any confusion between the two.
 *
 * Deliberately thin: every field wagmi already computes (`address`,
 * `chain`, `chainId`, `connector`, `isConnected`, `isReconnecting`) is
 * passed through unchanged, never re-derived. The real requirements this
 * hook adds, not extra state:
 *   - `status`, a 4-value union (`"disconnected" | "connecting" |
 *     "connected" | "unsupported-network"`) collapsing wagmi's own 4-state
 *     `isConnected`/`isConnecting`/`isReconnecting` plus a real chain-id
 *     check (`isSupportedWalletChain`) into the exact state machine this
 *     phase's spec asks for.
 *   - `connect`/`disconnect` are wagmi's mutation `mutate`/`mutateAsync`
 *     renamed to the field names this phase's spec asks for, so this
 *     hook's own public shape stays stable even if a future wagmi major
 *     version renames its internals again (`connect`/`connectors` on
 *     `useConnect()` are already `@deprecated` aliases in the installed
 *     wagmi version, in favor of `mutate` + a separate `useConnectors()`).
 *   - Release 1 Phase D — `signMessageAsync`, a thin rename of wagmi's own
 *     `useSignMessage()` mutation, for real SIWE challenge-signing
 *     (`lib/auth/session.ts`). This hook never signs anything itself or
 *     decides what a signature means; it only exposes the real wallet
 *     capability the same way `connect`/`disconnect` already do.
 */

import { useMemo } from "react";
import { useAccount as useWagmiAccount, useConnect, useConnectors, useDisconnect, useEnsName, useSignMessage } from "wagmi";
import { mainnet } from "viem/chains";

import { isSupportedWalletChain } from "@/lib/wallet/chains";
import { getWalletErrorMessage } from "@/lib/wallet/errors";

export type WalletConnectionStatus = "disconnected" | "connecting" | "connected" | "unsupported-network";

export function useWallet() {
  const { address, chain, chainId, connector, isConnected, isConnecting, isReconnecting } = useWagmiAccount();
  const connectors = useConnectors();
  const { mutate: connect, isPending: isConnectPending, error: connectErrorRaw, reset: resetConnectError } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const { mutateAsync: signMessageAsync } = useSignMessage();

  // ENS only ever resolves against Ethereum Mainnet's registry, regardless
  // of which chain the wallet itself is connected to — `chainId: mainnet.id`
  // is a deliberate override, not a bug. `enabled: !!address` means this
  // never fires while disconnected. Any lookup failure (no ENS name, RPC
  // hiccup) resolves to `undefined` data, exactly the "fail gracefully,
  // never block rendering" the spec asks for — this hook never throws or
  // suspends on it.
  const { data: ensName } = useEnsName({ address, chainId: mainnet.id, query: { enabled: Boolean(address) } });

  const isSupportedNetwork = isSupportedWalletChain(chainId);

  const status: WalletConnectionStatus = useMemo(() => {
    if (!isConnected) return isConnecting || isReconnecting ? "connecting" : "disconnected";
    return isSupportedNetwork ? "connected" : "unsupported-network";
  }, [isConnected, isConnecting, isReconnecting, isSupportedNetwork]);

  return {
    address,
    connector,
    connectors,
    chain,
    chainId,
    ensName: ensName ?? null,
    isConnected,
    isConnecting: isConnecting || isReconnecting || isConnectPending,
    isSupportedNetwork,
    status,
    connect,
    connectError: connectErrorRaw ? getWalletErrorMessage(connectErrorRaw) : null,
    resetConnectError,
    disconnect,
    signMessageAsync,
  };
}
