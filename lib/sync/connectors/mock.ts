/**
 * A configurable in-memory connector for future automated testing of the
 * Sync Engine against every outcome a real backend could produce, without
 * needing a real backend to exist yet. Never registered as the active
 * connector in production — nothing in the app wires this in today.
 */

import type { ConnectorHealth, ConnectorPullResult, ConnectorPushResult, SyncConnector } from "@/lib/sync/connectors/base";
import type { SyncOperation } from "@/lib/sync/types";

export type MockConnectorScenario = "success" | "failure" | "offline" | "conflict";

export type MockConnectorConfig = {
  scenario?: MockConnectorScenario;
  /** Artificial latency, in milliseconds, applied before every method resolves — simulates real network delay for testing loading states. */
  delayMs?: number;
};

export type MockConnector = SyncConnector & {
  setScenario(scenario: MockConnectorScenario): void;
  setDelay(delayMs: number): void;
};

export function createMockConnector(config: MockConnectorConfig = {}): MockConnector {
  let scenario = config.scenario ?? "success";
  let delayMs = config.delayMs ?? 0;

  async function delay(): Promise<void> {
    if (delayMs > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }
  }

  async function health(): Promise<ConnectorHealth> {
    await delay();
    return { connected: scenario !== "offline", online: scenario !== "offline" };
  }

  async function push(operations: SyncOperation[]): Promise<ConnectorPushResult> {
    await delay();

    if (scenario === "offline") {
      // Simulates a real network failure — the batch is returned unchanged, exactly as it would be if the request never went out.
      return { outcome: "error", operations };
    }

    if (scenario === "conflict") {
      // Simulates the backend rejecting every operation because a remote version already moved on — a distinct real outcome from a plain transport failure, left unchanged here since no merge logic exists to react to it yet.
      return { outcome: "error", operations };
    }

    const now = new Date().toISOString();

    if (scenario === "failure") {
      return {
        outcome: "error",
        operations: operations.map((operation) => ({
          ...operation,
          status: "error",
          retryCount: operation.retryCount + 1,
          updatedAt: now,
        })),
      };
    }

    return {
      outcome: "success",
      operations: operations.map((operation) => ({ ...operation, status: "success", updatedAt: now })),
    };
  }

  async function pull(): Promise<ConnectorPullResult> {
    await delay();
    return { operations: [] };
  }

  return {
    id: "mock",
    label: "Mock Connector",
    async connect() {
      await delay();
    },
    async disconnect() {
      await delay();
    },
    health,
    push,
    pull,
    async authenticate() {
      await delay();
    },
    async signOut() {
      await delay();
    },
    supportsRealtime: () => true,
    supportsOffline: () => false,
    supportsConflictResolution: () => true,
    setScenario(next: MockConnectorScenario) {
      scenario = next;
    },
    setDelay(next: number) {
      delayMs = next;
    },
  };
}
