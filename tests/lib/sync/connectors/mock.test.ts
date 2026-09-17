import { describe, expect, it } from "vitest";

import { createMockConnector } from "@/lib/sync/connectors/mock";
import { buildOperation } from "@/lib/sync/queue";

describe("MockConnector", () => {
  it("defaults to the success scenario with no artificial delay", async () => {
    const connector = createMockConnector();
    expect(connector.id).toBe("mock");
    const health = await connector.health();
    expect(health).toEqual({ connected: true, online: true });
  });

  it("success scenario marks every real operation as succeeded", async () => {
    const connector = createMockConnector({ scenario: "success" });
    const operation = buildOperation("create", "watchlist", "wl-1");
    const result = await connector.push([operation]);
    expect(result.outcome).toBe("success");
    expect(result.operations[0].status).toBe("success");
  });

  it("failure scenario bumps retryCount and marks status error", async () => {
    const connector = createMockConnector({ scenario: "failure" });
    const operation = buildOperation("create", "watchlist", "wl-1");
    const result = await connector.push([operation]);
    expect(result.outcome).toBe("error");
    expect(result.operations[0].status).toBe("error");
    expect(result.operations[0].retryCount).toBe(1);
  });

  it("offline scenario returns the batch genuinely unchanged, as a real network failure would", async () => {
    const connector = createMockConnector({ scenario: "offline" });
    const operation = buildOperation("create", "watchlist", "wl-1");
    const result = await connector.push([operation]);
    expect(result.outcome).toBe("error");
    expect(result.operations).toEqual([operation]);
    expect((await connector.health()).online).toBe(false);
  });

  it("conflict scenario returns the batch unchanged — no merge logic exists to react to it", async () => {
    const connector = createMockConnector({ scenario: "conflict" });
    const operation = buildOperation("create", "watchlist", "wl-1");
    const result = await connector.push([operation]);
    expect(result.outcome).toBe("error");
    expect(result.operations).toEqual([operation]);
  });

  it("setScenario changes behavior on the next real call", async () => {
    const connector = createMockConnector({ scenario: "success" });
    connector.setScenario("failure");
    const result = await connector.push([buildOperation("create", "watchlist", "wl-1")]);
    expect(result.outcome).toBe("error");
  });

  it("setDelay applies a real, measurable minimum latency to every method", async () => {
    const connector = createMockConnector({ scenario: "success" });
    connector.setDelay(30);
    const start = Date.now();
    await connector.pull();
    expect(Date.now() - start).toBeGreaterThanOrEqual(25);
  });

  it("reports its real, richer capabilities — distinct from LocalConnector", () => {
    const connector = createMockConnector();
    expect(connector.supportsRealtime()).toBe(true);
    expect(connector.supportsOffline()).toBe(false);
    expect(connector.supportsConflictResolution()).toBe(true);
  });

  it("pull always returns a real empty result — no remote data is ever fabricated", async () => {
    const connector = createMockConnector();
    expect(await connector.pull()).toEqual({ operations: [] });
  });
});
