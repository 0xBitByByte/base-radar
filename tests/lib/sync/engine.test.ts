import { afterEach, describe, expect, it } from "vitest";

import { createMockConnector } from "@/lib/sync/connectors/mock";
import { register, setActive } from "@/lib/sync/connectors/registry";
import { runPullAttempt, runSyncAttempt } from "@/lib/sync/engine";
import { buildOperation } from "@/lib/sync/queue";

describe("Sync Engine", () => {
  afterEach(() => {
    setActive("local");
  });

  it("delegates to whichever connector is currently active — the default LocalConnector honestly errors on real work", async () => {
    const result = await runSyncAttempt([buildOperation("create", "watchlist", "wl-1")]);
    expect(result.outcome).toBe("error");
  });

  it("an empty attempt against LocalConnector trivially, honestly succeeds", async () => {
    const result = await runSyncAttempt([]);
    expect(result.outcome).toBe("success");
    expect(result.operations).toEqual([]);
  });

  it("swapping the active connector changes the engine's real outcome, with no engine code change", async () => {
    const mock = createMockConnector({ scenario: "success" });
    register(mock);
    setActive("mock");

    const operation = buildOperation("create", "watchlist", "wl-1");
    const result = await runSyncAttempt([operation]);
    expect(result.outcome).toBe("success");
    expect(result.operations[0].status).toBe("success");
  });

  it("never fabricates a success the connector didn't itself report", async () => {
    const mock = createMockConnector({ scenario: "failure" });
    register(mock);
    setActive("mock");

    const result = await runSyncAttempt([buildOperation("update", "account", "acct-1")]);
    expect(result.outcome).toBe("error");
  });

  describe("runPullAttempt (PR-093.06)", () => {
    it("the default LocalConnector honestly returns no operations — no real remote counterpart exists", async () => {
      const result = await runPullAttempt();
      expect(result.operations).toEqual([]);
    });

    it("delegates to whichever connector is currently active, with no engine code change", async () => {
      const mock = createMockConnector({ scenario: "success" });
      const remoteOperation = buildOperation("update", "account", "acct-1");
      mock.setPullOperations([remoteOperation]);
      register(mock);
      setActive("mock");

      const result = await runPullAttempt();
      expect(result.operations).toEqual([remoteOperation]);
    });
  });
});
