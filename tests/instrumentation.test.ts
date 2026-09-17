import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { onRequestError } from "@/instrumentation";

// PR-097.03 (Observability — Error Tracking) — `onRequestError` is a
// Next.js framework-level hook, invoked internally by the server runtime
// when it captures a genuine server-side error; it isn't something a
// Route Handler test can trigger by calling an exported GET/POST function
// directly. This exercises the real, exported function itself with
// synthetic (but realistically-shaped) arguments — the same real logic
// Next.js would actually invoke it with — rather than mocking it away.
function request(overrides: Partial<{ path: string; method: string; headers: Record<string, string> }> = {}) {
  return { path: "/api/observability/events", method: "POST", headers: {}, ...overrides };
}

function context(overrides: Partial<{ routerKind: "App Router" | "Pages Router"; routePath: string; routeType: "render" | "route" | "action" | "proxy" }> = {}) {
  return {
    routerKind: "App Router" as const,
    routePath: "/api/observability/events",
    routeType: "route" as const,
    renderSource: undefined,
    revalidateReason: undefined,
    renderType: undefined,
    ...overrides,
  };
}

describe("onRequestError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs a real Error instance's own message, the real request path/method, and the real route context", async () => {
    const error = new Error("database connection refused");
    await onRequestError(error, request({ path: "/api/health", method: "GET" }), context({ routePath: "/api/health" }));

    expect(console.error).toHaveBeenCalledWith(
      "[server-error]",
      expect.objectContaining({ message: "database connection refused", path: "/api/health", method: "GET", routePath: "/api/health", routeType: "route" })
    );
  });

  it("extracts a real digest when the caught value carries one — Next re-processes some Server Component errors, replacing the original instance", async () => {
    const error = Object.assign(new Error("generic message"), { digest: "3245876877" });
    await onRequestError(error, request(), context());

    expect(console.error).toHaveBeenCalledWith("[server-error]", expect.objectContaining({ digest: "3245876877" }));
  });

  it("never crashes on a genuinely non-Error thrown value — the caught type is real `unknown`, per Next's own contract", async () => {
    await expect(onRequestError("a real, bare thrown string", request(), context())).resolves.not.toThrow();

    expect(console.error).toHaveBeenCalledWith("[server-error]", expect.objectContaining({ message: "a real, bare thrown string", digest: undefined }));
  });

  it("reports a real, honest undefined digest rather than fabricating one when none is present", async () => {
    const error = new Error("no digest here");
    await onRequestError(error, request(), context());

    expect(console.error).toHaveBeenCalledWith("[server-error]", expect.objectContaining({ digest: undefined }));
  });
});
