import type { Instrumentation } from "next";

/**
 * PR-097.03 (Observability — Error Tracking) — the server-side
 * counterpart to `app/dashboard/error.tsx`/`app/dashboard/projects/
 * [slug]/error.tsx`/`app/global-error.tsx` (all client-side React error
 * boundaries, which only ever see an error that survives long enough to
 * reach client rendering). A genuine server-side failure — an uncaught
 * exception inside a Route Handler, a Server Action, or Server Component
 * rendering that never reaches a client boundary at all — had zero
 * application-level observability before this file existed: Next.js
 * would still return a real error response, but nothing this app's own
 * code ever logged.
 *
 * `onRequestError` is Next.js's own built-in hook for exactly this (see
 * `node_modules/next/dist/docs/01-app/03-api-reference/03-file-
 * conventions/instrumentation.md`), stable since Next 15 — no new
 * dependency, no new architecture. Logs via `console.error`, the same
 * real log-aggregation channel (`fly logs`) every other PR-097.03 error-
 * tracking fix this session already reuses, rather than introducing a
 * third-party error-reporting service this codebase doesn't otherwise
 * need.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const message = error instanceof Error ? error.message : String(error);
  const digest = typeof error === "object" && error !== null && "digest" in error ? String((error as { digest: unknown }).digest) : undefined;

  console.error("[server-error]", {
    message,
    digest,
    path: request.path,
    method: request.method,
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
  });
};
