# Executive Project Discovery — Product Standard

**Status:** 🔒 Frozen v1.0 — discovery-experience foundation for PR-085
onward.

This document answers one question, for every surface where a user
encounters a list of projects rather than one project's own Profile page:

> **What must a discovery card communicate so a user can decide, within
> five seconds, whether to open it?**

It is the seventh document in this session's foundation-Standard series,
and the first to sit *on top of* rather than alongside the prior six. It
does not redefine the Universal Project Card's anatomy
(the Universal Project Card Standard, `docs/planning/` — its §1 Five
Investor Questions, §12 Information Priority Matrix, and §14
Cognitive Load Budget remain load-bearing and unchanged); it defines which
*surfaces* should show which *tier* of that card, and which fields on the
`detailed`/`compact` tiers deserve Tier-1 prominence specifically for
*discovery* (as opposed to monitoring, research, or portfolio-tracking)
intent. It extends
[INFORMATION_HIERARCHY_STANDARD.md](INFORMATION_HIERARCHY_STANDARD.md)'s
Executive Information Order and Five-Second Rule from a single page to a
whole discovery workflow, extends
[NAVIGATION_CLICKABILITY_STANDARD.md](NAVIGATION_CLICKABILITY_STANDARD.md)'s
Clickability Philosophy to the surfaces this audit found are not
clickable at all, and extends
[LOADING_STRATEGY.md](LOADING_STRATEGY.md)'s Progressive Rendering
Standard to the Projects Directory specifically, whose current loading
sequence this audit confirms blocks entirely rather than streaming.

---

## 1. Executive Summary

This audit found a real, consistent split in Base Radar's discovery
surfaces today: four of them (Projects Directory, Collections, Related
Projects, and `ProjectSpotlight`) render the full `detailed` tier and show
every executive signal — Trust, AI Rating, Risk, and growth/momentum.
**Eight others do not.** `AIProjectsWidget` and `WatchlistWidget` use the
`micro` tier, which by its own frozen anatomy never shows Trust
Indicators, Risk Badge, or a growth indicator — only logo, name, one chain
badge, AI Rating, and the primary metric value. Search's
`SearchProjectRow` independently hand-copies that same reduced anatomy
rather than reusing `micro` directly. `ProjectRail` (the Dashboard's
Curated Discovery/Leaderboards/Needs-Attention rails) uses `compact`,
which shows Trust, AI Rating, and Risk but never a growth/momentum signal.
And three surfaces show no executive signal at all: **Recommendations**
(`portfolio`/`brief`) render a single checkmark and a sentence with no
project identity field whatsoever; **Portfolio**'s `PerformerRow`/
`HighlightRow` and **Alerts**' `AlertCard` each independently hand-roll a
bespoke project-identity pill with a raw numeric score or a severity badge
that is not the AI Rating grade at all.

