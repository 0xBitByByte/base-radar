/**
 * PR-095.05 (Activity Logs) — shared by every admin mutation route that
 * records an Activity Log entry (`registry/[projectId]`, `roles/
 * [accountId]`). A real IANA time zone the client reports about itself —
 * validated by attempting to actually construct a formatter with it (the
 * same real check `Intl` itself performs), never trusted as a bare
 * string. An absent or malformed value honestly falls back to UTC rather
 * than persisting a value that could later fail to format.
 */

import type { NextRequest } from "next/server";

const FALLBACK_TIME_ZONE = "UTC";

export function resolveClientTimeZone(request: NextRequest): string {
  const candidate = request.headers.get("x-client-timezone");
  if (!candidate) return FALLBACK_TIME_ZONE;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: candidate });
    return candidate;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}
