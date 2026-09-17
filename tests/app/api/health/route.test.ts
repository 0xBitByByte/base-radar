// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetDbSingletonForTests } from "@/lib/backend/sqlite/db";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  beforeEach(() => {
    process.env.SQLITE_DB_PATH = ":memory:";
    resetDbSingletonForTests();
  });
  afterEach(() => {
    resetDbSingletonForTests();
    delete process.env.SQLITE_DB_PATH;
  });

  it("returns a real 200 with healthy: true against a real, reachable database", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ healthy: true });
  });

  it("returns a real 503 with healthy: false when the database is genuinely unreachable, never a fabricated 200", async () => {
    // An invalid, unwritable path makes the real database open fail.
    process.env.SQLITE_DB_PATH = "/dev/null/not-a-real-directory/backend.db";
    resetDbSingletonForTests();

    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.healthy).toBe(false);
    expect(body.message).toBe("Database is unreachable");
  });
});
