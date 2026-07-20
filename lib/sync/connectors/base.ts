/**
 * The generic contract the Sync Engine depends on — and the only thing it
 * depends on. The engine never imports Supabase, Firebase, Clerk, Auth0,
 * a REST client, a GraphQL client, or a WebSocket client directly; it only
 * ever calls through a `SyncConnector` obtained from
 * `lib/sync/connectors/registry.ts`. Swapping the real backend in the
 * future — Supabase, Firebase, a plain REST API — means registering a new
 * connector that implements this same contract, never touching the Sync
 * Engine, the Sync Queue, or any Sync Adapter.
 *
 * This file defines the interface only. It has no runtime implementation
 * of its own — see `local.ts` (today's production connector) and
 * `mock.ts` (a configurable connector for future testing).
 */

import type { SyncOperation } from "@/lib/sync/types";

export type ConnectorHealth = {
  /** Whether the connector currently has a usable connection to its backend — always `true` for a connector with no persistent connection to establish, like `LocalConnector`. */
  connected: boolean;
  /** Whether the backend is reachable right now — distinct from `connected`, since a connector can be "connected" in principle but currently offline. */
  online: boolean;
};

export type ConnectorPushResult = {
  outcome: "success" | "error";
  /** The same operations, with `status`/`retryCount`/`updatedAt` updated to reflect the real outcome of this push — never silently unchanged. */
  operations: SyncOperation[];
};

export type ConnectorPullResult = {
  /** Operations the backend reports as changed since the last pull. Always empty for a connector with no real remote counterpart. */
  operations: SyncOperation[];
};

export type SyncConnector = {
  readonly id: string;
  readonly label: string;

  /** Establishes whatever this connector needs before it can push/pull — a no-op for a connector with nothing to establish. */
  connect(): Promise<void>;
  /** Tears down whatever `connect()` established. */
  disconnect(): Promise<void>;
  /** A cheap, side-effect-free check of whether this connector's backend is currently reachable. */
  health(): Promise<ConnectorHealth>;

  /** Attempts to send `operations` to this connector's backend. Must never report a fabricated success for work that wasn't actually and honestly delivered. */
  push(operations: SyncOperation[]): Promise<ConnectorPushResult>;
  /** Attempts to fetch changes from this connector's backend. */
  pull(): Promise<ConnectorPullResult>;

  /** Establishes this connector's notion of an authenticated session, if it has one. */
  authenticate(): Promise<void>;
  /** Ends this connector's notion of an authenticated session, if it has one. */
  signOut(): Promise<void>;

  /** Whether this connector can push updates without the caller polling — no connector registered today implements real-time delivery. */
  supportsRealtime(): boolean;
  /** Whether this connector remains usable while the device is offline. */
  supportsOffline(): boolean;
  /** Whether this connector can resolve a conflict itself (merge, pick a winner) rather than just recording it for a human to look at later. */
  supportsConflictResolution(): boolean;
};
