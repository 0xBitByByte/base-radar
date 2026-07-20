/**
 * The Account Layer's data model (PR23 Part 1) — a single local account
 * per browser, starting as an auto-created Guest. This is a foundation for
 * a future cloud-sync backend, not a real authentication system: there is
 * no password, no session token, no server-verified identity here — just a
 * profile record persisted to `localStorage`, exactly like every other
 * layer in this app.
 */

export type Account = {
  id: string;
  name: string;
  username: string;
  /** `null` — email is optional, unlike name/username. */
  email: string | null;
  /** A URL, or `null` to fall back to initials derived from `name`. */
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
  /** Stamped once per session at load time — not on every render, to avoid unnecessary storage writes. */
  lastActiveAt: string;
  /** `true` for the auto-created default account and after Sign Out. There is no other account type yet — `createAccount()` is the future-ready seam where a real, non-guest account would be created once a backend exists. */
  isGuest: boolean;
};

/** The subset of `Account` a user can edit via the Profile dialog. */
export type ProfileInput = {
  name: string;
  username: string;
  email: string;
  avatar: string;
};

export type ProfileValidationError = "empty-name" | "empty-username" | "invalid-username" | "invalid-email" | "duplicate-username";
