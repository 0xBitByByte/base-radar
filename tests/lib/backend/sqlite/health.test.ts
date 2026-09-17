// @vitest-environment node
import { describe, expect, it } from "vitest";

import { createDatabase } from "@/lib/backend/sqlite/db";
import { createHealthService } from "@/lib/backend/sqlite/health";

describe("createHealthService (real SQLite health check)", () => {
  it("reports healthy true against a real, open database — a genuine query, not a fabricated response", async () => {
    const db = createDatabase(":memory:");
    const health = createHealthService(() => db);

    expect(await health.check()).toEqual({ healthy: true });
    db.close();
  });

  it("reports healthy false against a real closed connection, with a safe message that never leaks the driver's own error text", async () => {
    const db = createDatabase(":memory:");
    db.close();
    const health = createHealthService(() => db);

    const result = await health.check();
    expect(result.healthy).toBe(false);
    expect(result.message).toBe("Database is unreachable");
    expect(result.message).not.toMatch(/\.db|sqlite3|ENOENT|EACCES/i);
  });

  it("reports healthy false when the database getter itself throws — e.g. a real failed lazy-connect", async () => {
    const health = createHealthService(() => {
      throw new Error("simulated: cannot open real database file (disk full)");
    });

    const result = await health.check();
    expect(result.healthy).toBe(false);
    expect(result.message).toBe("Database is unreachable");
    expect(result.message).not.toContain("disk full");
  });
});
