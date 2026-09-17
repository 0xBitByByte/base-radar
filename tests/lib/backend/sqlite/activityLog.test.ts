// @vitest-environment node
import { describe, expect, it } from "vitest";

import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { recordActivity, listActivity } from "@/lib/backend/sqlite/activityLog";
import { createDatabase } from "@/lib/backend/sqlite/db";

const ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";

function baseEntry(overrides: Partial<Parameters<typeof recordActivity>[1]> = {}) {
  return {
    accountId: "acct-1",
    actorName: "Rajkumar",
    action: "EDIT" as const,
    entityType: "project" as const,
    entityId: "aerodrome-finance",
    entityName: "Aerodrome Finance",
    description: "Rajkumar edited Aerodrome Finance — name",
    changes: [{ field: "name", before: "Aerodrome", after: "Aerodrome Finance" }],
    createdAt: new Date().toISOString(),
    timeZone: "Asia/Kolkata",
    ...overrides,
  };
}

describe("activityLog repository", () => {
  it("recordActivity persists a real entry, retrievable by listActivity", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);

    const recorded = recordActivity(db, baseEntry({ accountId: account.id }));
    expect(recorded.id).toBeTruthy();

    const activity = listActivity(db);
    expect(activity).toHaveLength(1);
    expect(activity[0]).toEqual(recorded);
    db.close();
  });

  it("listActivity returns a real, honest empty list when nothing has ever been recorded", () => {
    const db = createDatabase(":memory:");
    expect(listActivity(db)).toEqual([]);
    db.close();
  });

  it("listActivity returns newest first", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);

    recordActivity(db, baseEntry({ accountId: account.id, entityId: "first", createdAt: "2026-01-01T00:00:00.000Z" }));
    recordActivity(db, baseEntry({ accountId: account.id, entityId: "second", createdAt: "2026-01-02T00:00:00.000Z" }));
    recordActivity(db, baseEntry({ accountId: account.id, entityId: "third", createdAt: "2026-01-03T00:00:00.000Z" }));

    const activity = listActivity(db);
    expect(activity.map((entry) => entry.entityId)).toEqual(["third", "second", "first"]);
    db.close();
  });

  it("listActivity respects a real limit", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    for (let i = 0; i < 5; i++) recordActivity(db, baseEntry({ accountId: account.id, entityId: `p-${i}` }));

    expect(listActivity(db, 2)).toHaveLength(2);
    db.close();
  });

  it("preserves real, structured field-level changes exactly, including multiple fields", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    const changes = [
      { field: "name", before: "Aerodrome", after: "Aerodrome Finance" },
      { field: "status", before: "live", after: "beta" },
    ];
    recordActivity(db, baseEntry({ accountId: account.id, changes }));

    expect(listActivity(db)[0].changes).toEqual(changes);
    db.close();
  });

  it("a genuinely corrupted stored changes payload degrades to an honest empty list, never a crash", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    db.prepare(
      `INSERT INTO admin_activity_log (id, account_id, actor_name, action, entity_type, entity_id, entity_name, description, changes, created_at, time_zone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run("corrupt-1", account.id, "Rajkumar", "EDIT", "project", "aerodrome-finance", "Aerodrome Finance", "desc", "{not valid json", new Date().toISOString(), "UTC");

    expect(() => listActivity(db)).not.toThrow();
    expect(listActivity(db)[0].changes).toEqual([]);
    db.close();
  });

  it("does not store any authentication/session secret — only the fields this module's own type declares", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    recordActivity(db, baseEntry({ accountId: account.id }));

    const row = db.prepare("SELECT * FROM admin_activity_log").get() as Record<string, unknown>;
    expect(Object.keys(row).sort()).toEqual(
      ["account_id", "action", "actor_name", "changes", "created_at", "description", "entity_id", "entity_name", "entity_type", "id", "time_zone"].sort()
    );
    db.close();
  });
});
