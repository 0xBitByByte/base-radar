/**
 * PR-095.06 (Roles & Permissions) — the real role/permission vocabulary
 * for the Administration Platform.
 *
 * No role or permission model is defined anywhere in this repository's
 * product documentation (Product Bible, roadmap, backlog) — confirmed by
 * direct search before writing this file. Per this PR's own explicit
 * instruction not to "silently invent a large RBAC hierarchy," the model
 * below is the minimum viable one the already-shipped Administration
 * Platform (PR-095.01–PR-095.05) actually needs: exactly two roles,
 * matching this PR's own worked example ("changed... from 'USER' to
 * 'ADMIN'") — never a speculative tier (`EDITOR`, `VIEWER`,
 * `SUPER_ADMIN`, ...) nothing in this codebase or its docs calls for.
 *
 * Permissions are named per real, already-existing administrative
 * capability — one per protected route/action that genuinely exists
 * today. `content:manage` is deliberately absent: PR-095.04's own
 * investigation concluded, from real repository evidence, that "Content
 * Management" has no separate system in this product — it *is* the
 * Project Registry's own editorial fields. Giving it a second, redundant
 * permission gating the exact same code path `registry:edit` already
 * gates would be exactly the kind of invented duplication this PR's own
 * rules prohibit; the mapping is documented here instead.
 *
 * The `ADMIN` role holds every real permission; `USER` holds none — a
 * flat, binary model, not a per-account custom permission grant system.
 * Nothing in the documented Administration Platform asks for more
 * granularity than "is this account an administrator," so building a
 * dynamic, per-account permission editor now would itself be the
 * "large RBAC hierarchy" this PR is told not to invent. If a genuine
 * product need for finer-grained roles ever emerges, `ROLE_PERMISSIONS`
 * below is the one place that would grow — every call site already
 * checks a named permission, never a raw role, so no caller would need
 * to change.
 */

export const ROLES = ["ADMIN", "USER"] as const;
export type Role = (typeof ROLES)[number];

export function isValidRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** One real permission per real, already-existing administrative capability. */
export const ADMIN_PERMISSIONS = [
  /** `/api/admin/overview` — Admin Dashboard / operational visibility (PR-095.01). */
  "admin:overview:view",
  /** `GET /api/admin/registry` — Project Registry viewing (PR-095.02). */
  "registry:view",
  /** `PATCH`/`DELETE /api/admin/registry/[projectId]` — Project editing (PR-095.03). Also the real gate for "Content Management" — see this file's own top comment. */
  "registry:edit",
  /** `GET /api/admin/activity` — Activity Log viewing (PR-095.05). */
  "activity:view",
  /** `GET`/`PATCH /api/admin/roles*` — Role management and, in this flat two-role model, permission management (there is nothing more granular to manage than which of the two roles an account holds). */
  "roles:manage",
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

function isValidPermission(value: string): value is AdminPermission {
  return (ADMIN_PERMISSIONS as readonly string[]).includes(value);
}

const ROLE_PERMISSIONS: Record<Role, readonly AdminPermission[]> = {
  ADMIN: ADMIN_PERMISSIONS,
  USER: [],
};

/**
 * The one real permission check every admin route goes through. An
 * unrecognized permission string (a genuine programmer error, never a
 * real value any caller in this codebase actually passes) fails closed —
 * `false`, never silently granted — the same "never trust an unvalidated
 * value" posture this module's other exports already apply to roles.
 */
export function hasPermission(role: Role, permission: AdminPermission | string): boolean {
  if (!isValidPermission(permission)) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}
