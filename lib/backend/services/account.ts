/**
 * The Account capability a backend must provide. Interface only — no
 * implementation lives here, the same "types only" shape
 * `lib/sync/connectors/base.ts` established for `SyncConnector`. See
 * `lib/backend/local.ts`'s `localBackend` for today's only concrete
 * implementation.
 */

import type { Account } from "@/lib/account/types";

export type AccountService = {
  getAccount(): Promise<Account>;
  updateAccount(patch: Partial<Pick<Account, "name" | "username" | "email" | "avatar">>): Promise<Account>;
  deleteAccount(): Promise<void>;
};
