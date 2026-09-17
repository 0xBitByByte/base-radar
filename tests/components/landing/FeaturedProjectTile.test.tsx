import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { FeaturedProjectTile } from "@/components/landing/FeaturedProjectTile";
import { FEATURED_PROJECTS } from "@/components/landing/featuredProjects";
import { RADAR_SCORE_LABEL, RADAR_SCORE_PREVIEW_DESCRIPTION, type RadarScoreResult } from "@/lib/intelligence/radarScore";

/**
 * PR-098.02 — Featured Ecosystem 24H% Semantics audit, UI layer. Asserts
 * the label is unambiguous ("Token 24H", never a bare "24H"), the "—"
 * fallback for a project with no verified token, and deterministic
 * positive/negative presentation for a real value.
 */

function tileFor(id: string) {
  const project = FEATURED_PROJECTS.find((p) => p.identity.id === id);
  if (!project) throw new Error(`Fixture missing for "${id}"`);
  return project;
}

describe("FeaturedProjectTile — Radar Score naming (PR-098.03)", () => {
  it('labels the score stat "Radar Score", never "AI Score"', () => {
    render(<FeaturedProjectTile project={tileFor("aerodrome-finance")} onActivate={vi.fn()} />);
    expect(screen.getByText(RADAR_SCORE_LABEL)).toBeInTheDocument();
    expect(screen.queryByText("AI Score")).not.toBeInTheDocument();
  });

  it("carries the honest preview description as a tooltip — PR-098.09: this number is still the illustrative health.score, not a live computeRadarScore() result, so the tooltip says so explicitly rather than reading as if it's live like its TVL/Token 24H neighbors", () => {
    render(<FeaturedProjectTile project={tileFor("aerodrome-finance")} onActivate={vi.fn()} />);
    const title = screen.getByText(RADAR_SCORE_LABEL).closest("[title]");
    expect(title).toHaveAttribute("title", RADAR_SCORE_PREVIEW_DESCRIPTION);
    expect(title?.getAttribute("title")).toMatch(/preview|illustrative/i);
  });

  it("DATA-HONESTY FIX — no live radarScore prop at all shows '—', never the illustrative health.score number (superseded PR-098.03/.09 behavior: the illustrative number used to render here with only a hover tooltip distinguishing it from a real one, which read as a real score at a glance)", () => {
    render(<FeaturedProjectTile project={tileFor("aerodrome-finance")} onActivate={vi.fn()} />);
    const label = screen.getByText(RADAR_SCORE_LABEL);
    const cell = label.parentElement!;
    expect(cell.textContent).toBe(`${RADAR_SCORE_LABEL}—`);
    expect(screen.queryByText(String(tileFor("aerodrome-finance").health.score))).not.toBeInTheDocument();
  });
});

describe("FeaturedProjectTile — Token 24H (PR-098.02)", () => {
  it('labels the stat "Token 24H", never a bare/ambiguous "24H"', () => {
    render(<FeaturedProjectTile project={tileFor("aerodrome-finance")} onActivate={vi.fn()} />);
    expect(screen.getByText("Token 24H")).toBeInTheDocument();
    expect(screen.queryByText(/^24H$/)).not.toBeInTheDocument();
  });

  it("shows a real positive token change with an up indicator", () => {
    // aerodrome-finance's fixture spec is illustrative but real-token-backed
    // (verified coingeckoId) — changePct24h: 4.2 in featuredProjects.ts.
    render(<FeaturedProjectTile project={tileFor("aerodrome-finance")} onActivate={vi.fn()} />);
    expect(screen.getByText("4.2%")).toBeInTheDocument();
  });

  it("shows a real negative token change without a fabricated sign", () => {
    // hydrex's fixture spec: changePct24h: -5.8, and it has a verified
    // registry coingeckoId (PR-098.01), so it's not nulled out.
    render(<FeaturedProjectTile project={tileFor("hydrex")} onActivate={vi.fn()} />);
    expect(screen.getByText("-5.8%")).toBeInTheDocument();
  });

  it('shows "—", never a substituted metric, for a project with no verified token mapping', () => {
    // PR-100 removed "superchain-eco" (formerly used here) from Featured
    // Ecosystem entirely — "clanker" is another real, still-featured
    // no-verified-token project, also covered individually by the
    // it.each below.
    render(<FeaturedProjectTile project={tileFor("clanker")} onActivate={vi.fn()} />);
    // The Token 24H cell must show em-dash; nothing else in that cell.
    const label = screen.getByText("Token 24H");
    const cell = label.parentElement!;
    expect(cell.textContent).toBe("Token 24H—");
  });

  it.each(["farcaster", "basenames", "clanker", "oku"])(
    "'%s' (no verified token) also shows \"—\", not a fabricated number",
    (id) => {
      render(<FeaturedProjectTile project={tileFor(id)} onActivate={vi.fn()} />);
      const label = screen.getByText("Token 24H");
      const cell = label.parentElement!;
      expect(cell.textContent).toBe("Token 24H—");
    }
  );
});

