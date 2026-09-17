import { describe, expect, it } from "vitest";

import { buildShareProfile } from "@/lib/share/build";
import type { ExportSection } from "@/lib/export/sections";

describe("buildShareProfile — reuses the shared renderers verbatim", () => {
  it("markdown/text/html all reflect the same real sections", () => {
    const sections: ExportSection[] = [{ title: "Overview", rows: [{ label: "Snapshots", value: "3" }] }];
    const profile = buildShareProfile({ title: "T", summary: "S", description: "D", sections, generatedAt: "2026-09-06T00:00:00.000Z" });
    expect(profile.markdown).toContain("Snapshots");
    expect(profile.text).toContain("Snapshots");
    expect(profile.html).toContain("Snapshots");
    expect(profile.title).toBe("T");
    expect(profile.summary).toBe("S");
    expect(profile.description).toBe("D");
  });
});

describe("buildShareProfile — stats.sectionsIncluded counts only sections with real rows", () => {
  it("a section with zero rows is never counted as included", () => {
    const sections: ExportSection[] = [
      { title: "A", rows: [{ label: "x", value: "y" }] },
      { title: "B (empty)", rows: [] },
      { title: "C", rows: [{ label: "x", value: "y" }] },
    ];
    const profile = buildShareProfile({ title: "T", summary: "S", description: "D", sections, generatedAt: "2026-09-06T00:00:00.000Z" });
    expect(profile.stats.sectionsIncluded).toBe(2);
  });

  it("zero sections with rows still produces sectionsIncluded 0 — the title/timestamp line alone never counts as an included section, but does contribute a few real words", () => {
    const profile = buildShareProfile({ title: "T", summary: "S", description: "D", sections: [{ title: "Empty", rows: [] }], generatedAt: "2026-09-06T00:00:00.000Z" });
    expect(profile.stats.sectionsIncluded).toBe(0);
    expect(profile.stats.wordCount).toBe(profile.text.trim().split(/\s+/).length);
    expect(profile.stats.estimatedReadingMinutes).toBe(1);
  });
});

describe("buildShareProfile — stats.wordCount is computed from plain TEXT, never markdown/HTML syntax", () => {
  it("counts real words, not markdown heading/bullet characters", () => {
    const sections: ExportSection[] = [{ title: "Overview", rows: [{ label: "Net Change", value: "positive this period" }] }];
    const profile = buildShareProfile({ title: "Base Radar Report", summary: "", description: "", sections, generatedAt: "2026-09-06T00:00:00.000Z" });
    // Real word count of the plain-text rendering — asserted against the TEXT renderer's own output, never a hardcoded guess.
    const expectedWordCount = profile.text.trim().split(/\s+/).length;
    expect(profile.stats.wordCount).toBe(expectedWordCount);
    expect(profile.stats.wordCount).toBeGreaterThan(0);
  });
});

describe("buildShareProfile — stats.estimatedReadingMinutes: ceil(wordCount / 200), minimum 1 when non-zero", () => {
  it("a small real word count still reports 1 minute, never 0", () => {
    const sections: ExportSection[] = [{ title: "Overview", rows: [{ label: "Snapshots", value: "3" }] }];
    const profile = buildShareProfile({ title: "T", summary: "", description: "", sections, generatedAt: "2026-09-06T00:00:00.000Z" });
    expect(profile.stats.wordCount).toBeGreaterThan(0);
    expect(profile.stats.estimatedReadingMinutes).toBe(1);
  });

  it("just over 200 real words rounds up to 2 minutes", () => {
    const longValue = Array.from({ length: 205 }, (_, i) => `word${i}`).join(" ");
    const sections: ExportSection[] = [{ title: "Overview", rows: [{ label: "Long", value: longValue }] }];
    const profile = buildShareProfile({ title: "T", summary: "", description: "", sections, generatedAt: "2026-09-06T00:00:00.000Z" });
    expect(profile.stats.estimatedReadingMinutes).toBe(2);
  });
});

describe("buildShareProfile — DETERMINISM", () => {
  it("identical input produces a deep-equal profile", () => {
    const sections: ExportSection[] = [{ title: "Overview", rows: [{ label: "Snapshots", value: "3" }] }];
    const a = buildShareProfile({ title: "T", summary: "S", description: "D", sections, generatedAt: "2026-09-06T00:00:00.000Z" });
    const b = buildShareProfile({ title: "T", summary: "S", description: "D", sections, generatedAt: "2026-09-06T00:00:00.000Z" });
    expect(a).toEqual(b);
  });
});
