import { describe, expect, it } from "vitest";

import { buildProjectSearchIndex, searchLiveProjects } from "@/lib/projects/search";
import { liveProject } from "./fixtures";

describe("searchLiveProjects", () => {
  it("finds a project by name, case-insensitively", () => {
    const project = liveProject({ identity: { ...liveProject().identity, name: "Aerodrome Finance" } });
    const index = buildProjectSearchIndex([project]);
    const results = searchLiveProjects(index, "aerodrome");
    expect(results.map((r) => r.project.id)).toContain(project.id);
  });

  it("finds a project by symbol", () => {
    const project = liveProject({ searchIdentifiers: { ...liveProject().searchIdentifiers, symbol: "AERO" } });
    const index = buildProjectSearchIndex([project]);
    expect(searchLiveProjects(index, "aero").map((r) => r.project.id)).toContain(project.id);
  });

  it("finds a project by slug", () => {
    const project = liveProject({ slug: "aerodrome-finance" });
    const index = buildProjectSearchIndex([project]);
    expect(searchLiveProjects(index, "aerodrome-finance").map((r) => r.project.id)).toContain(project.id);
  });

  it("finds a project by CoinGecko id", () => {
    const project = liveProject({ searchIdentifiers: { ...liveProject().searchIdentifiers, coingeckoId: "aerodrome-finance" } });
    const index = buildProjectSearchIndex([project]);
    expect(searchLiveProjects(index, "aerodrome-finance").map((r) => r.project.id)).toContain(project.id);
  });

  it("finds a project by GitHub owner/repo", () => {
    const project = liveProject({ searchIdentifiers: { ...liveProject().searchIdentifiers, github: "aerodrome-finance/contracts" } });
    const index = buildProjectSearchIndex([project]);
    expect(searchLiveProjects(index, "aerodrome-finance/contracts").map((r) => r.project.id)).toContain(project.id);
  });

  it("finds a project by contract address", () => {
    const project = liveProject({ searchIdentifiers: { ...liveProject().searchIdentifiers, contractAddresses: ["0xabc123"] } });
    const index = buildProjectSearchIndex([project]);
    expect(searchLiveProjects(index, "0xabc123").map((r) => r.project.id)).toContain(project.id);
  });

  it("ranks a name match above a website-only match", () => {
    const nameMatch = liveProject({ id: "name-match", identity: { ...liveProject().identity, name: "swap protocol" } });
    const websiteMatch = liveProject({ id: "website-match", identity: { ...liveProject().identity, websiteUrl: "https://swap-protocol.example" } });
    const index = buildProjectSearchIndex([websiteMatch, nameMatch]);
    const results = searchLiveProjects(index, "swap");
    expect(results[0].project.id).toBe("name-match");
  });

  it("returns no results for an empty query", () => {
    const index = buildProjectSearchIndex([liveProject()]);
    expect(searchLiveProjects(index, "   ")).toEqual([]);
  });

  it("is deterministic", () => {
    const index = buildProjectSearchIndex([liveProject({ id: "a" }), liveProject({ id: "b" })]);
    const first = searchLiveProjects(index, "test");
    const second = searchLiveProjects(index, "test");
    expect(first).toEqual(second);
  });
});
