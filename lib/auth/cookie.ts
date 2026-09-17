/**
 * The one real session cookie this app sets. `httpOnly` means client-side
 * JavaScript can never read or exfiltrate it — the session token is only
 * ever visible to the server, exactly the "do not expose authentication
 * secrets/tokens to client-side JavaScript" requirement. `secure` is
 * conditional on `NODE_ENV === "production"` only because local HTTP dev
 * (`http://localhost:3000`) can't set a `Secure` cookie at all — every
 * real (non-dev) deployment gets it.
 */

export const SESSION_COOKIE_NAME = "br_session";

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
