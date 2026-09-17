# Claude Efficiency Standard

Permanent rules for minimizing Claude's usage on this repository (tool
calls, redundant investigation, redundant validation) **without reducing
engineering quality**. This document does not relax anything in
[CLAUDE_PR_WORKFLOW.md](CLAUDE_PR_WORKFLOW.md) or
[CLAUDE_RULES.md](CLAUDE_RULES.md) — it governs *how efficiently* that
process is carried out, never *whether* a required step happens. Where this
document and either of those conflict, they win.

The Universal Project Card initiative (PR-1–PR-10) is the source for every
rule below — both the genuine inefficiencies it contained and the patterns
that worked well.

---

## Research Optimization

- **Never repeat valid research.** If a fact was already established this
  session (a file's contents, a type's shape, a component's behavior) and
  nothing has changed it since, use the established fact — don't re-read
  the file "to be sure." Re-read only when: the file may have changed since
  it was last read, or the earlier read didn't cover the specific detail
  now needed.
- **Reuse approved findings.** A resolved Engineering Note is a settled
  fact, not a question to re-derive. Cite it (EN-00N) instead of
  re-investigating the same contradiction (this document itself does this
  for every rule it states).
- **Reference existing Product/Engineering Standards** instead of
  re-explaining them inline. A future PR's plan should say "per §14" or
  "per CLAUDE_PR_WORKFLOW.md's Engineering Notes section," not restate the
  rule's content.
- **Avoid duplicate investigations.** Before grepping for something, check
  whether the current conversation already surfaced it. This session's
  worst pattern to avoid: re-discovering the same fact (e.g., which
  hook a component uses) three separate times across three separate PRs
  because each PR's analysis started from zero instead of from what the
  last one already found about the same file.

## Codebase Analysis

- **Batch searches.** A Step 2 analysis that needs to check five files
  should read/grep for all five in one turn's tool calls, not five
  sequential turns. This session's PR-10 audit is the model: one batch of
  greps across the whole `LiveProjectCard`/`ProjectIntelligence`/
  `ProjectLogo` consumer surface, in a handful of calls, rather than one
  file at a time.
- **Prefer one comprehensive audit over repeated narrow greps.** When the
  question is "does anything else do X," search broadly once (e.g. every
  consumer of a shared primitive) rather than checking candidates one at a
  time as they occur to you.
- **Reuse previous architecture findings.** Once a layer's shape is
  understood (e.g. "the search aggregation pipeline is a client-side hook
  chain with no server-data entry point," established during PR-8's
  analysis), later work in the same area starts from that finding instead
  of re-deriving it.

## Implementation Strategy

- **Implement one logical module completely before validating**, when the
  module's pieces are tightly coupled and none of them is independently
  testable (e.g. PR-8's five-file promise-threading chain was written in
  full, then validated once — not tsc-checked after each individual file
  edit, which would have produced five rounds of the same "unused prop"
  or "missing import" noise on files not yet finished).
- **Avoid validate-after-every-file workflows** for multi-file, single-
  purpose changes. Validate at natural completion boundaries: after a
  cohesive unit of work, not after each file in it.
- **Group related edits.** Prefer fewer, complete `Edit`/`Write` calls per
  file over many small sequential edits to the same file when the changes
  are already known — re-reading a file to make a second small edit
  seconds after the first is avoidable by planning both edits together.

## Validation Strategy

*(Restates [CLAUDE_PR_WORKFLOW.md](CLAUDE_PR_WORKFLOW.md#validation)'s
requirements — see there for the full list of when each check is
mandatory. This section only adds: how to run them efficiently.)*

- **Run the full suite once per completed unit of work**, not once per
  file. `npx vitest run` on the whole suite after a cohesive multi-file
  change catches cross-file breakage in one pass; running it after every
  intermediate edit inside the same unit of work is redundant until that
  unit is actually finished.
- **Never skip a required check to save time.** This document optimizes
  *when* and *how* validation runs, never removes it — see
  CLAUDE_PR_WORKFLOW.md's explicit examples of real defects (a contrast
  failure, a `tailwind-merge` gradient gap) that only surfaced *because*
  validation ran, on code that looked correct without it.
- **Re-run only what a late-stage fix could have affected.** If a fix
  lands after an initial full-suite pass, a second full run is still
  required before reporting (per the workflow doc) — but intermediate
  debugging steps while diagnosing that fix don't each need a full
  tsc+lint+vitest+build cycle; use the narrowest tool that answers the
  immediate question (e.g. `npx eslint <one file>` while iterating), then
  the full set once, at the end.

## Browser Testing

- **Reuse previous browser findings when the underlying code hasn't
  changed.** A contrast ratio, an accessible-name check, or a "does this
  page overflow at 375px" result computed earlier in the same session for
  code that is still unchanged does not need to be re-measured just
  because a later, unrelated PR is being verified.
- **Only re-test the areas an actual change could affect.** PR-6's
  verification checked the Watchlist widget's rendering and the one shared
  hook it now used — it did not re-verify every other Dashboard widget on
  the same page, since none of them were touched.
- **Avoid full regression testing after an isolated change.** A change
  scoped to one component, confirmed via its own test suite and one live
  check, does not require re-walking every previously-verified consumer of
  a shared component it calls — unless the *shared* component itself
  changed, in which case every consumer's tests (already covered by "run
  the full suite," above) are the actual regression net, not a manual
  re-walk of each one in the browser.
- **A known, environment-level tool limitation doesn't need to be
  re-proven every time.** Once a limitation is confirmed with real evidence
  (this session's repeated "Browser pane is currently hidden" screenshot
  failures, and the later-diagnosed Dialog-context keydown-delivery
  failure), later PRs can state it's the same known limitation instead of
  re-running the full diagnostic sequence that first confirmed it — but
  only when the symptom genuinely matches; a new or different failure mode
  still gets investigated fresh.

## Engineering Notes

- **Reuse a previous note's resolution when still applicable.** A pattern
  approved once (e.g. the `tickerPromise`-style Server-Component-to-
  client-`use()` threading pattern, or the "add the caller to file scope"
  resolution for a threading gap) is precedent for the next PR hitting the
  same shape of problem — cite it, don't re-litigate it from scratch.
- **Never reopen a previously resolved architectural decision** without a
  new, genuinely different fact. "This is inconvenient again" is not new
  evidence; a real, previously-unknown constraint is.

## Product Owner Interaction

Only interrupt implementation to ask the user when the situation is one
of:
- A genuine architecture conflict (the codebase can't do what the plan
  assumes, as written).
- A product decision (which of several defensible behaviors is correct —
  not "should I write correct code").
- A scope change (the fix requires touching files/systems the current
  task didn't authorize).
- A Standard/Roadmap contradiction (the governing documents disagree with
  themselves or with reality).
- A destructive or hard-to-reverse operation (per the platform's own
  action-category rules — deletions, force-pushes, financial/credential
  actions, and the like).

**Do not interrupt** for an implementation detail already settled by an
existing Standard, Engineering Note, or this document — e.g. "should I run
the full test suite" (yes, always, per CLAUDE_PR_WORKFLOW.md), "should I
fabricate a passing result if a tool is flaky" (no, ever, per the same
document's evidence requirement). Answering these from the existing
governance documents, silently and correctly, is the efficient path — 
asking about them wastes a round-trip on a question the repository has
already answered.

## Documentation Reuse

- **Reference the Product Standard instead of rewriting its rules.** An
  implementation plan cites "§14 Cognitive Load Budget," it doesn't restate
  the table.
- **Reference this Engineering Standard set instead of duplicating
  guidance.** A future PR's report doesn't re-explain what "Not Executed"
  means — it uses the term, defined once, here.

## Efficiency Principles

- **Batch work.** Independent tool calls (reading several files, running
  several greps, checking several unrelated facts) go in one turn, not
  several.
- **Reuse evidence.** A real, still-valid measurement from earlier this
  session is evidence now — re-measuring only when the underlying code
  changed or the earlier measurement didn't answer the current question.
- **Reuse analysis.** A conclusion reached and verified once doesn't get
  re-derived; it gets cited.
- **Minimize expensive operations** (full builds, full browser walks, full
  suite runs) to the natural checkpoints CLAUDE_PR_WORKFLOW.md already
  defines — not more often, and never less.

The test for every rule in this document is the same: **would skipping
this specific repeated step actually lose information, or was it always
going to produce the identical result?** If identical, skip it. If there's
any real chance the answer changed, run it — full stop, regardless of cost.
