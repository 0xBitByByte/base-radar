// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { resetRateLimitBucketsForTests } from "@/lib/providers/common/rate-limit";
import { getClientIp, isRequestRateLimited } from "@/lib/security/requestRateLimit";

function requestWithHeaders(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/whatever", { headers });
}

describe("getClientIp", () => {
  it("prefers the real Fly proxy header when present", () => {
    const request = requestWithHeaders({ "fly-client-ip": "203.0.113.9", "x-forwarded-for": "198.51.100.1" });
    expect(getClientIp(request)).toBe("203.0.113.9");
  });

  it("falls back to the first X-Forwarded-For entry when Fly's header is absent", () => {
    const request = requestWithHeaders({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" });
    expect(getClientIp(request)).toBe("198.51.100.1");
  });

  it("falls back to a real, harmless constant when neither header is present (local dev)", () => {
    expect(getClientIp(requestWithHeaders())).toBe("unknown");
  });
});

describe("isRequestRateLimited", () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests();
  });

  it("allows requests under the configured budget", () => {
    const request = requestWithHeaders({ "fly-client-ip": "203.0.113.1" });
    for (let i = 0; i < 5; i += 1) {
      expect(isRequestRateLimited(request, "test:route", { limit: 5, windowMs: 60_000 })).toBe(false);
    }
  });

  it("rejects the request once the same IP exceeds the budget", () => {
    const request = requestWithHeaders({ "fly-client-ip": "203.0.113.1" });
    for (let i = 0; i < 5; i += 1) {
      isRequestRateLimited(request, "test:route", { limit: 5, windowMs: 60_000 });
    }
    expect(isRequestRateLimited(request, "test:route", { limit: 5, windowMs: 60_000 })).toBe(true);
  });

  it("a different IP gets its own, independent budget — never penalized by another client's traffic", () => {
    const busyIp = requestWithHeaders({ "fly-client-ip": "203.0.113.1" });
    const otherIp = requestWithHeaders({ "fly-client-ip": "203.0.113.2" });
    for (let i = 0; i < 5; i += 1) {
      isRequestRateLimited(busyIp, "test:route", { limit: 5, windowMs: 60_000 });
    }
    expect(isRequestRateLimited(busyIp, "test:route", { limit: 5, windowMs: 60_000 })).toBe(true);
    expect(isRequestRateLimited(otherIp, "test:route", { limit: 5, windowMs: 60_000 })).toBe(false);
  });

  it("the same IP's budget is scoped per route — exhausting one route never blocks another", () => {
    const request = requestWithHeaders({ "fly-client-ip": "203.0.113.1" });
    for (let i = 0; i < 5; i += 1) {
      isRequestRateLimited(request, "route-a", { limit: 5, windowMs: 60_000 });
    }
    expect(isRequestRateLimited(request, "route-a", { limit: 5, windowMs: 60_000 })).toBe(true);
    expect(isRequestRateLimited(request, "route-b", { limit: 5, windowMs: 60_000 })).toBe(false);
  });
});
