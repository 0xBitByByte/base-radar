/**
 * PR-095.02/PR-095.03 (Project Registry / Project Editor) — real
 * aggregation over the Project Registry (`data/projects/`) for the Admin
 * Registry surface, now including the real, persisted admin override
 * layer (`project_edits`).
 *
 * The registry itself is a **statically-defined, compile-time TypeScript
 * dataset** (`data/projects/seed/*.ts`, aggregated into `SEED_PROJECTS`) —
 * see `docs/PROJECT_REGISTRY.md`'s own opening line: "The Project Registry
 * is the canonical, statically-defined list of Base ecosystem projects."
 * PR-095.03's approved architecture deliberately does not change that: an
 * admin edit is stored as a real, separate patch in `project_edits`
 * (`lib/backend/sqlite/projectEdits.ts`), merged onto the static base
 * ONLY for this admin-facing snapshot. `data/projects/helpers.ts` and
 * every one of its ~44 real call sites (7 of them client components —
 * `data/projects/helpers.ts` is bundled into client JavaScript and can
 * never import `node:sqlite`) are untouched — the public Explorer/Project
 * Profile continue reading the unedited static seed, exactly as before
 * this PR.
 *
 * `computeRegistryMetrics`, `validateRegistry`, `computeRegistryCoverage`
 * are the same real, pre-existing, already-tested functions PR-095.02
 * used — this module still invents no new computation, it only feeds
 * them the merged (seed + edit) project list instead of the raw seed.
 */

import type { DatabaseSync } from "node:sqlite";
import { isDeepStrictEqual } from "node:util";

import { getProject, getProjects } from "@/data/projects/helpers";
import { computeRegistryCoverage, type RegistryCoverageReport } from "@/data/projects/coverage";
import { computeRegistryMetrics, type RegistryMetrics } from "@/data/projects/metrics";
import { validateRegistry, type RegistryValidationReport, type ValidationIssue } from "@/data/projects/validation";
import type { Project } from "@/data/projects/types";
import { clearProjectEdit, getProjectEdit, listProjectEdits, upsertProjectEdit, type ProjectEditRecord } from "@/lib/backend/sqlite/projectEdits";
import { recordActivity, type ActivityFieldChange } from "@/lib/backend/sqlite/activityLog";

export type AdminRegistrySnapshot = {
  metrics: RegistryMetrics;
  validation: RegistryValidationReport;
  coverage: RegistryCoverageReport;
  projects: Project[];
  /** Every real, persisted edit on file — the UI's signal for which projects have a pending admin override and who/when made it. */
  edits: ProjectEditRecord[];
};

/**
 * PR-095.03 — fields a real admin PATCH may ever touch. Deliberately
 * excludes `id`/`slug` (the registry's own stable identity — "never
 * reused or renamed," `data/projects/types.ts`'s own words) and
 * `lifecycle`/`verificationLevel`/`qualityScore` (computed-only fields —
 * "Computed by a future scoring pass, never hand-authored," same file).
 * This is the one real gate a client-supplied field name is checked
 * against — never inferred, never partial.
 */
export const EDITABLE_PROJECT_FIELDS = [
  "name",
  "shortDescription",
  "description",
  "logoUrl",
  "websiteUrl",
  "categories",
  "tags",
  "status",
  "chains",
  "contracts",
  "github",
  "social",
  "verification",
  "providerIds",
  "governance",
] as const satisfies readonly (keyof Project)[];

export type EditableProjectField = (typeof EDITABLE_PROJECT_FIELDS)[number];

const EDITABLE_FIELD_SET = new Set<string>(EDITABLE_PROJECT_FIELDS);

/** Real, honest merge — an edit's own fields win over the seed's, field by field; a project with no real edit on file is returned completely unchanged (same object identity is not preserved, but every value is). */
function mergeProjectWithEdit(project: Project, edit: ProjectEditRecord | null): Project {
  if (!edit) return project;
  return { ...project, ...edit.fields };
}

