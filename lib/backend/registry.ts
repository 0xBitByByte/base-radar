/**
 * Holds every registered `Backend` and tracks which one is active — the
 * same registry pattern `lib/sync/connectors/registry.ts` established for
 * connectors, one layer further down the pipeline. Nothing in the app
 * calls `activeBackend()` yet; this is architecture only, a seam for a
 * future PR to route the Connector Layer (or a future real connector)
 * through instead of talking to Account/Sync/localStorage directly.
 */

import { localBackend } from "@/lib/backend/local";
import type { Backend } from "@/lib/backend/types";

const backends = new Map<string, Backend>([[localBackend.id, localBackend]]);
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
