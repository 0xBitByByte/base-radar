"use client";

import { useState } from "react";
import { AlertTriangle, Lock, ShieldAlert, ShieldCheck, Users } from "lucide-react";

import { AdminNav } from "@/components/admin/AdminNav";
import { PAGE_HEADER_GROUP_CLASS, PAGE_HEADER_SUBTITLE_CLASS, PAGE_HEADER_TITLE_CLASS } from "@/components/dashboard/pageHeaderStyles";
import { WidgetSkeleton } from "@/components/dashboard/WidgetSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { useAdminRoles } from "@/lib/hooks/useAdminRoles";
import { useAuthSession } from "@/lib/hooks/useAuthSession";
import { ROLES, type Role } from "@/lib/admin/permissions";
import type { EffectiveAccountRole } from "@/lib/admin/roles";

/**
 * PR-095.06 — `/dashboard/admin/roles`. Real authorization is enforced
 * entirely server-side by `/api/admin/roles*` (`resolveAdminPermission`,
 * checked against the real `roles:manage` permission — not a bare "is
 * admin" check). The UI reflects the server's own real decisions only:
 * an account's own row never offers a role-change control (the backend
 * rejects a self-role-change unconditionally — this is a real UX
 * courtesy mirroring that rule, never the rule's actual enforcement,
 * which stays server-side regardless of what this component renders).
 */
export function AdminRolesPage() {
  const { state, retry, changeRole } = useAdminRoles();
  const { account: viewer } = useAuthSession();

  return (
    <div className="flex flex-col gap-6">
      <div className={PAGE_HEADER_GROUP_CLASS}>
        <h1 className={PAGE_HEADER_TITLE_CLASS}>Roles &amp; Permissions</h1>
        <p className={PAGE_HEADER_SUBTITLE_CLASS}>Real, persisted role assignments for every account. Visible only to authorized administrators.</p>
      </div>

      <AdminNav />

      {state.status === "loading" && (
        <div className="flex flex-col gap-2" role="status" aria-live="polite" aria-label="Loading Roles &amp; Permissions">
          {Array.from({ length: 4 }).map((_, index) => (
            <WidgetSkeleton key={index} className="h-14" />
          ))}
        </div>
      )}

      {state.status === "unauthenticated" && (
        <EmptyState
          icon={Lock}
          title="Sign in required"
          description="Roles & Permissions is only visible to a signed-in, authorized account. Sign in from the account menu, then reload this page."
        />
      )}

      {state.status === "forbidden" && (
        <EmptyState icon={ShieldAlert} title="Access restricted" description="Your account is signed in but doesn't have permission to manage roles." />
      )}

      {state.status === "error" && (
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load Roles & Permissions"
          description="Something went wrong while loading role assignments. Please try again."
          action={
            <button
              type="button"
              onClick={retry}
              className="rounded-lg border border-radar-light-border px-3 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
            >
              Try again
            </button>
          }
        />
      )}

      {state.status === "ready" && (
        state.accounts.length === 0 ? (
          <EmptyState icon={Users} title="No accounts yet" description="Real accounts will appear here once someone signs in." />
        ) : (
          <div className="flex flex-col divide-y divide-radar-light-border overflow-hidden rounded-xl border border-radar-light-border dark:divide-white/10 dark:border-white/10">
            {state.accounts.map((entry) => (
              <RoleRow key={entry.accountId} entry={entry} isSelf={entry.accountId === viewer?.id} changeRole={changeRole} />
            ))}
          </div>
        )
      )}
    </div>
  );
}

function RoleRow({
  entry,
  isSelf,
  changeRole,
}: {
  entry: EffectiveAccountRole;
  isSelf: boolean;
  changeRole: (accountId: string, role: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(role: Role) {
    if (role === entry.role) return;
    setSaving(true);
    setError(null);
    const result = await changeRole(entry.accountId, role);
    setSaving(false);
    if (!result.ok) setError(result.error);
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-radar-light-text dark:text-radar-white">
            {entry.name} {isSelf && <span className="text-xs font-normal text-radar-light-muted dark:text-radar-muted">(you)</span>}
          </span>
          <span className="truncate text-xs text-radar-light-muted dark:text-radar-muted">
            {entry.username} · {entry.address ?? "no address on file"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <GlowBadge color={entry.role === "ADMIN" ? "success" : "muted"}>
            {entry.role === "ADMIN" ? <ShieldCheck className="size-3" aria-hidden="true" /> : null}
            {entry.role}
          </GlowBadge>
          {entry.isBootstrapRole && (
            <span className="text-[10px] italic text-radar-light-muted/70 dark:text-radar-muted/70">not explicitly assigned</span>
          )}
          {isSelf ? (
            <span className="text-xs text-radar-light-muted dark:text-radar-muted">Cannot change your own role</span>
          ) : (
            <select
              value={entry.role}
              disabled={saving}
              onChange={(event) => void handleChange(event.target.value as Role)}
              aria-label={`Change role for ${entry.name}`}
              className="rounded-lg border border-radar-light-border bg-radar-light-surface px-2 py-1 text-xs text-radar-light-text outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-radar-white"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-radar-danger">{error}</p>}
    </div>
  );
}
