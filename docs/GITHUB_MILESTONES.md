# GitHub Milestones

Recommended GitHub milestone list, matching the numbering already used in
[ROADMAP.md](ROADMAP.md). These are not yet created as GitHub milestone
objects — this document is the reference to apply when setting them up.

| # | Milestone | Status | Roadmap reference |
| --- | --- | --- | --- |
| 1 | Repository Foundation | ✅ Closed (shipped) | [ROADMAP.md § Completed](ROADMAP.md#completed) |
| 2 | Landing Page | ✅ Closed (shipped) | [ROADMAP.md § Completed](ROADMAP.md#completed) |
| 3 | Dashboard | ✅ Closed (shipped) | [ROADMAP.md § Completed](ROADMAP.md#completed) |
| 4 | Project Registry | ✅ Closed (shipped) | [ROADMAP.md § Completed](ROADMAP.md#completed) |
| 5 | Provider Layer | 📋 Open (planned, not started) | [ROADMAP.md § Milestone 5](ROADMAP.md#milestone-5--provider-layer) |
| 6 | Intelligence Engine | 📋 Open (planned) | [ROADMAP.md § Milestone 6](ROADMAP.md#milestone-6--intelligence-engine) |
| 7 | Project Explorer | 📋 Open (planned) | [ROADMAP.md § Milestone 7](ROADMAP.md#milestone-7--project-explorer) |
| 8 | Signals | 📋 Open (planned) | [ROADMAP.md § Future Ideas](ROADMAP.md#future-ideas) |
| 9 | Portfolio | 📋 Open (planned) | [ROADMAP.md § Future Ideas](ROADMAP.md#future-ideas) |
| 10 | AI Research | 📋 Open (planned) | [ROADMAP.md § Future Ideas](ROADMAP.md#future-ideas) |
| 11 | Release v1 | 📋 Open (planned) | [ROADMAP.md § Future Ideas](ROADMAP.md#future-ideas), [RELEASES.md](RELEASES.md) |

## Usage Notes

- **One milestone per issue/PR maximum.** An issue that seems to span two
  milestones is a sign it should be split.
- Milestones 1–4 would be created as **closed** milestones on GitHub purely
  for historical record — no new issues should be filed against them.
- Milestone order encodes dependency, not just sequence — Milestone 5
  (Provider Layer) blocks 6 and 7; see
  [ROADMAP.md § Notes](ROADMAP.md#notes) for the full dependency reasoning.
- Pair a milestone with the relevant labels from
  [GITHUB_LABELS.md](GITHUB_LABELS.md) — e.g. an issue in Milestone 5
  (Provider Layer) would typically also carry the `provider` area label.
- If a new milestone is added that isn't in this list, add it here **and**
  in [ROADMAP.md](ROADMAP.md) in the same PR — these two documents should
  never disagree on numbering (see the "avoid duplicated information" rule
  in [CLAUDE_RULES.md](CLAUDE_RULES.md#documentation-rules); this table
  exists to map milestones to GitHub objects, not to restate their
  descriptions).
