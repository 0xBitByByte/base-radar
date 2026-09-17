"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Lock, Pencil, RotateCcw, Search, ShieldAlert, X } from "lucide-react";

import { AdminMetric } from "@/components/admin/AdminMetric";
import { AdminNav } from "@/components/admin/AdminNav";
import { formatLabel } from "@/components/explorer/format";
import { VerificationBadge } from "@/components/explorer/VerificationBadge";
import { PAGE_HEADER_GROUP_CLASS, PAGE_HEADER_SUBTITLE_CLASS, PAGE_HEADER_TITLE_CLASS } from "@/components/dashboard/pageHeaderStyles";
import { WidgetSkeleton } from "@/components/dashboard/WidgetSkeleton";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAdminRegistry, type SaveProjectEditResult } from "@/lib/hooks/useAdminRegistry";
import type { AdminRegistrySnapshot } from "@/lib/admin/registry";
import { PROJECT_STATUSES, VERIFICATION_STATUSES } from "@/data/projects/enums";
import type { Project } from "@/data/projects/types";

/**
 * PR-095.02/PR-095.03 — `/dashboard/admin/registry`. Real authorization is
 * enforced entirely server-side by `/api/admin/registry*`
 * (`resolveAdminAccess`, the exact PR-095.01 boundary — never a second
 * mechanism). Edits are real and persisted (`project_edits`, via
 * PR-095.03's approved architecture) — never a fake/optimistic UI: a Save
 * only ever reflects the server's own real response, and a rejected edit
 * (a disallowed field, a validation failure) leaves the row exactly as it
 * was, with the real server error shown.
 *
 * Deliberately editable in this pass: `name`, `shortDescription`,
 * `description`, `websiteUrl`, `status`, and `verification.status`/
 * `verification.notes` — the scalar identity/copy fields a "Project
 * Editor" most commonly needs to fix. `categories`/`tags`/`chains`/
 * `contracts`/`social`/`providerIds`/`github`/`governance` stay
 * real-and-current in the read-only detail view but have no edit control
 * here — the server (`applyProjectEdit`) already accepts all of them, so
 * extending this form to cover them later is additive, not a redesign.
 */
