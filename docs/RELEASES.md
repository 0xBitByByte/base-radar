# Release Strategy

Base Radar is currently at `0.1.0` (see `package.json`) — pre-release,
under active development, with no tagged GitHub releases yet. This
document defines the versioning scheme and release checklist for when that
changes.

## Versioning

Base Radar follows [Semantic Versioning 2.0.0](https://semver.org/):

```
MAJOR.MINOR.PATCH
```

- **MAJOR** — incompatible changes to anything a consumer could depend on:
  a Project Registry schema change, a future public API's breaking change,
  or a routing change that breaks an existing URL.
- **MINOR** — backwards-compatible functionality: a new widget, a new
  provider, a new Project Registry entry, a new milestone shipping.
- **PATCH** — backwards-compatible bug fixes only.

Until `1.0.0`, the `0.MINOR.PATCH` convention applies more loosely, per
semver's own pre-1.0 allowance: breaking changes may still occur in a
`0.x` MINOR bump, since the public surface is not yet considered stable.

## Release Stages

| Stage | Suffix | Meaning |
| --- | --- | --- |
| **Alpha** | `-alpha.N` (e.g. `0.5.0-alpha.1`) | Early, unstable, milestone-in-progress build. Expect breaking changes between alphas. |
| **Beta** | `-beta.N` | Feature-complete for the milestone; stabilizing. API/schema shouldn't change further without a strong reason. |
| **RC** | `-rc.N` | Release candidate; no known issues. Promoted to stable if nothing surfaces. |
| **Stable** | *(no suffix)* | Tagged, production-ready release. |

Base Radar has not yet used alpha/beta/RC tags in practice (all work to
date has shipped directly to `main` at `0.1.0`) — this table defines the
convention for once release cadence formalizes, expected around Milestone
11 (Release v1) per [ROADMAP.md](ROADMAP.md).

## Path to v1.0

`1.0.0` is intentionally tied to Milestone 11 ("Release v1") in
[ROADMAP.md](ROADMAP.md) and [GITHUB_MILESTONES.md](GITHUB_MILESTONES.md)
— not to a date. The working definition of "ready for 1.0" is: the
Provider Layer, Intelligence Engine, and Project Explorer milestones (5–7)
are shipped, the dashboard's mock-only widgets have a documented, honest
story (either replaced with live data or clearly permanent by design), and
the checklist below passes clean.

## Release Checklist

Before tagging any release (pre-release or stable):

- [ ] `npx tsc --noEmit` passes with no errors
- [ ] `npm run lint` passes with no warnings
- [ ] `npm run build` succeeds
- [ ] `package.json` version bumped according to [Versioning](#versioning)
- [ ] [docs/CHANGELOG.md](CHANGELOG.md) updated with the release's notable changes
- [ ] Any schema/behavior change affecting `/docs` has the relevant doc updated in the same release (see [CLAUDE_RULES.md](CLAUDE_RULES.md#documentation-rules))
- [ ] Manually smoke-tested: landing page loads, dashboard loads, no console errors
- [ ] For a MAJOR bump: breaking changes are called out explicitly in the changelog, with a migration note if applicable
- [ ] Git tag created matching the version (`vX.Y.Z`), and a GitHub Release published from it

## Notes

- There is no automated release pipeline (CI/CD) configured yet — this
  checklist is manual today. Automating it is a reasonable candidate for
  Milestone 11, not a prerequisite for earlier milestones.
- No test suite exists yet (see [CONTRIBUTING.md](../CONTRIBUTING.md#testing-requirements));
  until one does, `tsc`/`lint`/`build` are the release quality bar.
