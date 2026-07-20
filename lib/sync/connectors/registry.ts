/**
 * Holds every registered `SyncConnector` and tracks which one is active.
 * `lib/sync/engine.ts` only ever calls `activeConnector()` here — it never
 * imports `LocalConnector`, `MockConnector`, or any future backend
 * connector directly. Swapping the real backend later (Supabase, Firebase,
 * a plain REST API) means registering a new connector and calling
 * `setActive()`, never touching the Sync Engine, Sync Queue, or any Sync
 * Adapter.
 */

import { localConnector } from "@/lib/sync/connectors/local";
import type { SyncConnector } from "@/lib/sync/connectors/base";

const connectors = new Map<string, SyncConnector>([[localConnector.id, localConnector]]);
let activeId: string = localConnector.id;

export function register(connector: SyncConnector): void {
  connectors.set(connector.id, connector);
}

export function unregister(id: string): void {
  if (id === activeId) {
    throw new Error(`ConnectorRegistry: cannot unregister the active connector "${id}".`);
  }
  connectors.delete(id);
}

export function get(id: string): SyncConnector | undefined {
  return connectors.get(id);
}

export function setActive(id: string): void {
  if (!connectors.has(id)) {
    throw new Error(`ConnectorRegistry: cannot activate unknown connector "${id}".`);
  }
  activeId = id;
}

/** The connector `lib/sync/engine.ts` pushes/pulls through. Defaults to `LocalConnector`. */
export function activeConnector(): SyncConnector {
  const connector = connectors.get(activeId);
  if (!connector) {
    throw new Error(`ConnectorRegistry: active connector "${activeId}" is not registered.`);
  }
  return connector;
}
