import { describe, expect, it } from "vitest";

import { sortLiveProjects } from "@/lib/projects/sort";
import { liveProject } from "./fixtures";

describe("sortLiveProjects", () => {
  it("sorts by confidence descending by default", () => {
    const low = liveProject({ id: "low", confidence: { score: 10, level: "low", source: "intelligence" } });
    const high = liveProject({ id: "high", confidence: { score: 90, level: "high", source: "intelligence" } });
    const result = sortLiveProjects([low, high], "confidence");
    expect(result.map((p) => p.id)).toEqual(["high", "low"]);
  });

  it("sorts ascending when requested", () => {
    const low = liveProject({ id: "low", confidence: { score: 10, level: "low", source: "intelligence" } });
    const high = liveProject({ id: "high", confidence: { score: 90, level: "high", source: "intelligence" } });
    const result = sortLiveProjects([low, high], "confidence", "asc");
    expect(result.map((p) => p.id)).toEqual(["low", "high"]);
  });

  it("always sorts null values last, regardless of direction", () => {
    const withTvl = liveProject({ id: "with", market: { ...liveProject().market, tvlUsd: 100 } });
    const withoutTvl = liveProject({ id: "without", market: { ...liveProject().market, tvlUsd: null } });

    const desc = sortLiveProjects([withoutTvl, withTvl], "tvl", "desc");
    expect(desc.map((p) => p.id)).toEqual(["with", "without"]);

    const asc = sortLiveProjects([withoutTvl, withTvl], "tvl", "asc");
    expect(asc.map((p) => p.id)).toEqual(["with", "without"]);
  });

  it("sorts alphabetically, case-insensitively", () => {
    const b = liveProject({ id: "b", identity: { ...liveProject().identity, name: "banana" } });
    const a = liveProject({ id: "a", identity: { ...liveProject().identity, name: "Apple" } });
    const result = sortLiveProjects([b, a], "alphabetical", "asc");
    expect(result.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("breaks ties on id ascending for a stable order", () => {
    const first = liveProject({ id: "a", confidence: { score: 50, level: "medium", source: "intelligence" } });
    const second = liveProject({ id: "b", confidence: { score: 50, level: "medium", source: "intelligence" } });
    const result = sortLiveProjects([second, first], "confidence");
    expect(result.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("sorts by activity using engineering.commitsLast7d", () => {
    const active = liveProject({ id: "active", engineering: { ...liveProject().engineering, commitsLast7d: 40 } });
    const quiet = liveProject({ id: "quiet", engineering: { ...liveProject().engineering, commitsLast7d: 2 } });
    const result = sortLiveProjects([quiet, active], "activity");
    expect(result.map((p) => p.id)).toEqual(["active", "quiet"]);
  });

  it("is deterministic — repeated calls on the same input produce the same order", () => {
    const projects = [liveProject({ id: "c" }), liveProject({ id: "a" }), liveProject({ id: "b" })];
    const first = sortLiveProjects(projects, "alphabetical");
    const second = sortLiveProjects(projects, "alphabetical");
    expect(first.map((p) => p.id)).toEqual(second.map((p) => p.id));
  });

  it("does not mutate the input array", () => {
    const projects = [liveProject({ id: "b" }), liveProject({ id: "a" })];
    const originalOrder = projects.map((p) => p.id);
    sortLiveProjects(projects, "alphabetical");
    expect(projects.map((p) => p.id)).toEqual(originalOrder);
  });
});
