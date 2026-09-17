// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { getAnalyticsSummary } from "@/lib/backend/sqlite/analyticsEvents";
import { getDb, resetDbSingletonForTests } from "@/lib/backend/sqlite/db";
import { resetRateLimitBucketsForTests } from "@/lib/providers/common/rate-limit";
import { POST } from "@/app/api/observability/events/route";

function postRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/observability/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/observability/events", () => {
  beforeEach(() => {
    process.env.SQLITE_DB_PATH = ":memory:";
    resetDbSingletonForTests();
    resetRateLimitBucketsForTests();
  });
  afterEach(() => {
    resetDbSingletonForTests();
    delete process.env.SQLITE_DB_PATH;
  });

  it("PR-097.05: real per-IP rate limiting — the request past the budget is rejected with 429, never persisted", async () => {
    for (let i = 0; i < 120; i += 1) {
      const response = await POST(postRequest({ name: "page_view", path: "/dashboard" }));
      expect(response.status).toBe(201);
    }

    const overBudget = await POST(postRequest({ name: "page_view", path: "/dashboard" }));
    expect(overBudget.status).toBe(429);

    const summary = getAnalyticsSummary(getDb());
    expect(summary.totalPageViews).toBe(120);
  });

  it("a real, well-formed page_view event is unauthenticated (no session required) and genuinely persisted", async () => {
    const response = await POST(postRequest({ name: "page_view", path: "/dashboard" }));
    expect(response.status).toBe(201);

    const summary = getAnalyticsSummary(getDb());
    expect(summary).toEqual({ totalPageViews: 1, topPaths: [{ path: "/dashboard", eventCount: 1 }] });
  });

  it("rejects an unrecognized event name — never persisted", async () => {
    const response = await POST(postRequest({ name: "made-up-event", path: "/" }));
    expect(response.status).toBe(400);
    expect(getAnalyticsSummary(getDb())).toEqual({ totalPageViews: 0, topPaths: [] });
  });

  it("rejects a missing/empty path — never persisted", async () => {
    const response = await POST(postRequest({ name: "page_view", path: "" }));
    expect(response.status).toBe(400);
    expect(getAnalyticsSummary(getDb())).toEqual({ totalPageViews: 0, topPaths: [] });
  });

  it("rejects a non-string path — never persisted", async () => {
    const response = await POST(postRequest({ name: "page_view", path: 123 }));
    expect(response.status).toBe(400);
  });

  it("rejects a genuinely malformed request body — never crashes", async () => {
    const request = new NextRequest("http://localhost:3000/api/observability/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not valid json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("rejects a real array/non-object body", async () => {
    const response = await POST(postRequest(["not", "an", "object"]));
    expect(response.status).toBe(400);
  });

  it("never persists any account/session/visitor identity, even if a malicious payload includes one", async () => {
    await POST(postRequest({ name: "page_view", path: "/", accountId: "spoofed", visitorId: "spoofed" }));
    const row = getDb().prepare("SELECT * FROM analytics_events").get() as Record<string, unknown>;
    expect(Object.keys(row)).not.toContain("account_id");
    expect(Object.keys(row)).not.toContain("visitor_id");
  });

  it("real repeated page views for the same real path are each recorded honestly, never deduplicated", async () => {
    await POST(postRequest({ name: "page_view", path: "/dashboard" }));
    await POST(postRequest({ name: "page_view", path: "/dashboard" }));

    const summary = getAnalyticsSummary(getDb());
    expect(summary.totalPageViews).toBe(2);
    expect(summary.topPaths).toEqual([{ path: "/dashboard", eventCount: 2 }]);
  });

  describe("PR-108.2 — graceful degradation when persistence fails", () => {
    afterEach(() => {
      delete process.env.VERCEL;
    });

    it("on Vercel (VERCEL set), a persistence failure responds 202 with persisted: false — never a fabricated 201, never an unhandled 500", async () => {
      process.env.VERCEL = "1";
      process.env.SQLITE_DB_PATH = "/dev/null/not-a-real-directory/backend.db";
      resetDbSingletonForTests();

      const response = await POST(postRequest({ name: "page_view", path: "/dashboard" }));
      expect(response.status).toBe(202);
      expect(await response.json()).toEqual({ ok: false, persisted: false, reason: "not-configured" });
    });

    it("off Vercel (Fly/local), a persistence failure still throws — today's loud failure behavior is preserved unchanged", async () => {
      delete process.env.VERCEL;
      process.env.SQLITE_DB_PATH = "/dev/null/not-a-real-directory/backend.db";
      resetDbSingletonForTests();

      await expect(POST(postRequest({ name: "page_view", path: "/dashboard" }))).rejects.toThrow();
    });
  });
});