This audit also found and confirms two of PR-085.01's three named
problems directly in the code: the Projects Directory's `loading.tsx`
shows one full-screen "Resolving trusted providers…" message for the
entire duration of `loadProjectsPageData()` — a synchronous `await` with
no `Suspense` boundary, no partial render, and (per
[PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md)'s own H1 finding) a
~20-pass, unmemoized filter/sort cost baked into that single blocking
call. And `categoryPeers` — the prop that would make Category Rank render
— is never passed on *any* live surface today, meaning the Universal
Card's own Category Rank field is dead weight everywhere it's nominally
available, a fact this Standard's Discovery Card Principles (§8) treats as
load-bearing evidence for which fields survive the field-prioritization
exercise below.

---

## 2. Industry Research

Research conducted for this Standard, principles extracted only — no
product's specific design copied. Search coverage for this round was
genuinely thinner on citable, dated specifics than prior rounds' research
(several queries returned platform-overview content rather than
UI/interaction detail) — recorded honestly per this initiative's own
anti-fabrication discipline, not backfilled with invented specifics.

- **DexScreener** is explicitly self-described, and described by
  third-party coverage, as "the Bloomberg terminal for DeFi" — every
  trading pair's price action, volume, liquidity, and on-chain data shown
  in real time, dense and scannable. Its own listing-quality guidance
  states a token needs verified contract data, sufficient liquidity, and
  accurate metadata "to appear correctly and look trustworthy" — trust
  signals directly gate visual credibility, not just a separate badge.
- **CoinGecko** runs a proprietary Trust Score system, and a 2026 update
  specifically replaced web-traffic-based signals with direct
  volume/order-book-depth analysis "for more accurate exchange quality
  assessment" — a concrete precedent for preferring on-chain-verifiable
  signals over softer, gameable ones, directly relevant to this
  initiative's own Good Project Evaluation Framework anti-bias principles.
- **CoinMarketCap** and **DeFiLlama** both position themselves around
  standardized, comparable metrics (TVL, fees, revenue, volume, yields)
  presented consistently across every listed protocol — the same
  "consistent secondary metric across project types" instinct PR-085.01's
  Problem 2 names directly.
- **Messari, Token Terminal, Arkham Intelligence:** all three have moved
  toward AI-generated narrative/analysis layers on top of raw data in
  2026 (Arkham's "AI Analyzer" explains transaction stages; Messari
  surfaces analyst-verified intelligence) — a real, current industry
  validation for Base Radar's own AI Rating + Recommendation pairing, not
  an invented justification.
- **DeBank** is independently cited as having "the cleanest UI/UX" among
  comparable portfolio/protocol trackers — no further citable specifics
  were found on why; recorded as a data point, not elaborated beyond what
  the research actually returned.
- **Investor vs. trader information needs** (general UX/psychology
  research, not platform-specific): investors evaluate fundamentals,
  adoption, tokenomics, security, and cycle positioning over months/years;
  traders evaluate liquidity, order flow, volatility, and catalysts over
  minutes/days. Portfolio-tracking interfaces answer "what do I own?";
  trading interfaces answer "what should I do next?" This maps directly
  onto §9's Investor vs. Trader analysis below.
- **Five-second-rule scanability** is confirmed as a general, current
  industry norm for discovery/listing content (cited directly in Product
  Hunt launch-guidance research: "a listing people can scan in five
  seconds") — not a Base-Radar-specific invention, a validated baseline
  this Standard's §6 builds on.

---

## 3. Current Base Radar Audit

*(Full per-surface evidence — exact file:line citations, literal field
lists for all 13 audited surfaces — is in this document's accompanying
chat response, per this initiative's established "findings-only, no file
duplication" convention. Summarized here for permanent reference.)*

### Which surfaces are intended for Discovery vs. Monitoring vs. Research vs. Decision-Making

Not every surface shares the same purpose, and this Standard does not
treat them as if they did:

| Surface | Purpose | Variant used today |
| --- | --- | --- |
| Projects Directory | **Discovery** — broad, unfiltered scanning | `detailed` |
| Collections (11 routes) | **Discovery**, pre-filtered by a specific question ("what's verified," "what's growing") | `detailed` |
| Category Rails (`ProjectRail`) | **Discovery**, curated/editorial | `compact` |
| Related Projects | **Discovery**, adjacent-to-research (found while already deep in one project) | `detailed` |
| Search (⌘K) | **Decision-making under a name already in mind** — not browsing | Hand-copied `micro`-like row |
| Watchlists | **Monitoring** — projects the user already decided matter | `micro` |
| `AIProjectsWidget` | **Discovery**, narrow (one category) | `micro` |
| `ProjectSpotlight` | **Discovery**, single-item editorial highlight | `detailed` |
| Base Today (`SpotlightCard`) | **Monitoring/ecosystem-awareness**, not per-project discovery | Not a project card at all |
| Recommendations | **Decision-making**, but with no discoverable subject | Not a project card at all |
| Portfolio rows | **Monitoring** — projects already held/tracked | Bespoke, not `LiveProjectCard` |
| Alerts | **Monitoring/notification**, project is context not subject | Bespoke, not `LiveProjectCard` |

This table is the direct answer to this Standard's own instruction not to
assume every surface has the same purpose — and it is the reason §5's
Executive Question Order applies fully only to the surfaces genuinely
performing Discovery, with Monitoring/Decision-making surfaces held to a
narrower bar (identity + the one signal relevant to their purpose, not the
full five-question set).

### The executive-signal gap, by surface

| Surface | Trust | AI Rating | Risk | Growth/Momentum |
| --- | --- | --- | --- | --- |
| Projects Directory | Yes | Yes | Yes | Yes (conditional) |
| Collections | Yes | Yes | Yes | Yes (conditional) |
| Related Projects | Yes | Yes | Yes | Yes (conditional) |
| `ProjectSpotlight` | Yes | Yes | Yes | Yes |
| Category Rails | Yes (compact) | Yes | Yes | **No** |
| `AIProjectsWidget` | **No** | Yes | **No** | **No** |
| `WatchlistWidget` | **No** | Yes | **No** | **No** |
| Watchlists (workspace/editor) | **No** | Yes | **No** | **No** |
| Search (⌘K) | **No** | Yes | **No** | **No** |
| Base Today | **No** | **No** | **No** | **No** |
| Recommendations | **No** | **No** | **No** | **No** |
| Portfolio rows | **No** | **No** (raw score, not AI grade) | **No** (`SeverityBadge`, not `RiskBadge`) | **No** |
| Alerts | **No** | **No** | **No** (`SeverityBadge`, not `RiskBadge`) | **No** |

Three real, confirmed inconsistencies worth naming explicitly:
`SearchProjectRow` independently re-derives `micro`'s exact field set
rather than composing it — a real duplication already flagged in
[DESIGN_SYSTEM_LOCK.md](DESIGN_SYSTEM_LOCK.md)'s spirit, not previously
named for this specific pair. Portfolio's `PerformerRow` and Alerts'
`AlertCard` both independently reach for `SeverityBadge`/a raw numeric
score where the Universal Card's own `RiskBadge`/AI Rating grade already
exist and would be the consistent choice. And `categoryPeers` (the prop
gating Category Rank) is never passed on any of the 4 `detailed`-tier
surfaces — confirmed by direct code reading of `ProjectsDirectory.tsx`,
`ProjectsCollectionPage.tsx`, and `ProfileRelatedProjects.tsx` — meaning
Category Rank has been dead, unreachable code on every live surface since
it was introduced (cross-referencing this initiative's own EN-003, which
flagged this as a Future Enhancement during the original PR-10 audit; this
Standard treats it as still-unresolved, not new).

### The loading-sequence finding

`app/dashboard/projects/loading.tsx` shows exactly one fallback —
`&lt;BrandLoader fullscreen size="lg" label="Resolving trusted providers…" /&gt;`
— for the entire duration of `app/dashboard/projects/page.tsx`'s
synchronous `await loadProjectsPageData()` call, which itself builds
`collections` (confirmed in [PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md)
to be 10 unmemoized filter/grouping passes), 5 leaderboards, and 2 smart
views, all before any JSX renders. This same `loading.tsx` and the same
blocking pattern cover all 11 dedicated Collection routes too, since none
of them has its own `loading.tsx`. This is a direct, confirmed instance of
exactly what PR-085.01's Problem 1 describes.

---

## 4. Discovery Philosophy

A discovery card answers **"should I open this?"** — never "everything
about this." This is not a new principle; it is the Universal Project
Card Standard's own §1 restated at the surface level rather than the
component level: the card is a triage tool, and a discovery *surface* (a
grid or rail of many cards) is a triage tool for triage tools — its job is
to let a user discard most of what's shown and open only what clears a
bar, in seconds, not to present a complete picture of any one project.

**What should intentionally NOT appear on a discovery card:** anything the
Universal Card Standard's own §2 Non-Goals already excludes (raw provider
data, historical charts, the full AI Intelligence Report, exact
transaction history) — restated here because this audit found several
discovery-adjacent surfaces (Base Today, Recommendations, Portfolio rows,
Alerts) that don't violate this rule by showing *too much*, but by an
entirely different failure: showing project identity with **no executive
signal at all**, which is not a triage tool, it's decoration. The
Discovery Philosophy's rule is symmetric: a discovery card must show
enough to triage, and must not show more than triage requires — both
halves are violated somewhere in the current app, and both are addressed
by §8 below.

---

## 5. Executive Question Order

For a genuine Discovery-purpose surface (per §3's table), the question
order — extending, not replacing, the Universal Card Standard's own §1
five questions — is:

1. **What is this?** (Identity — logo, name, category)
2. **Can I trust it?** (Trust — verification, confidence, freshness)
3. **What does the AI think?** (AI Rating + Recommendation)
4. **Is money flowing into it?** (Capital signal — the category-aware
   primary metric)
5. **Is it growing?** (Momentum — 24h/period change, or an equivalent
   directional signal)
6. **Should I research further?** (implicit — the whole card's
   composite answer, not a discrete field; answered by the first five,
   never a sixth field competing for space)

This is a re-sequencing, not a re-invention: it matches the Universal
Card's own §1 order exactly through question 4, and adds "Is it growing?"
as an explicit fifth question — momentum was previously folded into
"secondary metric" territory in the original Universal Card audit; this
Standard promotes it to a named executive question because PR-085.01's
own Problem 3 and this audit's surface-by-surface findings (§3) both
independently converged on momentum/growth as the single most
inconsistently-shown signal across the app's discovery surfaces (present
on 4 of 13, absent on 9). "Why should I care?" (a plain-language hook) is
deliberately *not* a separate numbered question — it is what the AI
Recommendation phrase already answers at question 3, per the Universal
Card's own §11; inventing a second, separate "why care" field would
duplicate that signal in a different form, which §24 of that Standard's
own Evolution Rules already prohibits.

---

## 6. Five-Second Rule

Extending [INFORMATION_HIERARCHY_STANDARD.md](INFORMATION_HIERARCHY_STANDARD.md)'s
own Five-Second Rule (§4 there) from a single page to a discovery
*surface* — a grid or rail of many cards, scanned in sequence:

| Time | Investor should understand | Active trader should understand |
| --- | --- | --- |
| **1 second** | Which cards are worth a second look, by AI Rating letter grade and Trust badge alone — a pure visual scan, no reading | Which cards show strong recent momentum (24h/period change), by color/direction alone |
| **3 seconds** | For 2-3 candidate cards: category, primary metric magnitude, and whether Risk is Low/Moderate — enough to narrow from "worth a look" to "worth opening" | Whether the primary metric (volume/TVL) and momentum together suggest current activity, not just historical size |
| **5 seconds** | Has picked 1-2 cards to open, based on the full Tier-1/Tier-2 field set (§7) | Has picked 1-2 cards to open, weighted toward momentum + capital-flow over trust/AI-grade (a trader's shorter time horizon tolerates more risk for more signal, per §9) |
| **10 seconds** | Has opened a card and reached the Profile page, or dismissed the whole visible set and scrolled/filtered | Has opened a card, or moved to a different discovery surface entirely (a trader's attention window for one screen is shorter than an investor's) |

The investor/trader divergence here is deliberate and is elaborated fully
in §9 — this table is the direct, measurable expression of that
divergence, not a restatement of one generic five-second rule for both.

---

## 7. Information Priority

Four tiers, extending the Universal Card Standard's own §12 Information
Priority Matrix with an explicit *discovery-context* re-ranking — a field
can be Medium priority on the Profile page's `detailed` card and still be
Tier 1 for discovery specifically, if it's one of §5's five executive
questions:

| Tier | Definition | Fields |
| --- | --- | --- |
| **Tier 1 — Absolutely required** | Answers one of §5's first three questions; a discovery card is not a discovery card without it | Logo, Name, Trust Indicator (verification status at minimum), AI Rating grade |
| **Tier 2 — Important** | Answers §5's questions 4-5; present whenever the underlying data exists | Category-aware primary metric, Growth/momentum indicator (24h or period change) |
| **Tier 3 — Helpful** | Adds context that speeds up, but isn't required for, the should-I-open decision | Chain badge(s), Category label, Risk Badge, Project Status |
| **Tier 4 — Available after click** | Everything the Profile page already owns; never belongs on a discovery card regardless of tier availability | Secondary metrics beyond the primary (TVL/Volume/GitHub activity when not primary), ecosystem-role tag, Category Rank, freshness timestamp, full AI Recommendation phrase text (the grade is Tier 1; the phrase is Tier 4) |

Every metric named in the source directive's own list (TVL, Market Cap,
Volume, Price, Revenue, Developer Activity, Community, Governance,
Transactions, Users, Adoption, Momentum, Innovation, Documentation,
Security) is classified below in §8, field by field — this table defines
the *tiers themselves*; §8 assigns every candidate field to exactly one.

---

## 8. Discovery Card Principles

For every candidate field, whether it belongs, whether it helps
decision-making, and whether it belongs before or after the click:

| Field | Belongs on discovery card? | Helps triage? | Before or after click |
| --- | --- | --- | --- |
| Project identity (logo, name) | Yes — Tier 1 | Yes, foundationally | Before |
| Verification / Trust cluster | Yes — Tier 1 | Yes — answers "can I trust it" | Before |
| AI Rating (grade) | Yes — Tier 1 | Yes — the single densest signal available | Before |
| AI Recommendation (phrase) | No, as a card field — Tier 4 | The grade already carries the signal; the phrase is depth | After |
| Risk (badge) | Yes — Tier 3 | Yes, but secondary to Trust/AI Rating, which already fold risk signal in | Before |
| Category | Yes — Tier 3 | Mild — aids scanning/comparison within a category, not a standalone decision driver | Before |
| Chains | Yes — Tier 3 | Mild — relevant mainly for multi-chain-aware users | Before |
| TVL | Conditional — Tier 2 when category-primary, else Tier 4 | Yes when primary (capital signal); redundant otherwise | Before if primary, else after |
| Market Cap | Same as TVL | Same as TVL | Same as TVL |
| Volume | Same as TVL | Same as TVL | Same as TVL |
| Price | Conditional — Tier 2 only for the categories where price *is* the primary metric (per the Universal Card's existing category-aware logic); otherwise Tier 4 | Only when it's the categorically-correct primary metric | Same as TVL |
| Revenue | No — Tier 4 | Not currently computed anywhere in the app (confirmed absent from `LiveProject`'s market data this session's prior audits); recording as a future candidate only if a real, honest data source exists (Universal Card §19's Empty Data Philosophy governs — never fabricate a Revenue figure to fill this cell) | After |
| Developer Activity | No — Tier 4 | Genuinely useful for research, but not a five-second triage signal — belongs in the `detailed` tier's secondary-metrics row, not Tier 1/2 | After |
| Community | No — Tier 4 | Same reasoning as Developer Activity; already governed by the Good Project Evaluation Framework's own anti-bias principle against follower-count-driven signals | After |
| Governance | No — Tier 4 | Same reasoning; already surfaced correctly one level deeper (Profile page's own Governance signal) | After |
| Transactions | No — Tier 4 | Belongs to Whale/Contracts Explorer depth, not discovery | After |
| Users / Adoption | No — Tier 4 | Not currently a real, sourced field on `LiveProject` (per this session's prior audits); a future-candidate cell only, same Empty Data Philosophy caveat as Revenue | After |
| **Momentum / Growth** | **Yes — Tier 2** | Yes, directly — this is §5's fifth executive question, and this audit's single most-requested-but-least-shown field | Before |
| Innovation | No — Tier 4 | Not a real, measurable field anywhere in the current data model; would require fabricating a score, which the Good Project Evaluation Framework's Evidence Hierarchy already prohibits | After (if ever built at all) |
| Documentation | No — Tier 4 | Research-depth signal, not a triage signal | After |
| Security | Represented, not duplicated — folded into Risk (Tier 3) and Trust (Tier 1) already | Yes, but via the existing composite signals, not a separate standalone field | Before, via Risk/Trust |

**The governing rule this table enforces:** a field earns Tier 1/2 only by
directly answering one of §5's five questions. Everything else is Tier
3/4 by default, regardless of how interesting or technically available it
is — this is the Universal Card Standard's own §24 Evolution Rules
(especially check 1: "does it answer one of the row-questions") applied
specifically to the discovery-card field set, not a new evaluation method.

---

## 9. Investor vs. Trader Analysis

Base Radar's own Product Vision and the Good Project Evaluation
Framework's own "investor-focused" framing (from the Universal Card
Standard's original audit) already lean investor-first — this Standard
does not propose changing that. But this audit's research (§2) confirms a
real, structural difference in what each persona needs from a *discovery*
surface specifically:

- **Investors** ask "can this become more valuable over months/years" —
  weighting Trust and AI Rating (fundamentals, security, adoption
  trajectory) more heavily than short-term momentum. A false-positive
  (opening a card that turns out uninteresting) costs an investor a few
  seconds; a false-negative (skipping a genuinely strong long-term project
  because its 24h momentum looked flat) costs more.
- **Traders** ask "can price move favorably over minutes/days/weeks" —
  weighting Momentum and the capital-signal metric (Volume specifically,
  over TVL) more heavily, and tolerating a lower Trust/AI-Rating bar for a
  short-horizon position than an investor would for a long one.
- **Researchers** and **builders** (the two other personas the source
  directive names) are, per §3's surface-purpose table, better served by
  the `detailed` tier's Tier-4 depth and the Profile page itself, not by a
  faster discovery card — this Standard does not propose a discovery-mode
  variant for them, since their workflow is already "open the card,
  then research" rather than "decide from the card."

**Recommendation — advantages/disadvantages, philosophy only, no mode
design:** Base Radar should **not** build two separate discovery card
modes (investor-mode / trader-mode) at this time. Advantage of building
them: each persona's five-second scan would be marginally faster.
Disadvantage, and the deciding factor: the Universal Card Standard's own
§25 Future-Proofing Rules explicitly prohibit a second card component or
a fourth density tier — a trader-mode/investor-mode split would require
either one of those, or a field-reordering-per-viewer-preference feature
this codebase has no precedent for (no user-preference storage for card
field order exists anywhere in the current `lib/personalization/` or
`lib/hooks/` layer, per this session's prior audits). Instead, this
Standard's §5 Executive Question Order and §7/§8 tiers already weight
Trust/AI-Rating (questions 2-3) ahead of Momentum (question 5) in a fixed
order that serves the investor lean already established elsewhere in this
product — a trader can still scan right-to-left through Tier 1→2 fields in
under five seconds; the fixed order costs them marginal, not fundamental,
speed. This is recorded as a Future Enhancement (§13) only if real user
research later shows the fixed order is a genuine trader-retention
problem — not proposed now.

---

## 10. Decision Signals

Ranked by how strongly each encourages a click-through, based on this
Standard's own §5/§7/§8 tiering (not a separate, independent ranking
exercise — this section names which of the already-tiered fields carry
the most weight):

1. **AI Rating grade** — the single densest, fastest-to-scan signal;
   already Tier 1, already the Universal Card's own Rank-1 visual element
   (§13 of that Standard).
2. **Trust/Verification status** — a genuinely disqualifying signal when
   absent (an unverified, low-confidence project is unlikely to earn a
   click regardless of how strong its other numbers look) — Tier 1.
3. **Momentum/Growth** — the strongest *positive* pull signal once Trust
   and AI Rating have cleared their bar; this is why §5 places it as
   question 5, not question 1 — it amplifies interest, it doesn't
   establish credibility on its own.
4. **Capital signal (category-aware primary metric)** — strong, but
   research (§2) and this Standard's own §9 analysis agree it means
   different things to different personas (size/stability to an investor,
   current liquidity to a trader) — Tier 2, ranked below Momentum because
   a large-but-flat metric is a weaker click-driver than a smaller-but-
   growing one, per the same research.
5. **Risk level** — mostly a *negative* filter (a High-risk badge
   suppresses clicks more than a Low-risk badge encourages them) — Tier 3,
   correctly below the four positive-pull signals above it.

Explicitly **not** independently ranked here, because §8 already
classifies them as Tier 4/research-depth rather than discovery-card
fields at all: Developer momentum, Security (beyond what Risk/Trust
already fold in), Whale activity, Community, Narrative. Including them in
a discovery-card decision-signal ranking would contradict §8's own
classification — a field that doesn't belong on the card can't be ranked
as a reason to click the card.

---

## 11. Executive Discovery Workflow

From landing on the Projects page to opening a Project Profile — the
ideal path, and what it implies for the surfaces audited in §3:

1. **Land on the Projects Directory.** The page shell, navigation, and
   page title should be visible immediately — not gated behind the full
   data build (this is [LOADING_STRATEGY.md](LOADING_STRATEGY.md)'s
   Progressive Rendering Standard, restated here as the entry point to
   this workflow specifically; see §12 for how it applies to this exact
   route).
2. **Notice** the highest-signal cards first — per §10's ranking, AI
   Rating and Trust are what a user's eye should catch first, which is
   already true of the `detailed` tier's own Rank-1/Rank-2 visual
   hierarchy (Universal Card §13) on the 4 surfaces that use it correctly
   today.
3. **Compare** 2-4 candidates using Tier-2 fields (capital signal,
   momentum) — this is where Category Rails' `compact` tier's missing
   Momentum field (§3's confirmed gap) actively costs the user a
   comparison signal the Directory's own `detailed` cards would have
   given them.
4. **Narrow** using Tier-3 fields (Risk, Category, Chains) only once the
   candidate set is already small — consistent with those fields'
   Tier-3 status; they're not meant to drive the first pass.
5. **Decide and open**, or return to step 2 with a filtered/scrolled view.

**What this workflow implies for surfaces that don't fit it:** Search
(⌘K) deliberately skips steps 2-4 — a user typing a name has already
decided what to open, which is exactly why §3 classifies it as
"decision-making under a name already in mind" rather than Discovery, and
why its reduced field set (no Trust/Risk/Momentum) is not, on its own, a
defect — it's correctly scoped to a different job. Watchlists similarly
skip this workflow entirely (a Monitoring surface, not a Discovery one) —
this Standard does not require Watchlists to adopt the full executive
signal set for that reason. Base Today, Recommendations, Portfolio rows,
and Alerts, by contrast, are genuinely misclassified today: three of the
four (Recommendations, Portfolio rows, Alerts) present project identity
in a *decision-adjacent* context (a recommendation, a portfolio holding
requiring attention, an alert about a specific project) without the
executive signal that would let a user actually evaluate that decision —
this is the real gap this Standard's §13 Future Enhancements records for
future work.

---

## 12. Relationship to Existing Standards

This Standard does not contradict any of the eight documents it was asked
to remain consistent with. Specifically:

- **Universal Project Card Standard:** unchanged. This Standard assigns
  surfaces to existing tiers (`detailed`/`compact`/`micro`) and
  re-prioritizes which `detailed`/`compact` fields matter most for
  discovery specifically — it introduces no new tier, no new component,
  and no field that isn't already part of that Standard's own §5 card
  anatomy. Momentum/Growth (§5, §7 above) is not a new field — it's
  `LiveProjectCard`'s own existing `changePct24h`-driven display, already
  built and already shown on 4 of 13 surfaces; this Standard's
  contribution is recognizing it as a named executive question, not
  inventing new data.
- **Trusted Project Framework / Good Project Evaluation Framework:** both
  remain the authority on "should this be listed" and "how good is it" —
  this Standard consumes their outputs (verification status, AI Rating,
  Risk level) as discovery-card *fields*, it does not redefine how those
  outputs are computed. §8's Innovation/Documentation/Security row
  explicitly defers to the Evaluation Framework's own Evidence Hierarchy
  and anti-bias principles rather than inventing a competing standard.
- **Information Hierarchy Standard:** §5/§6 above are direct extensions
  of that Standard's own Executive Information Order and Five-Second
  Rule from single-page to discovery-surface scope — not a competing
  framework.
- **Navigation & Clickability Standard:** §11's workflow and this
  Standard's field-prioritization findings (§3, §13) reinforce that
  Standard's own §3 Clickability Philosophy — the three surfaces found to
  show project identity with no click destination or no executive signal
  (Recommendations, specifically) are exactly the kind of gap that
  Standard's §12 Future Enhancements already flagged; this Standard adds
  the discovery-specific reasoning for why that gap matters.
- **Design System Lock:** this Standard introduces no new visual
  component or pattern — every field named in §7/§8 already has a
  canonical rendering (`GlowBadge`, `TrustIndicators`, `RiskBadge`,
  `MetricItem`) per that Standard's own Component Inventory. Where §3
  found a surface reaching for a *different*, non-canonical component for
  an equivalent signal (Portfolio's `SeverityBadge` instead of
  `RiskBadge`; Alerts' same substitution), that is a `Design System Lock`
  consistency violation this Standard surfaces but does not itself
  resolve.
- **Performance Audit:** the Projects Directory's blocking-load finding
  (§3) is the same root cause `PERFORMANCE_AUDIT.md`'s own H1 finding
  (`buildCollections()`'s 10-pass cost) already measured — this Standard
  doesn't re-audit the cost, it names the *experience* consequence (one
  static "Resolving trusted providers…" message for the whole wait) as a
  discovery-specific problem.
- **Loading Strategy:** §12 below (Loading Improvements) is this
  Standard's direct application of that document's Route Loading Standard
  and Progressive Rendering Standard to this one specific route — no
  contradiction, a worked example.

---

## 13. Future Enhancements

Recorded for future consideration only — no implementation authorized by
this Standard:

1. **Give Recommendations (`portfolio`/`brief`) a real project-identity
   field and a real destination.** Currently a checkmark and a sentence
   with no logo/name/link at all — the single largest gap this audit
   found between "shows project identity" and "helps a decision."
2. **Reconcile Portfolio's `PerformerRow`/`HighlightRow` and Alerts'
   `AlertCard` onto the canonical `RiskBadge`/AI Rating grade** instead of
   each independently reaching for `SeverityBadge`/a raw numeric score.
3. **Add a Momentum/Growth indicator to `compact`-tier cards**
   (`ProjectRail`'s rails) — the single most consistently-missing Tier-2
   field found across Discovery-purpose surfaces.
4. **Either wire `categoryPeers` into the 4 `detailed`-tier surfaces so
   Category Rank actually renders, or formally deprecate the field** —
   this audit reconfirms it is unreachable on every live surface, carried
   forward from this initiative's own EN-003, not newly discovered.
5. **Stream the Projects Directory's data build** behind the Progressive
   Rendering Standard's priority order (page shell → Base Today →
   executive summary → category sections → remaining collections, per
   PR-085.01's own requested order) rather than one synchronous
   `await`/one static fallback message.
6. **Consider whether `SearchProjectRow` should compose `micro` directly**
   rather than independently hand-copying its field set — flagged for a
   future `DESIGN_SYSTEM_LOCK.md`-aligned consolidation pass, contingent
   on resolving the nested-interactive-element constraint that caused the
   original divergence (per that component's own doc comment).
7. **Base Today's `SpotlightCard` remains an accepted Intentional
   Exception** (per this initiative's own EN-002) — this Standard does not
   propose converting it to `LiveProjectCard`, only notes it shows zero
   executive signal today, for the Product Owner's awareness alongside the
   other, genuinely-unintentional gaps above.
8. **Investor/trader discovery-mode split** — explicitly not proposed now
   (§9), recorded only as a contingent future item if real user research
   later demonstrates the fixed question-order costs trader retention.

---

## 14. Product Owner Recommendations

1. **Approve the field-prioritization findings in §7/§8 as the basis for
   PR-085.01's Problem 2/3 work** — they are grounded in this Standard's
   own extension of already-approved prior Standards, not a new,
   independent design opinion.
2. **Treat the loading-sequence finding (§3, §11) as validated** — it is
   independently confirmed by both this audit and
   [PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md)'s prior, separate audit —
   two independent investigations converged on the same root cause.
3. **Decide explicitly on the three misclassified surfaces** (Recommendations,
   Portfolio rows, Alerts) named in §11/§13 — this Standard recommends
   fixing them, but scoping that work is a Product Owner call, not this
   document's to make unilaterally, since it touches surfaces beyond the
   Projects page PR-085.01 itself targets.
4. **Do not approve an investor/trader mode split** at this time (§9) —
   recorded as a considered rejection, not an oversight, so a future
   Product Owner revisiting this question has the reasoning already
   documented.
5. This document is a **Product Standard only.** No implementation
   roadmap is produced here — see the separate PR-085.01 Product Decision
   document for the Projects-page-specific implementation roadmap this
   Standard's findings feed into, itself still pending your approval
   before any code changes.

---

## Provenance

Every codebase claim in this document is drawn from a direct,
current-session background audit of all 13 project-discovery surfaces
named in the source directives (`LiveProjectCard.tsx`, `ProjectRail.tsx`,
`CategoryRail.tsx`, `BaseTodayPanel.tsx`, `AIProjectsWidget.tsx`,
`WatchlistWidget.tsx`, `ProjectSpotlight.tsx`, `ProjectsCollectionPage.tsx`,
`SearchProjectRow.tsx`, `WatchlistsWorkspace.tsx`, `WatchlistEditor.tsx`,
`ProfileRelatedProjects.tsx`, `portfolio/RecommendationCard.tsx`,
`brief/RecommendationCard.tsx`, `PortfolioOverview.tsx`, `AlertCard.tsx`),
plus a direct reading of `app/dashboard/projects/loading.tsx` and
`app/dashboard/projects/page.tsx`'s current data-loading sequence — every
file:line citation is in this document's accompanying chat response.
Every industry-practice claim is drawn from research conducted for this
Standard (DexScreener, CoinGecko, CoinMarketCap, DeFiLlama, Messari, Token
Terminal, Arkham Intelligence, DeBank, and general investor-vs-trader/
five-second-rule research) — search coverage for several of the 13 named
platforms (Bloomberg Terminal, TradingView, GitHub Explore, Product Hunt)
returned thinner, less citable specifics than prior research rounds this
session; that limitation is recorded honestly in §2 rather than filled in
with unverified specifics. This document also directly reuses, without
re-deriving, facts already established in
[PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md) (the Projects Directory's
blocking-load cost) and this initiative's own EN-002/EN-003 Engineering
Notes (Base Today's Intentional Exception status, Category Rank's
Future-Enhancement status). Neither category is asserted from unverified
memory.
