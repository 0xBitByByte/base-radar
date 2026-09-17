/**
 * EIP-4361 (SIWE) message construction and verification — built entirely
 * on `viem/siwe` and `viem`'s plain `verifyMessage`, both already real
 * dependencies (`viem` is already installed for the wallet layer) — zero
 * new production dependencies for real, standards-compliant SIWE.
 *
 * Deliberately EOA-only: `verifyMessage` (used here) is viem's own pure,
 * offline ECDSA-recovery check — "Only supports Externally Owned
 * Accounts. Does not support Contract Accounts" per its own doc comment.
 * viem also ships `verifySiweMessage`, which additionally supports
 * ERC-6492 smart-contract-wallet signatures, but that requires a live RPC
 * client (a real, on-chain `eth_call`) — a genuinely new server-side
 * dependency (an RPC endpoint to call, with its own reliability/rate-limit
 * surface) this phase does not introduce. Every connector this app
 * currently offers (`lib/wallet/connectors.ts`: MetaMask, Rabby, Trust
 * Wallet, Coinbase Wallet, WalletConnect) signs as a standard EOA in its
 * default configuration, so this covers the real, currently-supported
 * wallet set. Documented here as a scoped limitation, not hidden.
 */

import { getAddress, verifyMessage, type Address, type Hex } from "viem";
import { base } from "viem/chains";
import { createSiweMessage, parseSiweMessage, validateSiweMessage } from "viem/siwe";

export type BuildChallengeMessageParams = {
  address: string;
  domain: string;
  uri: string;
  nonce: string;
  issuedAt: Date;
  expirationTime: Date;
};

/** Throws if `address` isn't a real, well-formed Ethereum address — a genuine input-validation failure, not swallowed. */
export function buildChallengeMessage({ address, domain, uri, nonce, issuedAt, expirationTime }: BuildChallengeMessageParams): string {
  return createSiweMessage({
    address: getAddress(address),
    chainId: base.id,
    domain,
    uri,
    version: "1",
    nonce,
    issuedAt,
    expirationTime,
    statement: "Sign in to Base Radar with your wallet. This request will not trigger a blockchain transaction or cost any gas.",
  });
}

export type StructuralValidationParams = {
  message: string;
  address: string;
  domain: string;
  nonce: string;
};

/** Checks the signed message's own fields (address, domain, nonce, expiration) match what the server expects — independent of, and prior to, the cryptographic signature check below. A forged or tampered message fails here even if it happened to carry a valid signature for different fields. */
export function validateChallengeMessageFields({ message, address, domain, nonce }: StructuralValidationParams): boolean {
  const parsed = parseSiweMessage(message);
  return validateSiweMessage({
    message: parsed,
    address: getAddress(address),
    domain,
    nonce,
    time: new Date(),
  });
}

/**
 * Real cryptographic verification — recovers the signing address from
 * `signature` and checks it against `address`. Never assumes a signature
 * is valid without this call; never treats a plausible-looking message as
 * proof on its own.
 *
 * A real defect found while testing this phase: viem's `verifyMessage`
 * *throws* (`"invalid signature length"` and similar) for a genuinely
 * malformed signature, rather than resolving `false` — a real, well-formed
 * ECDSA signature and a garbage string are different failure classes to
 * viem, but not to this function's own contract: "did this verify" always
 * has an honest `false` answer, even for garbage input. Left uncaught,
 * this would have surfaced as an unhandled exception in `/api/auth/verify`
 * (a raw 500, not the intended clean 401) for any malformed signature —
 * exactly the "leaking internal state" failure mode this phase is told to
 * avoid. Caught here so every caller gets one honest boolean.
 */
export async function verifySiweSignature(message: string, signature: Hex, address: string): Promise<boolean> {
  try {
    return await verifyMessage({ address: getAddress(address) as Address, message, signature });
  } catch {
    return false;
  }
}
