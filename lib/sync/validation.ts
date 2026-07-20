/**
 * Diagnostic validation for the Sync Layer's stored queue/conflict
 * records — distinct from `queue.ts`/`conflicts.ts`'s own silent,
 * filter-and-drop sanitization at read time. Where those files quietly
 * recover by discarding whatever doesn't validate, this file *reports*
 * what was wrong so `lib/sync/diagnostics.ts` can surface real numbers
 * (duplicate ids, corrupted timestamps, unknown types, broken
 * references) rather than a silent "everything's fine." Pure — never
 * touches storage itself.
 */

import type { SyncEntity, SyncOperationType } from "@/lib/sync/types";

const KNOWN_OPERATION_TYPES: ReadonlySet<SyncOperationType> = new Set(["create", "update", "delete"]);
const KNOWN_ENTITY_TYPES: ReadonlySet<SyncEntity> = new Set(["watchlist", "preferences", "account"]);

export type QueueValidationIssue =
  | { type: "malformed-record"; index: number }
  | { type: "duplicate-id"; id: string }
  | { type: "missing-entity-id"; id: string }
  | { type: "unknown-operation-type"; id: string; value: unknown }
  | { type: "unknown-entity-type"; id: string; value: unknown }
  | { type: "corrupted-timestamp"; id: string; field: "createdAt" | "updatedAt" };

export type QueueValidationResult = {
  valid: boolean;
  issues: QueueValidationIssue[];
  totalRecords: number;
  validRecords: number;
};

/** Validates the raw (pre-sanitize) array parsed from `base-radar:sync-queue` — every issue type the queue's own recovery would otherwise silently drop without reporting. */
export function validateQueueRecords(rawOperations: unknown): QueueValidationResult {
  if (!Array.isArray(rawOperations)) {
    return { valid: false, issues: [{ type: "malformed-record", index: -1 }], totalRecords: 0, validRecords: 0 };
  }

  const issues: QueueValidationIssue[] = [];
  const seenIds = new Set<string>();
  let validRecords = 0;

  rawOperations.forEach((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      issues.push({ type: "malformed-record", index });
      return;
    }

    const operation = entry as Record<string, unknown>;
    let recordValid = true;

    let id: string;
    if (typeof operation.id !== "string" || operation.id.trim() === "") {
      issues.push({ type: "malformed-record", index });
      recordValid = false;
      id = `#${index}`;
    } else if (seenIds.has(operation.id)) {
      issues.push({ type: "duplicate-id", id: operation.id });
      recordValid = false;
      id = operation.id;
    } else {
      seenIds.add(operation.id);
      id = operation.id;
    }

    if (operation.type !== undefined && !KNOWN_OPERATION_TYPES.has(operation.type as SyncOperationType)) {
      issues.push({ type: "unknown-operation-type", id, value: operation.type });
      recordValid = false;
    }
    if (operation.entity !== undefined && !KNOWN_ENTITY_TYPES.has(operation.entity as SyncEntity)) {
      issues.push({ type: "unknown-entity-type", id, value: operation.entity });
      recordValid = false;
    }
    if (typeof operation.entityId !== "string" || operation.entityId.trim() === "") {
      issues.push({ type: "missing-entity-id", id });
      recordValid = false;
    }
    if (typeof operation.createdAt !== "string" || Number.isNaN(Date.parse(operation.createdAt))) {
      issues.push({ type: "corrupted-timestamp", id, field: "createdAt" });
      recordValid = false;
    }
    if (typeof operation.updatedAt !== "string" || Number.isNaN(Date.parse(operation.updatedAt))) {
      issues.push({ type: "corrupted-timestamp", id, field: "updatedAt" });
      recordValid = false;
    }

    if (recordValid) validRecords += 1;
  });

  return { valid: issues.length === 0, issues, totalRecords: rawOperations.length, validRecords };
}

export type ConflictValidationIssue =
  | { type: "malformed-record"; index: number }
  | { type: "missing-entity-id"; index: number }
  | { type: "unknown-entity-type"; entityId: string; value: unknown }
  | { type: "invalid-resolved-flag"; entityId: string };

export type ConflictValidationResult = {
  valid: boolean;
  issues: ConflictValidationIssue[];
  totalRecords: number;
  validRecords: number;
};

/** Validates the raw (pre-sanitize) array parsed from `base-radar:sync-conflicts` — the "broken conflict references" this PR's brief asks for (a conflict record whose entity/entityId or `resolved` flag doesn't structurally hold up). */
export function validateConflictRecords(rawConflicts: unknown): ConflictValidationResult {
  if (!Array.isArray(rawConflicts)) {
    return { valid: false, issues: [{ type: "malformed-record", index: -1 }], totalRecords: 0, validRecords: 0 };
  }

  const issues: ConflictValidationIssue[] = [];
  let validRecords = 0;

  rawConflicts.forEach((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      issues.push({ type: "malformed-record", index });
      return;
    }

    const conflict = entry as Record<string, unknown>;
    let recordValid = true;

    let entityId: string;
    if (typeof conflict.entityId !== "string" || conflict.entityId.trim() === "") {
      issues.push({ type: "missing-entity-id", index });
      recordValid = false;
      entityId = `#${index}`;
    } else {
      entityId = conflict.entityId;
    }

    if (conflict.entity !== undefined && !KNOWN_ENTITY_TYPES.has(conflict.entity as SyncEntity)) {
      issues.push({ type: "unknown-entity-type", entityId, value: conflict.entity });
      recordValid = false;
    }
    if (typeof conflict.resolved !== "boolean") {
      issues.push({ type: "invalid-resolved-flag", entityId });
      recordValid = false;
    }

    if (recordValid) validRecords += 1;
  });

  return { valid: issues.length === 0, issues, totalRecords: rawConflicts.length, validRecords };
}

/** Whether a persisted blob's `version` field is one this codebase actually recognizes for that key — distinct from whether its *contents* validate. */
export function isKnownStorageVersion(version: unknown, knownVersions: readonly number[]): boolean {
  return typeof version === "number" && knownVersions.includes(version);
}