function buildMergedProjects(db: DatabaseSync): { projects: Project[]; edits: ProjectEditRecord[] } {
  const edits = listProjectEdits(db);
  const editsByProjectId = new Map(edits.map((edit) => [edit.projectId, edit]));
  const projects = getProjects().map((project) => mergeProjectWithEdit(project, editsByProjectId.get(project.id) ?? null));
  return { projects, edits };
}

export function getAdminRegistrySnapshot(db: DatabaseSync): AdminRegistrySnapshot {
  const { projects, edits } = buildMergedProjects(db);
  return {
    metrics: computeRegistryMetrics(projects),
    validation: validateRegistry(projects),
    coverage: computeRegistryCoverage(projects),
    projects,
    edits,
  };
}

export type ApplyProjectEditResult =
  | { outcome: "not-found" }
  | { outcome: "rejected-fields"; rejectedFields: string[] }
  | { outcome: "validation-failed"; errors: ValidationIssue[] }
  | { outcome: "success"; project: Project };

/** A real object's own field, read generically — `Project`'s fields are a fixed, known shape, but this helper is reused across dynamic field names collected at runtime (the patch's own keys). */
function fieldValue(project: Project, field: string): unknown {
  return (project as unknown as Record<string, unknown>)[field];
}

/**
 * PR-095.05/PR-095.07 — real, structural equality (not `!==`), since a
 * submitted field's value is very often an array or nested object
 * (`contracts`, `categories`, `social`, `providerIds`, ...) that can be a
 * genuinely new value with identical contents (e.g. a client resubmitting
 * a field it didn't actually change as part of a larger multi-field
 * patch). A reference check would wrongly log that field as "modified"
 * even though nothing about its real value differs — exactly the false
 * "unchanged field logged as a modification" this PR's own brief
 * prohibits.
 */
function fieldsDiffer(before: unknown, after: unknown): boolean {
  return !isDeepStrictEqual(before, after);
}

/**
 * PR-095.03 — the one real write path. `patch` is exactly what the caller
 * (`app/api/admin/registry/[projectId]/route.ts`) received in the request
 * body, already known to be a plain object but NOT yet known to contain
 * only real, editable fields — that check happens here, atomically: any
 * disallowed key rejects the entire request, never a silent partial
 * apply of only the allowed subset (a client should always get an
 * honest "this exact field isn't editable" answer, never a save that
 * quietly dropped part of what it asked for).
 *
 * A new edit is merged onto any existing real edit for this project
 * (never replacing a previously-saved field the caller didn't resubmit
 * this time), then validated as part of the FULL, real, merged registry
 * — not the one project in isolation — so a candidate edit that would
 * introduce a genuine cross-project conflict (a duplicate contract
 * address, a duplicate CoinGecko id, etc.) is rejected exactly the same
 * way `validateRegistry()` already rejects one in the static seed today.
 * Nothing is persisted unless validation genuinely passes.
 *
 * PR-095.05 — on a genuine success, records one real Activity Log entry
 * (`recordActivity`) with the real, server-computed before/after value
 * for exactly the fields this call actually changed (`patch`'s own keys,
 * never the whole accumulated edit) — never on a rejected/failed
 * request, so a validation failure or a disallowed-field attempt can
 * never produce a false "this succeeded" audit trail. `actorAccountId`/
 * `actorName` are always the caller's own already-resolved, server-
 * derived admin identity — this function never accepts an identity
 * argument sourced from the request body.
 */