describe("FeaturedProjectTile — freshness metadata (PR-098.07)", () => {
  it("shows no freshness tooltip when no freshness prop is passed (the illustrative-only fallback case)", () => {
    render(<FeaturedProjectTile project={tileFor("aerodrome-finance")} onActivate={vi.fn()} />);
    const tvlLabel = screen.getByText("TVL");
    expect(tvlLabel.parentElement).not.toHaveAttribute("title");
  });

  it('shows "Updated X min ago" on the TVL cell when real freshness data is provided', () => {
    render(
      <FeaturedProjectTile
        project={tileFor("aerodrome-finance")}
        onActivate={vi.fn()}
        freshness={{ tvl: { state: "fresh", updatedAt: new Date().toISOString(), ageMs: 4 * 60_000 }, tokenChange: null }}
      />
    );
    expect(screen.getByText("TVL").parentElement).toHaveAttribute("title", "Updated 4 min ago");
  });

  it("flags a stale TVL reading in the tooltip without exposing implementation details", () => {
    render(
      <FeaturedProjectTile
        project={tileFor("aerodrome-finance")}
        onActivate={vi.fn()}
        freshness={{ tvl: { state: "stale", updatedAt: new Date().toISOString(), ageMs: 20 * 60_000 }, tokenChange: null }}
      />
    );
    const title = screen.getByText("TVL").parentElement!.getAttribute("title");
    expect(title).toBe("Updated 20 min ago — may be outdated");
    expect(title).not.toMatch(/ttl|cache|defillama/i);
  });

  it("shows no tooltip for a null (unavailable) freshness value even when the freshness object itself is present", () => {
    render(
      <FeaturedProjectTile
        project={tileFor("aerodrome-finance")}
        onActivate={vi.fn()}
        freshness={{ tvl: null, tokenChange: null }}
      />
    );
    expect(screen.getByText("TVL").parentElement).not.toHaveAttribute("title");
  });
});

describe("FeaturedProjectTile — Oku interface/aggregator honesty (PR-101)", () => {
  it('shows "—" for TVL — never the combined TVL of the Uniswap v3/Morpho pools Oku renders', () => {
    render(<FeaturedProjectTile project={tileFor("oku")} onActivate={vi.fn()} />);
    const label = screen.getByText("TVL");
    const cell = label.parentElement!;
    expect(cell.textContent).toBe("TVL—");
  });

  it('shows "—" for Token 24H — Oku has no token of its own', () => {
    render(<FeaturedProjectTile project={tileFor("oku")} onActivate={vi.fn()} />);
    const label = screen.getByText("Token 24H");
    const cell = label.parentElement!;
    expect(cell.textContent).toBe("Token 24H—");
  });

  it("without a live radarScore (e.g. insufficient evidence), shows the honest preview tooltip AND '—' — never claims a live methodology it can't back, never an illustrative number either", () => {
    render(<FeaturedProjectTile project={tileFor("oku")} onActivate={vi.fn()} />);
    const label = screen.getByText(RADAR_SCORE_LABEL);
    const title = label.closest("[title]");
    expect(title).toHaveAttribute("title", RADAR_SCORE_PREVIEW_DESCRIPTION);
    expect(label.parentElement!.textContent).toBe(`${RADAR_SCORE_LABEL}—`);
  });

  // DATA-HONESTY FIX — the actual production shape of Oku's bug: a real,
  // computed `RadarScoreResult` object IS passed (every registry-mapped
  // project gets one — `computeRadarScore()` never returns `null` itself),
  // but its own `.score` is `null` because the project's real evidence
  // never cleared the minimum-evidence floor. The old `radarScore ? ... :
  // ...` check was a truthy-OBJECT check, so this exact shape slipped
  // through as if a real score existed, showing the illustrative
  // `health.score` number with a mismatched "Live: ..." tooltip. This is
  // the case the fix targets, tested directly rather than only through the
  // "no prop passed at all" case above.
  it("an insufficient-evidence radarScore object (real object, null .score — Oku's actual production shape) shows '—', not the illustrative health.score, and the honest PREVIEW tooltip, not a misleading 'Live' coverage claim", () => {
    const insufficientEvidence: RadarScoreResult = {
      score: null,
      availability: "unavailable",
      coveragePct: 0.15,
      confidence: { score: 0, level: "low" },
      dimensions: [{ id: "developerActivity", score: 95, weight: 0.15, weightedContribution: 14.25, stale: false }],
      staleDimensionIds: [],
      scoreFreshness: "unavailable",
      explanation: ["Insufficient evidence: only 1 of 7 dimensions available."],
    };
    render(<FeaturedProjectTile project={tileFor("oku")} onActivate={vi.fn()} radarScore={insufficientEvidence} />);
    const label = screen.getByText(RADAR_SCORE_LABEL);
    expect(label.parentElement!.textContent).toBe(`${RADAR_SCORE_LABEL}—`);
    expect(screen.queryByText(String(tileFor("oku").health.score))).not.toBeInTheDocument();
    const title = label.closest("[title]")!.getAttribute("title")!;
    expect(title).toBe(RADAR_SCORE_PREVIEW_DESCRIPTION);
    expect(title).not.toMatch(/live:/i);
  });
});

