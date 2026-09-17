/**
 * Human-readable copy for a failed `connect()`/`disconnect()` call.
 * "Wrong network" is deliberately NOT handled here — it isn't a connect-time
 * error at all, it's a derived state (`useWallet()`'s `status ===
 * "unsupported-network"`), read directly off the connected `chainId`, and
 * the Topbar renders it as its own distinct state rather than an error
 * message. `instanceof` checks against viem/wagmi's own real error classes
 * (never string-matching a `.message`, which varies per wallet/browser) —
 * the same "reuse the library's own typed errors" approach
 * `lib/providers/*` already uses for provider-layer failures.
 *
 * V3-WALLET-001F — `instanceof` alone isn't enough: confirmed live (real
 * MetaMask, `@wagmi/core`'s installed `injected` connector,
 * `connectors/injected.ts:132-140`) that a `-32002` ("already pending")
 * response from the connector's own pre-connect `wallet_requestPermissions`
 * call is rethrown as the *raw* provider error object — `throw error`, not
 * `throw new ResourceUnavailableRpcError(error)` — while the exact same
 * error code IS correctly wrapped a few lines later if it happens on
 * `eth_requestAccounts` instead (`connectors/injected.ts:198-199`). That
 * inconsistency is wagmi's, not ours, and not worth routing around by
 * touching connector config (`shimDisconnect` exists for a real reason —
 * see `lib/wallet/config.ts` — turning it off would trade this bug for
 * silently breaking "stay disconnected after Disconnect" for every injected
 * wallet). `getRpcErrorCode` reads the one thing that's reliably present on
 * an EIP-1193 provider error whether or not wagmi wrapped it: the numeric
 * `.code` — confirmed live as a plain `{code, message, stack}` object
 * (`constructor.name` "Object", not any Error subclass) for this exact
 * failure.
 */

import { ResourceUnavailableRpcError, UserRejectedRequestError } from "viem";
import { ConnectorNotFoundError, ProviderNotFoundError } from "wagmi";

function getRpcErrorCode(error: unknown): number | undefined {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "number") {
    return error.code;
  }
  return undefined;
}

export function getWalletErrorMessage(error: unknown): string {
  const code = getRpcErrorCode(error);

  if (error instanceof UserRejectedRequestError || code === UserRejectedRequestError.code) {
    return "Connection request declined.";
  }

  if (error instanceof ConnectorNotFoundError || error instanceof ProviderNotFoundError) {
    return "That wallet isn't available. Make sure it's installed, then try again.";
  }

  if (error instanceof ResourceUnavailableRpcError || code === ResourceUnavailableRpcError.code) {
    return "A connection request is already pending — check your wallet, or unlock it if it's locked.";
  }

  return "Couldn't connect your wallet. Please try again.";
}
