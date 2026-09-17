// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";

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

  describe("PR-108.2 — reason field distinguishes 'not-configured' from a real error", () => {
    const originalVercel = process.env.VERCEL;
    afterEach(() => {
      if (originalVercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = originalVercel;
    });

    it("reports reason: 'error' when persistence is expected (VERCEL unset) and the connection fails", async () => {
      delete process.env.VERCEL;
      const health = createHealthService(() => {
        throw new Error("simulated failure");
      });

      const result = await health.check();
      expect(result.healthy).toBe(false);
      expect(result.reason).toBe("error");
      expect(result.message).toBe("Database is unreachable");
    });

    it("reports reason: 'not-configured' when persistence is intentionally unavailable (VERCEL set) and the connection fails", async () => {
      process.env.VERCEL = "1";
      const health = createHealthService(() => {
        throw new Error("simulated: no persistent volume on Vercel");
      });

      const result = await health.check();
      expect(result.healthy).toBe(false);
      expect(result.reason).toBe("not-configured");
      expect(result.message).not.toContain("no persistent volume");
      expect(result.message).not.toMatch(/\.db|sqlite3|ENOENT|EACCES/i);
    });

    it("never reports a reason when genuinely healthy, regardless of VERCEL", async () => {
      process.env.VERCEL = "1";
      const db = createDatabase(":memory:");
      const health = createHealthService(() => db);

      const result = await health.check();
      expect(result).toEqual({ healthy: true });
      db.close();
    });
  });
});
