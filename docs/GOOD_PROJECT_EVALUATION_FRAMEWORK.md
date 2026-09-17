# Good Project Evaluation Framework — Product Standard

**Status:** 🔒 Frozen v1.0 — source of truth for all future Health Score,
Confidence Score, AI Grade, Risk Rating, Executive Ranking, AI
Recommendation, Project Comparison, Executive Dashboard, and Intelligence
Engine work.

This document is independent of, and complementary to,
[TRUSTED_PROJECT_FRAMEWORK.md](TRUSTED_PROJECT_FRAMEWORK.md):

> Trusted Project Framework asks: **"Should this project be listed?"**
> Good Project Evaluation Framework asks: **"How good is this listed project?"**

A project can pass every Trusted Project Framework gate and still score
poorly here — trust and quality are different questions, answered by
different evidence, and this Standard never lets one substitute for the
other.

This is a **product** standard — objective, measurable, evidence-based,
independent of implementation. It does not redesign any existing scoring
engine, and it proposes no roadmap. A future Implementation Roadmap
(mirroring the Universal Project Card and Trusted Project Framework
initiatives' own Engineering Notes discipline — see
[CLAUDE_PR_WORKFLOW.md](CLAUDE_PR_WORKFLOW.md)) does that, separately, later.

---

## Executive Summary

Base Radar today evaluates project quality through three real, working,
evidence-based mechanisms: a **Health Score** (TVL/GitHub/liquidity/momentum
heuristic), a **Confidence Score** (how much the engine trusts its own
assembled data), and an 8-tile **Health Scorecard** (Security, Liquidity,
Momentum, Engineering Health, Governance, Community, Whale Activity, AI
Rating) that honestly reports "Not Assessed" rather than fabricating a
number when no real signal exists. This is a genuinely disciplined
foundation — no other researched platform's methodology is fully public,
and this stack's transparency (every score traces to a real, cited field)
already matches or exceeds several of them in that specific respect.

It is also, measured against the full breadth of what "project quality"
means industry-wide, thin in real ways: **no Revenue signal, no
Adoption/network-effects signal, no Innovation signal, no Longevity/track-
record signal, and no Ecosystem-Importance signal exist anywhere in this
stack.** The current "AI Rating" is a flat 50/50 average of Health and
Confidence — two measurements of different things (project health vs. data
trustworthiness) blended as if they were one. The current "AI
Recommendation" is a single phrase keyed only by Risk Level — none of
Health, Community, Developer, or Governance evidence feeds it at all.

This Standard defines sixteen measurable Evaluation Dimensions, explicit
Healthy/Risky/Trustworthy/Attractive/Unsuitable project definitions, a
weighting-guidance mapping (not a redesign) to the four existing score
surfaces, an Evidence Hierarchy, an Unknown Data Policy, and — directly
answering this initiative's own brief — explicit Anti-Bias Principles
naming the signals that must never influence a quality judgment (follower
count, artificial engagement, paid marketing, short-term hype, temporary
volume spikes, celebrity endorsements), each with real, cited evidence for
why.

---

## Research Findings

### Current Base Radar Methodology (read in full this session)

