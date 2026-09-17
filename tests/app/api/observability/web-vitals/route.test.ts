// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { getDb, resetDbSingletonForTests } from "@/lib/backend/sqlite/db";
import { getPerformanceMetricsSummary } from "@/lib/backend/sqlite/performanceMetrics";
import { resetRateLimitBucketsForTests } from "@/lib/providers/common/rate-limit";
import { POST } from "@/app/api/observability/web-vitals/route";

function postRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/observability/web-vitals", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/observability/web-vitals", () => {
  beforeEach(() => {
    process.env.SQLITE_DB_PATH = ":memory:";
    resetDbSingletonForTests();
    resetRateLimitBucketsForTests();
  });
  afterEach(() => {
    resetDbSingletonForTests();
    delete process.env.SQLITE_DB_PATH;
  });

  it("PR-097.05: real per-IP rate limiting — the sample past the budget is rejected with 429, never persisted", async () => {
    for (let i = 0; i < 120; i += 1) {
      const response = await POST(postRequest({ name: "LCP", value: 100, rating: "good", path: "/" }));
      expect(response.status).toBe(201);
    }

    const overBudget = await POST(postRequest({ name: "LCP", value: 100, rating: "good", path: "/" }));
    expect(overBudget.status).toBe(429);

    const summary = getPerformanceMetricsSummary(getDb());
    expect(summary.find((entry) => entry.metricName === "LCP")?.sampleCount).toBe(120);
  });

  it("a real, well-formed sample is unauthenticated (no session required) and genuinely persisted", async () => {
    const response = await POST(postRequest({ name: "LCP", value: 1234.5, rating: "good", path: "/dashboard" }));
    expect(response.status).toBe(201);

    const summary = getPerformanceMetricsSummary(getDb());
    expect(summary).toEqual([{ metricName: "LCP", sampleCount: 1, average: 1234.5, min: 1234.5, max: 1234.5, goodCount: 1, needsImprovementCount: 0, poorCount: 0 }]);
  });

  it("rejects an unrecognized metric name — never persisted", async () => {
    const response = await POST(postRequest({ name: "made-up-metric", value: 100, rating: "good", path: "/" }));
    expect(response.status).toBe(400);
    expect(getPerformanceMetricsSummary(getDb())).toEqual([]);
  });

  it("rejects a non-numeric, negative, or non-finite value — never persisted", async () => {
    for (const value of ["100", -5, Infinity, NaN]) {
      const response = await POST(postRequest({ name: "FCP", value, rating: "good", path: "/" }));
      expect(response.status).toBe(400);
    }
    expect(getPerformanceMetricsSummary(getDb())).toEqual([]);
  });

  it("rejects an unrecognized rating — never persisted", async () => {
    const response = await POST(postRequest({ name: "FCP", value: 500, rating: "excellent", path: "/" }));
    expect(response.status).toBe(400);
    expect(getPerformanceMetricsSummary(getDb())).toEqual([]);
  });

  it("rejects a missing/empty path — never persisted", async () => {
    const response = await POST(postRequest({ name: "FCP", value: 500, rating: "good", path: "" }));
    expect(response.status).toBe(400);
    expect(getPerformanceMetricsSummary(getDb())).toEqual([]);
  });

  it("rejects a genuinely malformed request body — never crashes", async () => {
    const request = new NextRequest("http://localhost:3000/api/observability/web-vitals", {
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

  it("never persists any account/session identity, even if a malicious payload includes one", async () => {
    await POST(postRequest({ name: "LCP", value: 100, rating: "good", path: "/", accountId: "spoofed", userId: "spoofed" }));
    const row = getDb().prepare("SELECT * FROM performance_metrics").get() as Record<string, unknown>;
    expect(Object.keys(row)).not.toContain("account_id");
    expect(Object.keys(row)).not.toContain("user_id");
  });
});
