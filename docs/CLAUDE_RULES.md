# Claude Rules

Permanent engineering rules for any AI agent (or human) working in this
repository. These are not suggestions — they hold across every task,
regardless of what a given prompt asks for, unless the user explicitly
overrides one in that specific instance.

## Before Starting Work

- **Always read documentation first.** Read the relevant files in `/docs`
  — especially [ARCHITECTURE.md](ARCHITECTURE.md),
  [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), and [PROJECT_REGISTRY.md](PROJECT_REGISTRY.md)
  — and the current state of the affected code before making changes. Do
  not assume prior context is still accurate; verify against the live
  codebase.
- **Follow current architecture.** Respect the existing layering
  (UI → Hooks → Services → Providers, and the standalone Project Registry —
  see [ARCHITECTURE.md](ARCHITECTURE.md)). New data needs go through the
  services layer, not directly from a component to a provider.

## Scope Discipline

- **Never redesign UI unless requested.** Match existing patterns from
  [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md). A feature or bug fix is not an
  invitation to restyle a component, change spacing, or introduce a new
  visual pattern.
- **Never touch the landing page unless requested.** Changes scoped to the
  dashboard, data layer, or docs should not modify `app/page.tsx`,
  `components/landing/`, or `components/layout/` unless the task
  explicitly calls for it.
- **Never rename folders without approval.** Folder structure is part of
  the architecture. Renaming or moving a directory is a structural change
  that needs explicit sign-off first, even if it looks like a harmless
  cleanup.
- **Preserve design consistency.** Reuse the established token names
  (`radar-*` colors, the shared radius scale), component shells
  (`WidgetCard`, `GlassCard`), and interaction patterns rather than
  introducing one-off styling.
- **Keep PRs focused.** One task, one coherent change. Do not bundle
  unrelated fixes, refactors, or drive-by cleanups into the same change —
  flag them separately instead.

## Git Discipline

- **Never commit unless instructed.** Making changes is not the same as
  committing them; wait for an explicit instruction to commit.
- **Never push unless instructed.** The same applies to pushing — local
  commits are not to be pushed to any remote without being asked.

## Engineering Standards

- **Prefer reusable components.** Before adding a new component, check
  whether an existing primitive in `components/ui/` already covers the
  need. Extend or compose existing pieces before creating parallel ones.
- **Prefer free APIs.** Data providers should default to free, publicly
  documented APIs (as the current six in `lib/data/providers/` already do)
  before reaching for a paid one. Do not invent or assume access to a paid
  API without it being explicitly provided.
- **Maintain accessibility.** Keep the patterns already in place —
  `aria-label` on icon-only controls, `aria-hidden` on decorative icons,
  visible `focus-visible` rings, semantic landmarks — on any new
  interactive element. Don't ship a control that regresses keyboard or
  screen-reader support.
- **Maintain performance.** Respect the existing caching windows in the
  providers layer, avoid unnecessary client-side data fetching (prefer
  Server Components per [ARCHITECTURE.md](ARCHITECTURE.md)), and don't
  introduce blocking work on the main render path.
- **Keep code production ready.** No placeholder logic, no
  commented-out dead code, no half-finished implementations left in a
  mergeable state. If something is intentionally incomplete, it should be
  clearly scoped as a documented future step (e.g. in
  [ROADMAP.md](ROADMAP.md)), not silently shipped half-done.

## Validation

Before finishing any task that touches code, run and confirm all three
pass:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

A task is not complete until these succeed. If one fails, fix the
underlying issue rather than working around it.
