// @vitest-environment node
import { describe, expect, it } from "vitest";

import { computeRegistryCoverage } from "@/data/projects/coverage";
import { getProject, getProjects } from "@/data/projects/helpers";
import { computeRegistryMetrics } from "@/data/projects/metrics";
import { validateRegistry } from "@/data/projects/validation";
import { applyProjectEdit, getAdminRegistrySnapshot, revertProjectEdit } from "@/lib/admin/registry";
import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { listActivity } from "@/lib/backend/sqlite/activityLog";
import { createDatabase } from "@/lib/backend/sqlite/db";
import { getProjectEdit } from "@/lib/backend/sqlite/projectEdits";

const ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";
const AERODROME_ID = "aerodrome-finance";
const ACTOR_NAME = "Rin";
const TIME_ZONE = "Asia/Kolkata";

function edit(db: ReturnType<typeof createDatabase>, projectId: string, patch: Record<string, unknown>, accountId: string) {
  return applyProjectEdit(db, projectId, patch, accountId, ACTOR_NAME, TIME_ZONE);
}

function revert(db: ReturnType<typeof createDatabase>, projectId: string, accountId: string) {
  return revertProjectEdit(db, projectId, accountId, ACTOR_NAME, TIME_ZONE);
}

describe("getAdminRegistrySnapshot — no edits on file", () => {
  it("returns the real, current registry unchanged when no project has ever been edited", () => {
    const db = createDatabase(":memory:");
    const snapshot = getAdminRegistrySnapshot(db);
    const realProjects = getProjects();

    expect(snapshot.projects).toEqual(realProjects);
    expect(snapshot.edits).toEqual([]);
    db.close();
  });

  it("metrics/validation/coverage are computed by the real, existing functions — never a second, divergent implementation", () => {
    const db = createDatabase(":memory:");
    const snapshot = getAdminRegistrySnapshot(db);
    const projects = getProjects();

    expect(snapshot.metrics).toEqual(computeRegistryMetrics(projects));
    expect(snapshot.validation).toEqual(validateRegistry(projects));
    expect(snapshot.validation.valid).toBe(true);
    expect(snapshot.coverage).toEqual(computeRegistryCoverage(projects));
    db.close();
  });
});