export function AdminRegistryPage() {
  const { state, retry, saveEdit, revertEdit } = useAdminRegistry();

  return (
    <div className="flex flex-col gap-6">
      <div className={PAGE_HEADER_GROUP_CLASS}>
        <h1 className={PAGE_HEADER_TITLE_CLASS}>Project Registry</h1>
        <p className={PAGE_HEADER_SUBTITLE_CLASS}>
          Real registry data, validation, and provider coverage. Visible only to authorized administrators.
        </p>
      </div>

      <AdminNav />

      {state.status === "loading" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" role="status" aria-live="polite" aria-label="Loading Project Registry">
          {Array.from({ length: 6 }).map((_, index) => (
            <WidgetSkeleton key={index} className="h-[92px]" />
          ))}
        </div>
      )}

      {state.status === "unauthenticated" && (
        <EmptyState
          icon={Lock}
          title="Sign in required"
          description="The Admin Registry is only visible to a signed-in, authorized account. Sign in from the account menu, then reload this page."
        />
      )}

      {state.status === "forbidden" && (
        <EmptyState icon={ShieldAlert} title="Access restricted" description="Your account is signed in but isn't authorized to view the Admin Registry." />
      )}

      {state.status === "error" && (
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load the Project Registry"
          description="Something went wrong while loading registry data. Please try again."
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

      {state.status === "ready" && <RegistryReady snapshot={state.snapshot} saveEdit={saveEdit} revertEdit={revertEdit} />}
    </div>
  );
}

type MutationProps = {
  saveEdit: (projectId: string, patch: Record<string, unknown>) => Promise<SaveProjectEditResult>;
  revertEdit: (projectId: string) => Promise<SaveProjectEditResult>;
};

function RegistryReady({ snapshot, saveEdit, revertEdit }: { snapshot: AdminRegistrySnapshot } & MutationProps) {
  const { metrics, validation, coverage, projects, edits } = snapshot;
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return projects;
    return projects.filter((project) => {
      const haystack = [project.name, project.shortDescription, project.slug, ...project.tags, ...project.categories].join(" ").toLowerCase();
      return haystack.includes(trimmed);
    });
  }, [projects, query]);

  const coverageByProjectId = useMemo(() => new Map(coverage.projects.map((entry) => [entry.id, entry])), [coverage.projects]);
  const editByProjectId = useMemo(() => new Map(edits.map((edit) => [edit.projectId, edit])), [edits]);

  return (
    <>
      <section aria-labelledby="admin-registry-metrics-heading" className="flex flex-col gap-3">
        <h2 id="admin-registry-metrics-heading" className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
          Registry Metrics
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <AdminMetric icon={CheckCircle2} label="Discovered" value={metrics.discovered} description="Every registry entry" />
          <AdminMetric icon={CheckCircle2} label="Indexed" value={metrics.indexed} description="Reached the Indexed pipeline level" />
          <AdminMetric icon={CheckCircle2} label="Verified" value={metrics.verified} description="Reached the Verified pipeline level" />
          <AdminMetric icon={CheckCircle2} label="Intelligence Ready" value={metrics.intelligenceReady} description="Reached Intelligence Ready" />
          <AdminMetric icon={CheckCircle2} label="New This Month" value={metrics.newThisMonth} description="Discovered this calendar month" />
          <AdminMetric icon={CheckCircle2} label="Updated Today" value={metrics.updatedToday} description="Lifecycle updated today" />
        </div>
      </section>

      <section aria-labelledby="admin-registry-validation-heading" className="flex flex-col gap-3">
        <h2 id="admin-registry-validation-heading" className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
          Registry Validation
        </h2>
        <div
          className={`flex flex-col gap-3 rounded-xl border p-4 ${
            validation.valid
              ? "border-radar-success/30 bg-radar-success/5"
              : "border-radar-danger/30 bg-radar-danger/5"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium text-radar-light-text dark:text-radar-white">
            {validation.valid ? (
              <CheckCircle2 className="size-4 shrink-0 text-radar-success" aria-hidden="true" />
            ) : (
              <AlertTriangle className="size-4 shrink-0 text-radar-danger" aria-hidden="true" />
            )}
            {validation.valid ? "Registry valid" : "Registry has real validation errors"} — {validation.errors.length} error
            {validation.errors.length === 1 ? "" : "s"}, {validation.warnings.length} warning
            {validation.warnings.length === 1 ? "" : "s"}
          </div>
          {validation.issues.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {validation.issues.map((issue, index) => (
                <li key={`${issue.code}-${issue.projectId ?? "registry"}-${index}`} className="flex items-start gap-2 text-xs text-radar-light-muted dark:text-radar-muted">
                  <GlowBadge color={issue.severity === "error" ? "danger" : "warning"} className="shrink-0">
                    {issue.severity}
                  </GlowBadge>
                  <span>
                    {issue.projectId && <span className="font-medium text-radar-light-text dark:text-radar-white">{issue.projectId}: </span>}
                    {issue.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section aria-labelledby="admin-registry-coverage-heading" className="flex flex-col gap-3">
        <h2 id="admin-registry-coverage-heading" className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
          Provider Coverage
        </h2>
        <div className="flex flex-col gap-3 rounded-xl border border-radar-light-border bg-radar-light-card p-4 dark:border-white/10 dark:bg-radar-card">
          <p className="text-sm text-radar-light-text dark:text-radar-white">
            Average coverage: <span className="font-semibold tabular-nums">{coverage.averageCoveragePct}%</span> across {coverage.totalProjects} projects
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Object.entries(coverage.dimensionAvailabilityPct).map(([dimension, pct]) => (
              <div key={dimension} className="flex items-center justify-between rounded-lg bg-radar-light-surface px-2.5 py-1.5 text-xs dark:bg-white/5">
                <span className="text-radar-light-muted dark:text-radar-muted">{formatLabel(dimension)}</span>
                <span className="font-medium tabular-nums text-radar-light-text dark:text-radar-white">{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="admin-registry-projects-heading" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="admin-registry-projects-heading" className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
            Projects ({filtered.length} of {projects.length})
          </h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects…"
              aria-label="Search projects"
              className="rounded-lg border border-radar-light-border bg-radar-light-surface py-1.5 pl-8 pr-3 text-xs text-radar-light-text outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-white/5 dark:text-radar-white"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Search} title="No matching projects" description="No registry entry matches this search." />
        ) : (
          <div className="flex flex-col divide-y divide-radar-light-border overflow-hidden rounded-xl border border-radar-light-border dark:divide-white/10 dark:border-white/10">
            {filtered.map((project) => (
              <AdminRegistryProjectRow
                key={project.id}
                project={project}
                coveragePct={coverageByProjectId.get(project.id)?.coveragePct ?? 0}
                isEdited={editByProjectId.has(project.id)}
                expanded={expandedId === project.id}
                onToggle={() => setExpandedId((current) => (current === project.id ? null : project.id))}
                saveEdit={saveEdit}
                revertEdit={revertEdit}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

type EditableFormState = {
  name: string;
  shortDescription: string;
  description: string;
  websiteUrl: string;
  status: Project["status"];
  verificationStatus: Project["verification"]["status"];
  verificationNotes: string;
};

function toFormState(project: Project): EditableFormState {
  return {
    name: project.name,
    shortDescription: project.shortDescription,
    description: project.description,
    websiteUrl: project.websiteUrl,
    status: project.status,
    verificationStatus: project.verification.status,
    verificationNotes: project.verification.notes ?? "",
  };
}

function AdminRegistryProjectRow({
  project,
  coveragePct,
  isEdited,
  expanded,
  onToggle,
  saveEdit,
  revertEdit,
}: {
  project: Project;
  coveragePct: number;
  isEdited: boolean;
  expanded: boolean;
  onToggle: () => void;
} & MutationProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditableFormState>(() => toFormState(project));
  const [saving, setSaving] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());

  function startEditing() {
    setForm(toFormState(project));
    setError(null);
    setFieldErrors(new Set());
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setError(null);
    setFieldErrors(new Set());
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setFieldErrors(new Set());

    const result = await saveEdit(project.id, {
      name: form.name,
      shortDescription: form.shortDescription,
      description: form.description,
      websiteUrl: form.websiteUrl,
      status: form.status,
      verification: { ...project.verification, status: form.verificationStatus, notes: form.verificationNotes.trim() === "" ? undefined : form.verificationNotes },
    });

    setSaving(false);
    if (result.ok) {
      setEditing(false);
      return;
    }
    setError(result.error);
    if (result.validationErrors) setFieldErrors(new Set(result.validationErrors.map((issue) => issue.field).filter((field): field is string => Boolean(field))));
  }

  async function handleRevert() {
    setReverting(true);
    setError(null);
    const result = await revertEdit(project.id);
    setReverting(false);
    if (!result.ok) setError(result.error);
    else setEditing(false);
  }

  return (
    <div className="bg-radar-light-card dark:bg-radar-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:hover:bg-white/5"
      >
        {expanded ? (
          <ChevronDown className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
        )}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium text-radar-light-text dark:text-radar-white">{project.name}</span>
          <span className="text-xs text-radar-light-muted dark:text-radar-muted">{project.slug}</span>
          <GlowBadge color="muted">{formatLabel(project.status)}</GlowBadge>
          {project.categories.map((category) => (
            <GlowBadge key={category} color="accent">
              {formatLabel(category)}
            </GlowBadge>
          ))}
          {isEdited && <GlowBadge color="warning">edited</GlowBadge>}
        </div>
        <VerificationBadge status={project.verification.status} compact hideAlternates />
        <span className="shrink-0 text-xs font-medium tabular-nums text-radar-light-muted dark:text-radar-muted">{coveragePct}% coverage</span>
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-radar-light-border bg-radar-light-surface/50 px-4 py-4 text-xs dark:border-white/10 dark:bg-white/[0.02]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-radar-light-muted dark:text-radar-muted">
              {editing ? "Editing" : "Project details"}
            </span>
            <div className="flex items-center gap-2">
              {isEdited && !editing && (
                <button
                  type="button"
                  onClick={handleRevert}
                  disabled={reverting}
                  className="flex items-center gap-1 rounded-lg border border-radar-light-border px-2.5 py-1 text-[11px] font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 disabled:opacity-50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
                >
                  <RotateCcw className="size-3" aria-hidden="true" />
                  {reverting ? "Reverting…" : "Revert to seed"}
                </button>
              )}
              {!editing && (
                <button
                  type="button"
                  onClick={startEditing}
                  className="flex items-center gap-1 rounded-lg border border-radar-primary/40 bg-radar-primary/10 px-2.5 py-1 text-[11px] font-medium text-radar-primary outline-none transition-colors hover:bg-radar-primary/15 focus-visible:ring-2 focus-visible:ring-radar-primary/50"
                >
                  <Pencil className="size-3" aria-hidden="true" />
                  Edit
                </button>
              )}
              {editing && (
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="flex items-center gap-1 rounded-lg border border-radar-light-border px-2.5 py-1 text-[11px] font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
                >
                  <X className="size-3" aria-hidden="true" />
                  Cancel
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-radar-danger/30 bg-radar-danger/5 px-3 py-2 text-radar-danger">{error}</div>
          )}

          {editing ? (
            <div className="flex flex-col gap-3">
              <EditField label="Name" invalid={fieldErrors.has("name")}>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className={inputClass}
                />
              </EditField>
              <EditField label="Short description" invalid={fieldErrors.has("shortDescription")}>
                <input
                  type="text"
                  value={form.shortDescription}
                  onChange={(event) => setForm((prev) => ({ ...prev, shortDescription: event.target.value }))}
                  className={inputClass}
                />
              </EditField>
              <EditField label="Description" invalid={fieldErrors.has("description")}>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={3}
                  className={inputClass}
                />
              </EditField>
              <EditField label="Website" invalid={fieldErrors.has("websiteUrl")}>
                <input
                  type="text"
                  value={form.websiteUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, websiteUrl: event.target.value }))}
                  className={inputClass}
                />
              </EditField>
              <EditField label="Status" invalid={fieldErrors.has("status")}>
                <select
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as Project["status"] }))}
                  className={inputClass}
                >
                  {PROJECT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {formatLabel(status)}
                    </option>
                  ))}
                </select>
              </EditField>
              <EditField label="Verification status" invalid={fieldErrors.has("verification")}>
                <select
                  value={form.verificationStatus}
                  onChange={(event) => setForm((prev) => ({ ...prev, verificationStatus: event.target.value as Project["verification"]["status"] }))}
                  className={inputClass}
                >
                  {VERIFICATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {formatLabel(status)}
                    </option>
                  ))}
                </select>
              </EditField>
              <EditField label="Verification notes">
                <input
                  type="text"
                  value={form.verificationNotes}
                  onChange={(event) => setForm((prev) => ({ ...prev, verificationNotes: event.target.value }))}
                  className={inputClass}
                />
              </EditField>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-radar-primary px-3 py-1.5 text-xs font-medium text-white outline-none transition-colors hover:bg-radar-primary/90 focus-visible:ring-2 focus-visible:ring-radar-primary/50 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="rounded-lg border border-radar-light-border px-3 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>
              <p className="text-[11px] text-radar-light-muted dark:text-radar-muted">
                Categories, tags, chains, contracts, social links, provider ids, and governance aren&apos;t editable here yet — read-only below.
              </p>
            </div>
          ) : (
            <p className="text-radar-light-text dark:text-radar-white">{project.description}</p>
          )}

          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            <DetailRow label="Chains" value={project.chains.map(formatLabel).join(", ")} readOnly />
            <DetailRow label="Tags" value={project.tags.length > 0 ? project.tags.map(formatLabel).join(", ") : "—"} readOnly />
            <DetailRow label="Contracts" value={project.contracts.length > 0 ? `${project.contracts.length} registered` : "None registered"} readOnly />
            <DetailRow label="GitHub" value={project.github ? `${project.github.owner}${project.github.repo ? `/${project.github.repo}` : ""}` : "Not configured"} readOnly />
            <DetailRow label="CoinGecko" value={project.providerIds.coingeckoId ?? "Not configured"} readOnly />
            <DetailRow label="DefiLlama" value={project.providerIds.defillamaSlug ?? "Not configured"} readOnly />
            <DetailRow label="Snapshot" value={project.governance?.snapshotSpace ?? "Not configured"} readOnly />
            <DetailRow label="Verification level" value={project.verificationLevel?.level ? formatLabel(project.verificationLevel.level) : "Not computed"} readOnly computed />
            <DetailRow label="Quality score" value={project.qualityScore ? `${project.qualityScore.total}/100` : "Not computed"} readOnly computed />
            <DetailRow label="Lifecycle" value={project.lifecycle?.state ? formatLabel(project.lifecycle.state) : "Active (no lifecycle record)"} readOnly computed />
          </dl>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-radar-light-border bg-radar-light-card px-2.5 py-1.5 text-xs text-radar-light-text outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-radar-bg dark:text-radar-white";

function EditField({ label, invalid, children }: { label: string; invalid?: boolean; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className={`text-[11px] font-medium ${invalid ? "text-radar-danger" : "text-radar-light-muted dark:text-radar-muted"}`}>{label}</span>
      {children}
    </label>
  );
}

function DetailRow({ label, value, readOnly, computed }: { label: string; value: string; readOnly?: boolean; computed?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="w-28 shrink-0 text-radar-light-muted dark:text-radar-muted">
        {label}
        {computed && <span className="ml-1 text-[10px] italic">(computed)</span>}
      </dt>
      <dd className={`min-w-0 truncate ${readOnly ? "text-radar-light-muted dark:text-radar-muted" : "text-radar-light-text dark:text-radar-white"}`}>{value}</dd>
    </div>
  );
}
