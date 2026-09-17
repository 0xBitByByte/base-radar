// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { resetDbSingletonForTests } from "@/lib/backend/sqlite/db";
import { resetRateLimitBucketsForTests } from "@/lib/providers/common/rate-limit";
import { POST } from "@/app/api/auth/challenge/route";

const ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/auth/challenge", {
    method: "POST",
    headers: { "content-type": "application/json", host: "localhost:3000", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/challenge", () => {
  beforeEach(() => {
    process.env.SQLITE_DB_PATH = ":memory:";
    resetDbSingletonForTests();
    resetRateLimitBucketsForTests();
  });
  afterEach(() => {
    resetDbSingletonForTests();
    delete process.env.SQLITE_DB_PATH;
  });

  it("PR-097.05: real per-IP rate limiting — the request past the budget is rejected with 429, never issues a challenge", async () => {
    for (let i = 0; i < 20; i += 1) {
      const response = await POST(makeRequest({ address: ADDRESS }));
      expect(response.status).toBe(200);
    }

    const overBudget = await POST(makeRequest({ address: ADDRESS }));
    expect(overBudget.status).toBe(429);
  });

  it("issues a real, signable EIP-4361 message and nonce for a valid address", async () => {
    const response = await POST(makeRequest({ address: ADDRESS }));
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toContain(ADDRESS);
    expect(body.message).toContain("localhost:3000");
    expect(typeof body.nonce).toBe("string");
    expect(body.nonce.length).toBeGreaterThanOrEqual(8);
    expect(new Date(body.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("rejects a genuinely malformed address rather than issuing a challenge for it", async () => {
    const response = await POST(makeRequest({ address: "not-an-address" }));
    expect(response.status).toBe(400);
  });

  it("rejects a missing address", async () => {
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
  });

  it("rejects a genuinely invalid request body", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/challenge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("every real call issues a distinct nonce, even for the same address", async () => {
    const first = await (await POST(makeRequest({ address: ADDRESS }))).json();
    const second = await (await POST(makeRequest({ address: ADDRESS }))).json();
    expect(first.nonce).not.toBe(second.nonce);
  });
});
