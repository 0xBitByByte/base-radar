import type { Project } from "@/data/projects/types";
import type { CandidateProject } from "@/lib/discovery/types";

export function candidate(overrides: Partial<CandidateProject> = {}): CandidateProject {
  return {
    source: "coingecko",
    externalId: "test-coin",
    normalizedName: "test project",
    displayName: "Test Project",
    socials: {},
    contracts: [],
    discoveredAt: "2026-01-01T00:00:00.000Z",
    confidence: 60,
    providerMetadata: {},
    ...overrides,
  };
}

export function registryProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "test-project",
    slug: "test-project",
    name: "Test Project",
    shortDescription: "A test project.",
    description: "A test project used only in unit tests.",
    websiteUrl: "https://test-project.example",
    categories: ["dex"],
    tags: [],
    status: "live",
    chains: ["base"],
    contracts: [],
    social: {},
    verification: { status: "verified" },
    providerIds: {},
    ...overrides,
  };
}