| Mechanism | File | What it actually does |
| --- | --- | --- |
| Health Score | `lib/intelligence/scoring.ts` | Neutral 50 baseline + bounded log-scaled points for TVL, GitHub stars, DEX liquidity, and 24h price momentum. `0`/`"unknown"` when zero live signals exist; capped at 5/"poor" for a `verification.status: "flagged"` project regardless of other data. |
| Confidence Score | `lib/intelligence/confidence.ts` | Neutral 50 baseline + registry verification-status points (`verified` +40 … `flagged` −60) + 10 points per live provider source actually resolved (5 if a fuzzy/approximate match). **Measures data trustworthiness, not project quality** — a project can have perfect Confidence and mediocre Health simultaneously. |
| AI Rating Grade | `lib/intelligence/scorecard.ts` `computeAiRatingGrade` | `(healthScore + confidenceScore) / 2`, bucketed into A+ through D. A flat, equal-weight blend of two different measurements. |
| Risk Rating | `lib/intelligence-engine/rule-based-provider.ts` `buildRiskAnalysis` | 7 named contributors (Smart Contract Risk, Liquidity Risk, Centralization [always "unknown" — no data source exists], TVL Stability, Developer Health, Governance Activity, Data Freshness), each a real evidence-derived severity, never fabricated. Overall level from a small integer risk-score sum over health/confidence/verification/freshness/whale-activity. |
| Health Scorecard | `lib/intelligence/scorecard.ts` `buildHealthScorecard` | 8 tiles (Security, Liquidity, Momentum, Engineering Health, Governance, Community, Whale Activity, AI Rating), each severity-bucketed (`excellent/strong/moderate/weak/unknown`), each citing its real source. Community is a pure link-completeness ratio (configured links ÷ tracked platforms) — deliberately not an engagement/quality estimate. Whale Activity deliberately carries no numeric score — a real event count and classification only, since a 0-100 number would imply false precision on a discrete signal. |
| AI Recommendation | `lib/intelligence/report.ts` `RECOMMENDATION_FOR_RISK` | A **fixed lookup table keyed only by Risk Level** (4 possible phrases total) — does not draw on Health, Community, Developer, or Governance evidence. |
| Rule-Based Intelligence Engine | `lib/intelligence-engine/` | Deterministic, no ML/black-box — every output cites the real input field it derived from. Same transparency discipline as the scoring functions above. |

### Industry Methodologies Researched

- **CoinGecko / CoinMarketCap** — listing gated on real exchange/API
  coverage and anti-wash-trading checks; quality signals beyond listing are
  largely presentational (rankings, trust scores) rather than a published
  formula.
- **DefiLlama** — TVL-adapter-verified only; no published quality layer
  beyond "does the number come from real on-chain data."
- **Token Terminal** — quality is fundamentally revenue/fee-based:
  protocol revenue, fees, active users, FDV, and valuation multiples,
  standardized from on-chain + GitHub data — the one researched platform
  whose core methodology this stack has *zero* corresponding signal for.
- **Coinbase Research** — due diligence blends quantitative (price/volume
  history, token distribution/vesting, market cap) and qualitative
  (whitepaper, codebase, team credentials, partnerships, community
  sentiment, technical roadmap) evidence — explicitly notes that projects
  emphasizing "token utility and governance rights" review more smoothly
  than those emphasizing speculative returns.
- **Messari** — risk assessed across technology, governance, regulatory,
  market, and team dimensions; diligence reports include token
  distribution/vesting analysis, team background checks, and governance
  decentralization metrics — all built from *publicly available*
  information only, a discipline this Standard adopts directly (see
  "Evidence Hierarchy").
- **Electric Capital Developer Report** — the most quantitatively rigorous
  developer-ecosystem methodology researched: a **Monthly Active Developer**
  is anyone with ≥1 commit in a rolling 28-day window; **Full-Time** is
  ≥10 commit-days/month, **Part-Time** is 2-9. Removing subjective judgment
  entirely by counting real commit-days is directly adoptable guidance for
  this Standard's Developer Activity dimension, at whatever scale this
  stack's own GitHub coverage allows.
- **Arkham Intelligence** — combines algorithmic on-chain pattern analysis
  with human-reviewed labeling for high-confidence entity attribution; its
  own documented weakness (the "Intelligence Oracle Problem" — crowdsourced
  submissions are hard to verify at scale) is a direct, real caution this
  Standard's Evidence Hierarchy accounts for by ranking community-sourced
  signals low.
- **Adoption/network-effects research** — active-address counts are a real
  signal but are explicitly documented as inflatable by bots, airdrops, and
  Sybil activity; the "hype trap" pattern (high new-address growth with low
  sustained active-address retention) is the concrete, named failure mode
  this Standard's "Attractive Investment Characteristics" section is
  written to distinguish from real, sustained adoption.
- **Vanity-metrics research** — concrete, quotable evidence for this
  Standard's Anti-Bias Principles: Discord member counts can be inflated
  to an arbitrary number "with a $50 bot order"; one industry study found
  37.2% of influencer followers were fake accounts; "a project can buy
  50,000 Discord members in a weekend, but cannot fake 90-day on-chain
  retention."

