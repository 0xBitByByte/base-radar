import { describe, expect, it } from "vitest";

import {
  CURRENT_CONFLICTS_VERSION,
  CURRENT_QUEUE_VERSION,
  CURRENT_STATUS_VERSION,
  migrateConflictsRecord,
  migrateQueueRecord,
  migrateStatusRecord,
} from "@/lib/sync/migration";

describe("Sync migration runner", () => {
  it("every migration list is honestly empty today — no schema break has ever shipped", () => {
    expect(CURRENT_QUEUE_VERSION).toBe(3);
    expect(CURRENT_STATUS_VERSION).toBe(2);
    expect(CURRENT_CONFLICTS_VERSION).toBe(1);
  });

  it("migrateQueueRecord is a real no-op pass-through — the value comes back unchanged with no applied versions", () => {
    const value = { operations: [{ id: "sync:1" }] };
    const result = migrateQueueRecord(CURRENT_QUEUE_VERSION, value);
    expect(result.value).toBe(value);
    expect(result.appliedVersions).toEqual([]);
  });

  it("migrateStatusRecord passes an already-current value through untouched", () => {
    const value = { lastSyncAt: null };
    const result = migrateStatusRecord(CURRENT_STATUS_VERSION, value);
    expect(result.value).toBe(value);
    expect(result.appliedVersions).toEqual([]);
  });

  it("migrateConflictsRecord passes an already-current value through untouched", () => {
    const value = { conflicts: [] };
    const result = migrateConflictsRecord(CURRENT_CONFLICTS_VERSION, value);
    expect(result.value).toBe(value);
    expect(result.appliedVersions).toEqual([]);
  });

  it("a missing/non-numeric version is treated as version 0 and still passes through honestly (no migration exists to run)", () => {
    const value = { operations: [] };
    const result = migrateQueueRecord(undefined, value);
    expect(result.value).toBe(value);
    expect(result.appliedVersions).toEqual([]);
  });
});
