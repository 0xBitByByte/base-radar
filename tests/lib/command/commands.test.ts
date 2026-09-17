import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { COMMANDS } from "@/lib/command/commands";
import { DASHBOARD_NAV_GROUPS } from "@/constants/dashboard";

/** `route`/`href` values on this app's own convention (`/dashboard/<segment>`) map 1:1 to `app/dashboard/<segment>/page.tsx` — confirms a new entry points to a real, existing route file, never a placeholder. */
function routeFileExists(route: string): boolean {
  const relative = route.replace(/^\//, "").replace(/\/$/, "");
  return existsSync(join(process.cwd(), "app", relative, "page.tsx"));
}

describe("AI Workspace — navigation and command entries resolve to the real route", () => {
  it("the command palette entry points to /dashboard/ai-workspace, and that route file genuinely exists", () => {
    const command = COMMANDS.find((c) => c.id === "ai-workspace");
    expect(command).toBeDefined();
    expect(command!.route).toBe("/dashboard/ai-workspace");
    expect(routeFileExists(command!.route)).toBe(true);
  });

  it("the Sidebar nav entry points to /dashboard/ai-workspace, and that route file genuinely exists", () => {
    const item = DASHBOARD_NAV_GROUPS.flatMap((group) => group.items).find((i) => i.label === "AI Workspace");
    expect(item).toBeDefined();
    expect(item!.href).toBe("/dashboard/ai-workspace");
    expect(routeFileExists(item!.href)).toBe(true);
  });

  it("every existing command's route still resolves to a real page file — this change didn't disturb any other entry", () => {
    for (const command of COMMANDS) {
      expect(routeFileExists(command.route)).toBe(true);
    }
  });
});

describe("PR-091 (Compare Platform) — the command palette entry resolves to the real route", () => {
  it("the 'compare' command points to /dashboard/compare, and that route file genuinely exists", () => {
    const command = COMMANDS.find((c) => c.id === "compare");
    expect(command).toBeDefined();
    expect(command!.route).toBe("/dashboard/compare");
    expect(routeFileExists(command!.route)).toBe(true);
  });
});
