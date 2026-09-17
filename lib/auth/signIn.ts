"use client";

/**
 * The real three-step SIWE flow — challenge, sign, verify — composed here
 * so the UI component only ever calls one function and handles one
 * pending/error state, rather than re-implementing this sequencing
 * itself. `signMessageAsync` is injected (not imported from `wagmi`
 * directly) so this module stays framework-agnostic, matching
 * `lib/auth/session.ts`'s own convention — the caller supplies
 * `useWallet()`'s real `signMessageAsync`.
 */

import { collectGuestSnapshot } from "@/lib/auth/guestSnapshot";
import { requestChallenge, verifySignIn, type VerifyResult } from "@/lib/auth/session";

export type SignMessageFn = (args: { message: string }) => Promise<string>;

export async function performSiweSignIn(address: string, signMessageAsync: SignMessageFn): Promise<VerifyResult> {
  const { message } = await requestChallenge(address);
  const signature = await signMessageAsync({ message });
  const guestSnapshot = collectGuestSnapshot();
  return verifySignIn(message, signature, guestSnapshot);
}
