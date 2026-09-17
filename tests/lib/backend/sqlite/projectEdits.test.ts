// @vitest-environment node
import { describe, expect, it } from "vitest";

import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { createDatabase } from "@/lib/backend/sqlite/db";
import { clearProjectEdit, getProjectEdit, listProjectEdits, upsertProjectEdit } from "@/lib/backend/sqlite/projectEdits";

const ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";

describe("projectEdits repository", () => {
  it("getProjectEdit returns null for a project with no real edit on file", () => {
    const db = createDatabase(":memory:");
    expect(getProjectEdit(db, "aerodrome-finance")).toBeNull();
    db.close();
  });

  it("upsertProjectEdit persists a real edit, retrievable by getProjectEdit", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);

    upsertProjectEdit(db, "aerodrome-finance", { name: "Aerodrome Finance (edited)" }, account.id);
    const edit = getProjectEdit(db, "aerodrome-finance");

    expect(edit).not.toBeNull();
    expect(edit?.fields).toEqual({ name: "Aerodrome Finance (edited)" });
    expect(edit?.updatedBy).toBe(account.id);
    db.close();
  });

  it("upsertProjectEdit replaces the stored patch on a second real call for the same project", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);

    upsertProjectEdit(db, "aerodrome-finance", { name: "First edit" }, account.id);
    upsertProjectEdit(db, "aerodrome-finance", { name: "Second edit" }, account.id);

    const edit = getProjectEdit(db, "aerodrome-finance");
    expect(edit?.fields).toEqual({ name: "Second edit" });
    db.close();
  });

  it("listProjectEdits returns every real edit on file", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);

    upsertProjectEdit(db, "aerodrome-finance", { name: "A" }, account.id);
    upsertProjectEdit(db, "uniswap", { name: "B" }, account.id);

    const edits = listProjectEdits(db);
    expect(edits).toHaveLength(2);
    expect(edits.map((edit) => edit.projectId).sort()).toEqual(["aerodrome-finance", "uniswap"]);
    db.close();
  });

  it("clearProjectEdit removes a real edit and reports it was removed", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    upsertProjectEdit(db, "aerodrome-finance", { name: "A" }, account.id);

    expect(clearProjectEdit(db, "aerodrome-finance")).toBe(true);
    expect(getProjectEdit(db, "aerodrome-finance")).toBeNull();
    db.close();
  });

  it("clearProjectEdit is a real, honest no-op for a project with no edit on file", () => {
    const db = createDatabase(":memory:");
    expect(clearProjectEdit(db, "aerodrome-finance")).toBe(false);
    db.close();
  });

  it("a genuinely corrupted stored patch is handled safely — never a crash, never a fabricated partial edit", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    db.prepare("INSERT INTO project_edits (project_id, fields, updated_at, updated_by) VALUES (?, ?, ?, ?)").run(
      "aerodrome-finance",
      "{not valid json at all",
      new Date().toISOString(),
      account.id
    );

    expect(() => getProjectEdit(db, "aerodrome-finance")).not.toThrow();
    expect(getProjectEdit(db, "aerodrome-finance")).toBeNull();
    expect(() => listProjectEdits(db)).not.toThrow();
    expect(listProjectEdits(db)).toEqual([]);
    db.close();
  });

  it("a stored patch that isn't a real JSON object (e.g. an array or a primitive) is treated the same as corrupted — never surfaced as a real edit", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    db.prepare("INSERT INTO project_edits (project_id, fields, updated_at, updated_by) VALUES (?, ?, ?, ?)").run(
      "aerodrome-finance",
      JSON.stringify(["not", "an", "object"]),
      new Date().toISOString(),
      account.id
    );

    expect(getProjectEdit(db, "aerodrome-finance")).toBeNull();
    db.close();
  });
});