### Current vs. Industry — Comparison

| | Base Radar today | Industry practice researched |
| --- | --- | --- |
| Revenue/fees | Not tracked | Token Terminal's core signal |
| Adoption/network effects | Not tracked | Active addresses, retention cohorts (with explicit bot/Sybil caveats) |
| Innovation | Not tracked | Largely qualitative even industry-wide — no platform researched reduces it to a formula |
| Longevity/track record | Not tracked | Referenced by Messari (team/history) and Coinbase (milestones) diligence |
| Ecosystem importance | Not tracked | Implicit in most platforms' own curation/ranking, rarely published as a discrete score |
| Developer activity | Commits/contributors/releases (small scale, single repo) | Electric Capital: cross-repo, cross-chain, rolling 28-day MAD methodology |
| Governance | Snapshot-only, binary "active proposals" count | Messari: decentralization metrics, treasury management, voting mechanism analysis |
| Security | Contract-verification percentage only | Coinbase: codebase review + threat-detection screening; Messari: technology-risk dimension |
| Transparency | Registry-level (`verification.status`) | Messari/Coinbase: public-information-only diligence discipline (adopted directly, see below) |
| Anti-fabrication | Already strict ("Not Assessed," never guessed) | Matches or exceeds every researched platform's stated transparency claims |

---

## 1. Purpose

This framework measures **how good a project is, given that it has
already earned a place in the registry.** It answers: is this project
healthy, well-run, transparent, and durable — not "is it listed" (Trusted
Project Framework) and not "will its price go up" (this framework
deliberately never predicts price).

**What this framework deliberately does NOT measure:**
- Price direction, or whether a project is a good trade.
- Marketing quality, hype, or narrative strength.
- Anything this Standard's own Anti-Bias Principles name as a non-signal.
- Legality/regulatory status (a Trusted Project Framework and
  jurisdiction-specific concern, not a quality one).

## 2. Evaluation Principles

- **Objective** — every judgment traces to a real, checkable fact.
- **Explainable** — a user can see *why* a score is what it is, not just
  the number (already this stack's own convention — every `ScorecardTile`
  carries a real `detail` sentence and `source` citation).
- **Measurable** — a principle that can't be reduced to a check or a
  bounded number doesn't belong in a scored dimension; it belongs in
  qualitative context instead (see "Evaluation Dimensions," Innovation).
- **Repeatable** — the same real inputs always produce the same output;
  no randomness, no un-cited human judgment folded into an automated score.
- **Provider-backed** — a score input traces to a named, real data source,
  never an assumption.
- **Transparent** — the methodology itself is documented, not a black box
  (this document *is* that documentation).
- **Conservative** — when evidence is mixed or thin, the framework rounds
  toward caution, never toward optimism.
- **Honest under uncertainty** — matches this codebase's own established
  convention exactly: "Not Assessed" is a correct, complete answer.
- **No fabricated data** — never invent a number to fill a gap.
- **Unknown is preferable to incorrect** — restated as its own principle
  because it is the single most load-bearing rule in this document: a
  wrong "72/100" is worse than an honest "Not Assessed," because the wrong
  number is trusted and the honest gap is not.

## 3. Evaluation Dimensions

