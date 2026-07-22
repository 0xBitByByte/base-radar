import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Deliberately separate from the app's own Next.js/Turbopack build — this
 * only drives unit and component tests under `tests/`, mirrored against
 * `lib/` and `components/` (see `docs/TESTING.md`). SWC, not Babel, for
 * the React transform so it doesn't fight `shadcn`'s own Babel dependency
 * chain, and so the toolchain here matches the SWC-based one Next.js
 * itself already uses.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": dirname,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    css: false,
  },
});
