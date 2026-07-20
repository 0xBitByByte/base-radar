/**
 * The Sync Layer's engine — decides the outcome of one sync attempt by
 * delegating to whichever connector is currently active in
 * `lib/sync/connectors/registry.ts`. This file never touches storage
 * itself and never imports Supabase, Firebase, a REST client, a GraphQL
 * client, a WebSocket client, or `localStorage` directly — it only ever
 * calls `connector.push()`. Swapping the real backend in the future means
 * registering a new `SyncConnector`, never touching this file.
 *
 * There is no backend today (the active connector is `LocalConnector`),
 * so this can never report a fabricated success for work that was
 * actually sent anywhere: `LocalConnector.push()` honestly resolves
 * "success" for an empty batch (nothing to fail at) and "error" for a
 * non-empty one, with every operation's retry count bumped — an honest
 * record that an attempt was made and could not complete without a real
 * backend, never a silent, fabricated success.
 */

import { activeConnector } from "@/lib/sync/connectors/registry";
import type { SyncOperation } from "@/lib/sync/types";

export type SyncAttemptOutcome = "success" | "error";

export type SyncAttemptResult = {
  outcome: SyncAttemptOutcome;
  operations: SyncOperation[];
};

export async function runSyncAttempt(operations: SyncOperation[]): Promise<SyncAttemptResult> {
  const connector = activeConnector();
  const result = await connector.push(operations);
  return { outcome: result.outcome, operations: result.operations };
}
