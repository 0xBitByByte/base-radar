// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

async function freshRegistry() {
  vi.resetModules();
  return import("@/lib/backend/registry");
}

describe("Backend Registry", () => {
  it("registers both the local and real SQLite backends", async () => {
    const { get } = await freshRegistry();
    expect(get("local")?.id).toBe("local");
    expect(get("sqlite")?.id).toBe("sqlite");
  });

  it("defaults to localBackend as active — Phase C registers sqliteBackend but does not activate it", async () => {
    const { activeBackend } = await freshRegistry();
    expect(activeBackend().id).toBe("local");
  });

  it("setActive can switch to the real sqlite backend when explicitly asked", async () => {
    const { setActive, activeBackend } = await freshRegistry();
    setActive("sqlite");
    expect(activeBackend().id).toBe("sqlite");
  });

  it("get returns undefined for an unknown backend id", async () => {
    const { get } = await freshRegistry();
    expect(get("does-not-exist")).toBeUndefined();
  });
});
