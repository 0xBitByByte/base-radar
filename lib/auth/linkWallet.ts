"use client";

/**
 * PR-093.05 (Connected Accounts) — the real two-step "link a wallet" flow
 * (challenge, sign — no separate "verify" step; `/api/auth/linked-wallets`
 * itself both verifies the signature and performs the link in one real
 * request). Mirrors `lib/auth/signIn.ts`'s own composition exactly: the
 * caller supplies `useWallet()`'s real `signMessageAsync`, this module
 * stays framework-agnostic, and the UI only ever calls one function and
 * handles one pending/error state.
 */

import { requestChallenge, linkWallet, type LinkedWallet } from "@/lib/auth/session";

export type SignMessageFn = (args: { message: string }) => Promise<string>;

export async function performWalletLink(address: string, signMessageAsync: SignMessageFn): Promise<LinkedWallet[]> {
  const { message } = await requestChallenge(address);
  const signature = await signMessageAsync({ message });
  return linkWallet(message, signature);
}
