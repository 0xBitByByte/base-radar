"use client";

/**
 * React binding for `lib/auth/session.ts` — `useSyncExternalStore`, the
 * same primitive `useAccount()`/`useRecentlyViewed()` already use for an
 * outside-React source of truth. `getServerSnapshot` returns a fixed
 * `{status: "loading"}` — never a real fetch result, which couldn't exist
 * during server rendering anyway (no cookie to read) — so the server HTML
 * and the client's first render agree exactly; a `useEffect` then kicks
 * off the real `/api/auth/session` check once mounted, the same "resolve
 * to the real value only after hydration" shape `useRelativeTime` already
 * established for its own async-after-mount value.
 */

import { useCallback, useEffect, useSyncExternalStore } from "react";

import * as authSession from "@/lib/auth/session";
import type { AuthSessionState } from "@/lib/auth/session";
import { performSiweSignIn, type SignMessageFn } from "@/lib/auth/signIn";

const SERVER_SNAPSHOT: AuthSessionState = { status: "loading" };

function getServerSnapshot(): AuthSessionState {
  return SERVER_SNAPSHOT;
}

export function useAuthSession() {
  const session = useSyncExternalStore(authSession.subscribe, authSession.getAuthSession, getServerSnapshot);

  useEffect(() => {
    void authSession.refreshSession();
  }, []);

  const signIn = useCallback((address: string, signMessageAsync: SignMessageFn) => performSiweSignIn(address, signMessageAsync), []);
  const signOut = useCallback(() => authSession.signOut(), []);
  const refresh = useCallback(() => authSession.refreshSession(), []);

  return {
    session,
    status: session.status,
    account: session.status === "authenticated" ? session.account : null,
    signIn,
    signOut,
    refresh,
  };
}
