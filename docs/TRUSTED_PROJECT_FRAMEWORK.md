# Trusted Project Framework — Product Standard

**Status:** 🔒 Frozen v1.0 — source of truth for all future Project
Registry eligibility/verification work, beginning with PR-085.

This document defines *whether and how* a project earns a place in the
Base Radar Project Registry, and how that trust is maintained over time.
It is a **product** standard — objective, measurable, vendor-neutral, and
independent of implementation. It does not describe how any of this gets
built; a future Implementation Roadmap (mirroring the Universal Project
Card initiative's own Roadmap/Engineering-Notes discipline — see
[docs/planning/](planning/) and [CLAUDE_PR_WORKFLOW.md](CLAUDE_PR_WORKFLOW.md))
does that, separately, later.

This document governs *eligibility and trust* — "should this project be
listed?" For "how good is this already-listed project?" (Health Score,
Confidence Score, AI Grade, Risk Rating, Executive Ranking), see the
separate, complementary [GOOD_PROJECT_EVALUATION_FRAMEWORK.md](GOOD_PROJECT_EVALUATION_FRAMEWORK.md) —
a project can pass every gate in this document and still score anywhere on
that one; the two questions are answered independently.

[PROJECT_REGISTRY.md](PROJECT_REGISTRY.md)
governs the *schema* those decisions get recorded into — this Standard
names what a `lifecycle.state`/`verification.status`/`verificationLevel.level`
transition *should* require; `PROJECT_REGISTRY.md` names what fields exist
to record it. Read both; neither repeats the other.

---

# Purpose

Base Radar's entire value proposition rests on one claim: *what you see
here about a project is real, sourced, and honestly labeled when it
isn't fully known.* A registry that lists anything, or that lists real
projects but can't say how much is actually verified, breaks that claim
silently. This Standard exists so every future registry decision —
adding a project, upgrading its trust level, flagging it, delisting it —
is made against the same objective bar, not a judgment call reinvented
each time.

# Guiding Principles

1. **Objective before subjective.** Every requirement in this document is
   checkable against a real, external, or on-chain fact — never "does
   this feel legitimate."
