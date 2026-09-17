import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * PR-098.03 — Finalize Intelligence Score Product Naming. A repository-wide
 * regression guard, not just a single-component test: this app's evidence-
 * based, deterministic 0-100 project score has exactly one user-facing
 * name — "Radar Score" (`lib/intelligence/radarScore.ts`'s
 * `RADAR_SCORE_LABEL`) — and "AI Score" must never silently reappear as UI
 * copy in a new component the way it did once already (`FeaturedProjectTile.tsx`,
 * fixed by this PR). Scans real source files directly rather than relying
 * on any one component's own test remembering to check for it.
 *
 * Deliberately does NOT ban "AI Rating" or "AI Grade" — the separate A+–D
 * letter-grade Scorecard tile (`LiveProject.aiRating`) keeps its own
 * existing names; this PR's naming decision was scoped to "Score", not
 * "Rating"/"Grade" (see `radarScore.ts`'s doc comment for the full
 * reasoning). Banning those here would be exactly the "blindly rename
 * every historical reference" this PR was told not to do.
 */

const SCAN_ROOTS = ["components", "app", "lib"];
const SOURCE_EXTENSIONS = [".ts", ".tsx"];
const BANNED_TERM = "AI Score";

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (!SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) continue;
    if (entry.name.includes(".test.")) continue;
    files.push(fullPath);
  }
  return files;
}

const repoRoot = join(__dirname, "..", "..");
const sourceFiles = SCAN_ROOTS.flatMap((root) => collectSourceFiles(join(repoRoot, root)));

/**
 * Strips comments before checking for the banned term — a PR explaining
 * *why* a rename happened legitimately needs to quote the old copy (this
 * PR's own doc comments do exactly that, e.g. `radarScore.ts`'s own
 * explanation). Only a LIVE occurrence — real rendered/returned UI copy —
 * should ever fail this guard. Not a full parser, just good enough for
 * this codebase's style (no case here of the phrase spanning a
 * comment/code boundary).
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

describe("terminology consistency — Radar Score (PR-098.03)", () => {
  it("scanned a real, non-trivial number of source files (sanity check on the scan itself)", () => {
    expect(sourceFiles.length).toBeGreaterThan(100);
  });

  it('never renders the literal "AI Score" as live code (comments explaining the rename are fine)', () => {
    const offenders = sourceFiles.filter((file) => stripComments(readFileSync(file, "utf8")).includes(BANNED_TERM));
    expect(offenders.map((f) => f.replace(repoRoot + "/", ""))).toEqual([]);
  });

  it('uses "Radar Score" at least once, sourced from the canonical constant', () => {
    const radarScoreFile = join(repoRoot, "lib", "intelligence", "radarScore.ts");
    expect(statSync(radarScoreFile).isFile()).toBe(true);
    const content = readFileSync(radarScoreFile, "utf8");
    expect(content).toContain('"Radar Score"');
  });
});
