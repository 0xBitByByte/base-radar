"use client";

/**
 * React binding for `lib/account/service.ts` — `useSyncExternalStore`, the
 * same primitive `lib/hooks/useWatchlist.ts` already uses for an
 * outside-React source of truth. No provider access, no network call —
 * this hook only ever reads/writes the Account Layer's local store.
 *
 * `getServerSnapshot` returns a fixed, reference-stable placeholder (never
 * `buildGuestAccount()`, which stamps real timestamps and would produce a
 * hydration mismatch between the server's render and the client's
 * resolved account) — the client re-renders with the real cached account
 * immediately after mount, the same pattern every other
 * `useSyncExternalStore`-based hook in this app follows.
 */

import { useCallback, useSyncExternalStore } from "react";

import * as accountService from "@/lib/account/service";
import type { Account, ProfileInput } from "@/lib/account/types";

const SERVER_SNAPSHOT_ACCOUNT: Account = {
  id: "guest",
  name: "Guest User",
  username: "guest",
  email: null,
  avatar: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
  lastActiveAt: "2025-01-01T00:00:00.000Z",
  isGuest: true,
};

function getServerSnapshot(): Account {
  return SERVER_SNAPSHOT_ACCOUNT;
}

export function useAccount() {
  const account = useSyncExternalStore(accountService.subscribe, accountService.getAccount, getServerSnapshot);

  const updateProfile = useCallback(
    (patch: Partial<Pick<Account, "name" | "username" | "email" | "avatar">>) => accountService.updateAccount(patch),
    []
  );

  const validateProfile = useCallback(
    (input: ProfileInput) => accountService.validateProfileInput(input, account.id),
    [account.id]
  );

  const signOut = useCallback(() => accountService.signOut(), []);
  const exportAccount = useCallback(() => accountService.exportAccount(), []);

  return {
    account,
    isGuest: account.isGuest,
    updateProfile,
    validateProfile,
    signOut,
    exportAccount,
  };
}