| Dimension | Why it matters | How to interpret it | Objective indicators |
| --- | --- | --- | --- |
| **Security** | The single highest-consequence dimension — a security failure can erase all other quality instantly. | A snapshot of known risk exposure, never a guarantee of safety. | Contract verification status; disclosed audit reports (see Trusted Project Framework); known unresolved critical/high findings. |
| **Liquidity** | Determines whether users can actually enter/exit a position without severe slippage. | Depth relative to claimed scale, not an absolute threshold — a small project with proportionate liquidity is not "worse" than a large one. | Live DEX liquidity depth; number of independent trading venues. |
| **TVL** | A real, on-chain measure of capital committed to the protocol — harder to fake than a follower count. | Directional stability matters more than the raw number — see "TVL Stability" below. | Live TVL; 7-day/30-day TVL change magnitude. |
| **Trading Activity** | Signals real usage, but is the dimension most vulnerable to fabrication (wash trading). | Cross-reference against liquidity depth and multiple venues before treating volume as evidence of anything. | 24h volume; venue count; volume-to-liquidity ratio (an outlier ratio is a caution flag, not a quality signal). |
| **Developer Activity** | The clearest non-price signal that a project is actively maintained. | Recency and consistency matter more than a single burst — adopt Electric Capital's rolling-window discipline over a single point-in-time count. | Commits in a rolling window; contributor count; release cadence; days since last push. |
| **Revenue** | The most direct signal of real economic sustainability — a project can have TVL/volume without ever capturing value. | Present only where a real fee/revenue mechanism exists; absence is not itself negative for projects with no fee model by design. | Protocol fees; revenue captured to treasury (Token Terminal's own revenue/fees distinction). |
| **Adoption** | Real usage over time, distinct from a one-time spike. | Retention over new-user growth — the "hype trap" pattern (many new addresses, few returning) is a caution flag, not a positive signal, however large the raw growth number. | Active-address trend; retention across a rolling cohort window; caveat every reading with bot/Sybil/airdrop-inflation risk. |
| **Governance** | Signals whether real decision-making power is distributed and active. | An honest "no governance mechanism" is a neutral fact, not itself a negative — see Guiding Principle-style honesty throughout this document. | Active proposal count; voting participation; treasury-management transparency; confirmed governance mechanism type. |
| **Transparency** | The precondition for every other dimension being trustworthy at all. | Whether real information is disclosed and independently corroborated — never whether the project "seems honest." | Populated, independently-confirmable registry fields; disclosed team identity; disclosed audit status. |
| **Documentation** | A proxy for whether a team can be held to a real, checkable standard. | Presence and substance, not polish — a plain but complete technical doc outranks a beautifully designed but empty one. | A real, stable documentation URL; whether it substantively describes the actual product. |
| **Innovation** | Real, but the hardest dimension to make objective — every industry source researched treats it qualitatively, not formulaically. | Never scored numerically in this framework; recorded as qualitative context only (see "Metric-to-Score Guidance"). | Real, specific technical differentiation the team can articulate and a reviewer can verify — never "first," "revolutionary," or similar unverifiable marketing language, taken at face value. |
| **Longevity** | Track record is real evidence a project has survived market cycles, not just launched into one. | Time since verifiable mainnet launch, not time since the registry entry was created. | Verified launch date; count of full market cycles operated through, where determinable. |
| **Community Quality** | Distinct from community *size* — this dimension asks whether a real, engaged base exists, not how large the follower count is. | Never scored from follower/member counts alone (see Anti-Bias Principles) — engagement quality over reach. | Configured, working official channels (today's existing link-completeness signal); genuine, sustained update cadence on those channels, where independently checkable. |
| **Ecosystem Importance** | Not every project needs to be foundational, but a project's role in the Base ecosystem (infrastructure others depend on vs. a standalone app) is real, checkable context. | Descriptive, not a hierarchy of worth — infrastructure importance is a different kind of value than a good standalone app has, not a "better" one. | Number of other registry projects that depend on/integrate with this one; category (`infrastructure`/`oracle`/`bridge` categories carry structurally different ecosystem roles than `meme`/`gaming`, as fact, not judgment). |
| **Data Quality** | Distinct from Confidence (which measures *this engine's* trust in its own assembled data) — this asks whether the *project itself* publishes consistent, verifiable information. | A project-level trait; a stale/inconsistent registry record about an otherwise-excellent project is Base Radar's own data-quality gap, not the project's. | Cross-provider consistency (does CoinGecko and DefiLlama data agree); registry field freshness. |
| **Operational Maturity** | Whether a project runs like a durable business/protocol, versus an early, still-forming effort. | Composite context from Longevity + Developer Activity + Governance + Documentation together — never a standalone score of its own (see "Metric-to-Score Guidance"). | The same underlying evidence as its component dimensions, read together. |

## 4. Healthy Project Definition

Objectively, a healthy project is one where:
- Security shows no known unresolved critical/high finding.
- Liquidity is proportionate to its claimed scale and TVL.
- Developer Activity shows real, recent, recurring commits (not a single
  burst).
- Governance (where one exists) shows genuine, ongoing participation, or
  the project honestly discloses it has none.
- Transparency and Documentation are both substantively present.
- TVL Stability shows no unexplained, extreme swing.
- Data Quality is consistent across independent providers.

No single dimension alone determines health — a project weak in one area
(e.g. no revenue, by design) can still be healthy if every other real
signal is strong.

## 5. Risky Project Definition

- **Early warning indicators:** a sudden stop in developer activity after
  a period of real activity; TVL/liquidity withdrawing faster than
  organic market conditions would explain; a governance space going silent
  after being active.
- **Structural weaknesses:** single-maintainer projects with no
  succession evidence; no disclosed audit for a project handling
  meaningful TVL; unverified contracts.
- **Operational risks:** stale data across every provider simultaneously
  (the project itself may have gone dark, not just Base Radar's read of
  it); no working official channels.
- **Governance risks:** concentrated voting power with no disclosed
  rationale; governance space configured but permanently inactive.
- **Liquidity risks:** liquidity disproportionately thin relative to
  claimed TVL or market cap; liquidity concentrated in a single,
  unverified pool.
- **Security risks:** unverified contracts; any disclosed unresolved
  critical/high audit finding; mint/pause/freeze authority present with no
  disclosed governance control over it (see Trusted Project Framework's
  "Future Enhancements" — not automated in this stack today).

## 6. Trustworthy Project Definition

- **Increases trust:** independently-corroborated identity; disclosed,
  named audits; consistent data across independent providers; genuine
  transparency about known limitations (a project that discloses its own
  gaps honestly is more trustworthy than one that discloses nothing and
  appears flawless by omission).
- **Reduces trust:** any contract privilege exercised without disclosure;
  data that contradicts itself across sources; unexplained silence
  following a previously active governance/development cadence.
- Trust, in this framework, is always evidence-accumulated — never
  granted by a project's own claims about itself alone (Guiding Principle
  3 from the Trusted Project Framework, restated here since it governs
  quality evaluation identically).

## 7. Attractive Investment Characteristics

*(Descriptive only — this section names characteristics commonly
associated with high-quality projects in the research reviewed. It is not
financial advice and this framework never recommends a specific
investment action.)*

- **Sustainable growth** — adoption trend driven by retained, returning
  usage, not a one-time spike (the opposite of the researched "hype trap"
  pattern).
- **Strong, real adoption** — active-address and usage trends corroborated
  across more than one independent read, not a single provider's number
  taken alone.
- **Transparent governance** — a real, checkable mechanism, actively used,
  with disclosed participation.
- **Long-term builder signal** — sustained developer activity across
  multiple market cycles, not concentrated in a launch window.
- **Healthy liquidity** — proportionate to real scale, spread across
  multiple independent venues.
- **Revenue generation** — a real, disclosed fee/revenue mechanism
  actually capturing value, where the project's model calls for one.
- **Developer activity** — real, recent, recurring — per the Electric
  Capital-style rolling-window discipline in "Evaluation Dimensions."
- **Ecosystem importance** — other real projects building on or
  integrating with it, a structurally different kind of durability than
  a standalone app has.

## 8. Unsuitable Project Characteristics

- **Abandoned** — no developer activity, no governance activity, no
  official-channel activity for a sustained period (see Trusted Project
  Framework's Registry Maintenance Policy for the specific stale-detection
  window).
- **No liquidity** — cannot be meaningfully traded/exited.
- **No users** — no real on-chain activity beyond the project's own
  deployment transactions.
- **No documentation** — nothing substantive beyond marketing copy.
- **No development** — a repository that exists but shows no real,
  recurring activity.
- **Centralized ownership with undisclosed privilege** — mint/pause/
  freeze/blacklist authority present and undisclosed (see Trusted Project
  Framework's Scam Prevention, which governs the harder, fraud-adjacent
  case; this framework's concern is the honest-but-still-risky
  centralization case even absent fraud intent).
- **Repeated exploits** — any confirmed history of security incidents
  without a disclosed, credible remediation.
- **Wash trading** — volume with no independent corroboration across
  venues or on-chain activity.
- **Opaque governance** — a governance mechanism exists on paper but shows
  no real, disclosed participation or decision history.

## 9. Metric-to-Score Guidance

Product guidance only — **not a scoring-engine redesign.** Names which
Evaluation Dimensions are directionally relevant to each existing score
surface, for a future implementation PR to weigh against real engineering
constraints. No weight, formula, or threshold is prescribed here.

| Existing score surface | Dimensions this framework says are relevant |
| --- | --- |
| **Health Score** | Security, Liquidity, TVL, Developer Activity, Governance — already substantially aligned with today's implementation (`scoring.ts`'s TVL/GitHub/liquidity/momentum inputs cover a meaningful subset of these already). |
| **Confidence Score** | Data Quality, Transparency — this framework recommends Confidence continue to measure *data trustworthiness specifically*, not be expanded to also carry project-quality dimensions; the two questions should stay separable (see "Executive Summary"'s finding on the current 50/50 AI Rating blend). |
| **AI Grade** | Should draw from more than Health+Confidence alone once Revenue/Adoption/Longevity signals exist — this framework does not prescribe a new formula, only flags that today's flat 50/50 blend conflates two different questions and is a real candidate for future reconsideration. |
| **Risk Rating** | Security, Liquidity, Governance, Data Quality — already well-aligned with today's 7-contributor implementation; Centralization remains a real, named gap (see Trusted Project Framework's Future Enhancements — same underlying data-source gap affects both frameworks identically). |
| **Project Ranking / Executive Ranking** | Should be able to rank on more than one dimension at a time (e.g. "highest Developer Activity" vs. "highest TVL" as genuinely different, valid rankings) rather than collapsing everything into one composite number — matches the Universal Project Card Standard's own Category Rank precedent of ranking by one real, named metric at a time. |

## 10. Evidence Hierarchy

Highest to lowest weight, adopted directly from the Messari/Coinbase
"public, independently-verifiable information only" discipline confirmed
during this Standard's research:

1. **On-chain data** — the hardest evidence to fabricate; a transaction
   either happened or didn't.
2. **Official documentation** — authoritative for what a project *claims*
   to be, corroborated against on-chain reality wherever possible.
3. **Verified provider APIs** (CoinGecko, DefiLlama, Blockscout, GitHub,
   Snapshot) — real, but inherits that provider's own data-quality limits;
   never treated as infallible.
4. **Disclosed audits** — real, but scoped to what was actually reviewed
   and when; an audit from six months ago says nothing about code shipped
   since.
5. **Governance records** — real decision history, weighted below on-chain
   data since governance can be configured without being genuinely active.
6. **GitHub activity** — real, but a private/off-platform development
   process would understate this without necessarily indicating anything
   negative.
7. **Independent research** (Messari, Coinbase Research, Delphi Digital,
   Electric Capital, etc.) — credible but secondary; these firms' own
   published methodologies are themselves *evidence about the evidence*,
   not primary facts about the project.
8. **Community discussion** — directionally useful, never itself a fact —
   matches Arkham's own documented "Intelligence Oracle Problem" caution
   about crowdsourced input.
9. **Social media** — lowest-weight real signal; see Anti-Bias Principles
   for why raw follower/engagement counts specifically are excluded
   entirely, not just down-weighted.
10. **Rumors** — never evidence; never a scoring input under any
    circumstance.

## 11. Unknown Data Policy

Directly restates and extends this codebase's own already-proven
convention (`ScorecardTile.severity: "unknown"`, `score: null`,
`scoreLabel: "Not enough verified data"`):

- **Never fabricate.** A missing data point is reported as missing, never
  estimated to "fill in" a score.
- **Never assume.** The absence of a signal is not itself evidence of a
  negative outcome (e.g. no disclosed audit is not the same claim as "this
  project is unsafe") — it's evidence of nothing beyond its own absence.
- **Never infer an unsupported conclusion.** A real signal in one
  dimension is never used to infer a value for an unrelated, unmeasured
  dimension (e.g. high TVL never implies strong governance).
- Every "unknown" state names *why* it's unknown, in real, specific terms
  (matching this codebase's own existing `RiskContributor.detail` pattern
  — "No 7-day TVL history available," never a generic "Data unavailable").

## 12. Anti-Bias Principles

What must never influence a quality evaluation, and why — each grounded
in this Standard's own research, not assertion:

- **Follower count** — inflatable to an arbitrary number ("a $50 Discord
  bot order," per this Standard's research); tells you nothing about real
  user activity.
- **Artificial engagement** — research confirms bot activity is
  substantial and industrially available; engagement numbers alone cannot
  distinguish real interest from purchased activity.
- **Paid marketing** — buys attention, not usage; a well-funded marketing
  budget is orthogonal to whether the underlying protocol is well-built or
  well-run.
- **Celebrity endorsements** — zero demonstrated correlation with
  technical or operational quality in the research reviewed; independently
  flagged as a real, recurring scam-adjacent pattern in rug-pull research.
- **Token price alone** — price reflects market sentiment and liquidity
  conditions at a moment in time, not the underlying project's health;
  this is precisely why Health and Momentum are already kept as separate
  signals in this stack, a precedent this framework reinforces rather than
  overrides.
- **Short-term hype** — a real signal exists (Momentum), but hype and
  sustained quality are different things; a spike with no retained
  adoption behind it is the researched "hype trap" pattern, a caution
  flag rather than a positive signal.
- **Temporary volume spikes** — vulnerable to wash trading; only
  corroborated, sustained, multi-venue volume is treated as evidence of
  anything.
- **Memes / narrative virality** — can *coincide* with a genuinely strong
  community, but virality itself proves nothing measurable about quality.
- **VC reputation** — a real signal about access to capital, not about
  the project's own technical or operational quality; a well-funded
  project can still be poorly run, and a bootstrapped one can be
  excellent.

## 13. Future Enhancements

Real gaps identified during this research, recorded only — no
implementation proposed:

1. **Revenue/fee tracking** — no signal exists anywhere in this stack;
   Token Terminal's core methodology has no analog here today. (Same gap
   independently identified in the Trusted Project Framework's own Future
   Enhancements — worth resolving once, for both Standards.)
2. **Adoption/network-effects data source** — no active-address, retention,
   or usage-trend tracking exists anywhere in this stack.
3. **Longevity/track-record derivation** — no computed "time since
   verified launch" or "market cycles survived" metric exists; the raw
   data (`lifecycle.discoveredAt`, where set) exists but isn't used this
   way today.
4. **Ecosystem-importance signal** — no cross-project dependency/
   integration graph exists in this registry.
5. **Cross-provider data-quality reconciliation** — no automated check
   compares e.g. CoinGecko vs. DefiLlama figures for the same project and
   flags disagreement (same underlying gap the Trusted Project Framework's
   "Provider reconciliation" policy names).
6. **A revisited AI Rating formula** — this Standard's own finding (a flat
   50/50 Health+Confidence blend conflates two different questions) is
   recorded here as a real candidate for future reconsideration, not
   decided or implemented by this document.
7. **A richer AI Recommendation** — today's risk-level-only lookup table
   is a real, confirmed gap between what the feature's name implies and
   what it currently does.
8. **Electric-Capital-style rolling-window developer metrics** — this
   stack's current commit/contributor/release counts are a real but
   much smaller-scale analog; adopting a formal rolling-window
   (Monthly/Full-Time/Part-Time Developer) definition is a concrete,
   directly-adoptable future refinement.

---

## Provenance

Every codebase claim in this document is drawn from a direct,
current-session reading of `lib/intelligence/scoring.ts`,
`lib/intelligence/confidence.ts`, `lib/intelligence/scorecard.ts`,
`lib/intelligence/report.ts`, and `lib/intelligence-engine/rule-based-provider.ts`.
Every industry-practice claim is drawn from research conducted for this
Standard (CoinGecko, CoinMarketCap, DefiLlama, Messari, Coinbase Research,
Base.org, Token Terminal, Arkham Intelligence, Delphi Digital, Electric
Capital Developer Report, and independent research on vanity metrics and
adoption/retention measurement) — see the corresponding chat response this
document was delivered alongside for full source citations. Neither
category is asserted from unverified memory.
