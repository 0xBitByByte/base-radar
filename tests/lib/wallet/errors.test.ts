import { describe, expect, it } from "vitest";
import { ResourceUnavailableRpcError, UserRejectedRequestError } from "viem";
import { ConnectorNotFoundError, ProviderNotFoundError } from "wagmi";

import { getWalletErrorMessage } from "@/lib/wallet/errors";

describe("getWalletErrorMessage", () => {
  it("gives a clear message when the user rejects the connection", () => {
    expect(getWalletErrorMessage(new UserRejectedRequestError(new Error("rejected")))).toBe(
      "Connection request declined."
    );
  });

  it("gives a clear message when no connector/provider is found (wallet unavailable)", () => {
    expect(getWalletErrorMessage(new ConnectorNotFoundError())).toMatch(/isn't available/);
    expect(getWalletErrorMessage(new ProviderNotFoundError())).toMatch(/isn't available/);
  });

  it("gives a clear message for a pending/locked-wallet request", () => {
    expect(getWalletErrorMessage(new ResourceUnavailableRpcError(new Error("already processing")))).toMatch(
      /already pending/
    );
  });

  it("falls back to a generic message for anything unrecognized", () => {
    expect(getWalletErrorMessage(new Error("something obscure"))).toBe("Couldn't connect your wallet. Please try again.");
    expect(getWalletErrorMessage("not even an Error")).toBe("Couldn't connect your wallet. Please try again.");
  });

  /**
   * V3-WALLET-001F regression — confirmed live against a real MetaMask
   * extension: `@wagmi/core`'s installed `injected` connector
   * (`connectors/injected.ts:139`) rethrows a `-32002` ("already pending")
   * response from its pre-connect `wallet_requestPermissions` call as the
   * *raw* provider error — a plain `{code, message, stack}` object,
   * `constructor.name` "Object" — never wrapped in
   * `ResourceUnavailableRpcError`, unlike the same error code a few lines
   * later in the same function. `instanceof` alone can't catch this; these
   * two cases are what actually broke in production and what the `code`
   * fallback in `getWalletErrorMessage` exists to catch.
   */
  it("recognizes a raw (unwrapped) pending-request error by its numeric RPC code alone", () => {
    const rawMetaMaskError = {
      code: -32002,
      message: "Request of type 'wallet_requestPermissions' already pending for origin http://localhost:3000. Please wait.",
      stack: "...",
    };
    expect(rawMetaMaskError).not.toBeInstanceOf(ResourceUnavailableRpcError);
    expect(getWalletErrorMessage(rawMetaMaskError)).toMatch(/already pending/);
  });

  it("recognizes a raw (unwrapped) user-rejection error by its numeric RPC code alone", () => {
    const rawRejection = { code: 4001, message: "User rejected the request." };
    expect(rawRejection).not.toBeInstanceOf(UserRejectedRequestError);
    expect(getWalletErrorMessage(rawRejection)).toBe("Connection request declined.");
  });
});
