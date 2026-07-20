export type SyncOperationType = "create" | "update" | "delete";

export type SyncEntity = "watchlist" | "preferences" | "account";

export type SyncOperationStatus = "pending" | "syncing" | "error" | "success";

export type SyncOperation = {
  id: string;
  type: SyncOperationType;
  entity: SyncEntity;
  entityId: string;
  /** An adapter-serialized snapshot of the entity, opaque to the Sync Queue and Sync Engine — neither ever parses it. `null` for an operation with no payload (e.g. a bare delete). */
  payload: string | null;
  createdAt: string;
  updatedAt: string;
  status: SyncOperationStatus;
  retryCount: number;
};

export type ConflictRecord = {
  entity: SyncEntity;
  entityId: string;
  localVersion: unknown;
  remoteVersion: unknown;
  resolved: boolean;
};

/**
 * "Syncing", "error", and "success" only ever occur as the direct, honest
 * outcome of a real `performSync()` attempt — never fabricated ahead of
 * time. Since there is no backend in this PR, an attempt against an empty
 * queue honestly resolves "success" (nothing needed syncing); an attempt
 * against a non-empty queue honestly resolves "error" (there is nothing
 * real to sync it to yet).
 */
export type SyncState = "idle" | "pending" | "syncing" | "offline" | "conflict" | "error" | "success";

export type SyncStatus = {
  state: SyncState;
  pendingCount: number;
  retryCount: number;
  conflictCount: number;
  lastSyncAt: string | null;
  isOffline: boolean;
};

/**
 * The contract every entity-specific adapter in `lib/sync/adapters/`
 * implements. The Sync Queue and Sync Engine only ever handle the
 * `SyncOperation` an adapter's `createOperation()` produces — they never
 * import `TData` or know how to read/write it themselves. This is what
 * keeps the queue generic: Account, Watchlist, and Preferences syncing
 * differently is entirely an adapter concern.
 */
export type SyncAdapter<TData> = {
  readonly entity: SyncEntity;
  /** This adapter's own serialization schema version — for a future migration when its payload format changes, distinct from any per-record `updatedAt`. */
  version(): number;
  /** A type guard confirming an unknown value matches `TData`'s shape. */
  validate(data: unknown): data is TData;
  serialize(data: TData): string;
  /** Throws if `payload` fails `validate()` — never silently returns a malformed object. */
  deserialize(payload: string): TData;
  createOperation(type: SyncOperationType, entityId: string, data: TData): SyncOperation;
  /** Never called automatically today — there is no remote version of any entity to merge against without a backend. */
  merge(local: TData, remote: TData): TData;
};
