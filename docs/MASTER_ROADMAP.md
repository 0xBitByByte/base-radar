# Base Radar Master Roadmap

This is the canonical engineering roadmap for Base Radar: the single place
that documents every completed milestone, what's actively being built, what's
planned next, what's been intentionally deferred, and where the product is
headed long-term. It supersedes the informal roadmap sections previously
scattered across [README.md](../README.md), [ROADMAP.md](ROADMAP.md), and
[PRODUCT_VISION.md](PRODUCT_VISION.md#long-term-roadmap) — those documents now
point here (see each file's own roadmap section for a short redirect note).
Future PRs should update **this** document, not recreate a roadmap section
elsewhere.

**A numbering note, read this first**: for **completed work**, this document
treats real **GitHub Pull Request numbers** (`git log --merges`) as the
historical source of truth — every entry in Completed Milestones below cites
the actual, real PR number it was merged under (`PR-001` = GitHub PR #1,
`PR-004` = GitHub PR #4, and so on through `PR-043`). GitHub PR **#12** was
opened but never merged (superseded); it is skipped below rather than
assigned a placeholder.

Some older documentation in this repository — a few isolated references in
[TESTING.md](TESTING.md) (`PR-004`), [CI.md](CI.md) (`PR-007`), and the
Registry/Discovery/AI-Intelligence-v2 docs
([PROJECT_REGISTRY.md](PROJECT_REGISTRY.md), [DISCOVERY_ENGINE.md](DISCOVERY_ENGINE.md),
[AI_INTELLIGENCE_ENGINE.md](AI_INTELLIGENCE_ENGINE.md),
[DAILY_BRIEF_GENERATOR.md](DAILY_BRIEF_GENERATOR.md),
[DASHBOARD_INTELLIGENCE_INTEGRATION.md](DASHBOARD_INTELLIGENCE_INTEGRATION.md),
[PROJECT_INTELLIGENCE_INTEGRATION.md](PROJECT_INTELLIGENCE_INTEGRATION.md)) —
uses its own informal "PR-XXX" milestone numbering that **predates this
roadmap** and was assigned per-feature at the time, independent of GitHub's
own PR numbering. Those references are left exactly as they are in their
original documents; this roadmap does not rewrite, renumber, or attempt to
reconcile them. Where an older doc's informal number happens to coincide
with the real GitHub PR number (as is the case for the Registry/Discovery/
AI-Intelligence-v2 series, `PR-037`–`PR-043`), that's a genuine coincidence
worth noting, not a rule this document relies on.

**For planned, not-yet-built work** (`PR-044` onward, see Planned Milestones
below), no GitHub PR exists yet — those are sequential **roadmap
identifiers** assigned by this document to track and reference future work
before it has a real PR number. Once a planned item is actually opened as a
GitHub PR, its real PR number should be recorded alongside (or in place of)
its roadmap identifier here.

A second, separate planning track exists alongside this one:
[ENGINEERING_EXECUTION_PLAN_V1.md](ENGINEERING_EXECUTION_PLAN_V1.md) (status:
Active), built from [archive/REPOSITORY_AUDIT_V1.1.md](archive/REPOSITORY_AUDIT_V1.1.md)'s
findings and the [Product Bible](PRODUCT_BIBLE/00_INDEX.md)'s
[Release 1–9 plan](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#releases). That
plan is scoped to **engineering-quality and platform work** (test coverage,
loading/error boundary coverage, real authentication, a real backend) rather
than the **feature and visual-polish** work this roadmap tracks. The two are
complementary, not conflicting: Milestone B (Testing Foundation) of that plan
has already shipped (`tests/`, `PR-004` per `TESTING.md`); Milestone A
(Navigation & Ownership Integrity) is **not** finished — `/dashboard/watchlist`
and `/dashboard/watchlists` still both exist, the exact dual-implementation
issue that plan's Sprint A.2 calls out. See
[Repository Standards](#repository-standards) and
[Risks](#next-recommended-pr) below for how the two tracks relate.

A third, separate numbering scheme — distinct from both this document's own
fine-grained `PR-001`–`PR-053` (individual, shippable feature/polish PRs)
and the Product Bible's Release 1–9 sequence above (product-strategy-level
releases) — is used for **platform-epic-level tracking**: `PR-089` onward,
each identifier covering a multi-sub-item epic (e.g. `PR-093` User Platform,
`PR-094` Discovery Platform 2.0) rather than one mergeable PR. This scheme is
assigned and maintained directly by product ownership, sequenced
independently of — and numbered well ahead of — this document's own
`PR-001`–`PR-053` sequence, the same "coexists, not reconciled or renumbered"
relationship this note already describes for the older informal `PR-XXX`
references above. See [Platform Epics](#platform-epics-pr-089pr-097) below
for the current, authoritative record of this scheme.

---

## Platform Epics (PR-089–PR-097)

See the numbering note above for how this scheme relates to this document's
own `PR-001`–`PR-053` numbering and to the Product Bible's Release 1–9
sequence. Each epic below is tracked here as the authoritative record of its
scope and current status; sub-item detail is recorded only where it has
actually been defined and/or implemented — this section does not speculate
ahead of what's been genuinely scoped.

| Epic | Name | Status |
| --- | --- | --- |
| PR-089 | Version 1.0 Stabilization & Release | ✅ Complete |
| PR-090 | AI Intelligence Platform | ✅ Complete |
| PR-091 | Compare Platform | ✅ Complete |
| PR-092 | Portfolio Intelligence | ✅ Complete |
| PR-093 | User Platform | ✅ Complete |
| PR-094 | Discovery Platform 2.0 | ✅ Complete |
| PR-095 | Administration Platform | ✅ Complete — PR-095.01 (Admin Dashboard), PR-095.02 (Project Registry), PR-095.03 (Project Editor), PR-095.05 (Activity Logs), PR-095.06 (Roles & Permissions), and PR-095.07 (QA) are all ✅ Complete; PR-095.04 (Content Management) is ✅ Obsolete/Merged into PR-095.02/.03 |
| PR-096 | Automation Platform | ✅ Complete — General Automation, Wallet Automation, the PR-096.02–.05 hydration-safety fixes, and this closeout's own QA pass are all ✅ Complete |
| PR-097 | Platform Performance & Infrastructure | ✅ Complete — PR-097.01 (Performance), PR-097.02 (Bundle Optimization), PR-097.03 (Observability), PR-097.04 (Testing), PR-097.05 (Security), PR-097.06 (Production Readiness), and PR-097.07 (QA) are all ✅ Complete |

### PR-095 — Administration Platform

**Objective:** Provide internal tooling for managing projects, content, and
platform operations.

Unlike every release in the Product Bible's own [Release 1–9
sequence](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#releases), this epic is
internal/operator-facing tooling, not an end-user-facing capability — a
deliberate, explicit exception to that chapter's own Roadmap Principle 10
("A Release Is Never Just Infrastructure"), recorded here rather than
silently forced into that chapter's user-value-oriented Release template.
Chapter 07 predates this epic and does not yet list it among its nine
releases; this section is PR-095's authoritative scope record until that
chapter is revisited.

| Sub-item | Name | Covers | Status |
| --- | --- | --- | --- |
| PR-095.01 | Admin Dashboard | Administration overview; platform operational metrics | ✅ Complete |
| PR-095.02 | Project Registry | Project management; registry administration | ✅ Complete |
| PR-095.03 | Project Editor | Project information editing; project metadata management | ✅ Complete |
| PR-095.04 | Content Management | Platform content; curated content management | ✅ Obsolete/Merged into PR-095.02/.03 |
| PR-095.05 | Activity Logs | Administrative activity; audit history | ✅ Complete |
| PR-095.06 | Roles & Permissions | Role management; permission management | ✅ Complete |
| PR-095.07 | QA | Verification pass over PR-095.01–.06 | ✅ Complete |

PR-095.01 (Admin Dashboard) shipped a real, server-authorized `/dashboard/admin`
overview backed by a protected `/api/admin/overview` route, gated by a
real role/permission system (`lib/admin/permissions.ts`'s `ADMIN`/`USER`
model, with the wallet-address allowlist as its bootstrap fallback) checked
against the existing real, DB-validated session. PR-095.02 (Project
Registry), PR-095.03 (Project Editor), PR-095.05 (Activity Logs), and
PR-095.06 (Roles & Permissions) are all real, tested, and live-verified —
see PR-095.07's own closeout subsection below for the full evidence; this
paragraph previously stated they were unimplemented, which PR-095.07's
investigation found to be inaccurate against the actual codebase.
PR-095.04 (Content Management) was investigated and found to have no
separate system in this product — see below.

#### PR-095.07 — QA (Complete)

Scope: a genuine, live verification pass over every other PR-095
sub-item, plus correcting this document's own stale statuses — the same
"do not trust the roadmap, verify against the code" investigation this
epic's earlier turns applied to PR-097's sub-items. No dedicated PR-095
audit document existed before this closeout.

**Per-sub-item findings, each verified directly against the current
code (not assumed from doc comments or prior roadmap text):**

- **PR-095.01 — Admin Dashboard: Complete** (unchanged from its existing
  status; re-confirmed live this pass — real account/session/watchlist
  metrics, correct 401/403/200 authorization).
- **PR-095.02 — Project Registry: Complete.** `/dashboard/admin/registry`
  (`components/admin/AdminRegistryPage.tsx`, `app/api/admin/registry/
  route.ts`, `lib/admin/registry.ts`) — real registry metrics, real
  validation (errors/warnings against the full merged registry), real
  provider-coverage percentages, real search, real expandable per-project
  detail view. The roadmap previously marked this "📋 Planned"; it was
  not.
- **PR-095.03 — Project Editor: Complete, MVP boundary preserved as
  documented, not expanded.** Real edit UI (Name, Short Description,
  Description, Website, Status, Verification Status/Notes) with Save/
  Cancel/Revert, real field-level validation-error display, real
  "edited" badge, real `PATCH`/`DELETE` persistence
  (`app/api/admin/registry/[projectId]/route.ts`,
  `project_edits` table). **Confirmed, not assumed**: the *server's* own
  `EDITABLE_PROJECT_FIELDS` (`lib/admin/registry.ts`) already accepts
  `categories`/`tags`/`chains`/`contracts`/`github`/`social`/
  `providerIds`/`governance` — only the *UI form* deliberately doesn't
  yet expose input controls for them, exactly as
  `AdminRegistryPage.tsx`'s own doc comment already documents ("extending
  this form to cover them later is additive, not a redesign"). Per this
  closeout's explicit instruction, this documented UI boundary was left
  exactly as-is — it is a deliberate MVP scope decision already recorded
  in the code, not a defect this QA pass found, and the roadmap does not
  currently require those fields as part of PR-095.03's acceptance scope.
- **PR-095.04 — Content Management: Obsolete/Merged, not a gap.**
  `lib/admin/permissions.ts`'s own doc comment records a prior session's
  real investigation: *"Content Management" has no separate system in
  this product — it is the Project Registry's own editorial fields.*
  Re-confirmed this pass: no `content:manage` permission, no
  `/dashboard/admin/content` route, and no separate implementation
  exists or is missing — PR-095.02/.03 already cover the real, only
  "content" this product has (project copy/metadata).
- **PR-095.05 — Activity Logs: Complete.** `/dashboard/admin/activity`
  (`components/admin/AdminActivityPage.tsx`, `app/api/admin/activity/
  route.ts`, `lib/admin/activity.ts`) — real, append-only
  `admin_activity_log`, real EDIT/REVERT/ROLE_CHANGE entries with actual
  before/after field diffs and the real timezone the acting admin was in
  at the time (never the viewer's own). Live-verified this pass: a real
  edit, revert, and role change performed during this QA session all
  appeared correctly, in order, with accurate diffs.
- **PR-095.06 — Roles & Permissions: Complete.** `/dashboard/admin/roles`
  (`components/admin/AdminRolesPage.tsx`, `app/api/admin/roles*`,
  `lib/admin/roles.ts`, `lib/admin/permissions.ts`) — a real, deliberately
  flat `ADMIN`/`USER` model (not an invented RBAC hierarchy, per an
  explicit instruction already recorded in the code), real self-role-change
  protection (both server-enforced and UI-reflected), real Activity Log
  integration on every real change.

**Live QA performed this closeout** (real running production server,
real SIWE sessions — admin, a second admin-eligible account, and a
non-admin — never mocked):

- **Authorization boundary**, every admin route, both API and UI: guest
  → 401, non-admin → 403 (and a real "Access restricted" UI state, no
  data ever rendered), admin → 200 with real data. Confirmed on all four
  pages (Overview, Project Registry, Activity Log, Roles & Permissions).
- **Real edit → save → revert cycle**, driven through the actual UI (not
  just the API): expanded Aave, clicked Edit, changed Short Description,
  Saved — the "edited" badge and a real "Revert to seed" control appeared
  immediately; clicked Revert — both disappeared, project restored.
- **Form validation**: a disallowed field (`id`) sent directly to the
  PATCH endpoint was correctly rejected with `400`, never silently
  accepted or partially applied.
- **Real role change**, driven through the actual UI: changed a real
  second account from USER to ADMIN via the role `<select>` — the row's
  badge updated immediately to a real, persisted ADMIN state; changed it
  back to USER to leave state clean.
- **Self-role-change protection**: confirmed at both layers — the UI
  never renders a role control on the signed-in admin's own row ("Cannot
  change your own role"), and a direct API call attempting it was
  independently rejected with `400`.
- **Persistence**: every edit/revert/role-change above was confirmed to
  actually persist (re-fetching the registry/roles snapshot after each
  action reflected the real, changed state; reverting/reversing each one
  afterward returned to the real original state, proving the writes were
  genuine, not optimistic-only UI).
- **Activity Log accuracy**: all of the above real actions (one EDIT, one
  REVERT, one ROLE_CHANGE) appeared in `/dashboard/admin/activity` with
  correct actor, correct real before/after values, and correct
  timestamps in the real timezone each action was performed in.
- **Responsive**: `/dashboard/admin/registry` at 375×812 — no horizontal
  overflow, metric grid correctly collapses to two columns, `AdminNav`
  tabs wrap cleanly.
- **Console/runtime errors**: zero genuine errors across every page and
  action above. One recurring `401` was observed and investigated, not
  dismissed — traced to this session's own manual cookie-injection test
  technique (setting `document.cookie` on an already-loaded tab, which
  races the first client-side auth check before that cookie is
  recognized); it appears on the very first request of a session
  regardless of which admin page loads first, and every subsequent real
  request succeeds. This is the same artifact already documented during
  PR-097.03's own live verification, not a new or real defect — a real
  user's actual sign-in flow never exhibits it, since the cookie is
  already present before any component mounts.

**No genuine defect found.** Per this closeout's own explicit instruction
("If no actionable defect exists, make no application-code changes"), no
application source file was modified this pass.

**Tests:** no new tests were needed — the existing 13 files / 139 admin
tests (routes, admin lib, `AdminNav`, `adminMetrics`) already cover this
surface comprehensively and were re-run fresh this pass: **139/139
passing**. `npx tsc --noEmit` clean; `npm run lint` clean; full `npx
vitest run` — **290 files / 2985 tests passing**; `npm run build`
succeeds.

PR-095.07 is now Complete, and — since every other PR-095 sub-item is
either genuinely Complete or correctly resolved as Obsolete/Merged (with
zero remaining actionable gaps found) — **PR-095 itself is now Complete.**

---

### PR-096 — Automation Platform (Complete)

**Objective:** a real, user-configurable rule engine reacting to real
Notification/Alert/Wallet events — deliberately event-driven, never a
scheduled/cron system (see below).

No dedicated PR-096 section or sub-item table existed in this document
before this closeout — only a single epic-table line ("🟡 Partially
implemented — closure audit later"). This section is the first, built
entirely from direct evidence, not inferred from the name or the stale
status alone.

**Scope, precisely separated by origin — nothing here was invented:**

- **General Automation** (`lib/automation/`, `components/automation/`,
  `app/dashboard/automation`, `app/dashboard/settings/automation`) —
  real, predates PR-096 entirely (its own page doc comment attributes it
  to **PR20**; the historical milestone list separately records it as
  PR-030, "Automation System — rule engine evaluating Notifications into
  automation results"). A real rule engine matching Notifications against
  5 fixed default rules (trigger + conditions + actions), a real
  per-rule enable/disable overlay, a real master on/off kill switch, all
  `localStorage`-backed with version-guarded, corruption-resistant
  persistence. **By explicit, documented design, rule *logic* (trigger/
  conditions/actions) is not user-editable — only `enabled` is** ("Do NOT
  allow editing rule logic," per `lib/automation/rules.ts`'s own doc
  comment) — this is the real, intended feature boundary, not a gap this
  closeout found.
- **Wallet Automation** (`lib/wallet-automation/`) — a separate, real,
  mature subsystem (attributed to **V3-WALLET-004** for its 6 default
  rules, **V4-AUTOMATION-001** for snapshot/diff, and other V3/V4 wallet-
  platform phases for triggers/events/smart metadata) — also predates
  PR-096. Deeply integrated with Portfolio AI, Wallet History, AI Chat,
  Cross-Feature Intelligence, and Notification Explainability, per
  `docs/WALLET_PLATFORM_ARCHITECTURE_REVIEW.md`. Reuses the exact same
  `AutomationRule` type and the exact same enable/disable/reset/
  persistence pattern General Automation already established — real code
  reuse, not a parallel reimplementation.
- **PR-096.02 through PR-096.05** — the only sub-items this repository's
  own code actually labels "PR-096." Each is a real **hydration-safety
  fix** (a `getServerSnapshot` that returns fixed defaults rather than
  reading live `localStorage`, so SSR output and the client's first
  render always match) applied to one hook each:
  `useAutomationPreferences` (.02), `useAutomation` (.03),
  `useAutomationRules` (.04), `useWalletAutomationRules` (.05) — **fixes
  to existing systems, not original feature implementations**, confirmed
  present and covered by their own dedicated regression tests. No
  `PR-096.01` or `PR-096.06+` was found anywhere in the repository — not
  assumed to exist, not invented here.
- **No cron/scheduled/background-worker/queue architecture exists, and
  none was added.** Confirmed explicitly documented, not just absent:
  `lib/hooks/useAutomationMetrics.ts`'s own doc comment states outright
  "there's no cron/schedule concept in `lib/automation/types.ts`" and
  "there's no live execution state, only a rule's own real `enabled`
  flag." This is the system's real, deliberate architecture — rules
  react to already-computed events, they do not poll or run on a
  schedule. Recorded here explicitly so it is never later mistaken for a
  missing requirement.

**Live QA performed this closeout** (real running production server):

- **Automation Center** (`/dashboard/automation`) loads with real,
  live-computed metrics (Active Automations, Triggered Today, All-Time
  Triggers, Last Run) and all 5 default rules with correct trigger/action
  badges and per-rule trigger history.
- **Rule enable/disable**: toggled a real rule off via the real UI — the
  "Active Automations" metric updated immediately and correctly; **real
  persistence confirmed across an actual full page reload** (not just
  in-memory state).
- **Automation Preferences** (`/dashboard/settings/automation`) —
  correctly reflects the same shared state; the master **"Automation
  Enabled" switch** was toggled off and genuinely zeroed "Triggered
  Today"/"All-Time Triggers" to 0 while leaving individual rules'
  `enabled` flags untouched, exactly matching the documented "real kill
  switch" contract; toggled back on.
- **"Reset all rules to defaults"** — correctly cleared the manual
  override and restored the disabled rule to its real default (enabled),
  with the Reset control itself correctly greying out once no override
  remains.
- **Wallet Automation**, exercised via the existing, established
  developer verification surface (`/dashboard/wallet/verify`, the
  "Wallet Verification Harness" — the same real, persistent tool
  `docs/QA/WALLET_VERIFICATION_AUDIT.md` already documents from an
  earlier phase): real synthetic-fixture-driven events and results
  rendered correctly ("Health Score Changed," a real timestamp), and a
  real "Explain" action opened a genuine Notification Explainability
  timeline showing the event propagating correctly through Automation →
  Analytics → History → Reports → Monthly Digest → AI Chat. **A real,
  live-connected wallet could not be exercised in this environment** (no
  browser extension available, the same documented limitation as every
  other wallet-connector verification this session) — this limitation is
  stated honestly rather than fabricating a "connected" result.
- **Investigated, not assumed**: the harness showed "Wallet Rules: 0."
  Traced to source and confirmed this is the harness's own deliberate
  synthetic-data simplification (`buildAutomationHarness()` in
  `WalletVerificationHarness.tsx` explicitly hardcodes `rules: []`, since
  this particular harness focuses on events/results, not rule state) —
  **not a defect in the real `useWalletAutomationRules`/
  `useWalletAutomation` hooks**, which were separately confirmed by
  direct source reading to correctly implement the real 6-rule default
  set with real persistence, and which the real production pages
  (`AutomationPreferencesPage.tsx`, `AutomationCenter.tsx`) correctly
  wire in — never the harness's stub.
- **Console/runtime errors**: zero, across every page and action
  exercised.
- **Responsive**: `/dashboard/automation` at 375×812 — no horizontal
  overflow, metrics grid collapses cleanly.
- **Navigation/discoverability**: Automation is a real, top-level main
  Sidebar entry (`constants/dashboard.ts`) — unlike PR-097.03's
  Observability dashboards, this was never a gap.
- **Account scoping / data leakage**: not applicable as currently
  architected — both subsystems are purely local (`localStorage`-backed,
  origin-scoped), confirmed via `grep` to have zero participation in the
  server-side account sync system (`lib/sync/adapters/`); there is no
  server-side, per-account automation state that could leak between
  accounts.

**No genuine defect found.** Per this closeout's own explicit
instruction, no application source file was modified.

**Tests:** the existing 19 files / 309 tests (`lib/automation/` ×4,
`lib/wallet-automation/` ×8, 6 automation-related hooks, plus
`ExplainAutomationAction.test.tsx`) already cover this surface
comprehensively and were re-run fresh this pass: **309/309 passing**. No
dedicated `components/automation/*` test directory exists, consistent
with this codebase's established convention (thin presentational
components aren't independently tested when their underlying hooks
already are — the same pattern already confirmed for
`components/admin/`). `npx tsc --noEmit` clean; `npm run lint` clean;
full `npx vitest run` — **290 files / 2985 tests passing**; `npm run
build` succeeds.

PR-096 is now Complete.

---

### PR-097 — Platform Performance & Infrastructure

**Objective:** Platform-wide performance, bundle, observability, testing,
security, and production-readiness hardening — an internal engineering
epic, not a new user-facing feature, in the same "operator-facing, not a
Product Bible Release" category PR-095's own section above already
establishes precedent for.

| Sub-item | Name | Status |
| --- | --- | --- |
| PR-097.01 | Performance | ✅ Complete |
| PR-097.02 | Bundle Optimization | ✅ Complete |
| PR-097.03 | Observability | ✅ Complete |
| PR-097.04 | Testing | ✅ Complete |
| PR-097.05 | Security | ✅ Complete |
| PR-097.06 | Production Readiness | ✅ Complete |
| PR-097.07 | QA | ✅ Complete |

#### PR-097.01 — Performance (Complete)

Scope: the real, measured performance findings from
[`docs/PERFORMANCE_AUDIT.md`](PERFORMANCE_AUDIT.md)'s own STEP 4/5
(Critical/High findings, C1/C2, H1/H2), closed one item at a time, each
verified fresh against the current codebase — never assumed complete from
the audit document alone — and validated with real tests, builds, and live
measurement before being marked done.

- **C1 — Explorer pagination** (Governance/Whale/Contracts/Pools routes) — ✅ Complete.
- **H1 — `buildCollections()`/`loadProjectsPageData()` caching** — ✅ Complete.
- **H2 — Chart data downsampling** (`lib/data/downsample.ts`) — ✅ Complete.
- **C2 — Project Profile category-rank restructure**
  (`app/dashboard/projects/[slug]/page.tsx`) — ✅ Complete. The page's
  `getLiveProjects()` call — previously invoked sequentially, only once the
  category-rank/Smart-Collections blocks needed it — is now started
  immediately alongside the page's other concurrent fetches, so its cost
  overlaps with the rest of the page's already-concurrent work instead of
  stacking on top of it. Measured live (production build, cold cache,
  multiple trials): ~3.48s → ~3.12s average (~10%) — a real but modest
  improvement, reported honestly against the audit's more optimistic
  "1-2s" estimate rather than overstated.

Two items from the audit's own Phase 2/3 roadmap tables were investigated
and explicitly **deferred**, not implemented — recorded here as a
deliberate decision, not a gap:

- **Discovery-pipeline `cache()` boundary** (`lib/discovery/project.ts`'s
  `runDiscoveryPipelineAgainstRegistry()`) — confirmed it still has exactly
  one caller today (`lib/projects/service.ts`'s already-`cache()`-wrapped
  `getLiveProjects()`), so the gap the audit flagged is real but entirely
  latent — nothing currently exercises it, so there is no current
  performance impact to measure or fix. Deferred as defensive future
  hardening, not treated as an outstanding performance bug.
- **M4 — Partial Prerendering (PPR)** — confirmed directly against the
  installed Next.js 16.3.4 (`node_modules/next/dist/server/config-schema.js`)
  that `ppr` remains an experimental-only config option, not yet graduated
  to stable. Deferred/blocked until that Next.js capability stabilizes;
  adopting an experimental rendering mode now would be exactly the kind of
  speculative, high-risk change this epic's own execution rules rule out.

#### PR-097.02 — Bundle Optimization (Complete)

Scope: the bundle-composition findings from
[`docs/PERFORMANCE_AUDIT.md`](PERFORMANCE_AUDIT.md)'s own "Bundle
composition" section and STEP 5 roadmap tables (H3, M2, M1, and the
Phase 1 hygiene items), each re-verified fresh against the current
codebase — never assumed complete from a prior investigation alone.

- **H3 — `SyncStatusCard` code-splitting** — ✅ Complete. Confirmed
  `components/dashboard/Topbar.tsx` imports it via
  `next/dynamic({ ssr: false })`, matching `AccountMenu.tsx`'s
  already-proven pattern; the previous double-import that defeated the
  split is gone.
- **M2 — Command Palette code-splitting** — ✅ Complete. Confirmed
  `components/dashboard/Topbar.tsx` imports `CommandPalette` via
  `next/dynamic({ ssr: false })`.
- **Explorer async sub-page `loading.tsx`** — ✅ Complete. Confirmed all 5
  files present under `app/dashboard/projects/[slug]/{ai,contracts,
  governance,pools,whale}/loading.tsx`.
- **L1 — redundant `"use client"` on `components/command/CommandResults.tsx`**
  — ✅ Complete. Confirmed the directive is gone; the component has no
  client-only code and was already rendered inside an existing client
  boundary.
- **L2 — `shadcn` dependency placement** — ✅ Already correct. Confirmed
  in `package.json`'s `devDependencies`, not `dependencies` — a codegen
  CLI with no runtime import, correctly excluded from the shipped bundle.
- **L3 — bundle analyzer baseline** — ✅ Complete. A real baseline was run
  via `npm run build`'s own `route-bundle-stats.json` output (Next's
  built-in per-route first-load JS measurement), used directly to
  evaluate M1 below rather than relying on structural/import-graph
  guesses.

**M1 — `framer-motion`'s three root-adjacent touchpoints — Investigated /
Deferred — no meaningful measurable benefit.** The audit's own
recommendation ("starting with replacing `SplashScreen`'s boot animation
with a lighter mechanism") was tested directly: `framer-motion` was
temporarily removed from `SplashScreen.tsx` in an isolated experiment, a
real production build was measured before and after via
`route-bundle-stats.json`, and the change was then fully reverted
(confirmed byte-for-byte identical to the original, clean `tsc`, and a
rebuild matching the pre-experiment baseline exactly). Measured deltas:

| Route | Delta |
| --- | --- |
| `/` | ~0.3 KB |
| `/about`, `/contact` | ~0.6 KB |
| `/dashboard` | ~0.2 KB |
| `/dashboard/projects` | ~0.2 KB |
| `/_not-found` | ~138 KB |

Root cause of the near-zero deltas: 11 landing-page components
(`components/landing/*.tsx`) already import `framer-motion` independently
of `SplashScreen` for their own animations, and every `/dashboard/*` route
already needs it via `DashboardLayout.tsx`'s `MotionConfig` and
`app/dashboard/template.tsx`'s page transition — so removing it from
`SplashScreen` alone doesn't remove it from any of those routes' actual
bundle. Only `/_not-found` (a 404 page, not a route with any real
product-performance relevance) showed a substantial drop. **M1 is
therefore deferred, not implemented** — the audit's theoretical framing
("reduces the guaranteed-on-every-route cost") did not hold up once
measured against the real, current bundle graph, and rewriting a
carefully-tuned, first-paint-critical component for zero benefit on any
meaningfully-trafficked route is not justified.

No further actionable bundle-optimization work remains identified for
PR-097.02.

#### PR-097.04 — Testing (Complete)

**Existing, already-strong coverage (unchanged by this closeout):** 287
Vitest test files / 2959 tests — unit and integration coverage across
`lib/` and `components/`, plus real route-level integration tests for
auth/admin (`tests/app/api/auth/*`, `tests/app/api/admin/*`) using real
SIWE signatures via `viem/accounts`. This layer was never the gap — the
roadmap's own prior status named the gap precisely: E2E and visual
regression, neither of which existed in any form (confirmed: no
Playwright/Cypress config, no screenshot tooling, anywhere in the repo
before this closeout).

**Newly added:**

- **E2E** (Playwright, `e2e/`) — 4 spec files, 17 tests, driving a real
  Chromium against a real, locally-running production build (the exact
  `output: "standalone"` artifact `Dockerfile` ships, not a close
  approximation). Covers the critical flows named in this closeout's own
  task: real User Login / Admin Login / Sign Out (`auth.spec.ts` — the
  flow Bug 3 fixed, including a real non-admin-blocked-with-403 check),
  Dashboard's real Topbar controls and responsive layout
  (`dashboard.spec.ts`), Profile's real Identity form and Sign Out
  (`profile.spec.ts`), and a real Project Profile route including the
  category-rank data C2's fix targets, and real not-found behavior for an
  invalid slug (`project-profile.spec.ts`).
- **Visual regression** (Playwright's own `toHaveScreenshot`, no separate
  library) — 3 spec files, 6 baselines: Dashboard desktop/tablet/mobile,
  Profile desktop/mobile, and the Topbar account menu (open state) — the
  exact set this closeout's task prioritized, deliberately not a larger
  matrix.
- `e2e/fixtures/auth.ts` — real SIWE sign-in/sign-out reusing the same
  shape `tests/app/api/auth/verify/route.test.ts` already established
  (the safest existing mechanism, not a second auth-testing approach);
  `e2e/fixtures/splash.ts` — waits out the real first-load `SplashScreen`
  animation.
- CI: `.github/workflows/ci.yml`'s existing Quality Gates job now also
  installs Chromium and runs `npm run test:e2e`, uploading the Playwright
  HTML report on failure.

**Determinism — confirmed live, not assumed:** live market/ecosystem data
(gas, prices, AI-generated recommendation lists) makes a naive screenshot
baseline inherently flaky. Building this suite surfaced two real,
concrete problems, both fixed rather than worked around:

1. `framer-motion`'s `SplashScreen` fade can still be mid-animation when
   a screenshot fires (Playwright's animation-freezing only covers CSS
   animations, not `framer-motion`'s rAF-driven ones) — fixed by waiting
   for its real DOM element to detach.
2. Masking a volatile region's content isn't enough when that region's
   real height also varies (a mask paints over pixels, it doesn't reserve
   layout space) — `dashboard.visual.spec.ts` resolved this by clipping
   to the page's genuinely invariant chrome (Sidebar, Topbar, greeting)
   rather than fighting full-page reflow from variable-length cards below
   it, a deliberate, documented scope decision.

The full suite (smoke + visual) was run to a clean pass **four consecutive
times** after these fixes, with zero flakes, before being accepted as the
baseline. One environmental finding, also fixed: the default per-core
worker count sent enough concurrent requests to the real, provider-fetching
Project Profile route to occasionally exceed the suite's own test timeout
under contention — workers are now capped (2 locally, 1 in CI).

One real, narrow product gap was *discovered* (not introduced) while
writing the auth fixture: signing in without a `guestSnapshot` (unlike a
real browser, which always sends one) leaves the local `isGuest` flag
uncorrected — Bug 3's fix depends on a real sync-pull having something to
apply, and a snapshot-less sign-in never logs one. The fixture was
corrected to send a realistic default snapshot, matching real browser
behavior; per this closeout's explicit scope, Bug 3's application code was
**not** modified — see `e2e/fixtures/auth.ts`'s own doc comment for the
full trace.

See [`docs/TESTING.md`](TESTING.md)'s "E2E and visual regression" section
for how to run and extend this suite.

PR-097.03, PR-097.06, and PR-097.07 are tracked separately and are **not**
covered by this closeout.

#### PR-097.05 — Security (Complete)

Scope: no prior dedicated security audit document existed for this
sub-item (unlike PR-097.01/.02's `PERFORMANCE_AUDIT.md`) — this closeout's
own investigation is the first one, built by inspecting authentication/
session handling, admin authorization, every real `app/api/*` route,
SIWE verification, cookies, security headers, input validation, rate
limiting, secrets handling, and database access boundaries directly
against the current codebase, then cross-checking two routes' own doc
comments that explicitly named this PR as their own follow-up
(`/api/observability/events`, `/api/observability/web-vitals`: "Public-
endpoint abuse/rate-limiting is explicitly out of scope here — that
belongs to PR-097.05").

**Already correct — confirmed, not modified:**

- **Authentication/SIWE** (`lib/auth/siwe.ts`, `app/api/auth/challenge`,
  `/verify`) — real EIP-4361 verification, single-use/short-lived
  server-stored nonces (real replay prevention), structural validation
  before the cryptographic check, and a malformed-signature throw from
  viem's own `verifyMessage` is caught so it can never surface as a raw
  500. Bug 3's Login/Sign Out/admin-bootstrap fixes remain intact and were
  re-verified live during this investigation (see Test results below) —
  nothing in this closeout altered that flow.
- **Sessions/cookies** (`lib/backend/sqlite/sessions.ts`,
  `lib/auth/cookie.ts`) — DB-backed, genuinely revocable (`sign-out`
  survives even before `expires_at`), `httpOnly` + `secure` (production)
  + `sameSite=lax`, with `expired`/`guest`/`authenticated` kept as
  distinct, honest states.
- **Admin authorization** (`lib/admin/authorization.ts`,
  `lib/admin/permissions.ts`) — every `/api/admin/*` and
  `/api/observability/{analytics,performance}` route resolves through the
  real, DB-validated session, fails closed on an unrecognized permission
  string, correctly distinguishes 401 (unauthenticated) from 403
  (forbidden), and blocks self-role-changes.
- **Input validation & database access** — every route inspected
  (`auth/*`, `admin/*`, `sync/*`, `observability/*`,
  `projects/[slug]/compare-detail`) does real type/shape validation before
  touching the database, and every query across `lib/backend/sqlite/*` is
  parameterized — no string-built SQL found anywhere.
- **Secrets/environment handling** — `.env.example` requires no secrets;
  `ADMIN_WALLET_ADDRESSES` is explicitly documented as non-secret (public
  addresses, re-verified server-side on every request); no hardcoded
  credentials found.
- **CORS** — not applicable: no route sets `Access-Control-Allow-Origin`
  or any other CORS header anywhere in the codebase, so the browser's
  default same-origin policy is the only policy in effect; no route
  accepts a credentialed cross-origin request.

**Fixed in this closeout:**

- **Missing baseline security response headers** — confirmed nowhere in
  the codebase (`next.config.ts` had no `headers()` at all before this
  change). Added `X-Frame-Options: DENY`, `X-Content-Type-Options:
  nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and
  `Strict-Transport-Security` to every route (`next.config.ts`) —
  confirmed safe first (no inline scripts/`dangerouslySetInnerHTML`, no
  self-framing, no camera/mic/geolocation usage anywhere), then confirmed
  live on a real running production server (`curl -sI`) on both a page
  route and an API route.
- **No rate limiting on unauthenticated, state-writing public
  endpoints** — `/api/auth/challenge` (writes a real `auth_challenges`
  row per call) and `/api/observability/{events,web-vitals}` (writes a
  real DB row per call, and explicitly named this PR in their own doc
  comments) had no abuse protection at all. Fixed by reusing the
  existing outbound-provider fixed-window limiter
  (`lib/providers/common/rate-limit.ts`'s `tryAcquire` — already
  provider-agnostic, just not previously used for inbound requests)
  through a new, small `lib/security/requestRateLimit.ts` wrapper that
  keys each budget by real client IP (`Fly-Client-IP`, falling back to
  `X-Forwarded-For`) and route, returning a real 429 once exhausted.
  In-memory only, matching `fly.toml`'s own documented one-Machine,
  no-horizontal-scaling architecture — no new distributed-store
  dependency introduced. Confirmed live against a real running server:
  120 real requests to `/api/observability/web-vitals` succeed, the
  121st gets a real 429.

**Content-Security-Policy — completed in a follow-up pass.** The full CSP
this section previously deferred is now implemented in `next.config.ts`,
by tracing this app's ACTUAL current runtime network/resource behavior —
never generic wallet-provider knowledge — per Next.js's own CSP guide
(`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`,
consulted per this repo's `AGENTS.md`):

- **No nonce-based strict policy.** Next's own docs state nonces require
  every page to be dynamically rendered (static optimization/ISR
  disabled). This app's marketing pages (`/`, `/about`, `/contact`,
  `/legal/*`) are real, intentionally static routes that PR-097.02's own
  bundle work already measured and relied on — forcing them dynamic to
  support nonces would itself be a regression against that already-
  verified work. Next's own documented non-nonce alternative
  (`script-src 'self' 'unsafe-inline'`) is used instead, with
  `'unsafe-eval'` added only outside production (React's own documented
  debug-eval requirement).
- **Real, traced `connect-src` origins** — none guessed: the three chain
  RPC endpoints `lib/wallet/config.ts`'s `wagmi` transports actually call
  (`https://mainnet.base.org`, `https://sepolia.base.org`,
  `https://ethereum.reth.rs` — confirmed by reading the exact chain
  definitions in this app's installed `viem/chains`), plus Coinbase
  Wallet SDK's real, installed-source-confirmed endpoints
  (`https://keys.coinbase.com`, `https://rpc.wallet.coinbase.com`,
  `https://www.walletlink.org`, `wss://www.walletlink.org` — traced
  directly from `node_modules/@coinbase/wallet-sdk`'s own `constants.js`
  and real `fetch()`/`WebSocket` call sites). The four injected
  connectors (MetaMask, Rabby, Trust Wallet, Coinbase's own extension
  detection) need no `connect-src` entries — an injected provider's
  network calls happen inside the extension's own privileged background
  context, outside this page's CSP entirely.
- **`frame-src 'none'`** — confirmed via source inspection that neither
  this app nor `@coinbase/wallet-sdk` creates any `<iframe>` anywhere;
  Coinbase's flow is a real popup window, which `frame-src` does not
  govern.
- **`img-src 'self' data: https:`** — deliberately not a finite domain
  list. Live verification against the real running app (browser console)
  caught a real gap a static grep missed: this app's project/token logos
  are genuinely dynamic, provider-supplied URLs (`lib/projects/build.ts`'s
  `resolveLogoUrl()` — registry → CoinGecko → DefiLlama → GitHub avatar),
  confirmed live via real blocked loads from `coin-images.coingecko.com`
  and `icons.llamao.fi` on one page alone. As a real Discovery Platform
  (PR-094), this app has no fixed, enumerable set of image origins —
  restricting to `https:` still blocks plaintext `http:` loads, a real,
  meaningful restriction, without breaking the core branding system.
- **WalletConnect is the one deliberate, documented, permanent gap.** It
  is not currently active anywhere in this app's real configuration —
  `lib/wallet/config.ts` only includes the connector when
  `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set, and it is unset in
  `.env.example`, `.env.local`, and `fly.toml` alike. Its real relay/
  verify-API domains were deliberately not added — enumerating them
  safely needs a real project id and live network tracing this
  environment does not have. `next.config.ts` now emits a loud
  `console.warn` at config-load time if that variable is ever set without
  the CSP being extended for it, turning a silent future break into an
  actionable one.

**Live-verified**, not assumed: real running production server, `curl -sI`
confirmed the header on multiple routes; real browser session (Dashboard,
a Project Profile page, Profile) showed zero CSP console violations after
the `img-src` fix; the wallet connect picker showed exactly the four
active connectors (no WalletConnect) and clicking Coinbase Wallet
genuinely attempted to open `keys.coinbase.com` with zero CSP errors;
the full real-SIWE flow (logged-out → non-admin login → 403 on admin →
real admin login → 200 on admin → sign-out → 401 after) was re-run
against this exact CSP-enabled server and passed unchanged.

**Reviewed and explicitly out of scope, not a gap:** broader per-route
abuse protection for expensive, unauthenticated public GET endpoints
(e.g. `/api/projects/[slug]/compare-detail`, which fans out to several
provider calls per request) was considered and set aside — every
`/dashboard/projects/[slug]*` page carries the same real fan-out cost by
design (already a known, accepted characteristic of a public content
site, not unique to this endpoint), and rate-limiting every public read
route would be a broad, speculative expansion beyond this closeout's
documented, evidence-backed scope. A CDN/WAF-level control (Production
Readiness, PR-097.06) is the more appropriate layer for that class of
protection if it's ever needed, not a per-route change here.

**Security tests added:** `tests/lib/security/requestRateLimit.test.ts`
(new — direct unit coverage of the IP-resolution and per-route/per-IP
budget logic) plus one new regression test in each of
`tests/app/api/auth/challenge/route.test.ts`,
`tests/app/api/observability/events/route.test.ts`, and
`tests/app/api/observability/web-vitals/route.test.ts` confirming the
request past the budget gets a real 429 and is never persisted. A
`resetRateLimitBucketsForTests()` export was added to
`lib/providers/common/rate-limit.ts` (mirroring
`lib/backend/sqlite/db.ts`'s existing `resetDbSingletonForTests()`
pattern) and wired into every existing auth test file's `beforeEach`
that calls a now-rate-limited route, so this closeout's change can never
leak state between otherwise-unrelated test cases. `tests/next.config.test.ts`
(new, 10 tests) covers the CSP: every baseline header still present
alongside it, every real traced `connect-src`/`frame-src`/`img-src`
directive, the production-vs-dev `'unsafe-eval'` gate, and the
WalletConnect `console.warn` firing only when that env var is set.

PR-097.05 is now **Complete**. Every actionable item in this closeout's
own investigated scope is closed: baseline headers, rate limiting on the
three explicitly-flagged unauthenticated endpoints, and a real, live-
verified CSP. WalletConnect's own domains remain a deliberate, permanent,
documented gap (a currently-inactive, optional connector — see above),
not an open actionable item; re-scoping it is only needed if a real
WalletConnect project id is ever configured. PR-097.03, PR-097.06, and
PR-097.07 remain tracked separately and are **not** covered by this
closeout.

#### PR-097.06 — Production Readiness (Complete)

Scope: no prior dedicated production-readiness audit document existed for
this sub-item (unlike PR-097.01/.02's `PERFORMANCE_AUDIT.md`) — this
closeout's own investigation is the first one, checking every area named
in its own task brief (deployment/runtime config, standalone build
behavior, env vars, startup/shutdown, database readiness/migrations,
health checks, error handling, logging, CI/CD gates, Docker/Fly config,
and operational documentation) directly against the current codebase,
never assumed from an older document.

**Already correct — confirmed, not modified:**

- **Standalone build + Docker** (`Dockerfile`, `next.config.ts`) —
  multi-stage build, pinned `node:22.23.1-slim` runtime (not a floating
  tag — deliberate, given `node:sqlite`'s experimental status), real
  non-root user, `/data` pre-created with correct ownership for the Fly
  Volume mount.
- **Startup / database readiness** — `lib/backend/sqlite/db.ts`'s lazy
  singleton connection + `lib/backend/sqlite/migrations.ts`'s tracked,
  idempotent migrations. Confirmed live: a real running server's first
  `/api/health` call cleanly created the database file and ran every
  migration with zero errors.
- **Shutdown behavior** — confirmed, live, not just by reading source:
  Next.js's own standalone server already registers real `SIGTERM`
  handling (traced to `node_modules/next/dist/server/lib/start-server.js`).
  A real request to an expensive route (`/dashboard/projects/aave`) sent
  concurrently with a real `SIGTERM` to the running server process still
  completed with a genuine `200`, and the process then exited cleanly
  with the signal-correct code `143` — no custom shutdown code needed or
  added.
- **Health checks** — `GET /api/health` genuinely probes the live
  database connection (`SELECT 1`) and fails closed (`503`, never a
  fabricated `200`) on real failure; wired into `fly.toml`'s own health
  check.
- **Error handling / observability** — every real error boundary
  (`app/global-error.tsx`, `app/dashboard/error.tsx`, `app/dashboard/
  projects/[slug]/error.tsx`) already logs the real error server-side
  while showing only a safe, generic message to the user; `instrumentation.ts`'s
  `onRequestError` already covers server-side failures that never reach a
  client boundary at all. All PR-097.03's own work, re-verified here, not
  re-implemented.
- **Environment variables** — confirmed the app boots and serves traffic
  with zero variables set; the two that matter in a real deployment
  (`SQLITE_DB_PATH`, `ADMIN_WALLET_ADDRESSES`) are both already correctly
  documented and neither is a secret.
- **Caching / external-provider failure behavior** — Next's own
  per-provider `fetch` revalidate windows, the existing rate limiter and
  circuit breaker (`lib/providers/common/`) already provide real,
  measured resilience — this is PR-097.01's own territory and was
  reviewed, not modified, per this closeout's explicit scope limit.
- **Docker image build-context hygiene** — `.dockerignore` already
  excludes `.env`/`.env.local`/`.git`/`node_modules`/`tests` — confirmed
  no secret or test artifact can reach the built image.

**Fixed in this closeout:**

- **Two real, confirmed production-dependency vulnerabilities** — a real
  `npm audit --omit=dev` run (scoped to the tree that actually reaches
  the deployed server, not devDependency-only findings) found `nanoid`
  (high — via `postcss`, itself via `@tailwindcss/postcss`) and
  `baseline-browser-mapping` (moderate — via `next` itself and via
  `shadcn`'s `browserslist`). Both were transitive, and both had a safe,
  non-breaking patch-level fix already within their parent packages' own
  declared semver ranges (`nanoid` 3.3.16 → 3.3.19, `baseline-browser-mapping`
  2.10.42 → 2.11.22) — applied via a narrow `npm update <package>` per
  dependency (not a blanket `npm audit fix`, which errored in this
  environment with an internal npm bug unrelated to this repository).
  Each change was isolated to an 8-line lockfile diff touching only that
  package's own `version`/`resolved`/`integrity` fields, confirmed via a
  before/after diff; `package.json` itself was untouched (both are
  transitive, not direct, dependencies). Re-verified: `npm audit
  --omit=dev` now reports zero vulnerabilities; full Vitest suite, a
  clean production build, and live-browser verification (Tailwind CSS
  output, page rendering) all confirmed unaffected.
- **`npm audit --omit=dev` is now a real CI gate**
  (`.github/workflows/ci.yml`) — non-blocking (`continue-on-error: true`,
  deliberately, since a new transitive advisory isn't always something a
  code change here can immediately fix, and must not block unrelated
  merges the way a real test/lint/type failure should) but now visible on
  every run instead of only being found by a manual, ad hoc audit like
  the one that found the two issues above.
- **CI's Node version is now pinned to the exact version `Dockerfile`
  deploys** (`22.23.1`, not a floating `"22"` tag) — `Dockerfile`'s own
  comment already claimed "this repo's own CI ... already run[s]
  22.23.1" as its reason for pinning the deployed runtime image; that
  claim was not actually true until this fix, since a floating
  major-version tag can silently resolve to a newer `22.x` than the
  image ships. Matters specifically because `node:sqlite` is still an
  experimental, version-sensitive Node API.
- **A new operational runbook** ([`docs/DEPLOYMENT.md`](DEPLOYMENT.md))
  — the "how do I deploy this, and what do I do if it breaks" document
  that did not exist anywhere in this repository before this closeout.
  Covers deploying, rollback, environment variables, startup/shutdown
  behavior (including the live-verified SIGTERM finding above),
  health checks, backup/recovery posture, and dependency security —
  every claim in it traces to code/config actually read or behavior
  actually exercised during this investigation, not aspirational.

**Reviewed and deferred, with exact reasoning:**

- **A tighter Fly `kill_timeout`** was considered (this app's own
  measured page-load times, per PR-097.01, can exceed Fly's undocumented-
  in-this-repo default grace window under cold cache) but deliberately
  **not** added: this environment cannot exercise a real Fly deploy to
  verify Fly's actual current default behavior or confirm a specific
  configured value is correct, and guessing at Fly-specific config
  syntax without the ability to validate it live is exactly the kind of
  unverifiable change this closeout's own rules warn against ("do not
  claim anything is fixed without fresh validation"). Also low real
  severity today: this is an explicitly staging-only deployment
  (`fly.toml`'s own top comment), and every `node:sqlite` write is
  synchronous, so a cut-off request cannot leave a half-committed write
  behind — worth revisiting only if/when this graduates to a real
  production SLA.
- **`baseline-browser-mapping`'s own upstream root cause** (the fact that
  `next@16.3.4` itself still pins a range whose floor is vulnerable) is
  not something a dependency bump in this repository can fully close —
  the real fix landed in `next`'s own transitive dependency, this
  closeout just moved the resolved version forward within the range
  `next` already declares as acceptable. A future `next` upgrade may move
  this further; not itself a PR-097.06 action item, and out of scope
  (upgrading Next.js is a real architectural decision, not a production-
  readiness dependency patch).
- **Automated GitHub branch-protection / required-status-checks
  enforcement** for `deploy-staging.yml`'s manual trigger was reviewed
  (there is currently no automated guarantee that CI passed before a
  manual staging deploy is dispatched) but not configured — this is a
  GitHub repository *setting*, not a code or workflow-file change, and
  changing it is outside what this session can safely verify or is
  positioned to decide on the repository owner's behalf. Documented in
  `docs/DEPLOYMENT.md`'s "Deploying" section as a manual precondition
  instead of a silently-assumed one.

**Tests:** no new application test file was needed — every change this
closeout made is dependency/config/documentation, verified via the
existing full Vitest suite (unaffected), a clean production build, and
live runtime verification (health check, migration, and a real
SIGTERM-during-a-real-request test against the actual standalone
server) rather than new unit tests of their own.

PR-097.06 is now Complete. This closeout does not change PR-097.03's own
recorded status (out of this closeout's explicit scope) or PR-097.07's;
PR-097.07 remains tracked separately and is **not** covered by this
closeout.

#### PR-097.07 — QA (Complete)

Scope: no prior dedicated scope existed for this sub-item in this
document — established from first principles by reading this
repository's own existing QA genre (`docs/QA/`: `QA_TEST_PLAN.md`,
`REGRESSION_REPORT.md`, `KNOWN_ISSUES.md`, `RELEASE_CHECKLIST.md`, and
others, all from the PR-066/067 era) rather than inferred from
PR-097.01–.06's own work. Full detail and evidence in
[`docs/QA/PR-097_QA_REPORT.md`](QA/PR-097_QA_REPORT.md) (new); summarized
here.

**Closed this closeout — a stale QA backlog:** `docs/QA/KNOWN_ISSUES.md`
(PR-067) has recorded three "open" issues for many releases. All three
were re-verified against the current codebase and confirmed genuinely
fixed by later work, not by this pass: `RecentTransactions`'s duplicate-
key bug (now keyed by `` `${transfer.txHash}-${transfer.logIndex}` ``),
the `formatRelativeTime()` hydration mismatch (now a dedicated,
`useSyncExternalStore`-based `useRelativeTime()`/`RelativeTime`
abstraction, itself already hardened once further per its own PR-075 doc
comment), and the unset `metadataBase` (confirmed set during PR-097.06's
own investigation). `KNOWN_ISSUES.md` itself is left unedited — it
already self-labels its own PR-067 origin, and `PR-097_QA_REPORT.md` is
now the current, dated record superseding it.

**Verified this closeout — real, fresh evidence, not assumed:**

- **Full E2E + visual regression suite** (`e2e/`, PR-097.04) re-run fresh
  against the final build — the first full run since PR-097.05's CSP/
  rate-limiting and PR-097.06's dependency bumps landed on top of it:
  **23/23 passing**, confirming neither regressed anything the suite
  already covers.
- **Live spot-check of routes the E2E suite doesn't cover** — Admin
  Registry, Roles & Permissions (self-role-change correctly disabled,
  matching the server-side check), a Projects Collection route, and the
  Wallet page at mobile width — all clean, zero console errors, real
  authenticated data.
- **Accessibility spot-check** — two apparently-nameless elements
  surfaced by an accessibility-tree summary were investigated directly
  against the live DOM and confirmed to be false alarms from the
  summarization itself (a real, visible-text sidebar link; zero buttons
  genuinely lacking an accessible name), not real defects.

**Out of scope, with reasoning:** a full route × breakpoint × browser
matrix across the entire application (60+ routes today, versus 30 when
the PR-066-era QA docs were written) was not attempted — PR-097 is a
platform-infrastructure epic, not a UI/feature pass, and re-auditing
every route the app has grown is disproportionate to what this closeout's
own findings justify. Firefox/Safari remain unverified, unchanged from
every prior QA pass this repository has ever recorded.

**Result:** no new product bugs found; no application source code changes
were needed — every finding either confirmed already-correct behavior or
closed out a stale documentation record.

PR-097.07 is now Complete. Every PR-097 sub-item this epic scoped
(.01, .02, .04, .05, .06, .07) is now Complete; PR-097.03's own recorded
status in the table above is unchanged by this closeout (out of its
explicit scope), so PR-097 itself remains "In Progress" pending that
sub-item's own resolution — not marked Complete here.

#### PR-097.03 — Observability (Complete)

Scope, established from the current codebase itself, not assumed from
this document's own prior "Tracked separately" status or any earlier
session's conclusions: three real sub-areas already exist under the
"PR-097.03 (Observability — …)" doc-comment attribution found throughout
the codebase — **Error Tracking**, **Analytics**, and **Performance
Dashboards**. Every file was re-verified directly against the current
repository state before being recorded as complete below; none was
assumed correct because an earlier turn or an inline comment said so.

**Already complete, verified fresh this closeout — extensive, real, not
placeholder work:**

- **Error Tracking** — `instrumentation.ts`'s `onRequestError` (Next's
  own built-in server-side failure hook) plus three real client error
  boundaries (`app/global-error.tsx`, `app/dashboard/error.tsx`,
  `app/dashboard/projects/[slug]/error.tsx`), each logging the real error
  server-side while showing only a safe, generic message to the user.
- **Analytics** — a real, anonymous page-view pipeline, end to end:
  `components/observability/AnalyticsTracker.tsx` (mounted in
  `app/layout.tsx`, fires on every real navigation via
  `navigator.sendBeacon`) → `POST /api/observability/events` (validated,
  rate-limited per PR-097.05) → `lib/backend/sqlite/analyticsEvents.ts`
  (parameterized `INSERT`, real migration `0011_analytics_events`) →
  `GET /api/observability/analytics` (admin-gated via `resolveAdminAccess`,
  the same PR-095 boundary reused, not reimplemented) →
  `/dashboard/observability/analytics` (real loading/unauthenticated/
  forbidden/error/empty/ready states, no fabricated data).
- **Performance Dashboards** — the same real shape for Core Web Vitals:
  `components/observability/WebVitalsReporter.tsx` (Next's own
  `useReportWebVitals`) → `POST /api/observability/web-vitals` (validated,
  rate-limited) → `lib/backend/sqlite/performanceMetrics.ts` (real
  migration `0010_performance_metrics`) →
  `GET /api/observability/performance` (admin-gated) →
  `/dashboard/observability/performance`.
- **Tests** — 14 test files / 80 tests across every layer (routes,
  components, backend storage, hooks, `instrumentation.ts`), all
  re-run fresh this closeout: **80/80 passing**.
- **Anonymity / sensitive-data handling** — confirmed by direct code
  read and by inspecting real recorded rows during live verification:
  neither table has an `account_id`/`visitor_id`/cookie column, and
  neither summary endpoint's real JSON response (fetched live, admin-
  authenticated) contains anything beyond path/metric aggregates.
- **Overhead** — both reporters use `navigator.sendBeacon` (falling back
  to `fetch(..., { keepalive: true })`), a genuinely non-blocking,
  fire-and-forget send that cannot delay real page rendering; confirmed
  in source, not just assumed.
- **Live, end-to-end verification** — a real running production server:
  real navigations generated real `POST /api/observability/{events,
  web-vitals}` calls (`201 Created`, confirmed via network log); a real
  admin session then loaded both `/dashboard/observability/analytics`
  and `/dashboard/observability/performance`, each rendering the exact
  real data those navigations produced (4 real page views across the
  exact paths visited; a real `TTFB` sample), with zero console errors.

**Admin dashboard discoverability/navigation — Complete.** Two prior
closeout passes on this exact sub-item found and confirmed the gap
(neither dashboard had any in-app link) and investigated, then rejected,
`components/dashboard/Sidebar.tsx`/`constants/dashboard.ts` as an
alternative fix location: the main Sidebar has zero admin-related
entries today, not even a link to `/dashboard/admin` itself, so adding
these two there while every sibling admin page stays absent would create
a new, inconsistent pattern rather than a clean fix. The one real,
precedented integration point — `AdminNav.tsx`'s `ADMIN_NAV_ITEMS` array,
the same navigation every other admin page (`AdminOverviewPage.tsx`,
`AdminRegistryPage.tsx`, `AdminActivityPage.tsx`, `AdminRolesPage.tsx`)
already registers into — was correctly identified but left unmodified in
both of those passes because it is a file this repository attributes to
PR-095.02/.05/.06, and neither prior pass was authorized to touch
PR-095-owned work.

This closeout **was explicitly authorized** to make the minimal,
already-identified fix in that one file, and did so:

- `components/admin/AdminNav.tsx` — two entries added to the existing
  `ADMIN_NAV_ITEMS` array, in the same `{ href, label }` shape every
  existing entry already uses, appended after the four existing items
  (Overview → Project Registry → Activity Log → Roles & Permissions →
  **Analytics** → **Performance**): `{ href: "/dashboard/observability/
  analytics", label: "Analytics" }` and `{ href: "/dashboard/
  observability/performance", label: "Performance" }`. No other line in
  the file changed — the component's rendering logic, active-state
  styling, and every pre-existing entry are byte-for-byte unchanged.
- New focused test file, `tests/components/admin/AdminNav.test.tsx` (6
  tests): both new links render with the correct `href`; both correctly
  receive the active-state styling on their own route and not on the
  other's; every pre-existing entry still renders unchanged; the full
  six-item order is exactly as specified.
- **Live-verified, not just unit-tested**: a real running production
  server, a real admin SIWE session — the Admin navigation bar visibly
  shows Analytics and Performance after Roles & Permissions; clicking
  each performs a real client-side navigation (confirmed via page title
  change) to its real route, rendering real, live data (real page-view
  counts on Analytics; real INP/TTFB samples with correct good/needs-
  improvement/poor breakdowns on Performance); a real non-admin session
  loading either route directly shows the same honest "Access
  restricted" empty state as before this change — server-side
  authorization (`resolveAdminAccess`) is untouched and still the only
  thing that ever gates real data, confirmed via both a direct API check
  (`403` for non-admin, `200` for admin on both summary endpoints) and
  the rendered UI.

**No other gaps found.** No bugs, no missing input validation, no
security regressions, no sensitive-data exposure, and no measurable
overhead were found anywhere in the Observability system across any of
this sub-item's investigation passes — the "Analytics" and "Performance
dashboards" pipelines themselves (ingest, storage, authorization,
aggregation, rendering) were already fully implemented before this
closeout even began; only their navigation entry was missing.

**Validation:** `npx tsc --noEmit` clean; `npm run lint` clean; the new
`AdminNav.test.tsx` plus the full observability-scoped test slice
(11 files / 74 tests) all passing; full `npx vitest run` — **290 files /
2985 tests passing** (up from 289/2979, the 6 new `AdminNav` tests); `npm
run build` succeeds, same route split as every other current PR-097
build.

PR-097.03 is now **Complete**: Error Tracking, Analytics, Performance
Dashboards, and admin dashboard discoverability/navigation are all real,
tested, and live-verified. Every PR-097 sub-item (.01 through .07) is now
Complete, and the epic-level summary above reflects that.

---

## Product Vision

Base Radar's long-term vision is to become the default intelligence layer
for the Base ecosystem — the first place anyone opens to answer "what's
happening on Base right now," and the canonical, verified registry other
builders point to for trustworthy project data. It exists to solve four
concrete problems: fragmentation (ecosystem information scattered across
explorers, DEX aggregators, Discords, and X threads), unverified information
(most project directories are self-reported and unmoderated), noise over
signal (most dashboards weight everything equally), and the lack of any
canonical source of truth for "what exists" on Base. See
[PRODUCT_VISION.md](PRODUCT_VISION.md) for the full mission, target users,
and competitive positioning — this section only summarizes it for roadmap
context.

---

## Engineering Principles

Principles already established and enforced throughout the project (see
[CLAUDE_RULES.md](CLAUDE_RULES.md) for the full enforcement detail):

- **Evidence-first.** Every claim in this roadmap, and every feature in the
  product, is traceable to real, verifiable data — real commits, real
  provider responses, real registry entries — never an assumption presented
  as fact.
- **Deterministic intelligence.** Every scoring, narrative, and summary
  engine in the codebase (`lib/intelligence/`, `lib/alerts/intelligence/`,
  `lib/ai-intelligence/`) is rule-based and reproducible — same input,
  same output, always. No external LLM/AI API is called anywhere in the
  product today.
- **Registry-driven architecture.** `data/projects/` is the static, inert
  source of truth every live layer eventually joins against — the Provider
  Layer, Discovery Engine, and AI Intelligence Engine all read it; none of
  them write to it.
- **No fabricated data.** A missing metric is shown as an honest "Not
  Currently Available" (with a real reason) or hidden entirely — never
  invented, never a silent placeholder presented as real.
- **Reuse existing components.** New surfaces are built from
  `WidgetCard`/`ProfileSectionCard`/`GlowBadge`/`EmptyState`/etc., not
  parallel one-off implementations. Design system audits in this roadmap
  actively watch for and correct drift from this rule.
- **Small, focused PRs.** One purpose per PR — a fix, a feature increment,
  or a polish pass, never bundled.
- **Architecture before features.** New capability is added by extending
  the existing layered pipeline (Provider → Registry → Discovery → AI
  Intelligence → Dashboard/Project surfaces), never by bypassing it.
- **Design consistency over redesign.** Visual work audits against the
  system's own established conventions and fixes genuine drift; it does not
  invent new patterns or redesign working surfaces without an explicit
  mandate to do so.
- **Progressive enhancement.** Every live-data feature degrades gracefully
  to a typed mock baseline or an honest empty state — a slow or failing
  provider never breaks a page.

---

## Completed Milestones

Each entry cites its real GitHub PR number (`git log --merges`), grouped by
theme rather than strict chronological order. See the numbering note above.

### Foundation

| PR | Summary |
| --- | --- |
| PR-001 | Landing page: animated hero, live network stat cards, trust indicators, CTA into the dashboard. |
| PR-002 | Documentation foundation — README, Architecture, Product Vision, and the original Roadmap established. |
| PR-003 | Foundation polish pass across the landing page and initial dashboard shell. |
| PR-004 | Provider Layer: CoinGecko, DexScreener, DefiLlama, Blockscout, Base RPC, and GitHub integrated behind a typed mock-fallback aggregator. |

### Explorer

| PR | Summary |
| --- | --- |
| PR-006 | Project Explorer page shell — a browsable view over the Project Registry. |
| PR-007 | Explorer search. |
| PR-008 | Explorer category/tag/chain filters. |
| PR-009 | Explorer grid/card view. |
| PR-010 | Explorer table view polish. |
| PR-011 | Explorer table scroll-behavior fix. |
| PR-013 | Quick View micro-interaction polish. |
| PR-014 | Final Explorer/Quick View polish pass. |
| PR-015 | Design system conformance pass — removed one-off `Button`/`Skeleton` primitives that duplicated the shared system. |
| PR-016 | Production-readiness cleanup ahead of the v1.0.0 release. |
| PR-017 | v1.0.0 release — Explorer and Project Profile hardening milestone. |

### AI Intelligence

| PR | Summary |
| --- | --- |
| PR-022 | Alert Engine — real, provider-backed alerts (GitHub, Snapshot, CoinGecko, DefiLlama, Blockscout) for Watchlist projects. |
| PR-023 | Watchlist ↔ Alert Engine integration — per-project alert enable/disable. |
| PR-024 | Live provider-backed alert data wired through all five Alert Engine sources. |
| PR-025 | AI Intelligence layer — deterministic scoring/narrative/summary engine over Alert Engine output. |
| PR-026 | AI Daily Intelligence Brief — market-wide executive summary built entirely on the AI Intelligence Engine's output. |
| PR-027 | Portfolio Intelligence — a Watchlist-scoped executive summary one level above the Daily Brief. |
| PR-028 | Intelligence Timeline — chronological merge of Alerts, Daily Brief, and Portfolio Intelligence into one feed. |
| PR-029 | Notification System — unified bell/drawer/page reshaping the Intelligence Timeline. |
| PR-030 | Automation System — rule engine evaluating Notifications into automation results. |

### Platform, Search & Personalization

| PR | Summary |
| --- | --- |
| PR-031 | Global Search & Command Palette — ⌘K search spanning a static command registry and every existing data source. |
| PR-032 | Personalization & Advanced Watchlists — multiple named, user-organized project collections with an active-watchlist scoping model. |
| PR-033 | Account Layer & Sync Foundation — local-only profile, offline-first sync queue, Connector and Backend Service abstraction layers. |

### Release Hardening

| PR | Summary |
| --- | --- |
| PR-034 | v1 finalization — engineering milestone hardening pass. |
| PR-035 | Landing page cleanup. |
| PR-036 | Landing page messaging refresh. |

### Registry

| PR | Summary |
| --- | --- |
| PR-037 | Project Registry foundation model — `lifecycle`, `verificationLevel`, and `qualityScore` fields added, additive and non-breaking. |
| PR-038 | Project Registry integration pass — Explorer reads the registry model directly. |
| PR-039 | Discovery Engine — candidate-project discovery pipeline sitting beside the Registry, feeding a human-review queue; never writes to the Registry itself. |

### Dashboard Intelligence

| PR | Summary |
| --- | --- |
| PR-040 | AI Intelligence Engine v2 — a reusable `AIIntelligenceBrief` model (architecture only at this stage; no generation logic yet). |
| PR-041 | Daily Brief Generation Pipeline — deterministic, rule-based generator producing ranked `AIIntelligenceBrief`s from real Registry/Discovery/Alert input. No LLM, no external API call. |
| PR-042 | Dashboard Intelligence Integration — wired the Daily Brief Generation Pipeline into the Dashboard's existing Intelligence Brief widget. |

### Project Intelligence

| PR | Summary |
| --- | --- |
| PR-005 | Project Intelligence Engine (`lib/intelligence/`) — the original per-project Health/Risk/Confidence scoring engine behind the Project Profile. |
| PR-018 | Live intelligence data wired into the Project Profile. |
| PR-019 | Premium Project Profile redesign, final pass. |
| PR-020 | Live intelligence refinements on the Project Profile. |
| PR-021 | Project Profile intelligence overhaul — Health Scorecard, Executive Intelligence panel, and Activity Timeline. |
| PR-043 | Project Intelligence Integration — surfaced the AI Intelligence Engine / Daily Brief Pipeline per-project on the Project Profile page. |

---

> **⚠️ ARCHIVED — superseded, not current.** Everything from here through
> the end of this document (`Current Milestone`, `Planned Milestones`
> PR-044–PR-053, `Release Progress`, and `Next Recommended PR`) is a
> historical planning snapshot written before the [Platform Epics
> (PR-089–PR-097)](#platform-epics-pr-089pr-097) section above existed —
> all of which is now ✅ Complete. It predates and was superseded by that
> epic sequence, not the other way around; do not treat it as the current
> plan. Preserved here as historical record, not deleted, per this
> project's own "never left silently stale" documentation standard
> (below) — but every specific status/recommendation in this block should
> be treated as **unverified against the current codebase** unless
> re-confirmed. Verified this pass, evidence-based, not assumed:
>
> - **"Current Milestone" (Phase 6) and "Next Recommended PR" (PR-045)
>   are both stale.** The premise that PR-044 was "just done" and
>   awaiting review no longer holds — the codebase has moved through the
>   entire PR-089–097 sequence since. The specific example this section
>   cites as still-open (`/dashboard/watchlist` vs `/dashboard/watchlists`
>   consolidation) is already resolved: `app/dashboard/watchlist/page.tsx`
>   is a real, working `permanentRedirect("/dashboard/watchlists")`.
> - **"Release Progress"'s own note that "Release 1's real authentication/
>   backend work (D) hasn't started" is false.** Real SIWE authentication,
>   real server-side sessions, and a real SQLite backend are extensively
>   implemented, tested, and live-verified (see Bug 3, PR-095, and
>   PR-097.05 in the Platform Epics section above) — this table's
>   percentages predate that work entirely and should not be read as
>   current.
> - **PR-044 (Design System Foundation v2)'s own goal was superseded, not
>   left undone**: [`docs/DESIGN_SYSTEM_LOCK.md`](DESIGN_SYSTEM_LOCK.md)
>   records a later, more thorough design-system effort, explicitly
>   "🔒 Frozen v1.0 — visual and interaction foundation for PR-085
>   onward" — i.e. governing every surface PR-045–PR-049 below would have
>   touched, via a different, later initiative than the one planned here.
> - **PR-052 (Watchlist Intelligence)'s goal is genuinely built**:
>   `components/watchlists/WatchlistCollectionCard.tsx` already renders a
>   real per-project AI Grade, risk badge, and confidence level.
> - **PR-053 (Portfolio Intelligence Dashboard)'s goal was superseded by
>   something larger**: dedicated `lib/portfolio-intelligence/` and
>   `lib/portfolio-ai/` engines exist today with real scoring/narrative
>   logic of their own — well beyond this item's original "no new scoring
>   logic, just reuse existing output" scope.
> - **"Deferred Ideas"' "AI chat assistant" entry is factually wrong as
>   written** — a real `lib/ai-chat/` (7 files) already exists, live-used
>   inside the Wallet platform (confirmed live this session). **"Team
>   workspaces"/"Portfolio sharing"'s stated blocker ("deferred until real
>   authentication exists") no longer holds** — real authentication now
>   exists — though neither feature itself was found to be built; if
>   still wanted, they'd move from *blocked* to *available to schedule*,
>   not to *done*.
> - PR-045–PR-051 were not individually re-verified pixel-for-pixel this
>   pass; given the DESIGN_SYSTEM_LOCK.md evidence above and this
>   session's own extensive live UI verification (Admin, Automation,
>   Observability, Wallet surfaces all showing consistent, polished
>   styling throughout), they are very likely also superseded by that
>   same later effort rather than genuinely outstanding — flagged as
>   probable, not certain, since a full per-PR re-audit was out of this
>   pass's scope.
>
> None of the above required or received an application-code change —
> this is a documentation-accuracy correction only.

## Current Milestone

**Phase 6 — Design System Foundation**

With PR-043 shipped, every planned intelligence pipeline (Alert Engine →
Daily Brief → Portfolio → Timeline → Notifications → Automation, and
separately Discovery → AI Intelligence Engine v2 → Daily Brief Generator →
Dashboard/Project Intelligence) is live. Phase 6 turns attention to the
UI layer those pipelines render through: a visual-consistency audit and
polish pass across the entire dashboard experience — spacing, typography,
cards, widget headers, badges, buttons, tables, empty states, loading
states, and responsive behavior — bringing the product closer to
Linear/Raycast/Coinbase/Vercel-level polish while preserving Base Radar's
existing identity.

**Objectives:**

- Standardize the 8px spacing rhythm and remove inconsistent padding across
  widgets and pages.
- Standardize typography hierarchy (page/section/widget titles,
  descriptions, metadata, timestamps, badges) with no new fonts introduced.
- Audit card, widget-header, badge, button, table, empty-state, and
  loading-state conventions for genuine drift, fixing only unambiguous
  outliers — never forcing uniformity onto deliberate contextual variation.
- Verify no layout regression at Desktop, Tablet, and 375px Mobile.
- Explicitly **not** a redesign: no routing, business logic, provider,
  AI Intelligence Engine, or Registry changes; no new components, no
  component moves/renames, no animation beyond subtle hover/focus.

PR-044 (below) is this milestone's first concrete pass — audited and
fixed, currently uncommitted and awaiting review.

---

## Planned Milestones

### PR-044 — Design System Foundation v2

**Goals:** Audit and standardize spacing, typography, cards, widget
headers, badges, buttons, tables, empty states, and loading states across
the full dashboard experience.

**Deliverables:** A file-and-line-referenced audit distinguishing genuine
drift from deliberate contextual variation; surgical, zero-logic-risk
className fixes only for confirmed outliers (no redesign, no component
moves/renames); a full validation pass (`tsc`, lint, build) and live
browser QA at Desktop/Tablet/375px.

**Dependencies:** None — pure visual audit of already-shipped surfaces
(PR-001–PR-043).

---

### PR-045 — Dashboard Layout Polish

**Goals:** Apply PR-044's confirmed spacing/rhythm conventions to the
Dashboard page's own layout — widget grid gaps, KPI row alignment, and
section-to-section vertical rhythm.

**Deliverables:** Consistent widget-grid spacing; aligned KPI row; no
widget content or data-fetching changes.

**Dependencies:** PR-044.

---

### PR-046 — Widget Refinement

**Goals:** Bring every Dashboard widget's internal layout (icon chip,
title/subtitle, action menu, footer timestamp) into full conformance with
`WidgetCard`'s established anatomy, per PR-044's audit findings.

**Deliverables:** Any remaining per-widget internal spacing/typography
outliers resolved; no widget behavior or data change.

**Dependencies:** PR-044, PR-045.

---

### PR-047 — Explorer UX Polish

**Goals:** Apply the same spacing/typography/card standards to the
Project Explorer (grid view, table view, filters, search) established in
PR-044.

**Deliverables:** Consistent Explorer card/row/filter styling; no filtering
or search logic change.

**Dependencies:** PR-044.

---

### PR-048 — Project Profile Visual Refresh

**Goals:** Apply the design system standards to the Project Profile page's
remaining surfaces (Header, Scorecard, Token & Price, Network, Contracts,
Governance, Timeline) beyond what PR-044 already covered.

**Deliverables:** Full Project Profile visual conformance; no change to
`lib/intelligence/` or the AI Intelligence integration built in PR-043.

**Dependencies:** PR-044.

---

### PR-049 — Motion & Micro-interactions

**Goals:** Standardize hover/focus transition timing and easing across
buttons, cards, and interactive rows, per the Animation Principles already
documented in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#animations) — subtle
confirmation motion only, nothing decorative, full `prefers-reduced-motion`
support preserved.

**Deliverables:** A single, consistent hover/focus transition timing scale
applied across the dashboard; no new animation library.

**Dependencies:** PR-044–PR-048.

---

### PR-050 — Timeline Integration

**Goals:** Extend the Intelligence Timeline (PR-028) and the newer
Discovery/AI-Intelligence-v2 pipeline (PR-039–PR-043) so Timeline events can
originate from either source in one consistent feed, rather than only the
older Alert-Engine-derived events.

**Deliverables:** Timeline event model extended (additively) to accept a
second source; existing event types and sorting untouched.

**Dependencies:** PR-043.

---

### PR-051 — Notification Center v2

**Goals:** Extend the Notification System (PR-029) to reflect PR-050's
broadened Timeline sourcing, and revisit notification-density/grouping UX
in light of the Design System Foundation's typography and spacing
standards.

**Deliverables:** Notification Center visually conformant with PR-044's
system; notification model extended only if PR-050 requires it.

**Dependencies:** PR-044, PR-050.

---

### PR-052 — Watchlist Intelligence

**Goals:** Surface AI Intelligence Engine v2 / Daily Brief signals (PR-040–PR-043)
directly inside the Watchlists experience (PR-032), closing the gap between
the newer per-project intelligence pipeline and the personalization layer.

**Deliverables:** Watchlist detail view gains an intelligence summary per
project, reusing existing `getProjectAIIntelligence()` output — no new
scoring logic.

**Dependencies:** PR-043, PR-032.

---

### PR-053 — Portfolio Intelligence Dashboard

**Goals:** Extend Portfolio Intelligence (PR-027) to incorporate the same
newer AI Intelligence Engine v2 signals, and apply the Design System
Foundation's visual standards to the Portfolio page.

**Deliverables:** Portfolio Intelligence sections reuse PR-040–PR-043's
output where it adds real signal; page visually conformant with PR-044's
system; no new scoring or narrative logic.

**Dependencies:** PR-044, PR-052.

---

## Future Milestones

Directional ideas, intentionally **not scheduled** into a numbered PR yet:

- **AI Research Assistant** — dedicated research tooling for the AI-agent
  segment of the Base ecosystem (see [PRODUCT_VISION.md](PRODUCT_VISION.md#product-pillars)'s
  Research Tools pillar).
- **Narrative Detection** — automated, evidence-based narrative
  classification superseding today's curated narrative content.
- **Explain Why Engine** — a general-purpose "why is this scored this way"
  explanation layer generalizing the per-field explanations already present
  in the Project Profile's AI Intelligence section.
- **Registry Automation** — converting an accepted Discovery Engine
  (PR-039) candidate into a live Registry entry; today this conversion step
  is manual and unbuilt.
- **Scheduled Discovery** — running the Discovery Engine's providers on a
  schedule rather than on demand.
- **Semantic Search** — replacing Global Search's (PR-031) weighted
  keyword/substring scoring with embedding-based matching.
- **Email Digest** — a scheduled email rendering of the Daily Brief
  Generation Pipeline's (PR-041) output.
- **Mobile Optimization** — a dedicated pass beyond today's responsive
  breakpoints, for genuinely mobile-first interaction patterns.
- **PWA** — installable, offline-capable app shell.
- **Public API** — external, authenticated access to the Project Registry
  and AI Intelligence Engine output (see [API.md](API.md#future-api-endpoints)).

---

## Deferred Ideas

Backlog items intentionally postponed — not rejected, not scheduled:

- **AI chat assistant** — a conversational interface over the Registry and
  Intelligence layers; deferred until a deterministic, non-conversational
  Explain Why Engine (above) is proven out first.
- **Team workspaces** — multi-user shared Watchlists/Personalization;
  deferred until real authentication exists (see
  [ENGINEERING_EXECUTION_PLAN_V1.md](ENGINEERING_EXECUTION_PLAN_V1.md#milestone-d--release-1-platform-foundation)'s
  Session & Identity Model work).
- **Portfolio sharing** — publishing a read-only Portfolio Intelligence
  view; deferred for the same reason.
- **Plugin ecosystem** — third-party extensions to the Registry or
  Intelligence Engine; deferred until the Public API (above) exists.
- **Cross-chain intelligence** — extending beyond Base; deliberately
  deferred indefinitely per [PRODUCT_VISION.md](PRODUCT_VISION.md#what-base-radar-will-not-become)'s
  "not a general multi-chain tracker" principle — this is a standing
  product boundary, not a scheduling gap.

---

## Design System Evolution

The Design System Foundation (Phase 6, PR-044 onward) exists to make four
things true at once, in priority order:

1. **Consistency** — one spacing rhythm, one typography hierarchy, one card
   vocabulary (`WidgetCard`/`ProfileSectionCard`/`GlowBadge`/`EmptyState`),
   applied by convention rather than reinvented per feature. Genuine,
   deliberate contextual variation (a dense table row's lighter hover vs. an
   isolated card's stronger one; a hero `<h1>`'s larger scale vs. a
   secondary page title's) is preserved, not flattened — consistency means
   *no accidental drift*, not *no variation*.
2. **Accessibility** — every interactive element keeps its
   `focus-visible:ring-2` treatment, every icon-only control keeps its
   `aria-label`, and reduced-motion is honored throughout (see
   [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#accessibility)) — polish work never
   trades this away for visual effect.
3. **Information density** — the dashboard is a professional intelligence
   tool, not a marketing page; density and scannability are weighed against
   "premium feel" deliberately, favoring the former where they conflict.
4. **Premium feel** — the Linear/Raycast/Coinbase/Vercel reference point
   named for Phase 6 describes restraint (tighter, more consistent spacing;
   quieter borders and shadows; subtler hover states) rather than added
   ornamentation.

**Maintainability** underlies all four: every fix in this evolution reuses
an existing primitive rather than introducing a new one, per the Reuse
Existing Components principle above, so the system gets more consistent
over time rather than accumulating a second parallel vocabulary.

This section — not a new one per PR — should guide all future UI work;
individual PRs should reference it rather than restate design philosophy.

---

## Architecture Evolution

```
Provider Layer
      │
      ▼
   Registry
      │
      ▼
  Discovery
      │
      ▼
AI Intelligence Engine
      │
      ▼
  Daily Brief
      │
      ▼
  Dashboard
      │
      ▼
Project Intelligence
      │
      ▼
  Timeline
      │
      ▼
Notifications
      │
      ▼
  Portfolio
```

This is the conceptual dependency order the product's intelligence
capability was built in, and the order later capability naturally builds
on. In practice today, two related pipelines share this shape rather than
one single linear one — see [ARCHITECTURE.md](ARCHITECTURE.md) for the full
detail:

- **Alert Engine track** (PR-022–PR-030): Alert Engine → AI Intelligence
  (`lib/alerts/intelligence/`) → Daily Brief (`lib/brief/`) → Portfolio
  Intelligence (`lib/portfolio/`) → Intelligence Timeline (`lib/timeline/`)
  → Notifications (`lib/notifications/`) → Automation (`lib/automation/`).
- **Discovery / AI Intelligence v2 track** (PR-039–PR-043): Discovery
  Engine (`lib/discovery/`) → AI Intelligence Engine v2
  (`lib/ai-intelligence/`) → Daily Brief Generation Pipeline
  (`lib/ai-intelligence/generator/`) → Dashboard Intelligence Integration →
  Project Intelligence Integration.

Both sit downstream of the same Provider Layer and Project Registry, and
neither replaces the other — see each track's own architecture doc for why
they coexist rather than merge (`AI_INTELLIGENCE_ENGINE.md`'s "naming note"
section explains the deliberate type-name separation in detail).

---

## Repository Standards

- **Branch naming**: `feature/<pr-slug>` or `feat/<pr-slug>` (e.g.
  `feature/pr23-platform-foundation`, `feat/discovery-engine`) — matches
  every branch merged to date (`git log --merges`).
- **Commit naming**: Conventional-commit-style prefixes (`feat(scope):`,
  `fix:`) with an imperative, present-tense summary — e.g. `feat(project):
  integrate AI project intelligence`, `fix: align landing page with current
  product capabilities`. AI-assisted commits carry a `Co-Authored-By:`
  trailer.
- **PR naming**: Matches the branch's own feature name/slug; the PR
  description states purpose, files changed, and validation results — see
  the Pull Request Strategy in
  [ENGINEERING_EXECUTION_PLAN_V1.md](ENGINEERING_EXECUTION_PLAN_V1.md#pull-request-strategy)
  for the fuller standard (one purpose per PR, independently reviewable,
  remains mergeable).
- **Validation**: `npx tsc --noEmit`, `npm run lint`, `npm run build` must
  all pass clean before any PR is considered done — enforced identically by
  CI (`.github/workflows/ci.yml`, see [CI.md](CI.md)) and by every PR in
  this project's history.
- **Testing**: Vitest + React Testing Library, colocated under `tests/`
  mirroring `lib/`/`components/` structure — see [TESTING.md](TESTING.md).
  A foundation, not a coverage target; coverage grows PR by PR rather than
  being back-filled in bulk.
- **Documentation requirements**: A PR that changes what an existing doc
  describes updates that doc in the same PR (or explicitly flags the
  follow-up) — never left silently stale. Structural/architectural changes
  update [ARCHITECTURE.md](ARCHITECTURE.md) and [API.md](API.md); roadmap
  changes update this document.
- **Review checklist**: No new Dependency Rule or Ownership Principle
  violation; no new dead link or broken workflow; no new one-off UI pattern
  (Design Debt Prevention); the PR's own scope is test-covered where
  applicable; affected docs updated; no unexplained performance regression;
  no new accessibility regression (keyboard trap, missing focus state).
  Live browser QA (Desktop/Tablet/375px, no console errors, no hydration
  warnings) for any visual change. See
  [ENGINEERING_EXECUTION_PLAN_V1.md](ENGINEERING_EXECUTION_PLAN_V1.md#quality-gates)
  for the fuller Quality Gates list this distills.

---

## Release Progress

Realistic, current-state estimates — not a commitment to a date:

| Area | Progress |
| --- | --- |
| Foundation | 100% |
| Explorer | 95% |
| Registry | 100% |
| AI Intelligence | 100% |
| Dashboard | 100% |
| Project Pages | 90% |
| Notifications | 90% |
| Portfolio | 85% |
| Design System | 10% |
| Testing & Platform Hardening | 35% |
| Mobile | 45% |
| **Overall Progress** | **80%** |

Notes on the two lowest figures: **Design System** reflects that PR-044 (the
first real audit/fix pass) is complete but uncommitted, and PR-045–PR-049
haven't started. **Testing & Platform Hardening** reflects
[ENGINEERING_EXECUTION_PLAN_V1.md](ENGINEERING_EXECUTION_PLAN_V1.md)'s own
Milestone status: Testing Foundation (B) shipped, but Navigation & Ownership
Integrity (A) — specifically the dual `/dashboard/watchlist` /
`/dashboard/watchlists` routes — and Loading & Error Coverage (C) are not
finished, and Release 1's real authentication/backend work (D) hasn't
started.

---

## Next Recommended PR

**PR-045 — Dashboard Layout Polish**

PR-044 (Design System Foundation v2) has already been audited and fixed
locally — spacing, typography, card, and empty-state conventions across the
dashboard are validated (clean `tsc`/lint/build, live browser QA at three
breakpoints) and awaiting review. The natural next step is applying those
now-confirmed conventions to the Dashboard page's own layout (widget grid
spacing, KPI row alignment), the highest-traffic surface in the product and
the one PR-044's audit touched least directly. It has no dependency beyond
PR-044 landing, keeps the same low-risk "visual polish only" scope, and
sequences naturally before the wider Explorer/Project Profile passes
(PR-047, PR-048) reuse the same conventions.

Separately, and outside this visual-polish track: the still-open Milestone
A item in
[ENGINEERING_EXECUTION_PLAN_V1.md](ENGINEERING_EXECUTION_PLAN_V1.md#milestone-a--navigation--ownership-integrity)
(consolidating `/dashboard/watchlist` and `/dashboard/watchlists` into one
implementation) is a real, already-documented Ownership Principle violation
independent of design work, and should not be indefinitely displaced by the
visual-polish sequence above — it's flagged here so it isn't lost between
the two roadmaps.
