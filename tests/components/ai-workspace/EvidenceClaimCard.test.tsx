import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { EvidenceClaimCard } from "@/components/ai-workspace/EvidenceClaimCard";
import type { WorkspaceClaim } from "@/lib/ai-workspace/types";

function makeClaim(overrides: Partial<WorkspaceClaim> = {}): WorkspaceClaim {
  return {
    id: "claim:1",
    origin: "ai-intelligence",
    category: "liquidity",
    headline: "Aerodrome TVL rose 18% over 24h",
    summary: "A real, evidence-backed summary.",
    confidence: { kind: "level", level: "high", rationale: "Derived from 3 supporting signals across 2 distinct sources.", evidenceCount: 3 },
    evidence: [{ id: "sig:1", label: "Liquidity Signal", detail: "TVL rose 18% over 24h per DefiLlama", occurredAt: "2026-09-07T20:00:00.000Z", sourceLabel: "DefiLlama" }],
    sources: [{ label: "DefiLlama" }],
    projects: [{ id: "aerodrome", name: "Aerodrome Finance", slug: "aerodrome-finance" }],
    generatedAt: "2026-09-08T00:00:00.000Z",
    limitation: null,
    ...overrides,
  };
}

describe("EvidenceClaimCard — populated intelligence with evidence and source attribution", () => {
  it("renders the real claim, its evidence, and its source", () => {
    render(
      <ul>
        <EvidenceClaimCard claim={makeClaim()} />
      </ul>
    );
    expect(screen.getByText("Aerodrome TVL rose 18% over 24h")).toBeInTheDocument();
    expect(screen.getByText("A real, evidence-backed summary.")).toBeInTheDocument();
    expect(screen.getByText("TVL rose 18% over 24h per DefiLlama")).toBeInTheDocument();
    expect(screen.getByText("Supporting Evidence (1)")).toBeInTheDocument();
    expect(screen.getByText("DefiLlama")).toBeInTheDocument();
  });

  it("links a resolvable project to its real Project Profile route", () => {
    render(
      <ul>
        <EvidenceClaimCard claim={makeClaim()} />
      </ul>
    );
    expect(screen.getByRole("link", { name: "Aerodrome Finance" })).toHaveAttribute("href", "/dashboard/projects/aerodrome-finance");
  });

  it("an unresolvable project renders as plain text, never a broken link", () => {
    render(
      <ul>
        <EvidenceClaimCard claim={makeClaim({ projects: [{ id: "ghost", name: "ghost", slug: null }] })} />
      </ul>
    );
    expect(screen.queryByRole("link", { name: "ghost" })).not.toBeInTheDocument();
    expect(screen.getByText("ghost")).toBeInTheDocument();
  });
});

describe("EvidenceClaimCard — confidence display, never a fabricated value", () => {
  it("a 'level' confidence shows its real level and rationale, never a percentage", () => {
    render(
      <ul>
        <EvidenceClaimCard claim={makeClaim({ confidence: { kind: "level", level: "very-high", rationale: "Derived from 5 supporting signals across 3 distinct sources.", evidenceCount: 5 } })} />
      </ul>
    );
    expect(screen.getByText("Very high confidence")).toBeInTheDocument();
    expect(screen.getByText("Derived from 5 supporting signals across 3 distinct sources.")).toBeInTheDocument();
  });

  it("a 'score' confidence shows the real 0-100 value via the shared ConfidenceBar, never a categorical label", () => {
    render(
      <ul>
        <EvidenceClaimCard claim={makeClaim({ confidence: { kind: "score", value: 63 } })} />
      </ul>
    );
    expect(screen.getByText("63% Confidence")).toBeInTheDocument();
  });

  it("null confidence renders an honest 'not available' message, never a fabricated 0% or invented level", () => {
    render(
      <ul>
        <EvidenceClaimCard claim={makeClaim({ confidence: null })} />
      </ul>
    );
    expect(screen.getByText("Confidence not available for this finding.")).toBeInTheDocument();
    expect(screen.queryByText(/0% Confidence/)).not.toBeInTheDocument();
  });
});

describe("EvidenceClaimCard — evidence-item reference links, never fabricated", () => {
  it("an evidence item with a real reference URL renders an accessible link to that exact URL", () => {
    render(
      <ul>
        <EvidenceClaimCard
          claim={makeClaim({
            evidence: [{ id: "sig:1", label: "Volume Signal", detail: "Volume spiked 40% per DexScreener", occurredAt: null, sourceLabel: "DexScreener", url: "https://dexscreener.com/base/aerodrome" }],
          })}
        />
      </ul>
    );
    const link = screen.getByRole("link", { name: /view evidence/i });
    expect(link).toHaveAttribute("href", "https://dexscreener.com/base/aerodrome");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("an evidence item without a reference URL renders no invented link", () => {
    render(
      <ul>
        <EvidenceClaimCard
          claim={makeClaim({
            evidence: [{ id: "sig:1", label: "Liquidity Signal", detail: "TVL rose 18% over 24h per DefiLlama", occurredAt: null, sourceLabel: "DefiLlama" }],
          })}
        />
      </ul>
    );
    expect(screen.queryByRole("link", { name: /view evidence/i })).not.toBeInTheDocument();
  });

  it("an evidence-item link never replaces or duplicates the claim's own Sources row", () => {
    render(
      <ul>
        <EvidenceClaimCard
          claim={makeClaim({
            evidence: [{ id: "sig:1", label: "Volume Signal", detail: "Volume spiked 40%", occurredAt: null, sourceLabel: "DexScreener", url: "https://dexscreener.com/base/aerodrome" }],
            sources: [{ label: "DefiLlama", url: "https://defillama.com/protocol/aerodrome" }],
          })}
        />
      </ul>
    );
    expect(screen.getByRole("link", { name: /view evidence/i })).toHaveAttribute("href", "https://dexscreener.com/base/aerodrome");
    expect(screen.getByRole("link", { name: "DefiLlama" })).toHaveAttribute("href", "https://defillama.com/protocol/aerodrome");
  });
});

describe("EvidenceClaimCard — honest limitations", () => {
  it("shows the real limitation text when present", () => {
    render(
      <ul>
        <EvidenceClaimCard claim={makeClaim({ limitation: "Reflects Base Radar's Alert Engine aggregate read." })} />
      </ul>
    );
    expect(screen.getByText("Reflects Base Radar's Alert Engine aggregate read.")).toBeInTheDocument();
  });

  it("no evidence and no limitation: the Evidence section is simply absent, never a fabricated placeholder", () => {
    render(
      <ul>
        <EvidenceClaimCard claim={makeClaim({ evidence: [], limitation: null })} />
      </ul>
    );
    expect(screen.queryByText(/Supporting Evidence/)).not.toBeInTheDocument();
  });
});
