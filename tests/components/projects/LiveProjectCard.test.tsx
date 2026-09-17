import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { LiveProjectCard } from "@/components/projects/LiveProjectCard";
import { liveProject } from "../../lib/projects/fixtures";
import type { DiscoveryEvidence } from "@/lib/discovery/project";

/**
 * Universal Project Card, PR-2A acceptance criteria: "every §6 row renders
 * its correct content in both variants; no row is empty when data exists."
 * This smoke-tests exactly that, against a fully-populated fixture, for
 * both variants, plus the honest-omission cases (discovery-only, no risk
 * data, no category peers passed).
 */
describe("LiveProjectCard", () => {
  const fullProject = liveProject({
    id: "aave",
    slug: "aave",
    category: "lending",
    identity: { name: "Aave", shortDescription: "Lending", description: "Lending", logoUrl: null, logoUrlFallbacks: [], websiteUrl: null, socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null } },
    verification: { status: "verified", level: null, verifiedAt: null },
    confidence: { score: 90, level: "high", source: "intelligence" },
    market: { available: true, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: 15_000_000_000},
    health: { score: 95, label: "excellent", factors: [] },
    aiRating: "A+",
    riskLevel: "low",
    status: "live",
    engineering: { available: true, stars: 100, forks: 10, commitsLast7d: 12, commitTrendPct: 5, hasRecentActivity: true },
  });

  it("renders all six rows' content in the detailed variant", () => {
    render(<LiveProjectCard project={fullProject} variant="detailed" />);

    expect(screen.getByText("Aave")).toBeInTheDocument(); // Identity
    expect(screen.getByText("Verified")).toBeInTheDocument(); // Trust
    expect(screen.getByText("A+")).toBeInTheDocument(); // Score
    expect(screen.getByText("Suitable for Deeper Research")).toBeInTheDocument(); // Score (AI Recommendation)
    expect(screen.getByText("TVL")).toBeInTheDocument(); // Metric
    expect(screen.getByText("Low Risk")).toBeInTheDocument(); // Status (Risk)
    // Product Semantics audit — `status: "live"` is the default for every
    // registry project (20/20, confirmed); "Active" no longer renders for
    // it at all, only for the real exceptional states (Beta/Deprecated/...).
    expect(screen.queryByText("Active")).not.toBeInTheDocument(); // Status (Project Status) — default, no longer shown

  });

  it("renders the compact variant without throwing, keeping identity/trust/score/metric/status", () => {
    render(<LiveProjectCard project={fullProject} variant="compact" />);

    expect(screen.getByText("Aave")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("A+")).toBeInTheDocument();
    expect(screen.getByText("Low Risk")).toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
    // PR-085.02A, Objective 3 — the AI Recommendation phrase is no longer
    // detailed-only; it now renders at compact too, reusing the exact same
    // recommendation engine/vocabulary.
    expect(screen.getByText("Suitable for Deeper Research")).toBeInTheDocument();
  });

  it("never fabricates AI Rating/Risk/Recommendation for a discovery-only project", () => {
    const discoveryProject = liveProject({
      source: "discovery",
      slug: null,
      status: null,
      discoveryStatus: "discovered",
      health: null,
      aiRating: null,
      riskLevel: null,
      verification: { status: null, level: null, verifiedAt: null },
    });
    render(<LiveProjectCard project={discoveryProject} variant="detailed" />);

    // Product Semantics audit — the generic "Discovered" badge in the Trust
    // row no longer duplicates the more specific Lifecycle badge below it:
    // confirmed live, every discovery-only card previously showed both
    // "Discovered" and "Newly Discovered" simultaneously, saying the same
    // "not registry-reviewed" fact twice. This fixture has a real
    // `discoveryStatus`, so only the more specific label renders.
    expect(screen.queryByText("Discovered")).not.toBeInTheDocument(); // Trust — no longer duplicates the Lifecycle badge below
    expect(screen.getByText("—")).toBeInTheDocument(); // Score — no aiRating, never guessed
    expect(screen.getByText("Risk Unrated")).toBeInTheDocument(); // Status — Risk, no data
    expect(screen.getByText("Newly Discovered")).toBeInTheDocument(); // Status — Project Status via discoveryStatus
  });

  it("falls back to the generic 'Discovered' badge only when a discovery-only project has no real discoveryStatus either", () => {
    const discoveryProject = liveProject({
      source: "discovery",
      slug: null,
      status: null,
      discoveryStatus: null,
      verification: { status: null, level: null, verifiedAt: null },
    });
    render(<LiveProjectCard project={discoveryProject} variant="detailed" />);
    expect(screen.getByText("Discovered")).toBeInTheDocument();
  });

  it("renders Category Rank only when categoryPeers is passed, never fetching it itself", () => {
    const { rerender } = render(<LiveProjectCard project={fullProject} variant="detailed" />);
    expect(screen.queryByText(/of \d+ in/)).not.toBeInTheDocument();

    const peer = liveProject({ id: "compound", category: "lending", market: { available: true, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: 1_000_000_000} });
    rerender(<LiveProjectCard project={fullProject} variant="detailed" categoryPeers={[fullProject, peer]} />);
    expect(screen.getByText(/#1 of 2 in Lending/)).toBeInTheDocument();
  });

  describe("PR-2B — Interaction Rules (§17) and Accessibility (§21)", () => {
    it("never nests the Watch button's <button> inside the navigation <a> (invalid HTML, §17)", () => {
      const { container } = render(<LiveProjectCard project={fullProject} variant="detailed" />);
      const link = container.querySelector("a");
      const button = screen.getByRole("button", { name: /Watchlist/ });
      expect(link).not.toBeNull();
      expect(link?.contains(button)).toBe(false);
    });

    it("gives the navigation link an accessible name that is exactly the project name (§21)", () => {
      render(<LiveProjectCard project={fullProject} variant="detailed" />);
      expect(screen.getByRole("link", { name: "Aave" })).toBeInTheDocument();
    });

    it("still renders a real, independently-focusable Watch button alongside the link (§17)", () => {
      render(<LiveProjectCard project={fullProject} variant="detailed" />);
      expect(screen.getByRole("link", { name: "Aave" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Watchlist/ })).toBeInTheDocument();
    });

    it("omits the Watch button entirely for discovery-only projects (no Link exists to attach it to)", () => {
      const discoveryProject = liveProject({ source: "discovery", slug: null, verification: { status: null, level: null, verifiedAt: null } });
      render(<LiveProjectCard project={discoveryProject} variant="detailed" />);
      expect(screen.queryByRole("button", { name: /Watchlist/ })).not.toBeInTheDocument();
    });
  });

  describe("PR-2B — Cognitive Load Budget row merge at compact (§14, corrected to 3 badges)", () => {
    // Product Semantics audit — Project Status ("Active") no longer renders
    // for the default `"live"` state (see `ProjectStatusBadge`'s own doc
    // comment), so this fixture now genuinely shows two compact badges
    // (Trust, Risk), not three — the "up to three, merged into one row"
    // row-budget itself is unchanged, just no longer padded with a
    // non-informative default.
    it("shows Trust and Risk merged into one compact row; Project Status stays absent for the default 'live' state", () => {
      render(<LiveProjectCard project={fullProject} variant="compact" />);
      expect(screen.getByText("Verified")).toBeInTheDocument();
      expect(screen.getByText("Low Risk")).toBeInTheDocument();
      expect(screen.queryByText("Active")).not.toBeInTheDocument();
    });

    it("renders Confidence as neutral text at compact, and at detailed too (PR-085.03B, Finding 1 — no raw score at either density)", () => {
      const { unmount } = render(<LiveProjectCard project={fullProject} variant="compact" />);
      expect(screen.getByText(/high confidence/i)).toBeInTheDocument();
      expect(screen.queryByText(/90/)).not.toBeInTheDocument();
      unmount();

      render(<LiveProjectCard project={fullProject} variant="detailed" />);
      expect(screen.getByText(/high confidence/i)).toBeInTheDocument();
      expect(screen.queryByText(/90/)).not.toBeInTheDocument();
    });
  });

  describe("PR-085.02A — Momentum, Secondary Metric, AI Recommendation refinement (EN-004/005/006)", () => {
    it("Objective 1: prefers 7-day change over 24-hour when both exist, at both detailed and compact", () => {
      const project = liveProject({
        ...fullProject,
        market: { ...fullProject.market, changePct24h: 3.2, changePct7d: 9.8 },
      });
      // PR-086.03 — `detailed`'s momentum cell is now a real 24H/7D/30D
      // switch (`LiveProjectCardMomentum`): all three tab labels always
      // render, so "prefers 7-day" now means the 7D tab is selected by
      // default (`aria-pressed="true"`) and its value (9.8%) is what's
      // shown, not that "24H" text is absent from the DOM.
      const { unmount } = render(<LiveProjectCard project={project} variant="detailed" />);
      const sevenDayTab = screen.getByRole("button", { name: "7D" });
      expect(sevenDayTab).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("+9.8%")).toBeInTheDocument();
      unmount();

      // PR-085.05A, Task 2 — reverted back to the plain "7D"/"24H" label at
      // compact (PR-085.05's "{...} Change" wording was undone). `compact`
      // is unchanged by PR-086.03 — still the static auto-picked label.
      render(<LiveProjectCard project={project} variant="compact" />);
      expect(screen.getByText("7D")).toBeInTheDocument();
    });

    it("Objective 1: falls back to 24-hour change when 7-day is unavailable, never fabricating a 7d figure", () => {
      const project = liveProject({ ...fullProject, market: { ...fullProject.market, changePct24h: 3.2, changePct7d: null } });
      render(<LiveProjectCard project={project} variant="detailed" />);
      // PR-086.03 — the switch itself defaults to the 24H tab when 7D has
      // no data (never a fabricated 7d value); the 7D tab still renders
      // (it's always offered) but the displayed value/selection is 24H's.
      const twentyFourHourTab = screen.getByRole("button", { name: "24H" });
      expect(twentyFourHourTab).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("+3.2%")).toBeInTheDocument();
    });

    it("Objective 1: shows no momentum annotation when both 7d and 24h are unavailable", () => {
      const project = liveProject({ ...fullProject, market: { ...fullProject.market, changePct24h: null, changePct7d: null } });
      render(<LiveProjectCard project={project} variant="detailed" />);
      // `showMomentum` gates the whole switch off when neither window has
      // real data — no tabs render at all, never a switch offering only
      // dashes.
      expect(screen.queryByText("7D")).not.toBeInTheDocument();
      expect(screen.queryByText("24H")).not.toBeInTheDocument();
      expect(screen.queryByText("30D")).not.toBeInTheDocument();
    });

    it("Objective 2 (EN-004): GitHub Activity no longer appears on discovery cards", () => {
      render(<LiveProjectCard project={fullProject} variant="detailed" />);
      expect(screen.queryByText("GitHub Activity")).not.toBeInTheDocument();
    });
  });

  describe("PR-085.03, Requirement 5 — Standard Metrics grid (Market Cap, Price, 24H Volume, FDV, always shown at detailed)", () => {
    it("always renders all four fixed fields alongside the category-aware primary, never fewer", () => {
      const project = liveProject({
        ...fullProject,
        market: { ...fullProject.market, marketCapUsd: 10_000_000_000, priceUsd: 2.5, volume24hUsd: 500_000_000, fdvUsd: 20_000_000_000 },
      });
      render(<LiveProjectCard project={project} variant="detailed" />);
      expect(screen.getByText("TVL")).toBeInTheDocument(); // category-aware primary, Lending
      expect(screen.getByText("Market Cap")).toBeInTheDocument();
      expect(screen.getByText("Price")).toBeInTheDocument();
      expect(screen.getByText("24H Volume")).toBeInTheDocument();
      expect(screen.getByText("FDV")).toBeInTheDocument();
    });

    it("shows a labeled 'Not Tracked' per field when only some of the four are missing", () => {
      const project = liveProject({
        ...fullProject,
        market: { ...fullProject.market, marketCapUsd: 10_000_000_000, priceUsd: null, volume24hUsd: null, fdvUsd: null },
      });
      render(<LiveProjectCard project={project} variant="detailed" />);
      expect(screen.getByText("Market Cap")).toBeInTheDocument();
      // Product Semantics audit — 4, not 3: Price/24H Volume/FDV (the
      // standard grid) plus the hero row's Performance companion cell,
      // which used to say "Not Available" and now says "Not Tracked" too
      // (same underlying "no data" meaning, one vocabulary instead of two).
      expect(screen.getAllByText("Not Tracked")).toHaveLength(4);
    });

    it("PR-087 — collapses to one unified empty state instead of repeating 'Not Tracked' four times when every field is missing", () => {
      render(<LiveProjectCard project={fullProject} variant="detailed" />); // only tvlUsd is real; MktCap/Price/Volume/FDV are all null
      expect(screen.queryByText("Market Cap")).not.toBeInTheDocument();
      // Product Semantics audit — the collapsed placeholder now reads
      // "Price Data / Not Tracked" (was "Market Data / Not available
      // yet"), naming the actual missing source (CoinGecko-only fields,
      // distinct from the real TVL — a DefiLlama field — shown in the
      // hero metric row above) and reusing this card's one established
      // "Not Tracked" vocabulary instead of a third, inconsistent phrase.
      // Two, not four (PR-087's original point still holds — never four
      // separate standard-grid cells): one from the collapsed placeholder
      // itself, one from the hero row's Performance companion cell (a
      // different section, same "Not Tracked" vocabulary now).
      expect(screen.getAllByText("Not Tracked")).toHaveLength(2);
      expect(screen.getByText("Price Data")).toBeInTheDocument();
    });

    it("does not skip a field even when it duplicates the primary metric — layout stays identical across categories", () => {
      const stablecoinProject = liveProject({
        ...fullProject,
        category: "stablecoin",
        market: { ...fullProject.market, tvlUsd: null, marketCapUsd: 1_000_000_000 },
      });
      render(<LiveProjectCard project={stablecoinProject} variant="detailed" />);
      // Primary is Market Cap (Stablecoin category) — the fixed "Market Cap" field still renders too.
      expect(screen.getAllByText("Market Cap").length).toBeGreaterThanOrEqual(1);
    });

    it("the detailed four-field grid doesn't also render at compact", () => {
      // PR-085.10 — "Market Cap" is no longer a valid discriminator on its
      // own: compact's own 3-column footer legitimately shows it too now.
      // FDV (never part of compact's footer) and the full "24H Volume"
      // label (compact abbreviates to "24H Vol") still distinguish the two.
      render(<LiveProjectCard project={fullProject} variant="compact" />);
      expect(screen.queryByText("FDV")).not.toBeInTheDocument();
      expect(screen.queryByText("24H Volume")).not.toBeInTheDocument();
    });
  });

  /**
   * PR-085.10 — the compact footer must always render exactly 3 columns,
   * even when a project (e.g. the real ether.fi Stake/Steakhouse
   * Financial/Spiko cases this PR was written to fix) has no real Market
   * Cap/Price/Volume read — never hidden, never collapsed, never fewer
   * than 3 columns.
   */
  describe("PR-085.10 — compact footer always renders 3 columns with honest placeholders", () => {
    it("always shows all three column labels when only some fields are unavailable", () => {
      const project = liveProject({
        ...fullProject,
        market: { ...fullProject.market, marketCapUsd: 5_000_000_000, priceUsd: null, volume24hUsd: null },
      });
      render(<LiveProjectCard project={project} variant="compact" />);
      expect(screen.getByText("Market Cap")).toBeInTheDocument();
      expect(screen.getByText("Price")).toBeInTheDocument();
      expect(screen.getByText("24H Vol")).toBeInTheDocument();
      // Product Semantics audit — 3, not 2: Price/24H Vol (the compact
      // footer) plus the hero row's Change companion cell, which used to
      // say "Not Available" and now says "Not Tracked" too (same
      // underlying "no data" meaning, one vocabulary instead of two).
      expect(screen.getAllByText("Not Tracked")).toHaveLength(3);
    });

    it("PR-087 — collapses to one unified message instead of repeating 'Not Tracked' three times when every field is unavailable", () => {
      // fullProject's market only has tvlUsd real — marketCap/price/volume are all null, matching the real broken cases.
      render(<LiveProjectCard project={fullProject} variant="compact" />);
      expect(screen.queryByText("Market Cap")).not.toBeInTheDocument();
      expect(screen.getByText("Price data not tracked")).toBeInTheDocument();
      // The one remaining "Not Tracked" is the hero row's own Change
      // companion cell (a different section) — the standard-footer collapse
      // itself never repeats it (PR-087's original point: one "Price data
      // not tracked" line, not three separate "Not Tracked" columns).
      expect(screen.getAllByText("Not Tracked")).toHaveLength(1);
    });

    it("shows real values instead of placeholders once data is available", () => {
      const project = liveProject({
        ...fullProject,
        market: { ...fullProject.market, marketCapUsd: 500_000_000, priceUsd: 1.5, volume24hUsd: 2_000_000 },
      });
      render(<LiveProjectCard project={project} variant="compact" />);
      // The standard-metrics footer itself is fully populated here — the
      // one remaining "Not Tracked" is the unrelated hero-row Change cell
      // (this fixture sets no momentum data), not a regression of this
      // footer's own placeholder logic.
      expect(screen.getAllByText("Not Tracked")).toHaveLength(1);
      expect(screen.queryByText("—")).not.toBeInTheDocument();
    });
  });

  describe("PR-3 — `micro` variant (§5.B's exact five fields, §14's caps)", () => {
    it("renders exactly the five §5.B fields for a lending project (TVL primary)", () => {
      render(<LiveProjectCard project={fullProject} variant="micro" />);
      expect(screen.getByText("Aave")).toBeInTheDocument();
      expect(screen.getByText("A+")).toBeInTheDocument();
      expect(screen.getByText("$15B")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Aave" })).toBeInTheDocument();
    });

    it("renders a different category's primary metric correctly (DEX → Volume 24h)", () => {
      const dexProject = liveProject({
        id: "aerodrome",
        slug: "aerodrome",
        category: "dex",
        identity: { name: "Aerodrome", shortDescription: "DEX", description: "DEX", logoUrl: null, logoUrlFallbacks: [], websiteUrl: null, socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null } },
        aiRating: "B+",
        market: { available: true, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: 42_000_000, liquidityUsd: null, tvlUsd: null},
      });
      render(<LiveProjectCard project={dexProject} variant="micro" />);
      expect(screen.getByText("Aerodrome")).toBeInTheDocument();
      expect(screen.getByText("B+")).toBeInTheDocument();
      expect(screen.getByText("$42M")).toBeInTheDocument();
    });

    it("shows 'Not Tracked' rather than fabricating a metric when no market data exists", () => {
      const noMarketProject = liveProject({ id: "obscure", slug: "obscure", identity: { name: "Obscure Project", shortDescription: "", description: "", logoUrl: null, logoUrlFallbacks: [], websiteUrl: null, socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null } } });
      render(<LiveProjectCard project={noMarketProject} variant="micro" />);
      expect(screen.getByText("Not Tracked")).toBeInTheDocument();
    });

    it("renders without a navigation link for a discovery-only project (no slug), never a fabricated destination", () => {
      const discoveryProject = liveProject({ source: "discovery", slug: null, aiRating: null, identity: { name: "Brand New Coin", shortDescription: "", description: "", logoUrl: null, logoUrlFallbacks: [], websiteUrl: null, socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null } } });
      const { container } = render(<LiveProjectCard project={discoveryProject} variant="micro" />);
      expect(container.querySelector("a")).toBeNull();
      expect(screen.getByText("Brand New Coin")).toBeInTheDocument();
      expect(screen.getByText("—")).toBeInTheDocument(); // AI Rating, never guessed
    });

    it("stays within §14's micro caps: exactly one badge, no Trust/Risk/Status/Watch elements", () => {
      render(<LiveProjectCard project={fullProject} variant="micro" />);
      // §12 v1.2 (EN-002): Trust Indicators, Risk Badge, Project Status, and
      // Watch button are no longer part of micro's canonical anatomy.
      expect(screen.queryByText("Verified")).not.toBeInTheDocument();
      expect(screen.queryByText("Low Risk")).not.toBeInTheDocument();
      expect(screen.queryByText("Active")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Watchlist/ })).not.toBeInTheDocument();
    });

    it("leaves `compact` and `detailed` rendering unaffected by the new `micro` branch", () => {
      render(<LiveProjectCard project={fullProject} variant="detailed" />);
      expect(screen.getByText("Suitable for Deeper Research")).toBeInTheDocument();
      expect(screen.getByText("TVL")).toBeInTheDocument();
    });
  });

  describe("PR-085.12 — Executive Summary stays a single line (two/three-line enrichment rejected)", () => {
    it("renders exactly the unchanged primary phrase at detailed, with no label and no second line", () => {
      // V1-FIX-018 — `fullProject` carries `engineering.commitsLast7d: 12`
      // (set for unrelated Engineering-row tests elsewhere in this file),
      // and commits-this-week now outranks the static blue-chip branch this
      // test exists to check — zeroed out locally so this test isolates
      // exactly what it always intended to (the static branch, with no
      // dynamic signal competing), independent of that shared default.
      const project = liveProject({
        ...fullProject,
        engineering: { available: false, stars: null, forks: null, commitsLast7d: null, commitTrendPct: null, hasRecentActivity: false },
      });
      render(<LiveProjectCard project={project} variant="detailed" />);
      expect(screen.getByText("Blue-chip ecosystem leader")).toBeInTheDocument();
      expect(screen.queryByText("Executive Summary")).not.toBeInTheDocument();
    });

    it("never renders an Executive Summary line at compact", () => {
      render(<LiveProjectCard project={fullProject} variant="compact" />);
      expect(screen.queryByText("Blue-chip ecosystem leader")).not.toBeInTheDocument();
    });

    it("falls back through the same real-evidence priority order it always has (governance, no verification/TVL/infra/commits to win first), now with the real proposal count interpolated (V1-FIX-010)", () => {
      const project = liveProject({
        ...fullProject,
        verification: { status: null, level: null, verifiedAt: null },
        // V1-FIX-018 — zeroed out for the same reason as the blue-chip test
        // above: `fullProject`'s inherited `commitsLast7d: 12` now outranks
        // governance, so this isolates the branch this test is actually for.
        engineering: { available: false, stars: null, forks: null, commitsLast7d: null, commitTrendPct: null, hasRecentActivity: false },
        governance: { configured: true, activeProposalCount: 2, totalProposalCount: 5 },
      });
      render(<LiveProjectCard project={project} variant="detailed" />);
      expect(screen.getByText("2 active governance proposals")).toBeInTheDocument();
    });

    it("never generates a phrase that merely restates the category (e.g. no fabricated 'Lending protocol')", () => {
      render(<LiveProjectCard project={fullProject} variant="detailed" />); // category: "lending"
      expect(screen.queryByText("Lending protocol")).not.toBeInTheDocument();
    });
  });

  describe("V1-FIX-004/009 — Needs Review cards show the real evidence reason instead of a generic tag", () => {
    const needsReviewEvidence: DiscoveryEvidence = {
      registryMatch: {
        type: "alias",
        project: null,
        matches: [],
        strongestMatch: null,
        reason: "Matched USD Coin only on a secondary signal (website), without a unique identifier to confirm it — flagged as a possible alias, needs a human look.",
      },
      classification: { category: "stablecoin", tags: [], confidence: "low", method: "unclassified", evidence: null },
      confidence: { score: 55, level: "medium", factors: [] },
      enrichment: { hasLiveMarketData: false, hasLiveTvlData: false, volume24hUsd: null, tvlUsd: null, changePct24h: null, githubActivity: null },
      statusReason: "Matched USD Coin only on a secondary signal (website), without a unique identifier to confirm it — flagged as a possible alias, needs a human look.",
    };

    it("shows the real discoveryEvidence.statusReason, not the generic ecosystemRoleTag fallback, for a needs-review card", () => {
      const project = liveProject({
        ...fullProject,
        source: "discovery",
        discoveryStatus: "needs-review",
        discoveryEvidence: needsReviewEvidence,
      });
      render(<LiveProjectCard project={project} variant="detailed" />);
      expect(screen.getByText(needsReviewEvidence.statusReason)).toBeInTheDocument();
      expect(screen.queryByText("Newly discovered")).not.toBeInTheDocument();
    });

    it("still falls back to ecosystemRoleTag when discoveryStatus is needs-review but no evidence reason is present", () => {
      const project = liveProject({
        ...fullProject,
        verification: { status: null, level: null, verifiedAt: null },
        governance: { configured: false, activeProposalCount: null, totalProposalCount: null },
        engineering: { available: false, stars: null, forks: null, commitsLast7d: null, commitTrendPct: null, hasRecentActivity: false },
        confidence: { score: 20, level: "low", source: "discovery" },
        source: "discovery",
        discoveryStatus: "needs-review",
        discoveryEvidence: null,
      });
      render(<LiveProjectCard project={project} variant="detailed" />);
      expect(screen.getByText("Newly discovered")).toBeInTheDocument();
    });

    it("never shows an evidence reason for a normal, non-needs-review card", () => {
      render(<LiveProjectCard project={fullProject} variant="detailed" />);
      expect(screen.queryByText(needsReviewEvidence.statusReason)).not.toBeInTheDocument();
    });
  });

  describe("Bug fix — soloCard also disables the elevation wrapper's own hover classes", () => {
    it("skips the peer-hover elevation classes when soloCard is set", () => {
      render(<LiveProjectCard project={fullProject} variant="detailed" soloCard />);
      const link = screen.getByRole("link", { name: "Aave" });
      const elevationWrapper = link.nextElementSibling as HTMLElement;
      expect(elevationWrapper.className).not.toMatch(/peer-hover:scale/);
      expect(elevationWrapper.className).not.toMatch(/peer-hover:shadow/);
    });

    it("keeps the peer-hover elevation classes for every other detailed card (Full Directory, ProfileRelatedProjects)", () => {
      render(<LiveProjectCard project={fullProject} variant="detailed" />);
      const link = screen.getByRole("link", { name: "Aave" });
      const elevationWrapper = link.nextElementSibling as HTMLElement;
      expect(elevationWrapper.className).toMatch(/peer-hover:scale/);
      expect(elevationWrapper.className).toMatch(/peer-hover:shadow/);
    });
  });

  describe("V1-FIX-017 — Visible Risk Evidence", () => {
    it("selects the highest-severity contributor, not contributors[0]", () => {
      // Deliberately out of severity order: a "low" item first, the real
      // "high"-severity one third — proves selection isn't a bare [0] index.
      const project = liveProject({
        ...fullProject,
        riskLevel: "high",
        riskContributors: [
          { label: "Smart Contract Risk", detail: "All registered contracts are verified on-chain.", severity: "low" },
          { label: "Governance Activity", detail: "No active governance proposals right now.", severity: "moderate" },
          { label: "Liquidity Risk", detail: "Only $50.00K in tracked DEX liquidity.", severity: "high" },
        ],
      });
      render(<LiveProjectCard project={project} variant="detailed" />);
      expect(screen.getByText("· Low liquidity")).toBeInTheDocument();
      expect(screen.queryByText(/No active governance/)).not.toBeInTheDocument();
    });

    it("shows nothing new for Low Risk, even with real high-severity contributors present", () => {
      const project = liveProject({
        ...fullProject,
        riskLevel: "low",
        riskContributors: [{ label: "Liquidity Risk", detail: "Only $50.00K in tracked DEX liquidity.", severity: "high" }],
      });
      render(<LiveProjectCard project={project} variant="detailed" />);
      expect(screen.queryByText(/Low liquidity/)).not.toBeInTheDocument();
    });

    it("shows concise evidence for Moderate risk", () => {
      const project = liveProject({
        ...fullProject,
        riskLevel: "moderate",
        riskContributors: [{ label: "Developer Health", detail: "1 commit in the last 7 days.", severity: "moderate" }],
      });
      render(<LiveProjectCard project={project} variant="detailed" />);
      expect(screen.getByText("· Low developer activity")).toBeInTheDocument();
    });

    it("shows concise evidence for Elevated risk", () => {
      const project = liveProject({
        ...fullProject,
        riskLevel: "elevated",
        riskContributors: [{ label: "TVL Stability", detail: "TVL has swung -34.2% over 7 days — volatile.", severity: "high" }],
        market: { ...fullProject.market, changePct7d: -34.2 },
      });
      render(<LiveProjectCard project={project} variant="detailed" />);
      expect(screen.getByText("· TVL declining")).toBeInTheDocument();
    });

    it("shows concise evidence for High risk", () => {
      const project = liveProject({
        ...fullProject,
        riskLevel: "high",
        riskContributors: [{ label: "Developer Health", detail: "No commits in the last 7 days.", severity: "high" }],
      });
      render(<LiveProjectCard project={project} variant="detailed" />);
      expect(screen.getByText("· Developer inactivity")).toBeInTheDocument();
    });

    it("never guesses when the only real contributors are unknown/low severity, even at High risk", () => {
      const project = liveProject({
        ...fullProject,
        riskLevel: "high",
        riskContributors: [
          { label: "Centralization", detail: "Not assessed — no on-chain holder-distribution or ownership-concentration data source is available.", severity: "unknown" },
          { label: "Smart Contract Risk", detail: "All registered contracts are verified on-chain.", severity: "low" },
        ],
      });
      render(<LiveProjectCard project={project} variant="detailed" />);
      expect(screen.queryByText(/^·/)).not.toBeInTheDocument();
    });

    it("does not change RiskBadge's own tooltip-enabling behavior — the full contributor list still reaches it", () => {
      const contributors = [{ label: "Liquidity Risk", detail: "Only $50.00K in tracked DEX liquidity.", severity: "high" as const }];
      const project = liveProject({ ...fullProject, riskLevel: "high", riskContributors: contributors });
      render(<LiveProjectCard project={project} variant="detailed" />);
      const badge = screen.getByText("High Risk");
      // RiskBadge only sets tabIndex={0} (enabling its Tooltip) when it received a non-empty contributors array.
      expect(badge.closest('[tabindex="0"]')).not.toBeNull();
    });
  });

  describe("V1-FIX-018 — 'Why Today?' priority (dynamic executive facts before static ones)", () => {
    it("a real 24h price move outranks the static blue-chip branch, even for a verified $15B-TVL project", () => {
      const project = liveProject({
        ...fullProject, // verified, TVL $15B — would win "Blue-chip ecosystem leader" under the old order
        engineering: { available: false, stars: null, forks: null, commitsLast7d: null, commitTrendPct: null, hasRecentActivity: false },
        market: { ...fullProject.market, changePct24h: 18.4 },
      });
      render(<LiveProjectCard project={project} variant="detailed" />);
      expect(screen.getByText("Price +18.4% today")).toBeInTheDocument();
      expect(screen.queryByText("Blue-chip ecosystem leader")).not.toBeInTheDocument();
    });

    it("renders a negative 24h move with its real sign, no leading '+'", () => {
      const project = liveProject({
        ...fullProject,
        engineering: { available: false, stars: null, forks: null, commitsLast7d: null, commitTrendPct: null, hasRecentActivity: false },
        market: { ...fullProject.market, changePct24h: -22.7 },
      });
      render(<LiveProjectCard project={project} variant="detailed" />);
      expect(screen.getByText("Price -22.7% today")).toBeInTheDocument();
    });

    it("a below-threshold 24h move does not preempt the static branches (no regression for ordinary moves)", () => {
      const project = liveProject({
        ...fullProject,
        engineering: { available: false, stars: null, forks: null, commitsLast7d: null, commitTrendPct: null, hasRecentActivity: false },
        market: { ...fullProject.market, changePct24h: 3.1 },
      });
      render(<LiveProjectCard project={project} variant="detailed" />);
      expect(screen.getByText("Blue-chip ecosystem leader")).toBeInTheDocument();
      expect(screen.queryByText(/Price.*today/)).not.toBeInTheDocument();
    });

    it("commits this week outranks an active governance proposal (delta before standing state)", () => {
      const project = liveProject({
        ...fullProject,
        verification: { status: null, level: null, verifiedAt: null },
        market: { ...fullProject.market, changePct24h: null },
        governance: { configured: true, activeProposalCount: 2, totalProposalCount: 5 },
        // fullProject.engineering.commitsLast7d is already 12 — inherited, not overridden.
      });
      render(<LiveProjectCard project={project} variant="detailed" />);
      expect(screen.getByText("12 commits this week")).toBeInTheDocument();
      expect(screen.queryByText("2 active governance proposals")).not.toBeInTheDocument();
    });

    it("a real 24h price move outranks commits this week too (delta strictly bound to 24h wins first)", () => {
      const project = liveProject({
        ...fullProject, // engineering.commitsLast7d: 12
        market: { ...fullProject.market, changePct24h: -15.0 },
      });
      render(<LiveProjectCard project={project} variant="detailed" />);
      expect(screen.getByText("Price -15.0% today")).toBeInTheDocument();
      expect(screen.queryByText("12 commits this week")).not.toBeInTheDocument();
    });

    it("never renders at compact — this line has never rendered there, unchanged by V1-FIX-018", () => {
      const project = liveProject({ ...fullProject, market: { ...fullProject.market, changePct24h: 25.0 } });
      render(<LiveProjectCard project={project} variant="compact" />);
      expect(screen.queryByText(/Price.*today/)).not.toBeInTheDocument();
    });
  });

  describe("V1-FIX-019 — Executive Information Hierarchy (Social Icons relocated)", () => {
    // Only `identity.websiteUrl`/`identity.socials` differ from `fullProject`
    // — every registry project has a required `websiteUrl`, so this is the
    // realistic case the relocated row actually renders for.
    const projectWithSocials = liveProject({
      ...fullProject,
      identity: { ...fullProject.identity, websiteUrl: "https://aave.com", socials: { ...fullProject.identity.socials, twitter: "https://x.com/aave" } },
      // Real Standard Metrics values so the populated 2x2 grid (with its
      // "FDV" label) actually renders instead of the all-missing collapsed
      // state `fullProject` alone would hit (only `tvlUsd` is set there).
      market: { ...fullProject.market, marketCapUsd: 10_000_000_000, priceUsd: 2.5, volume24hUsd: 500_000_000, fdvUsd: 20_000_000_000 },
    });

    function isBefore(a: Element, b: Element): boolean {
      return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    }

    it("renders Social Icons after the Standard Metrics section, not directly under Identity", () => {
      render(<LiveProjectCard project={projectWithSocials} variant="detailed" />);
      const websiteLink = screen.getByLabelText("Website");
      // "FDV" is the last cell of the Standard Metrics 2x2 grid — the social
      // row must now come after it, not before it (its old position).
      const fdvLabel = screen.getByText("FDV");
      expect(isBefore(fdvLabel, websiteLink)).toBe(true);
    });

    it("keeps Identity → Role Tag → Trust → Risk → Recommendation → Metrics in their existing relative order", () => {
      render(<LiveProjectCard project={projectWithSocials} variant="detailed" />);
      const name = screen.getByText("Aave");
      const roleTag = screen.getByText("12 commits this week"); // fullProject's real ecosystemRoleTag output
      const trust = screen.getByText("Verified");
      const risk = screen.getByText("Low Risk");
      const recommendation = screen.getByText("AI Recommendation");
      const metric = screen.getByText("TVL"); // fullProject's primary metric label

      expect(isBefore(name, roleTag)).toBe(true);
      expect(isBefore(roleTag, trust)).toBe(true);
      expect(isBefore(trust, risk)).toBe(true);
      expect(isBefore(risk, recommendation)).toBe(true);
      expect(isBefore(recommendation, metric)).toBe(true);
    });

    it("a card with no real social links still renders correctly — no crash, no stray icon row", () => {
      // fullProject itself has `websiteUrl: null` and every social null.
      render(<LiveProjectCard project={fullProject} variant="detailed" />);
      expect(screen.getByText("Aave")).toBeInTheDocument();
      expect(screen.queryByLabelText("Website")).not.toBeInTheDocument();
    });
  });

  describe("V1-FIX-020 — Executive Copy & Narrative (fallback role-tag wording)", () => {
    it("renders the new 'Base ecosystem project' fallback instead of the old generic 'Tracked project' string", () => {
      // Reaches ecosystemRoleTag()'s final fallback: not verified, medium
      // confidence (not high), registry source (not discovery), and no
      // real price move/commits/governance — every one of `liveProject()`'s
      // own defaults already satisfies the latter three.
      const project = liveProject({ ...fullProject, verification: { status: "unverified", level: null, verifiedAt: null }, confidence: { score: 50, level: "medium", source: "intelligence" }, engineering: { available: false, stars: null, forks: null, commitsLast7d: null, commitTrendPct: null, hasRecentActivity: false } });
      render(<LiveProjectCard project={project} variant="detailed" />);
      expect(screen.getByText("Base ecosystem project")).toBeInTheDocument();
      expect(screen.queryByText("Tracked project")).not.toBeInTheDocument();
    });
  });

  describe("V1-FIX-021 — Typography & Visual Emphasis", () => {
    it("AI Rating grade renders at text-2xl, matching the Primary Metric value's size (§13 parity restored)", () => {
      render(<LiveProjectCard project={fullProject} variant="detailed" />);
      const grade = screen.getByText("A+");
      expect(grade.className).toContain("text-2xl");
      expect(grade.className).not.toContain("text-xl "); // guards against a stray "text-xl" surviving alongside "text-2xl"
      expect(grade.className).toContain("font-bold");
      expect(grade.className).toContain("tracking-tight");
    });

    it("Momentum value gains tracking-tight but stays font-semibold — must not visually compete with AI Rating or the Primary Metric", () => {
      const project = liveProject({ ...fullProject, market: { ...fullProject.market, changePct24h: 4.2 } });
      render(<LiveProjectCard project={project} variant="detailed" />);
      const control = screen.getByLabelText("Performance window");
      const momentumValue = control.parentElement!.querySelector(".tabular-nums");
      expect(momentumValue).not.toBeNull();
      expect(momentumValue!.className).toContain("tracking-tight");
      expect(momentumValue!.className).toContain("font-semibold");
      expect(momentumValue!.className).not.toContain("font-bold");
    });
  });

  describe("V1-FIX-022 — Accessibility & Reading Order (tooltip-trigger reachability)", () => {
    it("RiskBadge, VerificationBadge, and ChainBadgeGroup's tooltip triggers all carry pointer-events-auto inside the card's pointer-events-none content wrapper", () => {
      const project = liveProject({
        ...fullProject,
        chains: ["base", "ethereum", "arbitrum"], // >1 chain so ChainBadgeGroup's "+N" overflow tooltip renders (max=1 at this call site)
        riskLevel: "high",
        riskContributors: [{ label: "Liquidity Risk", detail: "Only $50.00K in tracked DEX liquidity.", severity: "high" }],
      });
      const { container } = render(<LiveProjectCard project={project} variant="detailed" />);
      // WatchButton also uses the shared `Tooltip` component but sits OUTSIDE
      // the pointer-events-none content wrapper (a sibling overlay, not a
      // descendant — see `LiveProjectCard.tsx`'s own doc comment) and never
      // needed this fix; excluded here by filtering out its own trigger,
      // identifiable by wrapping a "...Watchlist" button.
      const allTriggers = Array.from(container.querySelectorAll("[data-base-ui-tooltip-trigger]"));
      const triggers = allTriggers.filter((trigger) => !trigger.querySelector('button[aria-label*="Watchlist"]'));
      // Expect exactly: RiskBadge (1) + VerificationBadge (4: active + 3 dimmed alternates) + ChainBadgeGroup "+N" (1) = 6.
      expect(triggers.length).toBe(6);
      for (const trigger of triggers) {
        expect(trigger.className).toContain("pointer-events-auto");
      }
    });
  });
});
