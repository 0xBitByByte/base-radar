"use client";

/**
 * PR-093.06 (Ongoing Cloud Sync) — the one place real auth state decides
 * which Sync connector is active. Mounted once, globally
 * (`components/sync/CloudSyncActivation.tsx`, in `app/layout.tsx`), not
 * per-page, so Cloud Sync activates/deactivates correctly regardless of
 * which page the user is on.
 *
 * PR-094.01 (Recent Searches Cross-Device Sync) extends the same pull-
 * apply loop below to the `search` entity — `performPull()` itself needed
 * no changes at all (its reconciliation is already entity-agnostic); only
 * this loop's dispatch (which adapter/apply-function a given entity uses)
 * grew a second real branch.
 *
 * PR-094.02 (Saved Searches Cloud Sync) adds a third branch for the real
 * multi-record `savedSearch` entity. Unlike `account`/`search` (always a
 * payload-carrying "here is the new state" operation), a `savedSearch`
 * pull can be a real, explicit tombstone `"delete"` operation whose
 * `payload` is deliberately `null` (see `pullSavedSearchState()`) — the
 * loop below branches on `operation.type` for this entity specifically,
 * rather than treating a null payload as "nothing to apply, skip it" the
 * way every other entity safely can.
 *
 * `"loading"` (the transient state before the first real
 * `/api/auth/session` check resolves) deliberately leaves the active
 * connector untouched — there's no real answer yet, so nothing should
 * change based on a guess.
 *
 * Bug fix (Guest + Sign Out follow-up — profile not restored on re-sign-in)
 * — `performSync()` (push) and `performPull()` were both fired with `void`
 * back-to-back, with no ordering between them. `performPull()`'s own
 * reconciliation treats any queued local operation with `status !==
 * "success"` as a real, unresolved conflict (see `lib/sync/service.ts`'s
 * `performPull()`) — so a locally-queued-but-not-yet-pushed edit (e.g. a
 * profile edit made just before a reload/sign-out interrupted its push)
 * could still read as "pending" when `performPull()`'s check ran, even
 * though `performSync()` was already in flight to resolve it. That raced
 * conflict then permanently blocked the real remote data from applying —
 * confirmed live: the same wallet's previously-saved name/username/avatar
 * never came back on a later sign-in, with the Topbar showing "Conflict".
 * Pull now only ever runs after push has genuinely finished, exactly the
 * push-then-pull order this comment already documented as intended.
 */

import { useEffect } from "react";

import { applyRemoteAccountFields } from "@/lib/account/service";
import { useAuthSession } from "@/lib/hooks/useAuthSession";
import { applyRemoteSavedSearch, removeSavedSearchLocally } from "@/lib/search/savedSearches";
import { applyRemoteRecentSearches } from "@/lib/search/storage";
import { accountSyncAdapter } from "@/lib/sync/adapters/account";
import { savedSearchSyncAdapter } from "@/lib/sync/adapters/savedSearch";
import { searchSyncAdapter } from "@/lib/sync/adapters/search";
import { setActive } from "@/lib/sync/connectors/registry";
import { performPull, performSync } from "@/lib/sync/service";

export function useCloudSyncActivation() {
  const { status } = useAuthSession();

  useEffect(() => {
    if (status === "authenticated") {
      setActive("backend");
      void (async () => {
        await performSync();
        const { applied } = await performPull();
        for (const operation of applied) {
          try {
            if (operation.entity === "savedSearch") {
              if (operation.type === "delete") {
                removeSavedSearchLocally(operation.entityId);
              } else if (operation.payload !== null) {
                applyRemoteSavedSearch(savedSearchSyncAdapter.deserialize(operation.payload));
              }
              continue;
            }
            if (operation.payload === null) continue;
            if (operation.entity === "account") {
              const data = accountSyncAdapter.deserialize(operation.payload);
              applyRemoteAccountFields({ name: data.name, username: data.username, email: data.email, avatar: data.avatar, bio: data.bio });
            } else if (operation.entity === "search") {
              const data = searchSyncAdapter.deserialize(operation.payload);
              applyRemoteRecentSearches(data.queries);
            }
          } catch {
            // A malformed cloud payload is skipped, never applied and never crashes this loop.
          }
        }
      })();
      return;
    }

    if (status === "guest" || status === "signed-out" || status === "expired") {
      setActive("local");
    }
  }, [status]);
}
