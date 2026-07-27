import { describe, expect, it } from "vitest";

import { matchAgainstRegistry } from "@/lib/discovery/registryMatch";
import { candidate, registryProject } from "./fixtures";

describe("matchAgainstRegistry", () => {
  it("returns 'new' when nothing in the registry matches", () => {
    const result = matchAgainstRegistry(
      candidate({ displayName: "Totally Unrelated", normalizedName: "totally unrelated" }),
      [registryProject({ name: "Some Other Project" })]
    );
    expect(result.type).toBe("new");
    expect(result.project).toBeNull();
  });

  it("returns 'duplicate' when a unique identifier and the name both match", () => {
    const project = registryProject({ id: "aave", name: "Aave", providerIds: { coingeckoId: "aave" } });
    const result = matchAgainstRegistry(candidate({ displayName: "Aave", normalizedName: "aave", coingeckoId: "aave" }), [project]);
    expect(result.type).toBe("duplicate");
    expect(result.project?.id).toBe("aave");
  });

  it("returns 'updated' when a unique identifier matches but the candidate carries new data", () => {
    const project = registryProject({ id: "aave", name: "Aave", providerIds: { coingeckoId: "aave" }, social: {} });
    const result = matchAgainstRegistry(
      candidate({ displayName: "Aave", normalizedName: "aave", coingeckoId: "aave", socials: { twitter: "https://twitter.com/aave" } }),
      [project]
    );
    expect(result.type).toBe("updated");
  });

  it("returns 'renamed' when a unique identifier matches but the name differs", () => {
    const project = registryProject({ id: "aave", name: "Aave", providerIds: { coingeckoId: "aave" } });
    const result = matchAgainstRegistry(candidate({ displayName: "Aave V4 Rebrand", normalizedName: "aave v4 rebrand", coingeckoId: "aave" }), [project]);
    expect(result.type).toBe("renamed");
  });

  it("returns 'alias' when only a secondary signal (website) matches with a different name", () => {
    const project = registryProject({ id: "aave", name: "Aave", websiteUrl: "https://aave.com" });
    const result = matchAgainstRegistry(
      candidate({ displayName: "Aave Labs", normalizedName: "aave labs", website: "https://aave.com" }),
      [project]
    );
    expect(result.type).toBe("alias");
  });

  it("returns 'needs-review' for a bare name-only match", () => {
    const project = registryProject({ id: "test-project", name: "Test Project" });
    const result = matchAgainstRegistry(candidate({ displayName: "Test Project", normalizedName: "test project" }), [project]);
    expect(result.type).toBe("needs-review");
  });

  it("never classifies as duplicate/updated/renamed on a name match alone, even with high candidate confidence", () => {
    const project = registryProject({ id: "test-project", name: "Test Project" });
    const result = matchAgainstRegistry(candidate({ displayName: "Test Project", normalizedName: "test project", confidence: 95 }), [project]);
    expect(["new", "duplicate", "updated", "renamed"]).not.toContain(result.type);
  });

  it("is deterministic — the same inputs always produce the same classification", () => {
    const project = registryProject({ id: "aave", name: "Aave", providerIds: { coingeckoId: "aave" } });
    const input = candidate({ displayName: "Aave", normalizedName: "aave", coingeckoId: "aave" });
    const first = matchAgainstRegistry(input, [project]);
    const second = matchAgainstRegistry(input, [project]);
    expect(first.type).toBe(second.type);
  });
});
