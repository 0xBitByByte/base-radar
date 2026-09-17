// @vitest-environment node
import { describe, expect, it } from "vitest";

import { ADMIN_PERMISSIONS, ROLES, hasPermission, isValidRole } from "@/lib/admin/permissions";

describe("isValidRole", () => {
  it("accepts every real, known role", () => {
    for (const role of ROLES) expect(isValidRole(role)).toBe(true);
  });

  it("rejects an unknown role string", () => {
    expect(isValidRole("SUPER_ADMIN")).toBe(false);
    expect(isValidRole("editor")).toBe(false); // wrong case is also unknown
  });

  it("rejects non-string values, never throwing", () => {
    expect(isValidRole(undefined)).toBe(false);
    expect(isValidRole(null)).toBe(false);
    expect(isValidRole(42)).toBe(false);
    expect(isValidRole({ role: "ADMIN" })).toBe(false);
  });
});

describe("hasPermission", () => {
  it("ADMIN holds every real, named permission", () => {
    for (const permission of ADMIN_PERMISSIONS) expect(hasPermission("ADMIN", permission)).toBe(true);
  });

  it("USER holds no permission — the flat, minimum-viable model has no default grants", () => {
    for (const permission of ADMIN_PERMISSIONS) expect(hasPermission("USER", permission)).toBe(false);
  });

  it("fails closed on an unrecognized permission string, even for ADMIN", () => {
    expect(hasPermission("ADMIN", "not-a-real-permission")).toBe(false);
    expect(hasPermission("USER", "not-a-real-permission")).toBe(false);
  });
});
