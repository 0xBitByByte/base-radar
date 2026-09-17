import { beforeEach, describe, expect, it, vi } from "vitest";

import { SnapshotGovernanceProvider } from "@/lib/governance/snapshot-provider";
import type { GovernanceProjectRef } from "@/lib/governance/types";
import * as snapshotService from "@/lib/providers/snapshot/service";
import type { SnapshotProposal } from "@/lib/providers/snapshot/service";
import type { ProviderName } from "@/lib/providers/common/types";

// Matches `lib/providers/snapshot/service.ts`'s own `PROVIDER_TAG` cast —
// "snapshot" is a real provider but is not (yet) part of the shared
// `PROVIDER_NAMES` union in `common/types.ts`, a pre-existing gap unrelated
// to this PR's fix.
const SNAPSHOT_PROVIDER = "snapshot" as ProviderName;

/**
 * PR-106 — regression coverage for the N+1 fix: `fetchEvents` must issue
 * exactly ONE `getProposalsForSpaces` call regardless of how many projects
 * are requested, never one `getProposals` call per project. No test file
 * existed for this module before this PR.
 */

vi.mock("@/lib/providers/snapshot/service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/providers/snapshot/service")>("@/lib/providers/snapshot/service");
  return { ...actual, getProposals: vi.fn(), getProposalsForSpaces: vi.fn() };
});

function proposal(overrides: Partial<SnapshotProposal> = {}): SnapshotProposal {
  return {
    id: "prop-1",
    title: "Test Proposal",
    description: "A real description",
    status: "active",
    start: "2026-01-01T00:00:00Z",
    end: "2026-01-08T00:00:00Z",
    participation: 1000,
    quorumMet: true,
    url: "https://snapshot.org/#/space/proposal/prop-1",
    voterCount: 42,
    discussionUrl: null,
    proposerAddress: "0xabc",
    ...overrides,
  };
}

function projectRef(id: string, space: string): GovernanceProjectRef {
  return { projectId: id, projectName: id, snapshotSpace: space };
}

beforeEach(() => {
  vi.mocked(snapshotService.getProposals).mockReset();
  vi.mocked(snapshotService.getProposalsForSpaces).mockReset();
});

describe("SnapshotGovernanceProvider.fetchEvents — batched (PR-106)", () => {
  it("is empty and makes no calls when no projects are requested", async () => {
    const provider = new SnapshotGovernanceProvider();
    const events = await provider.fetchEvents({ projects: [] });
    expect(events).toEqual([]);
    expect(snapshotService.getProposalsForSpaces).not.toHaveBeenCalled();
  });

  it("makes exactly ONE getProposalsForSpaces call for N projects — never N individual getProposals calls (the N+1 this PR fixes)", async () => {
    vi.mocked(snapshotService.getProposalsForSpaces).mockResolvedValue({
      ok: true,
      data: {
        "aave.eth": [proposal({ id: "aave-1" })],
        "compound-finance.eth": [proposal({ id: "compound-1" })],
        "morpho.eth": [],
      },
      source: SNAPSHOT_PROVIDER,
      fetchedAt: new Date().toISOString(),
    });

    const provider = new SnapshotGovernanceProvider();
    const events = await provider.fetchEvents({
      projects: [projectRef("aave", "aave.eth"), projectRef("compound", "compound-finance.eth"), projectRef("morpho", "morpho.eth")],
    });

    expect(snapshotService.getProposalsForSpaces).toHaveBeenCalledTimes(1);
    expect(snapshotService.getProposalsForSpaces).toHaveBeenCalledWith(["aave.eth", "compound-finance.eth", "morpho.eth"]);
    expect(snapshotService.getProposals).not.toHaveBeenCalled();
    expect(events).toHaveLength(2);
  });

  it("tags each event with the correct project — proposals never leak across projects", async () => {
    vi.mocked(snapshotService.getProposalsForSpaces).mockResolvedValue({
      ok: true,
      data: {
        "space-a": [proposal({ id: "a-1" })],
        "space-b": [proposal({ id: "b-1" }), proposal({ id: "b-2" })],
      },
      source: SNAPSHOT_PROVIDER,
      fetchedAt: new Date().toISOString(),
    });

    const provider = new SnapshotGovernanceProvider();
    const events = await provider.fetchEvents({
      projects: [projectRef("proj-a", "space-a"), projectRef("proj-b", "space-b")],
    });

    const forA = events.filter((e) => e.projectId === "proj-a");
    const forB = events.filter((e) => e.projectId === "proj-b");
    expect(forA).toHaveLength(1);
    expect(forA[0].proposalId).toBe("a-1");
    expect(forB).toHaveLength(2);
    expect(forB.map((e) => e.proposalId).sort()).toEqual(["b-1", "b-2"]);
  });

  it("a project whose space is absent from the batch result contributes zero events, never an error", async () => {
    vi.mocked(snapshotService.getProposalsForSpaces).mockResolvedValue({
      ok: true,
      data: { "space-a": [proposal()] }, // "space-missing" not present in the response at all
      source: SNAPSHOT_PROVIDER,
      fetchedAt: new Date().toISOString(),
    });

    const provider = new SnapshotGovernanceProvider();
    const events = await provider.fetchEvents({
      projects: [projectRef("proj-a", "space-a"), projectRef("proj-missing", "space-missing")],
    });

    expect(events.filter((e) => e.projectId === "proj-missing")).toEqual([]);
    expect(events.filter((e) => e.projectId === "proj-a")).toHaveLength(1);
  });

  it("degrades to an empty list — never fabricated, never throws — when the whole batch call fails", async () => {
    vi.mocked(snapshotService.getProposalsForSpaces).mockResolvedValue({
      ok: false,
      source: SNAPSHOT_PROVIDER,
      error: { code: "network_error", message: "Snapshot is down" },
    });

    const provider = new SnapshotGovernanceProvider();
    const events = await provider.fetchEvents({ projects: [projectRef("proj-a", "space-a")] });
    expect(events).toEqual([]);
  });

  it("maps every real proposal field through unchanged (status, participation, quorum, voter count, urls)", async () => {
    vi.mocked(snapshotService.getProposalsForSpaces).mockResolvedValue({
      ok: true,
      data: {
        "space-a": [
          proposal({
            id: "full-1",
            status: "passed",
            participation: 5000,
            quorumMet: false,
            voterCount: 123,
            discussionUrl: "https://forum.example/1",
            proposerAddress: "0xdeadbeef",
          }),
        ],
      },
      source: SNAPSHOT_PROVIDER,
      fetchedAt: new Date().toISOString(),
    });

    const provider = new SnapshotGovernanceProvider();
    const [event] = await provider.fetchEvents({ projects: [projectRef("proj-a", "space-a")] });

    expect(event).toMatchObject({
      projectId: "proj-a",
      provider: "snapshot",
      proposalId: "full-1",
      status: "passed",
      participation: 5000,
      quorumMet: false,
      voterCount: 123,
      discussionUrl: "https://forum.example/1",
      proposerAddress: "0xdeadbeef",
    });
  });
});
