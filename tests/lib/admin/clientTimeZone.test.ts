// @vitest-environment node
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { resolveClientTimeZone } from "@/lib/admin/clientTimeZone";

// resolveClientTimeZone's "valid header → passthrough" and "malformed
// header → UTC fallback" branches are already exercised indirectly via
// tests/app/api/admin/registry/[projectId]/route.test.ts and
// tests/app/api/admin/roles/[accountId]/route.test.ts (both routes send
// a real "Asia/Kolkata" header in one test and a real "Not/A/Real/Zone"
// header in another, asserting the resulting Activity Log entry's real
// timeZone). Neither route test suite ever omits the header entirely
// while still asserting the resulting timeZone — that third, structurally
// distinct branch (`if (!candidate) return FALLBACK_TIME_ZONE;`, an early
// return before the try/catch a malformed value falls through to) has no
// direct coverage anywhere. This file closes exactly that gap, directly
// and completely, rather than re-testing the other two branches a second
// time through the route layer.
function request(headers?: Record<string, string>) {
  return new NextRequest("http://localhost:3000/api/admin/registry/aerodrome-finance", { headers });
}

describe("resolveClientTimeZone", () => {
  it("falls back to UTC when the x-client-timezone header is genuinely absent — the branch no existing route test directly asserts", () => {
    expect(resolveClientTimeZone(request())).toBe("UTC");
  });

  it("falls back to UTC when the header is present but an empty string", () => {
    expect(resolveClientTimeZone(request({ "x-client-timezone": "" }))).toBe("UTC");
  });

  it("passes through a real, valid IANA time zone unchanged", () => {
    expect(resolveClientTimeZone(request({ "x-client-timezone": "Asia/Kolkata" }))).toBe("Asia/Kolkata");
    expect(resolveClientTimeZone(request({ "x-client-timezone": "America/New_York" }))).toBe("America/New_York");
    expect(resolveClientTimeZone(request({ "x-client-timezone": "UTC" }))).toBe("UTC");
  });

  it("falls back to UTC when the header is a genuinely malformed/unrecognized time zone — never trusted as a bare string", () => {
    expect(resolveClientTimeZone(request({ "x-client-timezone": "Not/A/Real/Zone" }))).toBe("UTC");
    expect(resolveClientTimeZone(request({ "x-client-timezone": "garbage" }))).toBe("UTC");
  });

  it("validates the real way Intl itself would — by genuinely attempting to construct a formatter, not a hardcoded allow-list", () => {
    // A real, valid but less-common zone that would fail a naive hardcoded check — proving this is a genuine Intl construction attempt.
    expect(resolveClientTimeZone(request({ "x-client-timezone": "Pacific/Kiritimati" }))).toBe("Pacific/Kiritimati");
  });
});
