/**
 * The generic key/value capability a backend must provide. Interface
 * only — no implementation lives here. This is the lowest-level contract
 * in the Backend Service Layer: every other service can be built in
 * terms of it, though today's concrete services mostly wrap existing
 * Account/Sync/Connector code directly instead.
 */

export type StorageService = {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
};