describe("applyProjectEdit", () => {
  it("a valid edit persists and is returned by the Admin Registry snapshot", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);

    const result = edit(db, AERODROME_ID, { name: "Aerodrome Finance (renamed)" }, account.id);
    expect(result.outcome).toBe("success");

    const snapshot = getAdminRegistrySnapshot(db);
    const edited = snapshot.projects.find((project) => project.id === AERODROME_ID);
    expect(edited?.name).toBe("Aerodrome Finance (renamed)");
    db.close();
  });

  it("the merged state — not the raw seed — is what validation/coverage sees", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);

    edit(db, AERODROME_ID, { categories: ["dex", "yield", "infrastructure"] }, account.id);
    const snapshot = getAdminRegistrySnapshot(db);

    const edited = snapshot.projects.find((project) => project.id === AERODROME_ID)!;
    expect(edited.categories).toEqual(["dex", "yield", "infrastructure"]);
    // Coverage/validation were computed against the same merged array snapshot.projects carries.
    expect(snapshot.coverage).toEqual(computeRegistryCoverage(snapshot.projects));
    expect(snapshot.validation).toEqual(validateRegistry(snapshot.projects));
    db.close();
  });

  it("updated_by is always the server-derived account id passed in — never anything else", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);

    edit(db, AERODROME_ID, { name: "Renamed" }, account.id);
    const projectEdit = getProjectEdit(db, AERODROME_ID);
    expect(projectEdit?.updatedBy).toBe(account.id);
    db.close();
  });

  it("a second edit merges onto the existing real edit rather than discarding it", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);

    edit(db, AERODROME_ID, { name: "Renamed" }, account.id);
    edit(db, AERODROME_ID, { shortDescription: "A new short description." }, account.id);

    const snapshot = getAdminRegistrySnapshot(db);
    const edited = snapshot.projects.find((project) => project.id === AERODROME_ID)!;
    expect(edited.name).toBe("Renamed");
    expect(edited.shortDescription).toBe("A new short description.");
    db.close();
  });

  it("id and slug can never be edited — the whole request is rejected, not silently dropped", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);

    const idResult = edit(db, AERODROME_ID, { id: "hijacked-id" }, account.id);
    expect(idResult.outcome).toBe("rejected-fields");
    if (idResult.outcome === "rejected-fields") expect(idResult.rejectedFields).toContain("id");

    const slugResult = edit(db, AERODROME_ID, { slug: "hijacked-slug" }, account.id);
    expect(slugResult.outcome).toBe("rejected-fields");
    if (slugResult.outcome === "rejected-fields") expect(slugResult.rejectedFields).toContain("slug");

    expect(getProjectEdit(db, AERODROME_ID)).toBeNull();
    db.close();
  });

  it("computed-only fields (verificationLevel, qualityScore, lifecycle) can never be edited", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);

    for (const field of ["verificationLevel", "qualityScore", "lifecycle"]) {
      const result = edit(db, AERODROME_ID, { [field]: { fabricated: true } }, account.id);
      expect(result.outcome).toBe("rejected-fields");
      if (result.outcome === "rejected-fields") expect(result.rejectedFields).toContain(field);
    }
    expect(getProjectEdit(db, AERODROME_ID)).toBeNull();
    db.close();
  });

  it("a merged project that would make the registry genuinely invalid is rejected and never persisted", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);

    const aerodrome = getProject(AERODROME_ID)!;
    const duplicateAddress = aerodrome.contracts[0].address; // a real, already-registered contract address

    const result = edit(db, "uniswap", { contracts: [{ chain: "base", address: duplicateAddress, type: "token" }] }, account.id);

    expect(result.outcome).toBe("validation-failed");
    if (result.outcome === "validation-failed") expect(result.errors.length).toBeGreaterThan(0);
    expect(getProjectEdit(db, "uniswap")).toBeNull(); // never persisted
    db.close();
  });

  it("editing an unknown project id is a real, honest not-found — never a fabricated success", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    const result = edit(db, "not-a-real-project", { name: "x" }, account.id);
    expect(result.outcome).toBe("not-found");
    db.close();
  });

  it("no public registry consumer is affected — the raw, unedited getProjects() output never changes", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    const before = getProjects().find((project) => project.id === AERODROME_ID)!.name;

    edit(db, AERODROME_ID, { name: "Renamed for admins only" }, account.id);

    const after = getProjects().find((project) => project.id === AERODROME_ID)!.name;
    expect(after).toBe(before);
    expect(after).not.toBe("Renamed for admins only");
    db.close();
  });
});

describe("revertProjectEdit", () => {
  it("removes the override and restores the real seed values", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    edit(db, AERODROME_ID, { name: "Temporarily renamed" }, account.id);

    const result = revert(db, AERODROME_ID, account.id);
    expect(result.outcome).toBe("reverted");

    const snapshot = getAdminRegistrySnapshot(db);
    const restored = snapshot.projects.find((project) => project.id === AERODROME_ID)!;
    expect(restored).toEqual(getProject(AERODROME_ID));
    db.close();
  });

  it("reverting a project with no real edit on file is a genuine no-op, never an error", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    const result = revert(db, AERODROME_ID, account.id);
    expect(result.outcome).toBe("no-edit");
    db.close();
  });

  it("reverting an unknown project id is a real, honest not-found", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    const result = revert(db, "not-a-real-project", account.id);
    expect(result.outcome).toBe("not-found");
    db.close();
  });
});

