# GitHub Labels

Recommended label taxonomy for issue and PR triage. These are not yet
created on the GitHub repository — this document is the reference to apply
when setting them up (via the GitHub UI, or `gh label create`).

## Type Labels

| Label | Color (suggested) | Use for |
| --- | --- | --- |
| `bug` | `#d73a4a` (red) | Something isn't working as expected |
| `feature` | `#a2eeef` (light blue) | A new capability, not a fix |
| `enhancement` | `#84b6eb` (blue) | An improvement to an existing feature |
| `documentation` | `#0075ca` (dark blue) | Changes to `/docs`, README, or other docs-only work |
| `research` | `#d4c5f9` (light purple) | Investigation/spike work, not a direct implementation |

## Area Labels

| Label | Color (suggested) | Use for |
| --- | --- | --- |
| `dashboard` | `#fbca04` (yellow) | The dashboard shell or any widget |
| `provider` | `#c5def5` (pale blue) | `lib/data/providers/*` — a specific external data source |
| `api` | `#bfd4f2` (pale blue) | The internal services/aggregator API (see [API.md](API.md)) |

## Priority / Effort Labels

| Label | Color (suggested) | Use for |
| --- | --- | --- |
| `performance` | `#fef2c0` (pale yellow) | Rendering speed, bundle size, caching, or provider latency |
| `security` | `#ee0701` (bright red) | See [SECURITY.md](../SECURITY.md) before using this on a public issue |
| `good first issue` | `#7057ff` (purple) | Small, well-scoped, good entry point for a new contributor |
| `help wanted` | `#008672` (teal) | Maintainer would welcome outside help on this one |

## Usage Notes

- An issue typically gets **one type label** (`bug`/`feature`/`enhancement`/
  `documentation`/`research`) plus **zero or more area labels**
  (`dashboard`/`provider`/`api`) so it's filterable both by "what kind of
  work" and "what part of the system."
- `good first issue` and `help wanted` are orthogonal to type/area — apply
  them alongside, not instead of, the other labels.
- Reserve `security` for genuine vulnerability reports routed through the
  process in [SECURITY.md](../SECURITY.md); don't use it for general
  hardening suggestions (those are `enhancement`).
- See [GITHUB_MILESTONES.md](GITHUB_MILESTONES.md) for how labels and
  milestones are expected to be used together — a label says *what kind* of
  work; a milestone says *which roadmap phase* it belongs to.
