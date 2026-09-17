/**
 * V4-FUTURE-002B — "Add Download alongside Copy." Same
 * `exportFilenameStamp` convention `lib/report-export/filename.ts`/
 * `lib/portfolio-story/export.ts`/`lib/monthly-digest/export.ts` already
 * established — never a second timestamp-formatting scheme.
 */

import { exportFilenameStamp } from "@/lib/export/markdown";
import type { ShareFormat } from "@/lib/report-share/types";

const EXTENSION: Record<ShareFormat, string> = { markdown: "md", text: "txt", html: "html" };

export function buildShareFilename(format: ShareFormat, generatedAt: string = new Date().toISOString()): string {
  return `base-radar-share-${exportFilenameStamp(generatedAt)}.${EXTENSION[format]}`;
}
