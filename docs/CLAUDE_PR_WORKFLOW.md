# Claude PR Workflow — Engineering Execution Policy

Permanent process rules for how Claude executes implementation work in this
repository, distilled from the Universal Project Card initiative (PR-1
through PR-10) — the first initiative run end-to-end under this discipline.
This document governs *process* (how a PR gets from assignment to done);
[CLAUDE_RULES.md](CLAUDE_RULES.md) governs *code* (architecture, coding
standards, component rules). Both apply to every task; neither repeats the
other.

This is not a suggestion set. It holds for every future implementation PR
in this repository unless the user explicitly overrides a specific rule for
a specific task.

---

## Planning

Every PR starts with three steps, in order, before any file is touched.

**1. Read first.** Read the assigned PR's section from its governing
roadmap/plan document, and only the Product Standard (or equivalent design
doc) sections that PR actually references. Do not read ahead into future
PRs unless the current PR has an explicit, stated dependency on one. Output
only: Objective, Scope, Dependencies, Acceptance Criteria — nothing
inferred beyond what the document says.

**2. Analyze before coding.** Inspect the real codebase the PR will touch
before writing anything:
- Read every file the PR's stated scope names, in full.
- Identify reusable components/helpers/patterns already in the codebase —
  reuse before creating (see [CLAUDE_RULES.md](CLAUDE_RULES.md#component-rules)).
- Validate every assumption the plan document makes against what the code
  actually does today. A plan is a hypothesis about the codebase, not a
  fact about it, until checked.
- If this surfaces a genuine mismatch — see **Engineering Notes** below —
  stop before Step 3.

**3. Produce an implementation plan, then wait.** Once Step 2 finds no
blocker, produce: Objective, Files to modify, Files to create, Files
intentionally untouched, Risks, Testing strategy, Acceptance-criteria
mapping. Do not begin implementation in the same turn unless the user's
instructions for that task explicitly pre-approve moving straight to
implementation. When in doubt, wait — approving a plan costs the user one
short reply; unwinding an unwanted implementation costs much more.

---

## Engineering Notes

**When one is required.** Stop and produce an Engineering Note the moment
Step 2 (Analyze) or Step 5 (Verify) surfaces any of:
- A plan/roadmap assumption that's factually wrong once checked against the
  real code (e.g. PR-2A's `LifecycleBadge` reuse assumption, PR-5's
  discovery that `AIProjectsWidget`'s data source had no relationship to
  the canonical model).
- A file-scope gap — the plan's stated file list can't actually implement
  the objective without touching an unlisted file (the recurring pattern
  across PR-4 through PR-8: a caller's Server Component boundary had to
  gain one line to thread data down; PR-8's version of this reached five
  files deep through the app shell before landing on a proven pattern).
- An internal contradiction inside the governing Standard/plan itself (the
  §12/§14 badge-count conflict found during PR-2B; the §5.B/§12/§14
  three-way conflict over `micro`'s canonical anatomy found during PR-3).
- Any genuine architecture question with more than one defensible answer
  (PR-7's nested-card-chrome problem; PR-8's "how does server data reach an
  always-mounted client component" problem).

**How it's written.** Every note carries, in this order: Title, Affected
files, Evidence (real file:line citations, real command output — never a
paraphrase), Conflict/Why it conflicts, Impact, Options (labeled A/B/C,
each with a real tradeoff, not a strawman), Preferred option with
justification. State the evidence before the opinion — a reader should be
able to reach the same conclusion from the evidence alone.

**When implementation must stop.** The moment a note is warranted,
implementation stops completely — no partial fix, no "safe" workaround
applied while waiting, no silent resolution. Never invent a workaround for
a documented contradiction; surface it. This is non-negotiable even when a
fix seems obvious — an obvious-looking fix is exactly what a plan/Standard
author would have written themselves if they'd known.

**How Product Owner decisions get recorded.** Every resolved note is
appended to a durable `ENGINEERING_NOTES.md` (or equivalent) in the
initiative's own planning folder — never only stated in chat and never
folded silently into the frozen plan/Standard documents themselves. A
resolved note records: Status (Resolved — category, e.g. "approved
deviation," "Intentional Exception," "Future Enhancement"), the original
Context/Problem, the Decision actually made, Consequences, and a decision
date. Categorize every resolution precisely — this initiative used
**Approved Deviation** (the plan's letter can't be met, an existing
alternative is accepted instead — EN-001), **Intentional Exception** (found
during audit, ruled out of scope entirely, not a deviation from anything —
EN-002), and **Future Enhancement** (real, wanted, correctly deferred
because building it now would exceed the current PR's charter — EN-003).
Picking the right category matters: it tells a future reader whether
anything is still owed.

---

## Implementation Rules

- **Safe refactoring only.** A PR's own diff should be readable as "exactly
  what this PR's objective required," nothing riding along. If a
  correction is genuinely required to satisfy the PR's own acceptance
  criteria (e.g. PR-2B's Rank-1 sizing fix, found while executing its own
  Design Review checklist), it's in scope; a tidiness pass that happens to
  be nearby is not.
- **Reuse existing patterns before inventing a new one.** Before writing a
  new mechanism, check whether one already exists for the same shape of
  problem — PR-8's `liveProjectsPromise` reused the exact
  `tickerPromise`/`use()`/`*Async`-boundary pattern already live in
  `LiveStatusBarAsync`, rather than inventing a second way to get server
  data into a client tree.
- **Avoid architecture drift.** Never introduce a second data-access path
  for something the codebase already has one canonical path for (no new
  API route or client fetch was introduced anywhere in PR-4 through PR-8,
  even when it would have been the locally-easiest fix — see PR-8's
  Engineering Note, Option B, explicitly rejected on this basis).
- **No silent assumptions.** If an assumption can't be verified from the
  real code in front of you, it becomes a question (to the user) or an
  Engineering Note (if it blocks the plan) — never a guess folded quietly
  into the implementation.
- **No hidden behavior changes.** A migration PR changes exactly what its
  acceptance criteria say and nothing else — every other result type/row/
  consumer stays byte-for-byte identical, confirmed by name in the report
  (PR-8's explicit "every other search result type is byte-for-byte
  unchanged" checks). A field or affordance that disappears or appears as a
  side effect of reusing a shared component gets called out explicitly
  (PR-7's incidental new Watch button on the Spotlight card was reported,
  not left for the user to discover).

---

## Validation

Every task that touches code runs, at minimum, before it can be reported
as done:

```bash
npx tsc --noEmit
npm run lint      # or the project's eslint invocation
npx vitest run    # or the project's test runner
npm run build
```

**When each is required:**
- **TypeScript, ESLint:** every time any file changes, no exception —
  cheap, fast, and catches an entire class of error before it can reach
  runtime.
- **Full test suite:** every time any file changes, not just a targeted
  test file — a change in one shared component (e.g. `LiveProjectCard`)
  can silently break an unrelated consumer's test; the only way to know is
  running everything.
- **Production build:** every time any file changes — `tsc`/lint can miss
  build-time-only failures (e.g. an invalid Server/Client Component
  boundary) that only `next build` surfaces.
- **Browser verification:** required whenever the change is observable in
  a rendered page — new/changed UI, new data wiring, new interaction. Real
  evidence only: computed styles, real DOM inspection, real keyboard
  key-presses (not programmatic `.focus()`, which produces false negatives
  for `:focus-visible` — confirmed this session), real network-request
  counts for performance claims. A screenshot is supporting evidence, never
  the only evidence, and its absence (e.g. a flaky tool) is never a reason
  to skip the DOM/computed-style checks that can stand in for it.
- **Accessibility:** required for any change touching an interactive
  element or a card/row rendered inside another interactive context — 
  check accessible name, keyboard reachability, focus visibility, touch
  target size, and (for anything nested inside another interactive
  element) absence of nested interactive elements, with real evidence, not
  an assumption that it "should still work."
- **Responsive verification:** required for any layout/chrome change —
  minimum mobile + one larger breakpoint, checked via fresh navigation at
  that width (a resize-then-check on an already-loaded page produced a
  documented false positive this session; navigating fresh at the target
  width is the reliable method).

**When each can be skipped — narrowly:**
- A pure-documentation change (no code file touched) doesn't need
  tsc/lint/tests/build — but still gets read back for accuracy.
- A tracker/status-only edit to an already-frozen plan document (e.g.
  flipping a roadmap row to ✅ Complete) needs no code validation, since no
  code changed.
- Browser verification is not required for a change with no rendering
  surface at all (e.g. a pure type or internal refactor with full test
  coverage already proving behavior) — but this is the narrow case, not the
  default, and "no rendering surface" must be actually true, not assumed.

Never skip a validation step because a change "looks safe" — this
session's own evidence argues against that instinct twice: a contrast
failure only surfaced by actually computing WCAG ratios (PR-2B), and a
`tailwind-merge` gradient-conflict gap only surfaced by actually reading
live computed styles (PR-7), both in code that looked correct on inspection.

---

## Reporting

Every completed PR gets a report in this shape — nothing more, nothing
less, unless the user's task instructions for that PR specify otherwise:

1. **Summary** — what changed and why, in a few sentences.
2. **Files Modified / Files Created** — the real, final list.
3. **Tests Executed** — actual command invocations and their actual
   output, never a paraphrase ("tests pass") and never fabricated. An item
   that wasn't run is labeled **Not Executed**, with the reason, not
   silently omitted.
4. **Browser Verification** (when applicable) — same evidence standard:
   real DOM/computed-style/network output, clearly separated into Executed
   vs. Not Executed.
5. **Acceptance Checklist** — every criterion the PR's own plan named,
   each marked PASS / FAIL / NOT EXECUTED / APPROVED DEVIATION. Nothing
   omitted, nothing left ambiguous.
6. **Engineering Notes** — any produced this PR, or "none."
7. **Remaining Risks** — only genuine, currently-true risks; not a
   restatement of things already resolved in this same report.
8. **Recommendation** — exactly one of: **READY FOR APPROVAL**, **BLOCKED
   — USER DECISION REQUIRED**, or **IMPLEMENTATION DEFECTS REMAIN**. Never
   hedge across two of these at once.

**Evidence requirement, stated once, applying everywhere above:** never
claim a command ran, a test passed, a build succeeded, or a browser check
happened unless it was actually executed in that turn and its real output
is what's being reported. If verification uncovers a real defect, fix it
(when in scope) and re-run the full verification set before reporting —
don't report a defect and a pass in the same breath.

---

## Product Owner Workflow

- **Approval is required** before: starting implementation on a plan
  (Step 3 output), proceeding past an Engineering Note, and marking any PR
  complete. It is also required, separately, whenever a PR's own governing
  document says so explicitly (e.g. this initiative's PR-7 carried its own
  additional requirement — "separate, deliberate sign-off given the
  visual-change scope" — beyond the normal recommendation flow).
- **Implementation may continue without a fresh approval** only when the
  user has explicitly pre-authorized a recurring pattern for the rest of a
  phase (this initiative's Phase 4 file-scope-gap pattern, approved once
  and then explicitly declared to no longer require a fresh stop for the
  same category of gap) — and even then, a *new* category of architectural
  question still stops and asks.
- **Tracker updates happen only on explicit instruction**, and only the
  tracker/status fields named — never roadmap content, never acceptance
  criteria, never the Standard, unless the user separately authorizes a
  content change (and even then, per Engineering Notes governance, as a
  minimal, categorized, dated record — never a silent rewrite).

---

## Completion Rules

- **Definition of Done** for a single PR: every item in its own Acceptance
  Checklist reads PASS or Approved Deviation, all four validation layers
  (tsc/lint/tests/build) are clean with real, current-turn output, and the
  user has given explicit approval.
- **Phase completion**: every PR listed under that phase reads ✅ Complete
  (or an explicitly accepted Deferred/optional status the phase's own text
  already allows), and the phase's own stated Exit Criteria are true.
- **Roadmap completion**: every phase is complete, every deferred item is
  named with its reason (not silently dropped), and a final completion
  report accounts for: Completed PRs, Deferred PRs, Intentional Exceptions,
  Future Enhancements, final implementation statistics (real counts, not
  estimates), and one overall recommendation.
- **Tracker updates** happen exactly once per milestone (PR complete, phase
  complete, roadmap complete) and only after the corresponding approval —
  never provisionally, never ahead of the actual decision.

---

## Provenance

This document is a distillation of real practice, not a hypothetical
process — every rule above cites, in its own section, the specific PR in
the Universal Project Card initiative (docs/planning/) where it was
established, tested, or where violating it would have caused a real,
observed problem. When this workflow is applied to a new initiative,
update this document's examples only if a genuinely new pattern emerges —
don't let it drift into abstraction disconnected from real precedent.
