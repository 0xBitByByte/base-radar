/**
 * Today's only registered backend, and the registry's default. It wires
 * the four Backend Service contracts to what already exists — nothing
 * here is new logic, only new seams:
 *
 * - `account` forwards to `lib/account/service.ts`'s existing
 *   `getAccount()`/`updateAccount()`/`deleteAccount()` — today's real
 *   local Account implementation.
 * - `sync` forwards `push()`/`pull()` to the Connector Layer's
 *   `localConnector` (`lib/sync/connectors/local.ts`) — the same
 *   connector the Sync Engine already uses — and `getStatus()`/
 *   `getConflicts()` to `lib/sync/service.ts`'s own cached snapshot.
 * - `storage` is a thin `window.localStorage` wrapper — there is no
 *   existing generic key/value seam to reuse, so this is the one
 *   genuinely new (but minimal, SSR-safe, best-effort) implementation.
 * - `health` forwards to `localConnector.health()`.
 *
 * Nothing in the app calls `localBackend` yet — this is architecture
 * only, a seam for a future PR to route through instead of importing
 * `lib/account/service.ts` or `lib/sync/connectors/local.ts` directly.
 */

import { deleteAccount, getAccount, updateAccount } from "@/lib/account/service";
import type { AccountService } from "@/lib/backend/services/account";
import type { HealthService } from "@/lib/backend/services/health";
import type { StorageService } from "@/lib/backend/services/storage";
import type { SyncService } from "@/lib/backend/services/sync";
import type { Backend } from "@/lib/backend/types";
import { localConnector } from "@/lib/sync/connectors/local";
import { getConflicts, getSyncStatus } from "@/lib/sync/service";

const accountService: AccountService = {
  async getAccount() {
    return getAccount();
  },
  async updateAccount(patch) {
    await updateAccount(patch);
    return getAccount();
  },
  async deleteAccount() {
    await deleteAccount();
  },
};

const syncService: SyncService = {
  push: (operations) => localConnector.push(operations),
  pull: () => localConnector.pull(),
  async getStatus() {
    return getSyncStatus();
  },
  async getConflicts() {
    return getConflicts();
  },
};

const storageService: StorageService = {
  async read(key) {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async write(key, value) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // best-effort — a full localStorage or private-browsing mode should never crash the app.
    }
  },
  async remove(key) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // best-effort — see comment above
    }
  },
};

const healthService: HealthService = {
  async check() {
    const health = await localConnector.health();
    return { healthy: health.connected && health.online };
  },
};

export const localBackend: Backend = {
  id: "local",
  label: "Local Storage",
  services: {
    account: accountService,
    sync: syncService,
    storage: storageService,
    health: healthService,
  },
};
