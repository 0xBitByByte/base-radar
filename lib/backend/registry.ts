/**
 * Holds every registered `Backend` and tracks which one is active — the
 * same registry pattern `lib/sync/connectors/registry.ts` established for
 * connectors, one layer further down the pipeline. Nothing in the app
 * calls `activeBackend()` yet; this is architecture only, a seam for a
 * future PR to route the Connector Layer (or a future real connector)
 * through instead of talking to Account/Sync/localStorage directly.
 *
 * Release 1 Phase C registers `sqliteBackend` (real, SQLite-backed
 * Storage/Health) alongside `localBackend` — registered, not activated:
 * `localBackend` stays the default, unchanged. Activating a real backend
 * is a Phase D+ decision, made once real authentication exists to scope
 * data to. `sqliteBackend` pulls in `node:sqlite`, a server-only native
 * module — this file must never be imported from client code as a
 * result; nothing does today (confirmed zero consumers of `lib/backend/`
 * anywhere in the app), and a bundler would fail loudly if that changed,
 * rather than silently shipping a broken client bundle.
 */

import { localBackend } from "@/lib/backend/local";
import { sqliteBackend } from "@/lib/backend/sqlite";
import type { Backend } from "@/lib/backend/types";

const backends = new Map<string, Backend>([
  [localBackend.id, localBackend],
  [sqliteBackend.id, sqliteBackend],
]);
let activeId: string = localBackend.id;

export function register(backend: Backend): void {
  backends.set(backend.id, backend);
}

export function unregister(id: string): void {
  if (id === activeId) {
    throw new Error(`BackendRegistry: cannot unregister the active backend "${id}".`);
  }
  backends.delete(id);
}

export function get(id: string): Backend | undefined {
  return backends.get(id);
}

export function setActive(id: string): void {
  if (!backends.has(id)) {
    throw new Error(`BackendRegistry: cannot activate unknown backend "${id}".`);
  }
  activeId = id;
}

/** The backend a future Connector Layer would delegate through. Defaults to `localBackend`. */
export function activeBackend(): Backend {
  const backend = backends.get(activeId);
  if (!backend) {
    throw new Error(`BackendRegistry: active backend "${activeId}" is not registered.`);
  }
  return backend;
}