2. **Honest gradation, never a single gate.** A project is never simply
   "in" or "out" — it occupies a real position on the Lifecycle,
   Verification Level, and Risk axes simultaneously (see "How the axes
   relate," `PROJECT_REGISTRY.md`), and this Standard extends, never
   collapses, that model.
3. **Provider-backed, not self-reported alone.** A project's own claims
   (website copy, socials, whitepaper) establish identity; they never
   alone establish trust. Trust requires at least one independent,
   external corroboration per §"Verification Checklist."
4. **Never fabricate a signal.** Where no real data source exists for a
   category (this Standard's own audit found Centralization/holder-
   distribution has none, today — see the accompanying findings), the
   category is honestly marked unassessed, per the existing `RiskContributor`
   `severity: "unknown"` convention — never a guessed number.
5. **Reversible by default, permanent by exception.** Every negative
   determination (flag, delist, archive) is reversible on new evidence,
   except confirmed fraud (`lifecycle.state: "scam"`), which is permanent
   per this Standard's own Delisting Policy.
6. **Proportionate scrutiny.** A stablecoin issuer moving billions and an
   early-stage protocol with $10k TVL do not need identical diligence
   depth — this Standard scales verification effort to real risk exposure
   (see "Recommended Quality Requirements"), while every project, however
   small, still clears the same objective Minimum Listing Requirements.
7. **Vendor-neutral.** No single external provider (CoinGecko, DefiLlama,
   a specific audit firm) is a hard dependency — every requirement below
   is satisfiable by more than one real, named source, and a provider
   outage never itself disqualifies an otherwise-eligible project.

---

# Registry Philosophy

Extending `PROJECT_REGISTRY.md`'s own stated philosophy ("how much do we
actually know about this project, and how much should a user trust what's
shown") with the question this Standard exists to answer: **on what basis
does a project earn the right to be shown at all, and at what trust level?**

The registry is not a marketing directory. Inclusion is not an endorsement
(matching Base.org's own explicit disclaimer, confirmed during this
Standard's research — "Base does not offer, recommend, endorse, or provide
investment advice, and listings are not endorsements"). A project earns
increasing *visibility and trust signaling* as it clears increasing
*evidence thresholds* — never the reverse.

---

# Project Lifecycle

This Standard's lifecycle is the **eligibility decision process** a
candidate moves through; `lifecycle.state` (`PROJECT_REGISTRY.md`) is the
**registry-record state** that results from it. The two are related but
distinct — a candidate can be rejected and never reach `lifecycle.state`
at all.

| Stage | Question answered | Exits to |
| --- | --- | --- |
| **Discovery** | Does a real, distinct project exist here? | Review, or discarded (not a registry record; no `lifecycle.state` exists yet) |
| **Review** | Does it clear the Minimum Listing Requirements? | Verification, or Rejected (not recorded, unless resubmitted later) |
| **Verification** | How much of the Verification Checklist does real evidence confirm? | Approved (`verificationLevel.level` set per evidence reached) |
| **Approved** | Entry created; `verification.status` set per evidence quality. | Active |
| **Active** | Normal, default state — surfaced everywhere. | Monitored (ongoing), or Archived/Delisted on new evidence |
| **Monitored** | Not a separate lifecycle state — the *ongoing* condition of every Active project, per the Registry Maintenance Policy's cadence, below. | Active (no change found), or Archived/Delisted |
| **Archived** | Base Radar has stopped active tracking, but the record is kept. | Terminal, reversible only by a fresh Review pass |
| **Delisted** | Confirmed fraud, or a sustained, uncorrected Minimum-Requirement failure. | Terminal (fraud: permanent; requirement-failure: reversible on remediation) |

This maps cleanly onto `PROJECT_REGISTRY.md`'s existing `lifecycle.state`
values (`discovered → active ⇄ inactive → archived | duplicate | migrated |
scam`) without requiring any new enum value — "Monitored" is this
Standard's name for the ongoing condition of `active`; "Delisted" covers
both `scam` (fraud, permanent) and a future requirement-failure removal
(which the existing schema would record as `archived`, distinguished from
a discretionary archive by a required `notes` citation — see "Delisting
Policy").

---

# Minimum Listing Requirements

Objective, binary, checkable today against fields `PROJECT_REGISTRY.md`
already defines. **A candidate failing any one of these does not enter the
registry**, regardless of how strong it is elsewhere.

1. **Real, resolvable identity.** A working, HTTPS official website
   (`websiteUrl`) reachable and genuinely representing this project (not a
   placeholder, not parked, not a mismatched project — per
   `PROJECT_REGISTRY.md`'s own documented Clanker/Moonwell mismatch
   precedents).
2. **Deployed and operating.** At least one real, verifiable on-chain
   presence on a chain in `chains` — a live contract address, confirmed
   independently on that chain's block explorer (Basescan/Blockscout for
   Base) — *or*, for a pre-launch/`development`-status entry, a credible,
   dated public announcement from an official source.
3. **Distinct from every existing entry.** Passes registry duplicate
   detection (`findDuplicateMatches()`, `PROJECT_REGISTRY.md`) with no
   match ≥ 70 combined weight against contract address, GitHub, website,
   X/Twitter, or name.
4. **At least one independent, external corroboration.** The candidate
   must be resolvable through at least one of: an official Base ecosystem
   listing, a major aggregator (CoinGecko or DefiLlama) listing, or a
   verified on-chain contract with real transaction history — never
   self-reported claims alone.
5. **No confirmed disqualifying signal present at review time**, per
   "Scam Prevention" and "Fake Project Detection" below.
6. **Minimum required registry fields populated honestly** — `name`,
   `shortDescription`, `description`, `categories` (≥1), `status`,
   `chains` (≥1) — matching `PROJECT_REGISTRY.md`'s existing "Adding a New
   Project" checklist item 1, restated here as an eligibility gate, not
   just a schema requirement.

# Recommended Quality Requirements

Beyond the minimum bar — not required for listing, but required to reach
`verificationLevel.level: "verified"` or higher, and weighted into
`ProjectQualityScore` (`PROJECT_REGISTRY.md`'s existing model). Scrutiny
scales with real risk exposure (Guiding Principle 6): a project with
meaningful TVL/market cap is expected to clear more of these than an
early-stage one.

- **Documentation**: real technical or user documentation exists at a
  stable, official URL (not just marketing copy).
- **GitHub with a specific repository** (`github.repo` set, not org-only —
  matching `PROJECT_REGISTRY.md`'s own existing documented rule that an
  org-only reference is functionally inert).
- **Recent, real development activity** — at least one commit or release
  within a proportionate window for the project's stage (active production
  protocol: 90 days; pre-launch: no requirement).
- **At least one governance mechanism disclosed** — on-chain, Snapshot, or
  documented forum-based decision-making — even if the disclosed answer is
  "none" (an honest "no governance" is a pass on this item; silence is
  not).
- **Liquidity/TVL depth proportionate to claimed scale** — a project
  claiming meaningful adoption with negligible on-chain liquidity is a
  quality flag, not a hard rejection.
- **Audit disclosure** — at least one named, dated audit report from a
  real firm, *or* an explicit, honest statement that none exists yet. See
  "Verification Checklist — Security & Audits."
- **Team transparency** — named, publicly-associated founders/maintainers,
  *or* a credible, non-anonymous organizational entity — see "Fake
  Project Detection."

# Verification Checklist

Every item below is measurable and, where a real provider already exists
in this stack, cites it. Cite the actual instrument used for the
codebase's current attempt at this factor; do not treat that citation as
a claim the current attempt is complete.

| Category | Check | Real evidence source |
| --- | --- | --- |
| **Identity** | Name, description, category are internally consistent with the project's own official materials. | Manual review against `websiteUrl` and official docs (existing `verification.status: "verified"` review process). |
| **Official sources** | Website, docs, and social accounts are all linked from one another (cross-referencing, not isolated claims). | Manual cross-check, per `PROJECT_REGISTRY.md`'s existing "How to verify an identifier" section. |
| **Contracts** | Every registered contract address is independently confirmed on the relevant chain's block explorer, matching the project's own published address if one is stated. | Basescan/Blockscout; this stack's `matchVerifiedContract`/Blockscout provider. |
| **Contract privileges** *(new — gap identified this audit)* | Mint authority, pause/freeze/blacklist functions, and proxy-upgradability are disclosed, whatever the answer. | Block explorer contract-read tab; no automated check exists in this stack today — see "Future Enhancements." |
| **Documentation** | A real, stable documentation URL exists and substantively describes the product (not marketing copy alone). | Manual review. |
| **Team transparency** | Founders/maintainers are named and independently corroborated (LinkedIn, prior project history, conference appearances) — or the project is transparently pseudonymous with an established, evaluable track record. | Manual review; no automated source exists in this stack — see "Future Enhancements." |
| **Security** | No unresolved critical/high-severity finding is publicly known. | Manual review of any disclosed audit report; no automated feed exists in this stack today. |
| **Audits** | At least one named, dated report from a real firm is disclosed, or the project honestly discloses it has none. | Manual citation of the report; this Standard does not endorse or require any single specific firm — see "Guiding Principles" §7. |
| **Liquidity** | Real, live DEX liquidity is resolvable for a trading-enabled project. | This stack's DexScreener provider (`matchTrading`). |
| **Market activity** | Trading volume is organic — not exclusively concentrated in a single, unverified pool with no independent price discovery. | This stack's CoinGecko/DexScreener providers; wash-trading detection itself is not automated in this stack today — see "Future Enhancements." |
| **TVL** | Where applicable, TVL is independently confirmed by a major aggregator. | This stack's DefiLlama provider (`matchTVL`). |
| **Governance** | A disclosed governance mechanism (or an honest "none") is confirmed live. | This stack's Snapshot integration (`lib/governance`), where applicable. |
| **Community** | Official social accounts exist and are genuinely active (not dormant/abandoned). | Manual review of linked `social.*` fields. |
| **GitHub** | A specific repository is linked and shows real commit history. | This stack's GitHub provider (`matchGithub`). |
| **Provider consistency** | Every populated `providerIds` key resolves to a record that actually matches this project's identity — no mismatched CoinGecko id, no wrong contract. | This stack's `validateRegistry()`; matches the existing `verificationLevel.level: "verified"` requirement in `PROJECT_REGISTRY.md`. |

# Approval Workflow

1. **Discovery** — a candidate is surfaced by any `DiscoverySource`
   (`PROJECT_REGISTRY.md`'s existing trust table; this stack's
   `lib/discovery/` pipeline already produces `DiscoveryProject` candidates
   for three real sources today).
2. **Manual review** — a human reviewer checks the candidate against
   "Minimum Listing Requirements." Fails here are discarded, not recorded.
3. **Verification** — the reviewer works through the "Verification
   Checklist," recording real evidence for each item reached. Partial
   completion is expected and honest — this sets `verificationLevel.level`
   at whatever stage the evidence actually supports, never higher.
4. **Publication** — the entry is created with `verification.status` set
   per evidence quality (`verified` only when independently reviewed
   against primary sources, matching `PROJECT_REGISTRY.md`'s existing
   definition — never assigned by the candidate's own self-report alone).
5. **Ongoing monitoring** — every Active project is subject to the
   Registry Maintenance Policy's review cadence below; monitoring is not a
   one-time gate, it's the ongoing condition of every listed project.
6. **Re-verification** — triggered on: a scheduled cadence (below), a
   material registry-data change (new contract, chain, or governance
   space), a Discovery Engine `updated`/`renamed` match against an
   existing entry, or a specific, credible external report.

# Registry Maintenance Policy

- **Review cadence.** Every Active project is re-reviewed against the
  Verification Checklist at least once every 180 days, or immediately upon
  a triggering event listed in "Re-verification" above. A project at
  `verificationLevel.level: "intelligence-ready"` (the highest tier) is
  re-reviewed every 90 days, since it carries the strongest trust signal
  and the highest cost if it silently degrades.
- **Stale project detection.** A project with no GitHub push, no
  governance activity, and no material TVL/volume for 180 consecutive days
  is flagged for manual review — not automatically archived. This is a
  detection trigger, not a determination.
- **Data quality monitoring.** `validateRegistry()`/`computeRegistryCoverage()`
  (`PROJECT_REGISTRY.md`) run on every registry change — an entry that
  fails validation never merges, per this stack's existing CI-enforced
  convention.
- **Provider reconciliation.** When two providers disagree on a fact this
  registry stores (e.g. CoinGecko and DefiLlama reporting materially
  different TVL for the same protocol), the discrepancy is recorded, not
  silently resolved by picking one — a future reviewer decides, with both
  figures visible.
- **Conflict resolution.** Where `verificationLevel.level` and
  `verification.status` diverge (e.g. a previously-verified project newly
  flagged) — `PROJECT_REGISTRY.md`'s own documented "How the axes relate"
  case — the divergence itself is the trigger for the next scheduled
  re-verification, never silently reconciled by editing one field to match
  the other.

# Delisting Policy

Objective removal criteria — a project is delisted (moved out of default
discovery/active surfaces) when any of:

1. **Confirmed fraud** — verified evidence of an exit scam, a malicious
   contract function actually exercised against users, or deliberate
   identity fraud (a fake team, a plagiarized project). Recorded as
   `lifecycle.state: "scam"`. **Permanent** — never reversed, per Guiding
   Principle 5.
2. **Sustained Minimum-Requirement failure** — a previously-passing
   project no longer meets "Minimum Listing Requirements" (e.g. its
   official website has been down for 30+ consecutive days with no
   successor, or its only on-chain presence has been fully migrated
   elsewhere with no update). Recorded as `lifecycle.state: "archived"`
   with a required `notes` citation of which requirement failed and when
   it was last confirmed passing. **Reversible** on remediation — a fresh
   Review pass, not an automatic reinstatement.
3. **Team/registry request** — a project's own team requests removal (a
   real, verifiable request from an identity already on record for that
   project). Recorded as `archived`, reversible if the team later requests
   reinstatement.
4. **Superseded** — the project has migrated or rebranded into a successor
   entry already in the registry. Recorded as `lifecycle.state: "migrated"`,
   per `PROJECT_REGISTRY.md`'s existing convention (never deleted, so past
   references still resolve).

Delisting never means deletion — matching `PROJECT_REGISTRY.md`'s existing,
explicit "never delete, preserve referential integrity" convention for
every terminal `lifecycle.state`.

# Scam Prevention

Measurable, objective detection rules — each one checkable against a real
signal, grounded in the industry research behind this Standard (rug-pull
checklists consistently cite the same handful of mechanical flags):

1. **Liquidity lock check** *(not automated in this stack today — see
   "Future Enhancements")* — for any project with a claimed liquidity
   pool, whether LP tokens are time-locked or burned, and for how long. No
   lock, or a lock under 30 days, is a Verification Checklist fail for
   "Liquidity," not an outright disqualifier alone — combined with any
   other flag below, it blocks Approval pending manual review.
2. **Holder concentration check** *(no data source exists in this stack
   today — this Standard's own audit confirmed Centralization has zero
   signal anywhere; see "Future Enhancements")* — a single non-team wallet
   holding more than 5% of circulating supply, or the top 10 holders
   controlling more than 30-40%, is a required manual-review trigger before
   Approval.
3. **Contract privilege check** — an unrestricted mint function, an
   unrestricted pause/freeze/blacklist function, or an unverified/obfuscated
   contract is a required manual-review trigger; a verified, published
   contract with no such function present is a pass.
4. **Guaranteed-return language check** — public project materials
   promising a fixed or guaranteed return ("1000% APY," "guaranteed 10x")
   is an automatic Review-stage fail, independent of every other signal —
   this is the one criterion every platform researched treats as an
   unconditional red flag, not a weighted factor.
5. **Wash-trading signal** *(not automated in this stack today — see
   "Future Enhancements")* — trading volume concentrated in a single,
   unverified pool with no independent price discovery across multiple
   venues is a required manual-review trigger, matching CoinMarketCap's
   and CoinGecko's explicit rejection criterion.

# Fake Project Detection

Measurable identity-verification rules, distinct from Scam Prevention
(which targets malicious *intent*; this targets false *identity*):

1. **Name/ticker collision check** — the candidate's name or ticker must
   be confirmed to genuinely refer to *this* project, not a superficially
   similar or unrelated one — `PROJECT_REGISTRY.md`'s own documented
   Clanker precedent (a CoinGecko id collision with an unrelated Solana
   meme token) is the concrete, real case this rule exists to prevent
   recurring.
2. **Cross-reference requirement** — website, GitHub, and social accounts
   must each independently reference each other (the website links the
   real GitHub; the GitHub's README links the real website) — a candidate
   whose official sources don't corroborate each other fails Minimum
   Listing Requirement 4.
3. **Impersonation check** — the candidate's branding/identity must not
   closely mimic an existing, already-registered project's name, logo, or
   domain in a way likely to confuse users — checked manually against the
   existing registry at Review stage.
4. **Unverifiable team + no independent corroboration** — a project that
   is both anonymous/pseudonymous *and* has no independently-verifiable
   track record, contract history, or third-party coverage is not
   automatically rejected (pseudonymity alone is not disqualifying — see
   Guiding Principle 1, "objective before subjective," and the real
   precedent of legitimately pseudonymous, long-track-record protocols),
   but is held to a stricter bar on every other Verification Checklist
   item before reaching `verificationLevel.level: "verified"`.

# Transparency Requirements

Mandatory disclosures for a project to reach `verificationLevel.level:
"verified"` or higher:

1. **Every populated registry field must be independently confirmable** —
   no field is set from the project's own unconfirmed self-report alone
   once verification is claimed (matching `PROJECT_REGISTRY.md`'s existing
   "never guess a plausible-looking value" discipline).
2. **Every trust/quality signal shown to users must trace to a real,
   named source** — matching this codebase's existing, established
   anti-fabrication convention throughout the intelligence layer ("Not
   Assessed," never a fake number).
3. **Any known gap is disclosed, not hidden** — a project missing GitHub
   data, audit disclosure, or governance information shows as honestly
   "Not Yet Tracked"/"Not Available" (per the existing Empty Data
   vocabulary already established for the Universal Project Card
   initiative — see `docs/planning/`), never silently omitted from view in
   a way that implies the category doesn't apply.
4. **Editorial reviews are attributable** — a `verification.status:
   "verified"` determination records who/what performed the review and
   when (`verification.verifiedAt`/`source` — fields `PROJECT_REGISTRY.md`
   already defines), not an unattributed "trust us."

# Exceptions

Product Owner approval is explicitly required before:

- Listing a project that fails any single Minimum Listing Requirement, for
  a documented, exceptional reason (e.g. a Base ecosystem project of
  clear public interest with a temporarily-down website during a
  migration).
- Reinstating a project after `lifecycle.state: "archived"` under
  circumstances not already covered by "Delisting Policy"'s stated
  reversal path.
- Any change to the weighting or membership of the Verification Checklist,
  Scam Prevention rules, or Fake Project Detection rules themselves — this
  Standard is frozen; a change here follows the same Engineering Notes
  discipline as the Universal Project Card initiative's frozen documents
  (see `CLAUDE_PR_WORKFLOW.md`), never a silent edit.
- Accepting a project whose only independent corroboration is a source
  this Standard's "Minimum Listing Requirements" §4 doesn't already name.

# Future Enhancements

Real, identified gaps — intentionally not solved by this Standard, since
this is a product document, not an implementation plan. Recorded here so
a future PR's Engineering Note has a documented starting point instead of
rediscovering the same gap:

1. **Holder concentration / Centralization data source** — no signal
   exists anywhere in this stack today (confirmed via this Standard's own
   codebase audit); the single most industry-cited scam indicator this
   registry currently cannot check.
2. **Liquidity-lock verification** — no automated check exists; the most
   industry-cited rug-pull flag after holder concentration.
3. **Contract-privilege scanning** (mint authority, pause/blacklist/freeze,
   proxy-upgradability) — no automated check exists.
4. **Audit-report registry field** — `Project` has no structured place to
   record a disclosed audit today; this Standard's Verification Checklist
   item currently depends entirely on manual citation.
5. **Wash-trading / organic-volume detection** — no automated check exists;
   both CoinMarketCap and CoinGecko name this as an explicit criterion this
   stack cannot currently evaluate.
6. **Team-transparency data source** — no automated or structured signal
   exists; entirely a manual-review item today.
7. **Revenue/fee tracking** (Token Terminal's core signal) — not tracked
   anywhere in this stack.
8. **Automated candidate→registry ingestion** — `lib/discovery/`'s own
   documentation already names this as future work ("Future Ingestion
   Flow"); this Standard's Approval Workflow assumes it will eventually
   exist but does not require it — every step above already works as a
   manual process today.
9. **Scheduled re-verification automation** — this Standard's stated
   cadence (180/90 days) is a policy, not yet a mechanism; nothing in this
   stack currently triggers or tracks it.

---

## Provenance

Every industry-practice claim in this document is drawn from research
conducted for this Standard (CoinGecko, CoinMarketCap, DefiLlama, Messari,
Coinbase, Base.org, Token Terminal, Arkham Intelligence, and independent
rug-pull/audit-industry research); every codebase claim is drawn from a
direct, current-session reading of `data/projects/`, `lib/discovery/`,
`lib/intelligence/`, `lib/intelligence-engine/`, and `docs/PROJECT_REGISTRY.md`/
`docs/DISCOVERY_ENGINE.md`. Neither category is asserted from unverified
memory — see the corresponding chat response this document was delivered
alongside for full source citations.
