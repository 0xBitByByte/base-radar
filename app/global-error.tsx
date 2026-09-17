"use client";

import { useEffect } from "react";

/**
 * The last-resort boundary — catches an error in the root layout itself,
 * which `app/dashboard/error.tsx`/`app/dashboard/projects/[slug]/error.tsx`
 * cannot (per Next.js's own docs, `error.tsx` never wraps the `layout.tsx`
 * above it in the same segment). Before this file existed, a root-layout
 * failure fell through to Next's bare, unbranded default error screen with
 * nothing logged anywhere — the one uncaught-exception path this app had
 * zero observability into.
 *
 * Must define its own `<html>`/`<body>` (it replaces the root layout when
 * active) and cannot rely on `app/layout.tsx`'s fonts, global stylesheet,
 * or theme provider — none of that is guaranteed to have mounted if the
 * root layout itself is what failed. Inline styles only, by design.
 *
 * PR-097.03 (Observability) — same real-error-logging fix already applied
 * to the two route-level boundaries, extended to this last remaining gap.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          color: "#fafafa",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "28rem", padding: "1.5rem" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.5rem" }}>Something went wrong</h1>
          <p style={{ fontSize: "0.875rem", color: "#a1a1aa", margin: "0 0 1.5rem" }}>
            Base Radar ran into a problem loading. You can try again, or reload the page.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              borderRadius: "0.5rem",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              padding: "0.375rem 0.875rem",
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: "#fafafa",
              backgroundColor: "transparent",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
