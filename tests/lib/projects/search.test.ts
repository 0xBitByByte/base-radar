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

  describe("website hostname (PR-056)", () => {
    it("finds a project by its bare hostname even though the stored URL has a protocol", () => {
      const project = liveProject({ identity: { ...liveProject().identity, websiteUrl: "https://aerodrome.finance" } });
      const index = buildProjectSearchIndex([project]);
      expect(searchLiveProjects(index, "aerodrome.finance").map((r) => r.project.id)).toContain(project.id);
    });

    it("strips a www prefix so the hostname matches regardless of subdomain noise", () => {
      const project = liveProject({ identity: { ...liveProject().identity, websiteUrl: "https://www.aerodrome.finance/" } });
      const index = buildProjectSearchIndex([project]);
      expect(searchLiveProjects(index, "aerodrome.finance").map((r) => r.project.id)).toContain(project.id);
    });

    it("matches a hostname even when the URL carries a path or query string", () => {
      const project = liveProject({ identity: { ...liveProject().identity, websiteUrl: "https://aerodrome.finance/swap?from=eth" } });
      const index = buildProjectSearchIndex([project]);
      expect(searchLiveProjects(index, "aerodrome.finance").map((r) => r.project.id)).toContain(project.id);
    });

    it("matches a protocol-less website value", () => {
      const project = liveProject({ identity: { ...liveProject().identity, websiteUrl: "aerodrome.finance" } });
      const index = buildProjectSearchIndex([project]);
      expect(searchLiveProjects(index, "aerodrome.finance").map((r) => r.project.id)).toContain(project.id);
    });

    it("ranks a hostname match above a raw full-URL substring match on a different project", () => {
      // Both candidates only match via their website field; the hostname-carrying one should win.
      const hostnameMatch = liveProject({
        id: "hostname-match",
        identity: { ...liveProject().identity, name: "Alpha", websiteUrl: "https://uniquehost.example" },
      });
      const pathOnlyMatch = liveProject({
        id: "path-only-match",
        identity: { ...liveProject().identity, name: "Beta", websiteUrl: "https://other.example/uniquehost" },
      });
      const index = buildProjectSearchIndex([pathOnlyMatch, hostnameMatch]);
      const results = searchLiveProjects(index, "uniquehost");
      expect(results[0].project.id).toBe("hostname-match");
    });

    it("still ranks a name match above a hostname match", () => {
      const nameMatch = liveProject({ id: "name-match", identity: { ...liveProject().identity, name: "portal protocol" } });
      const hostnameMatch = liveProject({ id: "hostname-match", identity: { ...liveProject().identity, websiteUrl: "https://portal.example" } });
      const index = buildProjectSearchIndex([hostnameMatch, nameMatch]);
      expect(searchLiveProjects(index, "portal")[0].project.id).toBe("name-match");
    });

    it("never throws when websiteUrl is null", () => {
      const project = liveProject({ identity: { ...liveProject().identity, websiteUrl: null } });
      const index = buildProjectSearchIndex([project]);
      expect(() => searchLiveProjects(index, "anything")).not.toThrow();
    });
  });

  describe("edge cases (PR-056)", () => {
    it("returns no results when nothing in the index matches", () => {
      const index = buildProjectSearchIndex([liveProject({ identity: { ...liveProject().identity, name: "Aerodrome Finance" } })]);
      expect(searchLiveProjects(index, "zzz-nonexistent-zzz")).toEqual([]);
    });

    it("does not perform fuzzy or typo-tolerant matching", () => {
      const project = liveProject({ identity: { ...liveProject().identity, name: "Aerodrome Finance" } });
      const index = buildProjectSearchIndex([project]);
      // "Aerodrone" (typo) should not match "Aerodrome" — substring-only, deterministic.
      expect(searchLiveProjects(index, "aerodrone")).toEqual([]);
    });

    it("matches a real alias produced by a Discovery rename/alias signal", () => {
      const project = liveProject({ searchIdentifiers: { ...liveProject().searchIdentifiers, aliases: ["Old Name Inc"] } });
      const index = buildProjectSearchIndex([project]);
      expect(searchLiveProjects(index, "old name").map((r) => r.project.id)).toContain(project.id);
    });

    it("handles an empty project list without error", () => {
      const index = buildProjectSearchIndex([]);
      expect(searchLiveProjects(index, "anything")).toEqual([]);
    });

    it("breaks a tied score by project id ascending", () => {
      const b = liveProject({ id: "b", identity: { ...liveProject().identity, name: "Match" } });
      const a = liveProject({ id: "a", identity: { ...liveProject().identity, name: "Match" } });
      const index = buildProjectSearchIndex([b, a]);
      expect(searchLiveProjects(index, "match").map((r) => r.project.id)).toEqual(["a", "b"]);
    });
  });
});