describe("FeaturedProjectTile — live Radar Score tooltip (PR-099)", () => {
  const liveRadarScore: RadarScoreResult = {
    score: 82,
    availability: "full",
    coveragePct: 1,
    confidence: { score: 100, level: "high" },
    dimensions: [
      { id: "marketStrength", score: 80, weight: 0.2, weightedContribution: 16, stale: false },
      { id: "tvlLiquidity", score: 85, weight: 0.15, weightedContribution: 12.75, stale: false },
    ],
    staleDimensionIds: [],
    scoreFreshness: "fresh",
    explanation: ["Final Radar Score: 82."],
  };

  it("shows the honest PREVIEW tooltip and '—' when no live radarScore is passed (DATA-HONESTY FIX: no longer the illustrative number)", () => {
    render(<FeaturedProjectTile project={tileFor("aerodrome-finance")} onActivate={vi.fn()} />);
    const label = screen.getByText(RADAR_SCORE_LABEL);
    expect(label.closest("[title]")).toHaveAttribute("title", RADAR_SCORE_PREVIEW_DESCRIPTION);
    expect(label.parentElement!.textContent).toBe(`${RADAR_SCORE_LABEL}—`);
  });

  it("shows a real, live coverage/confidence tooltip when a real radarScore is passed — never the PREVIEW copy", () => {
    render(<FeaturedProjectTile project={tileFor("aerodrome-finance")} onActivate={vi.fn()} radarScore={liveRadarScore} />);
    const title = screen.getByText(RADAR_SCORE_LABEL).closest("[title]")!.getAttribute("title")!;
    expect(title).not.toBe(RADAR_SCORE_PREVIEW_DESCRIPTION);
    expect(title).toContain("2/2"); // both fixture dimensions available
    expect(title).toContain("100%"); // full coverage/confidence
  });

  // DATA-HONESTY FIX regression: a genuine live score (unlike the
  // insufficient-evidence case covered above) must display its real
  // number exactly as before — this fix must never affect a project that
  // has a real Radar Score.
  it("shows the real numeric score — not '—' — when radarScore.score is a genuine number", () => {
    // The tile renders `project.health.score` (the caller — `featuredProjects.ts`'s
    // overlay logic — is responsible for making that equal the live
    // `radarScore.score` before passing both down); this test's fixture
    // project's own illustrative `health.score` is what should render here.
    render(<FeaturedProjectTile project={tileFor("aerodrome-finance")} onActivate={vi.fn()} radarScore={liveRadarScore} />);
    const label = screen.getByText(RADAR_SCORE_LABEL);
    expect(label.parentElement!.textContent).toBe(`${RADAR_SCORE_LABEL}${tileFor("aerodrome-finance").health.score}`);
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });

  it("a real score of exactly 0 still displays a number, never mistaken for the N/A '—' state", () => {
    const zeroScore: RadarScoreResult = { ...liveRadarScore, score: 0 };
    render(<FeaturedProjectTile project={tileFor("aerodrome-finance")} onActivate={vi.fn()} radarScore={zeroScore} />);
    const label = screen.getByText(RADAR_SCORE_LABEL);
    expect(label.parentElement!.textContent).not.toBe(`${RADAR_SCORE_LABEL}—`);
  });
});
