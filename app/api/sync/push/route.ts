/**
 * PR-093.06 (Ongoing Cloud Sync) — real push, originally for the
 * `account` entity only; PR-094.01 extends this same route to also
 * accept `search` entity operations, dispatched by
 * `sqliteBackend.services.sync.push()` to the right entity-specific
 * module. Requires a real, validated session (`resolveRequestSession`) —
 * the same boundary every other account-scoped route in this app already
 * enforces. `accountId` always comes from that resolved session, never
 * from the request body — a client cannot claim to push on behalf of any
 * account but its own.
 */

import { NextResponse, type NextRequest } from "next/server";

import { resolveRequestSession } from "@/lib/auth/request-session";
import { sqliteBackend } from "@/lib/backend/sqlite";
import type { SyncOperation } from "@/lib/sync/types";

function isValidOperation(value: unknown): value is SyncOperation {
  if (typeof value !== "object" || value === null) return false;
  const op = value as Record<string, unknown>;
  return (
    typeof op.id === "string" &&
    (op.type === "create" || op.type === "update" || op.type === "delete") &&
    (op.entity === "watchlist" ||
      op.entity === "preferences" ||
      op.entity === "account" ||
      op.entity === "search" ||
      op.entity === "savedSearch") &&
    typeof op.entityId === "string" &&
    (typeof op.payload === "string" || op.payload === null) &&
    typeof op.createdAt === "string" &&
    typeof op.updatedAt === "string" &&
    (op.status === "pending" || op.status === "syncing" || op.status === "error" || op.status === "success") &&
    typeof op.retryCount === "number"
  );
}

export async function POST(request: NextRequest) {
  const session = resolveRequestSession(request);
  if (session.state !== "authenticated") {
    return NextResponse.json({ error: "Sign in to sync." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const operations = (body as { operations?: unknown } | null)?.operations;
  if (!Array.isArray(operations) || !operations.every(isValidOperation)) {
    return NextResponse.json({ error: "A real array of sync operations is required." }, { status: 400 });
  }

  const result = await sqliteBackend.services.sync.push(session.account.id, operations);
  return NextResponse.json(result);
}
