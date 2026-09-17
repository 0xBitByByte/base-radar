"use client";

/**
 * Gathers the current device's real local Guest state for migration —
 * the exact three stores the existing Sync Adapters already know how to
 * describe (`accountSyncAdapter`, `watchlistSyncAdapter`,
 * `preferencesSyncAdapter`): `lib/account/service.ts`'s current `Account`,
 * `lib/personalization/storage.ts`'s current Watchlists, and
 * `lib/personalization/preferences.ts`'s current Preferences. Returns
 * `null` when there's genuinely nothing to migrate — the account isn't a
 * Guest (already authenticated locally, or mid-migration already), so
 * sending a snapshot would be meaningless.
 */

import * as accountService from "@/lib/account/service";
import { getPersonalizationPreferences } from "@/lib/personalization/preferences";
import { getPersonalizationState } from "@/lib/personalization/storage";
import type { GuestMigrationSnapshot } from "@/lib/auth/session";

export function collectGuestSnapshot(): GuestMigrationSnapshot | null {
  const account = accountService.getAccount();
  if (!account.isGuest) return null;

  const { watchlists } = getPersonalizationState();
  const preferences = getPersonalizationPreferences();

  return {
    account: { name: account.name, username: account.username, email: account.email, avatar: account.avatar, bio: account.bio },
    watchlists,
    preferences,
  };
}
