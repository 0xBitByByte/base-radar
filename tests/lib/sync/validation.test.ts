import { describe, expect, it } from "vitest";

import { isKnownStorageVersion, validateConflictRecords, validateQueueRecords } from "@/lib/sync/validation";

function makeRawOperation(overrides: Record<string, unknown> = {}) {
  return {
    id: "sync:1",
    type: "create",
    entity: "watchlist",
    entityId: "wl-1",
    payload: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    status: "pending",
    retryCount: 0,
    ...overrides,
  };
}

describe("validateQueueRecords", () => {
  it("a real, well-formed queue reports no issues", () => {
    const result = validateQueueRecords([makeRawOperation()]);
    expect(result).toEqual({ valid: true, issues: [], totalRecords: 1, validRecords: 1 });
  });

  it("flags a genuinely non-array payload as malformed", () => {
    const result = validateQueueRecords("not-an-array");
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([{ type: "malformed-record", index: -1 }]);
  });

  it("flags a null/non-object entry as malformed", () => {
    const result = validateQueueRecords([null]);
    expect(result.issues).toEqual([{ type: "malformed-record", index: 0 }]);
    expect(result.validRecords).toBe(0);
  });

  it("flags a real duplicate id", () => {
    const result = validateQueueRecords([makeRawOperation({ id: "sync:dup" }), makeRawOperation({ id: "sync:dup" })]);
    expect(result.issues).toContainEqual({ type: "duplicate-id", id: "sync:dup" });
    expect(result.validRecords).toBe(1);
  });

  it("flags an unknown operation type and an unknown entity type", () => {
    const result = validateQueueRecords([makeRawOperation({ type: "explode", entity: "spaceship" })]);
    expect(result.issues).toContainEqual({ type: "unknown-operation-type", id: "sync:1", value: "explode" });
    expect(result.issues).toContainEqual({ type: "unknown-entity-type", id: "sync:1", value: "spaceship" });
  });

  it("flags a missing/empty entityId", () => {
    const result = validateQueueRecords([makeRawOperation({ entityId: "" })]);
    expect(result.issues).toContainEqual({ type: "missing-entity-id", id: "sync:1" });
  });

  it("flags a corrupted createdAt/updatedAt that doesn't parse as a real date", () => {
    const result = validateQueueRecords([makeRawOperation({ createdAt: "not-a-date", updatedAt: "also-not-a-date" })]);
    expect(result.issues).toContainEqual({ type: "corrupted-timestamp", id: "sync:1", field: "createdAt" });
    expect(result.issues).toContainEqual({ type: "corrupted-timestamp", id: "sync:1", field: "updatedAt" });
  });

  it("reports every real issue on one record at once, never just the first", () => {
    const result = validateQueueRecords([makeRawOperation({ type: "bogus", entityId: "", createdAt: "nope" })]);
    expect(result.issues.length).toBeGreaterThanOrEqual(3);
    expect(result.validRecords).toBe(0);
  });
});

describe("validateConflictRecords", () => {
  function makeRawConflict(overrides: Record<string, unknown> = {}) {
    return { entity: "watchlist", entityId: "wl-1", localVersion: 1, remoteVersion: 2, resolved: false, ...overrides };
  }

  it("a real, well-formed conflicts array reports no issues", () => {
    const result = validateConflictRecords([makeRawConflict()]);
    expect(result).toEqual({ valid: true, issues: [], totalRecords: 1, validRecords: 1 });
  });

  it("flags a genuinely non-array payload as malformed", () => {
    const result = validateConflictRecords({});
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([{ type: "malformed-record", index: -1 }]);
  });

  it("flags a missing/empty entityId", () => {
    const result = validateConflictRecords([makeRawConflict({ entityId: "" })]);
    expect(result.issues).toContainEqual({ type: "missing-entity-id", index: 0 });
  });

  it("flags an unknown entity type — a genuinely broken reference", () => {
    const result = validateConflictRecords([makeRawConflict({ entity: "spaceship" })]);
    expect(result.issues).toContainEqual({ type: "unknown-entity-type", entityId: "wl-1", value: "spaceship" });
  });

  it("flags a non-boolean resolved flag", () => {
    const result = validateConflictRecords([makeRawConflict({ resolved: "yes" })]);
    expect(result.issues).toContainEqual({ type: "invalid-resolved-flag", entityId: "wl-1" });
  });
});

describe("isKnownStorageVersion", () => {
  it("true for a real recognized version number", () => {
    expect(isKnownStorageVersion(3, [1, 2, 3])).toBe(true);
  });

  it("false for an unrecognized version number", () => {
    expect(isKnownStorageVersion(99, [1, 2, 3])).toBe(false);
  });

  it("false for a non-numeric value", () => {
    expect(isKnownStorageVersion("3", [1, 2, 3])).toBe(false);
    expect(isKnownStorageVersion(null, [1, 2, 3])).toBe(false);
  });
});
