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
  not assume prior context (including this document) is still accurate;
  verify against the live codebase.
- **Read the repository, not just the prompt.** A task description is a
  starting point, not the full picture — check how the affected area
  actually works today before changing it.

## Architecture Rules

- **Follow current architecture.** Respect the existing layering
  (UI → Hooks → Services → Providers, and the standalone Project Registry —
  see [ARCHITECTURE.md](ARCHITECTURE.md)).
- **Never let a component call a provider directly.** New data needs go
  through `lib/data/aggregate.ts` (the services layer), which every widget
  already imports from — not directly from a component to
  `lib/data/providers/*`.
- **Never let a component fetch on an interval without a hook.** Anything
  that needs to poll or refresh on a timer belongs in `lib/hooks/`, per the
  existing `useLiveNetworkStatus`/`useNowTick` pattern — see
  [ARCHITECTURE.md](ARCHITECTURE.md#hooks-layer).
- **The Project Registry stays inert.** `data/projects/` performs no
  network requests and holds no live state — it is static, canonical data.
  Joining it to live data is a services-layer concern, not a registry one.
- **Prefer Server Components by default.** Only mark a component
  `"use client"` when it genuinely needs interactivity, state, or browser
  APIs — keep client boundaries small and leaf-level, per
  [ARCHITECTURE.md](ARCHITECTURE.md#ui-layer).

## Coding Standards

- TypeScript strict mode, no `any` — the codebase currently has none;
  don't introduce the first one.
- ESLint (`eslint-config-next`) is the source of truth for lint rules;
  `npm run lint` must pass with no warnings.
- No dead code, no commented-out blocks, no placeholder
  logic left in a mergeable state — see
  [CONTRIBUTING.md](../CONTRIBUTING.md#testing-requirements).
- Comments explain *why*, never *what*. If a comment just restates the
  code in English, delete it — well-named identifiers already carry that
  weight.
- Don't add error handling, fallbacks, or config options for scenarios
  that can't happen. Trust the guarantees the surrounding code already
  provides (e.g. providers already never throw — don't re-wrap them in
  another try/catch "just in case").

## Naming Conventions

- **Seed project files**: kebab-case, matching the project's `id`/`slug`
  exactly (`data/projects/seed/aerodrome-finance.ts`) — see
  [PROJECT_REGISTRY.md](PROJECT_REGISTRY.md#naming-conventions).
- **Seed project exports**: camelCase version of the file name
  (`export const aerodromeFinance`).
- **Components**: PascalCase, one component per file, file name matches
  the exported component (`WidgetCard.tsx` exports `WidgetCard`).
- **Hooks**: camelCase, always prefixed `use` (`useLiveNetworkStatus`),
  always in `lib/hooks/`.
- **Provider modules**: one file per external API, named after the
  provider in camelCase or lowercase (`baseRpc.ts`, `coingecko.ts`),
  exporting `async function getX()` style functions that return `T | null`.
- **IDs/slugs**: kebab-case, stable forever once shipped — never renamed
  or reused, since other parts of the app may reference them by string.

## Component Rules

- **Reuse before creating.** Check `components/ui/` for an existing
  primitive before adding a new one — extend or compose
  (`GlassCard`, `WidgetCard`, `Tooltip`, `GlowBadge`, etc.) rather than
  building a parallel one-off.
- **Every dashboard widget renders inside `WidgetCard`.** This is what
  keeps a grid of unrelated widgets reading as one product — don't build a
  widget with its own bespoke card shell.
- **Base UI for behavior, Tailwind for looks.** Interactive primitives with
  real accessibility complexity (tooltip, menu, dialog, switch, progress)
  are built on `@base-ui/react`; don't hand-roll keyboard/focus handling
  that a Base UI primitive already provides.
- **Semantic tokens, not raw values.** Reference `radar-*` color names and
  the shared radius scale — never a raw hex code or an arbitrary pixel
  value — so dark/light themes stay independent of component code. See
  [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#colors).

## Provider Rules

- **One module per external API**, under `lib/data/providers/`.
- **Never throw.** Every provider function resolves to `null` on failure —
  catch internally, never let a raw fetch error propagate to the caller.
- **Always set a `revalidate` window** on provider `fetch` calls, sized to
  how often the data actually changes (see current windows in
  [DATABASE.md](DATABASE.md#caching-strategy)) — don't fetch uncached
  unless the payload genuinely can't be cached (see the documented
  DefiLlama `/protocols` exception).
- **Prefer free APIs.** Default to free, publicly documented APIs (as all
  six current providers already do) before reaching for a paid one. Do not
  invent or assume access to a paid API without it being explicitly
  provided by the user.
- **Providers know nothing about each other.** Merging/blending multiple
  providers' data is a services-layer (`aggregate.ts`) concern, never
  logic inside a provider module.

## Documentation Rules

- **Update docs in the same change as the behavior they describe.**
  Documentation drift is treated as a bug, not a follow-up.
- **Avoid duplicated information across docs.** Cross-link to the
  authoritative source (e.g. milestones live in
  [ROADMAP.md](ROADMAP.md); don't re-list them elsewhere) rather than
  repeating and risking drift.
- **Reference existing architecture instead of inventing new systems** —
  when documenting a future capability, ground it in what already exists
  (a real function, a real type, a real pattern) rather than describing
  something unrelated to the current codebase.
- **Keep [docs/README.md](README.md) current** as the index of every file
  in `/docs` — add new docs to it in the same PR that creates them.
- **Use tables and Mermaid diagrams where they aid clarity**, plain
  Markdown otherwise — don't over-diagram a simple list.

## Strict DO NOT Rules

These hold regardless of what a specific task's scope implies, unless the
user explicitly instructs otherwise for that task:

- Do **not** redesign UI unless explicitly requested.
- Do **not** touch the landing page (`app/page.tsx`,
  `components/landing/`, `components/layout/`) unless explicitly
  requested.
- Do **not** rename or restructure existing folders without approval.
- Do **not** commit changes unless explicitly instructed.
- Do **not** push changes unless explicitly instructed.
- Do **not** skip validation (`tsc`, `lint`, `build`) before declaring a
  code change finished.
- Do **not** bundle unrelated changes into one PR — keep PRs focused.
- Do **not** invent external APIs, paid services, or capabilities the
  codebase doesn't actually have access to.
- Do **not** leave placeholder logic, dead code, or half-finished
  implementations in a mergeable state.

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