export function applyProjectEdit(
  db: DatabaseSync,
  projectId: string,
  patch: Record<string, unknown>,
  actorAccountId: string,
  actorName: string,
  timeZone: string
): ApplyProjectEditResult {
  const seedProject = getProject(projectId);
  if (!seedProject) return { outcome: "not-found" };

  const rejectedFields = Object.keys(patch).filter((field) => !EDITABLE_FIELD_SET.has(field));
  if (rejectedFields.length > 0) return { outcome: "rejected-fields", rejectedFields };

  const existingEdit = getProjectEdit(db, projectId);
  const mergedPatch: Partial<Project> = { ...existingEdit?.fields, ...patch };
  const candidateProject: Project = { ...seedProject, ...mergedPatch };

  const { projects: currentMergedRegistry } = buildMergedProjects(db);
  const beforeProject = currentMergedRegistry.find((project) => project.id === projectId) ?? seedProject;
  const candidateRegistry = currentMergedRegistry.map((project) => (project.id === projectId ? candidateProject : project));

  const validation = validateRegistry(candidateRegistry);
  if (validation.errors.length > 0) return { outcome: "validation-failed", errors: validation.errors };

  upsertProjectEdit(db, projectId, mergedPatch, actorAccountId);

  // Only fields whose real value genuinely differs are ever logged — a
  // field resubmitted with its own current value (common in a
  // multi-field patch where only some fields actually changed) is a real
  // no-op for that field and must never appear as a false modification.
  const changes: ActivityFieldChange[] = Object.keys(patch)
    .map((field) => ({ field, before: fieldValue(beforeProject, field), after: fieldValue(candidateProject, field) }))
    .filter((change) => fieldsDiffer(change.before, change.after));

  // If every submitted field turned out to be a real no-op, nothing
  // genuinely changed — the same "no real change → no audit entry"
  // principle this codebase already applies to a no-op role change
  // (`lib/admin/roles.ts`) and a no-edit revert below.
  if (changes.length > 0) {
    recordActivity(db, {
      accountId: actorAccountId,
      actorName,
      action: "EDIT",
      entityType: "project",
      entityId: projectId,
      entityName: candidateProject.name,
      description: `${actorName} edited ${candidateProject.name} — ${changes.map((change) => change.field).join(", ")}`,
      changes,
      createdAt: new Date().toISOString(),
      timeZone,
    });
  }

  return { outcome: "success", project: candidateProject };
}

export type RevertProjectEditResult = { outcome: "reverted" | "no-edit" } | { outcome: "not-found" };

/**
 * Real revert — removes the entire stored patch, restoring the seed
 * project's own values exactly. A project with no real edit on file
 * reverts as a genuine no-op, never an error — and, per PR-095.05,
 * never produces an Activity Log entry either (nothing real actually
 * happened, so nothing real is recorded).
 */
export function revertProjectEdit(db: DatabaseSync, projectId: string, actorAccountId: string, actorName: string, timeZone: string): RevertProjectEditResult {
  const seedProject = getProject(projectId);
  if (!seedProject) return { outcome: "not-found" };

  const existingEdit = getProjectEdit(db, projectId);
  const removed = clearProjectEdit(db, projectId);
  if (!removed) return { outcome: "no-edit" };

  if (existingEdit) {
    const beforeProject: Project = { ...seedProject, ...existingEdit.fields };
    // Same real-change filter as `applyProjectEdit` — a stored edit field
    // that happens to already equal the seed's own value (e.g. it was
    // explicitly re-set back to the seed value in a later edit) is a
    // genuine no-op for that one field, even though removing the edit
    // row itself is still a real action worth logging.
    const changes: ActivityFieldChange[] = Object.keys(existingEdit.fields)
      .map((field) => ({ field, before: fieldValue(beforeProject, field), after: fieldValue(seedProject, field) }))
      .filter((change) => fieldsDiffer(change.before, change.after));
    recordActivity(db, {
      accountId: actorAccountId,
      actorName,
      action: "REVERT",
      entityType: "project",
      entityId: projectId,
      entityName: seedProject.name,
      description: `${actorName} reverted ${seedProject.name} to its real registry values`,
      changes,
      createdAt: new Date().toISOString(),
      timeZone,
    });
  }

  return { outcome: "reverted" };
}
