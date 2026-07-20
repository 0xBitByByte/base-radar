/**
 * Shared types for the Backend Service Abstraction Layer — the layer
 * between the Connector Layer and any real backend (Dashboard → Account
 * Layer → Sync Layer → Connector Layer → Backend Service Layer →
 * Backend). Every concrete backend implements `BackendServices` by
 * providing all four of `lib/backend/services/`'s interface-only
 * contracts; `lib/backend/registry.ts` tracks which `Backend` is active.
 */

import type { AccountService } from "@/lib/backend/services/account";
import type { HealthService } from "@/lib/backend/services/health";
import type { StorageService } from "@/lib/backend/services/storage";
import type { SyncService } from "@/lib/backend/services/sync";

export type BackendServices = {
  account: AccountService;
  sync: SyncService;
  storage: StorageService;
  health: HealthService;
};

export type Backend = {
  readonly id: string;
  readonly label: string;
  readonly services: BackendServices;
};
