// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";

import { createDatabase } from "@/lib/backend/sqlite/db";
import { createStorageService } from "@/lib/backend/sqlite/storage";

describe("createStorageService (real SQLite-backed StorageService)", () => {
  let db: DatabaseSync | undefined;
  const service = () => {
    db = createDatabase(":memory:");
    return createStorageService(() => db!);
  };
  afterEach(() => {
    db?.close();
    db = undefined;
  });

  it("read on a key that was never written returns a real null, never a fabricated default", async () => {
    const storage = service();
    expect(await storage.read("missing-key")).toBeNull();
  });

  it("write then read round-trips a real value", async () => {
    const storage = service();
    await storage.write("greeting", "hello");
    expect(await storage.read("greeting")).toBe("hello");
  });

  it("write on an existing key genuinely overwrites, never appends or duplicates", async () => {
    const storage = service();
    await storage.write("k", "first");
    await storage.write("k", "second");
    expect(await storage.read("k")).toBe("second");

    const rows = db!.prepare("SELECT * FROM kv_storage WHERE key = 'k'").all();
    expect(rows).toHaveLength(1);
  });

  it("remove genuinely deletes a real stored value", async () => {
    const storage = service();
    await storage.write("k", "v");
    await storage.remove("k");
    expect(await storage.read("k")).toBeNull();
  });

  it("remove on a key that was never written is a real, safe no-op", async () => {
    const storage = service();
    await expect(storage.remove("never-existed")).resolves.toBeUndefined();
  });

  it("rejects a genuinely empty key rather than silently storing it", async () => {
    const storage = service();
    await expect(storage.write("", "v")).rejects.toThrow(/non-empty string/);
    await expect(storage.read("")).rejects.toThrow(/non-empty string/);
    await expect(storage.remove("   ")).rejects.toThrow(/non-empty string/);
  });

  it("rejects a key beyond the real maximum length", async () => {
    const storage = service();
    const tooLong = "x".repeat(600);
    await expect(storage.write(tooLong, "v")).rejects.toThrow(/maximum length/);
  });

  it("rejects a non-string value", async () => {
    const storage = service();
    // @ts-expect-error — deliberately the wrong type, to confirm the runtime guard, not just the compile-time contract.
    await expect(storage.write("k", 123)).rejects.toThrow(/value must be a string/);
  });

  it("two real, distinct database instances never share state", async () => {
    const dbA = createDatabase(":memory:");
    const dbB = createDatabase(":memory:");
    const storageA = createStorageService(() => dbA);
    const storageB = createStorageService(() => dbB);

    await storageA.write("k", "from-a");
    expect(await storageB.read("k")).toBeNull();

    dbA.close();
    dbB.close();
  });

  it("wraps a real underlying database failure in a safe, generic error — never the raw driver message", async () => {
    const localDb = createDatabase(":memory:");
    const storage = createStorageService(() => localDb);
    localDb.close();

    await expect(storage.read("k")).rejects.toThrow("StorageService.read: the database operation failed");
  });
});
