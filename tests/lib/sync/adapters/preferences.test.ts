import { describe, expect, it } from "vitest";

import { PREFERENCES_ENTITY_ID, preferencesSyncAdapter } from "@/lib/sync/adapters/preferences";
import type { PersonalizationPreferences } from "@/lib/personalization/preferences";

function makePreferences(overrides: Partial<PersonalizationPreferences> = {}): PersonalizationPreferences {
  return {
    filterDashboardByActiveWatchlist: true,
    enableSearchPrioritization: true,
    rememberActiveWatchlist: true,
    showWatchlistSelectorInTopbar: true,
    ...overrides,
  };
}

describe("preferencesSyncAdapter", () => {
  it("identifies itself as the preferences entity with a real version number", () => {
    expect(preferencesSyncAdapter.entity).toBe("preferences");
    expect(preferencesSyncAdapter.version()).toBe(1);
  });

  it("validate accepts a real, well-formed preferences object", () => {
    expect(preferencesSyncAdapter.validate(makePreferences())).toBe(true);
  });

  it("validate rejects a value missing a real required field", () => {
    expect(preferencesSyncAdapter.validate({ filterDashboardByActiveWatchlist: true })).toBe(false);
    expect(preferencesSyncAdapter.validate(null)).toBe(false);
  });

  it("serialize/deserialize round-trip real preferences exactly", () => {
    const preferences = makePreferences({ enableSearchPrioritization: false });
    const payload = preferencesSyncAdapter.serialize(preferences);
    expect(preferencesSyncAdapter.deserialize(payload)).toEqual(preferences);
  });

  it("deserialize throws on a payload that fails validation", () => {
    expect(() => preferencesSyncAdapter.deserialize(JSON.stringify({}))).toThrow(/failed validation/);
  });

  it("createOperation always addresses the fixed singleton entityId, not a per-record id", () => {
    const preferences = makePreferences();
    const operation = preferencesSyncAdapter.createOperation("update", PREFERENCES_ENTITY_ID, preferences);
    expect(operation.entity).toBe("preferences");
    expect(operation.entityId).toBe(PREFERENCES_ENTITY_ID);
    expect(preferencesSyncAdapter.deserialize(operation.payload!)).toEqual(preferences);
  });

  it("merge treats the remote version as authoritative by convention — no per-record timestamp to compare", () => {
    const local = makePreferences({ enableSearchPrioritization: true });
    const remote = makePreferences({ enableSearchPrioritization: false });
    expect(preferencesSyncAdapter.merge(local, remote)).toEqual(remote);
  });
});