describe("PR-095.05 — Activity Log integration", () => {
  it("a successful edit records exactly one real EDIT activity entry with real before/after values", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS, { name: "Rajkumar" });

    applyProjectEdit(db, AERODROME_ID, { name: "Aerodrome Finance (edited)" }, account.id, "Rajkumar", "Asia/Kolkata");

    const activity = listActivity(db);
    expect(activity).toHaveLength(1);
    const entry = activity[0];
    expect(entry.action).toBe("EDIT");
    expect(entry.entityType).toBe("project");
    expect(entry.entityId).toBe(AERODROME_ID);
    expect(entry.entityName).toBe("Aerodrome Finance (edited)");
    expect(entry.accountId).toBe(account.id);
    expect(entry.actorName).toBe("Rajkumar");
    expect(entry.timeZone).toBe("Asia/Kolkata");
    expect(entry.changes).toEqual([{ field: "name", before: "Aerodrome Finance", after: "Aerodrome Finance (edited)" }]);
    expect(Number.isNaN(Date.parse(entry.createdAt))).toBe(false);
    db.close();
  });

  it("a multi-field edit records every real changed field with its own real before/after value — never losing one to the others", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS, { name: "Rajkumar" });

    applyProjectEdit(
      db,
      AERODROME_ID,
      { name: "Aerodrome Finance (renamed)", shortDescription: "New short description.", status: "beta" },
      account.id,
      "Rajkumar",
      "Asia/Kolkata"
    );

    const [entry] = listActivity(db);
    const fields = entry.changes.map((change) => change.field).sort();
    expect(fields).toEqual(["name", "shortDescription", "status"]);
    const statusChange = entry.changes.find((change) => change.field === "status")!;
    expect(statusChange.before).toBe("live");
    expect(statusChange.after).toBe("beta");
    db.close();
  });

  it("PR-095.07 QA: a field resubmitted with its own real current value is a genuine no-op and is excluded from the recorded changes — never a false modification", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS, { name: "Rajkumar" });

    // "name" is submitted but is byte-for-byte identical to the real seed value; only "status" is a genuine change.
    applyProjectEdit(db, AERODROME_ID, { name: "Aerodrome Finance", status: "beta" }, account.id, "Rajkumar", "Asia/Kolkata");

    const [entry] = listActivity(db);
    expect(entry.changes.map((change) => change.field)).toEqual(["status"]);
    expect(entry.description).not.toContain("name");
    db.close();
  });

  it("PR-095.07 QA: a genuine no-op edit (every submitted field already matches its current value) creates no activity entry at all", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS, { name: "Rajkumar" });

    const result = applyProjectEdit(db, AERODROME_ID, { name: "Aerodrome Finance" }, account.id, "Rajkumar", "Asia/Kolkata");
    expect(result.outcome).toBe("success"); // a valid, honestly-processed request — just with nothing to report
    expect(listActivity(db)).toEqual([]);
    db.close();
  });

  it("PR-095.07 QA: a structurally-equal but newly-constructed array/object value is correctly recognized as unchanged, not a false positive", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS, { name: "Rajkumar" });
    const currentCategories = [...getProject(AERODROME_ID)!.categories]; // a new array, same real contents

    const result = applyProjectEdit(db, AERODROME_ID, { categories: currentCategories, status: "beta" }, account.id, "Rajkumar", "Asia/Kolkata");
    expect(result.outcome).toBe("success");

    const [entry] = listActivity(db);
    expect(entry.changes.map((change) => change.field)).toEqual(["status"]);
    db.close();
  });

  it("a second, later edit to the same project records a distinct real before value reflecting the first edit's real result", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS, { name: "Rajkumar" });

    applyProjectEdit(db, AERODROME_ID, { name: "First rename" }, account.id, "Rajkumar", "Asia/Kolkata");
    applyProjectEdit(db, AERODROME_ID, { name: "Second rename" }, account.id, "Rajkumar", "Asia/Kolkata");

    const activity = listActivity(db);
    expect(activity).toHaveLength(2);
    const secondEdit = activity[0]; // newest first
    const nameChange = secondEdit.changes.find((change) => change.field === "name")!;
    expect(nameChange.before).toBe("First rename"); // the real state right before this second edit, not the original seed
    expect(nameChange.after).toBe("Second rename");
    db.close();
  });

  it("a rejected (disallowed-field) edit never creates an activity entry", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    applyProjectEdit(db, AERODROME_ID, { id: "hijacked" }, account.id, "Rajkumar", "Asia/Kolkata");
    expect(listActivity(db)).toEqual([]);
    db.close();
  });

  it("a validation-failed edit never creates an activity entry", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    const duplicateAddress = getProject(AERODROME_ID)!.contracts[0].address;
    applyProjectEdit(db, "uniswap", { contracts: [{ chain: "base", address: duplicateAddress, type: "token" }] }, account.id, "Rajkumar", "Asia/Kolkata");
    expect(listActivity(db)).toEqual([]);
    db.close();
  });

  it("editing an unknown project never creates an activity entry", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    applyProjectEdit(db, "not-a-real-project", { name: "x" }, account.id, "Rajkumar", "Asia/Kolkata");
    expect(listActivity(db)).toEqual([]);
    db.close();
  });

  it("a real revert records exactly one REVERT activity entry with the real before (edited) and after (seed) values", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS, { name: "Rajkumar" });
    applyProjectEdit(db, AERODROME_ID, { name: "Temporarily renamed" }, account.id, "Rajkumar", "Asia/Kolkata");

    revertProjectEdit(db, AERODROME_ID, account.id, "Rajkumar", "Asia/Kolkata");

    const activity = listActivity(db);
    expect(activity).toHaveLength(2); // the edit + the revert
    const revertEntry = activity[0];
    expect(revertEntry.action).toBe("REVERT");
    expect(revertEntry.entityId).toBe(AERODROME_ID);
    expect(revertEntry.entityName).toBe("Aerodrome Finance"); // the real, restored seed name
    const nameChange = revertEntry.changes.find((change) => change.field === "name")!;
    expect(nameChange.before).toBe("Temporarily renamed");
    expect(nameChange.after).toBe("Aerodrome Finance");
    db.close();
  });

  it("reverting a project with no real edit on file is a genuine no-op and never creates a fabricated activity entry", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    revertProjectEdit(db, AERODROME_ID, account.id, "Rajkumar", "Asia/Kolkata");
    expect(listActivity(db)).toEqual([]);
    db.close();
  });

  it("PR-095.07 QA: a revert still logs the real removal even when a stored edit field happens to already equal the seed value, but excludes that one field from changes", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS, { name: "Rajkumar" });
    // "status" ends up back at its real seed value ("live") after a second edit, while "name" genuinely differs.
    applyProjectEdit(db, AERODROME_ID, { name: "Temporarily renamed", status: "beta" }, account.id, "Rajkumar", "Asia/Kolkata");
    applyProjectEdit(db, AERODROME_ID, { status: "live" }, account.id, "Rajkumar", "Asia/Kolkata");

    revertProjectEdit(db, AERODROME_ID, account.id, "Rajkumar", "Asia/Kolkata");

    const revertEntry = listActivity(db)[0];
    expect(revertEntry.action).toBe("REVERT"); // the edit row removal is still a real, logged action
    const fields = revertEntry.changes.map((change) => change.field);
    expect(fields).toContain("name");
    expect(fields).not.toContain("status"); // already equaled the seed — not a real change
    db.close();
  });

  it("activity entries are returned newest first, matching real chronological insertion order", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS, { name: "Rajkumar" });

    applyProjectEdit(db, AERODROME_ID, { name: "Edit 1" }, account.id, "Rajkumar", "Asia/Kolkata");
    applyProjectEdit(db, "uniswap", { name: "Edit 2" }, account.id, "Rajkumar", "Asia/Kolkata");

    const activity = listActivity(db);
    expect(activity.map((entry) => entry.entityId)).toEqual(["uniswap", "aerodrome-finance"]);
    db.close();
  });
});
