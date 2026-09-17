import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildOperation, QUEUE_STORAGE_KEY, readQueue, writeQueue } from "@/lib/sync/queue";
import type { SyncOperation } from "@/lib/sync/types";

function makeOperation(overrides: Partial<SyncOperation> = {}): SyncOperation {
  return {
    id: "sync:abc123",
    type: "create",
    entity: "watchlist",
    entityId: "wl-1",
    payload: JSON.stringify({ name: "Favorites" }),
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    status: "pending",
    retryCount: 0,
    ...overrides,
  };
}

describe("Sync Queue storage", () => {
  beforeEach(() => window.localStorage.removeItem(QUEUE_STORAGE_KEY));
  afterEach(() => window.localStorage.removeItem(QUEUE_STORAGE_KEY));

  describe("readQueue", () => {
    it("is empty on first load — no key has ever been written", () => {
      expect(readQueue()).toEqual([]);
    });

    it("round-trips real operations written via writeQueue", () => {
      const operation = makeOperation();
      writeQueue([operation]);
      expect(readQueue()).toEqual([operation]);
    });

    it("recovers to an honest empty queue on corrupted JSON", () => {
      window.localStorage.setItem(QUEUE_STORAGE_KEY, "{not json");
      expect(readQueue()).toEqual([]);
    });

    it("recovers to an empty queue when the persisted operations field isn't an array", () => {
      window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify({ version: 3, operations: "nope" }));
      expect(readQueue()).toEqual([]);
    });

    it("filters out a structurally invalid operation while keeping valid ones", () => {
      const valid = makeOperation({ id: "sync:valid" });
      const invalid = { id: "sync:bad", type: "not-a-real-type", entity: "watchlist" };
      window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify({ version: 3, operations: [valid, invalid] }));
      expect(readQueue()).toEqual([valid]);
    });

    it("filters out an operation with an unknown entity or status", () => {
      const badEntity = makeOperation({ id: "sync:bad-entity", entity: "unknown-entity" as never });
      const badStatus = makeOperation({ id: "sync:bad-status", status: "unknown-status" as never });
      window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify({ version: 3, operations: [badEntity, badStatus] }));
      expect(readQueue()).toEqual([]);
    });
  });

  describe("buildOperation", () => {
    it("builds a real pending operation with a fresh id and matching timestamps", () => {
      const operation = buildOperation("create", "watchlist", "wl-1", "{}");
      expect(operation.id).toMatch(/^sync:/);
      expect(operation.type).toBe("create");
      expect(operation.entity).toBe("watchlist");
      expect(operation.entityId).toBe("wl-1");
      expect(operation.payload).toBe("{}");
      expect(operation.status).toBe("pending");
      expect(operation.retryCount).toBe(0);
      expect(operation.createdAt).toBe(operation.updatedAt);
    });

    it("defaults payload to null when omitted — a bare delete has no payload", () => {
      const operation = buildOperation("delete", "account", "acct-1");
      expect(operation.payload).toBeNull();
    });

    it("generates a distinct id on every call", () => {
      const a = buildOperation("create", "watchlist", "wl-1");
      const b = buildOperation("create", "watchlist", "wl-1");
      expect(a.id).not.toBe(b.id);
    });
  });
});
