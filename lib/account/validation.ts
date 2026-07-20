/**
 * Diagnostic validation for the Account record — distinct from
 * `storage.ts`'s `sanitizeAccount()`, which silently recovers by
 * defaulting whatever doesn't validate. This file *reports* what was
 * wrong instead, so `lib/sync/diagnostics.ts` can surface real integrity
 * information rather than a silent "everything's fine." Pure — never
 * touches storage itself.
 */

import type { Account } from "@/lib/account/types";

export type AccountValidationIssue =
  | "missing-id"
  | "missing-name"
  | "missing-username"
  | "invalid-email-type"
  | "invalid-avatar-type"
  | "corrupted-created-at"
  | "corrupted-updated-at"
  | "corrupted-last-active-at"
  | "invalid-is-guest-type";

export type AccountValidationResult = {
  valid: boolean;
  issues: AccountValidationIssue[];
};

function isValidTimestamp(value: unknown): boolean {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

/** Validates an already-parsed candidate value against the current `Account` shape. */
export function validateAccountRecord(value: unknown): AccountValidationResult {
  if (typeof value !== "object" || value === null) {
    return { valid: false, issues: ["missing-id", "missing-name", "missing-username"] };
  }

  const issues: AccountValidationIssue[] = [];
  const account = value as Record<string, unknown>;

  if (typeof account.id !== "string" || account.id.trim() === "") issues.push("missing-id");
  if (typeof account.name !== "string" || account.name.trim() === "") issues.push("missing-name");
  if (typeof account.username !== "string" || account.username.trim() === "") issues.push("missing-username");
  if (!(typeof account.email === "string" || account.email === null)) issues.push("invalid-email-type");
  if (!(typeof account.avatar === "string" || account.avatar === null)) issues.push("invalid-avatar-type");
  if (!isValidTimestamp(account.createdAt)) issues.push("corrupted-created-at");
  if (!isValidTimestamp(account.updatedAt)) issues.push("corrupted-updated-at");
  if (!isValidTimestamp(account.lastActiveAt)) issues.push("corrupted-last-active-at");
  if (typeof account.isGuest !== "boolean") issues.push("invalid-is-guest-type");

  return { valid: issues.length === 0, issues };
}

export type AccountImportValidation = {
  valid: boolean;
  parseError: boolean;
  issues: AccountValidationIssue[];
  account: Account | null;
};

/**
 * Validates a serialized Account payload (the shape `exportAccount()`
 * produces) ahead of a future "Import Account" action — foundation-ready
 * validation with no UI wired to it yet, the same pattern
 * `lib/personalization/importExport.ts`'s `validateWatchlistImport`
 * established: pure, never writes to storage, and the caller decides what
 * to do with a valid result.
 */
export function validateAccountImport(raw: string): AccountImportValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { valid: false, parseError: true, issues: [], account: null };
  }

  const candidate =
    typeof parsed === "object" && parsed !== null && "account" in (parsed as Record<string, unknown>)
      ? (parsed as Record<string, unknown>).account
      : parsed;

  const result = validateAccountRecord(candidate);
  return {
    valid: result.valid,
    parseError: false,
    issues: result.issues,
    account: result.valid ? (candidate as Account) : null,
  };
}
