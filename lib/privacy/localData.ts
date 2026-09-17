/**
 * PR-093.06 (Security) — the one honestly-buildable local-data-privacy
 * capability in an app with no backend, no session, and no device layer
 * (confirmed absent during this PR's own audit — see
 * `components/account/ProfilePage.tsx`'s own "no auth/session/device layer
 * exists" comment). Real MFA, session revocation, and device management
 * all require a server to be meaningful and are deliberately NOT built
 * here. What IS honestly real: every piece of Base Radar's local state
 * lives in `window.localStorage` under a real, universal `"base-radar:"`
 * key prefix (confirmed by inspecting every storage module in this
 * codebase — Account, Personalization/Watchlists, all four Preferences
 * modules, Sync, AI Watch, Compare, Portfolio Monitoring, Wallet History,
 * Wallet/Guided-Review Automation state, Recently Viewed) — so this module
 * can genuinely introspect and clear exactly that, and only that, without
 * hardcoding a key list that would silently go stale as new features add
 * their own storage.
 *
 * Deliberately excludes `wagmi`'s own connection-state key and
 * `next-themes`' own theme key — clearing "Base Radar's local data" must
 * never silently disconnect a wallet or reset the theme, two genuinely
 * separate concerns this action should not surprise a user with.
 */

const BASE_RADAR_KEY_PREFIX = "base-radar:";

export type LocalDataEntry = {
  key: string;
  /** Raw, already-serialized byte length of the stored value — a real, measured fact, never estimated. */
  sizeBytes: number;
};

/** Real, current keys/sizes — introspected live, never a hardcoded or possibly-stale list. Sorted alphabetically for a stable, readable display order. */
export function listLocalDataEntries(): LocalDataEntry[] {
  if (typeof window === "undefined") return [];
  const entries: LocalDataEntry[] = [];
  for (const key of Object.keys(window.localStorage)) {
    if (!key.startsWith(BASE_RADAR_KEY_PREFIX)) continue;
    const value = window.localStorage.getItem(key) ?? "";
    entries.push({ key, sizeBytes: new Blob([value]).size });
  }
  return entries.sort((a, b) => a.key.localeCompare(b.key));
}

export function getTotalLocalDataSizeBytes(): number {
  return listLocalDataEntries().reduce((sum, entry) => sum + entry.sizeBytes, 0);
}

/**
 * Removes every real `"base-radar:"`-prefixed key currently in
 * `localStorage` — a genuine, irreversible local reset (profile,
 * watchlists, preferences, AI Watch/Portfolio Monitoring state, Compare
 * list, wallet history, everything). Returns the real keys that were
 * removed, for honest UI confirmation — never a fabricated "all clear"
 * when nothing was actually there. Callers are responsible for their own
 * confirmation UI; this function performs no confirmation itself.
 */
export function clearAllLocalData(): string[] {
  if (typeof window === "undefined") return [];
  const keys = Object.keys(window.localStorage).filter((key) => key.startsWith(BASE_RADAR_KEY_PREFIX));
  for (const key of keys) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Best-effort per key — a single failure never aborts clearing the rest.
    }
  }
  return keys;
}
