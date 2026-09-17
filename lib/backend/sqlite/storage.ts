/**
 * A real `StorageService` (`lib/backend/services/storage.ts`'s contract)
 * against the Phase C SQLite database's `kv_storage` table — the first
 * genuinely real (non-`localStorage`) implementation of that contract.
 * Server-only: `node:sqlite` is a native Node module that cannot bundle
 * into client code, so this file can only ever run in a server context —
 * the exact "backend foundation separate from identity/session handling"
 * boundary Phase C asks for, enforced structurally rather than by
 * convention alone.
 */

import type { DatabaseSync } from "node:sqlite";

import type { StorageService } from "@/lib/backend/services/storage";

const MAX_KEY_LENGTH = 512;

/** Every externally-supplied identifier crossing this server boundary is validated before it ever reaches a query — never trusted as-is. */
function assertValidKey(key: string): void {
  if (typeof key !== "string" || key.trim() === "") {
    throw new Error("StorageService: key must be a non-empty string");
  }
  if (key.length > MAX_KEY_LENGTH) {
    throw new Error(`StorageService: key exceeds the maximum length of ${MAX_KEY_LENGTH} characters`);
  }
}

/** Wraps a real SQLite failure in a generic, safe error — never the driver's own message (which can include the real database file path), and never a stack trace, either of which would leak internal deployment detail to whatever eventually calls this service. */
function wrapDbError(operation: string, error: unknown): never {
  throw new Error(`StorageService.${operation}: the database operation failed`, { cause: error });
}

/** `getDb` is a getter, not a resolved connection — deferring the actual `getDb()` call (and the lazy connection/migration it can trigger) until a method is genuinely invoked, never at module import or backend-registration time. */
export function createStorageService(getDb: () => DatabaseSync): StorageService {
  return {
    async read(key: string): Promise<string | null> {
      assertValidKey(key);
      try {
        const db = getDb();
        const row = db.prepare("SELECT value FROM kv_storage WHERE key = ?").get(key) as { value: string } | undefined;
        return row ? row.value : null;
      } catch (error) {
        wrapDbError("read", error);
      }
    },

    async write(key: string, value: string): Promise<void> {
      assertValidKey(key);
      if (typeof value !== "string") {
        throw new Error("StorageService: value must be a string");
      }
      try {
        const db = getDb();
        db.prepare(
          "INSERT INTO kv_storage (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
        ).run(key, value, new Date().toISOString());
      } catch (error) {
        wrapDbError("write", error);
      }
    },

    async remove(key: string): Promise<void> {
      assertValidKey(key);
      try {
        const db = getDb();
        db.prepare("DELETE FROM kv_storage WHERE key = ?").run(key);
      } catch (error) {
        wrapDbError("remove", error);
      }
    },
  };
}
