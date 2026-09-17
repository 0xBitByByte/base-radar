import { describe, expect, it, vi } from "vitest";

import { createMockConnector } from "@/lib/sync/connectors/mock";

async function freshRegistryModule() {
  vi.resetModules();
  return import("@/lib/sync/connectors/registry");
}

describe("Connector Registry", () => {
  it("defaults to LocalConnector as the active connector", async () => {
    const { activeConnector } = await freshRegistryModule();
    expect(activeConnector().id).toBe("local");
  });

  it("get returns a registered connector by id, undefined for an unknown one", async () => {
    const { get } = await freshRegistryModule();
    expect(get("local")?.id).toBe("local");
    expect(get("does-not-exist")).toBeUndefined();
  });

  it("register adds a new connector without changing which one is active", async () => {
    const { register, get, activeConnector } = await freshRegistryModule();
    const mock = createMockConnector();
    register(mock);
    expect(get("mock")?.id).toBe("mock");
    expect(activeConnector().id).toBe("local");
  });

  it("setActive switches the connector the engine will use", async () => {
    const { register, setActive, activeConnector } = await freshRegistryModule();
    register(createMockConnector());
    setActive("mock");
    expect(activeConnector().id).toBe("mock");
  });

  it("setActive throws for a connector id that was never registered", async () => {
    const { setActive } = await freshRegistryModule();
    expect(() => setActive("nonexistent")).toThrow(/unknown connector/);
  });

  it("unregister removes a non-active connector", async () => {
    const { register, unregister, get } = await freshRegistryModule();
    register(createMockConnector());
    unregister("mock");
    expect(get("mock")).toBeUndefined();
  });

  it("unregister refuses to remove the currently active connector", async () => {
    const { unregister } = await freshRegistryModule();
    expect(() => unregister("local")).toThrow(/cannot unregister the active connector/);
  });
});
