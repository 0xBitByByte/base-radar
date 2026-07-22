# CI/CD

Base Radar's continuous integration pipeline, added in PR-007. No workflow, Husky, or lint-staged config existed before this — this is a new, minimal quality gate, not a replacement of anything.

## What runs

Defined in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml), one job (`Quality Gates`) running these steps in order on a single `ubuntu-latest` runner:

1. `npm ci`
2. `npx tsc --noEmit` — TypeScript
3. `npx eslint .` — ESLint
4. `npm test` — unit tests (see [`docs/TESTING.md`](TESTING.md) for what's covered and why)
5. `npm run build` — production build

Each step must succeed before the next runs — GitHub Actions stops a job at its first failing step by default, so a red TypeScript or lint step blocks tests and the build from ever running.

## Triggers

- Every pull request (any target branch).
- Every push to `main`.

## Node version and caching

Pinned to Node 22 (the version this repo is developed against) rather than a floating `lts/*` alias, so CI behavior doesn't shift silently when a new Node line becomes LTS. Dependency installs are cached via `actions/setup-node`'s built-in `cache: npm`, keyed off `package-lock.json` — no separate cache action or build-cache layer was added, to keep the workflow easy to reason about.

## Reproducing a CI failure locally

Run the same five commands, in the same order, from the repo root:

```bash
npm ci
npx tsc --noEmit
npx eslint .
npm test
npm run build
```

Whatever fails locally is what will fail in CI — the workflow does not run anything the commands above don't already run.

## Branch protection (not configurable in code)

GitHub branch protection / required status checks are a repository *setting*, not something a workflow YAML file can express — this PR does not attempt to configure it. Recommended configuration for `main`, to be applied by someone with repo admin access via **Settings → Branches → Branch protection rules**:

- Require the `Quality Gates` status check to pass before merging.
- Require branches to be up to date before merging.
- (Optional) Require at least one review approval.

## Explicitly out of scope

No Husky or lint-staged pre-commit hooks were added — none existed before this PR, and the brief for this change scoped it to repository-level CI only. If pre-commit enforcement is wanted later, that's a separate, deliberate decision, not an implicit follow-on to this one.
