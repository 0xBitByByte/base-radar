# Security Policy

## Supported Versions

Base Radar is pre-1.0 and does not yet maintain multiple parallel release
branches. Security fixes are applied to the latest code on the default
branch (`main`).

| Version | Supported |
| --- | --- |
| `0.x` (current, pre-release) | ✅ |
| Anything older / forked without updates | ❌ |

This will be revisited once [docs/RELEASES.md](docs/RELEASES.md)'s
versioning strategy reaches a stable `1.0`.

## Reporting a Vulnerability

**Do not open a public GitHub issue for a security vulnerability.** Instead:

1. Report it privately via GitHub's
   ["Report a vulnerability"](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability)
   flow on this repository (Security tab → Advisories → Report a
   vulnerability), if enabled, or by contacting the maintainer directly
   through the contact listed on the GitHub profile
   [0xbitbybyte](https://github.com/0xbitbybyte).
2. Include: a description of the issue, steps to reproduce, the affected
   file(s)/route(s), and the potential impact.
3. Do not include real credentials, private keys, or another person's data
   in your report.

## Expected Response Timeline

| Stage | Target |
| --- | --- |
| Acknowledgement of report | Within 3 business days |
| Initial assessment (severity, affected scope) | Within 7 business days |
| Fix or mitigation for confirmed critical issues | Best-effort, prioritized over other work |

These are targets for a small, actively developed open-source project, not
contractual SLAs.

## Disclosure Policy

Base Radar follows **coordinated disclosure**:

- Please give the maintainer a reasonable window to investigate and ship a
  fix before any public disclosure or write-up.
- Once a fix is released, the reporter is credited (with permission) in the
  release notes / [docs/CHANGELOG.md](docs/CHANGELOG.md), unless anonymity
  is requested.
- Issues affecting only mock/demo data (no real user data or funds at risk,
  since Base Radar currently has no accounts, wallets, or backend storage
  — see [docs/DATABASE.md](docs/DATABASE.md)) are still welcome reports,
  but are treated as standard bugs rather than security incidents unless
  they demonstrate a real exploit path.

## Security Best Practices

Contributors should keep in mind Base Radar's current architecture (see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)) when reasoning about risk:

- All external data providers (CoinGecko, DexScreener, DefiLlama,
  Blockscout, Base RPC, GitHub) are called **read-only, server-side**, from
  `lib/data/providers/`. No provider call should ever be given the ability
  to write, sign, or spend anything.
- There is no user authentication, wallet connection, or fund custody
  implemented today. Any future feature that introduces one (see the
  Portfolio milestone in [docs/ROADMAP.md](docs/ROADMAP.md)) must go
  through explicit security review before merging — this is a hard
  requirement, not a suggestion.
- Never render unsanitized third-party API data as raw HTML. Provider
  responses (project names, descriptions, etc.) should be treated as
  untrusted input.
- Keep dependencies reasonably current; review `npm audit` output for new
  dependencies before adding them.

## API Key Handling

**No API key is required or used by Base Radar today.** All six current
providers are called against free, public, unauthenticated endpoints (see
[docs/API.md](docs/API.md#providers-api--libdataprovidersts) — GitHub's REST
API is called unauthenticated and is rate-limited to 60 requests/hour per
IP as a result).

If a future provider requires an API key:

- It must be read from an environment variable, never hardcoded in source.
- It must only be used in server-side code (`lib/data/providers/`), never
  exposed to the client bundle — do not prefix a secret key with
  `NEXT_PUBLIC_`.
- It must be documented (name, purpose, where to obtain it) in
  [docs/API.md](docs/API.md) and in an `.env.example` file, without the
  real value.

## Environment Variable Rules

- Real secrets belong in a local `.env` (or `.env.local`) file only. `.env*`
  is already excluded via [.gitignore](.gitignore) — do not remove that
  exclusion or force-add an env file.
- Never commit a populated `.env` file, a real API key, or a real wallet
  address/private key to the repository, an issue, or a pull request.
- Public, non-secret configuration (feature flags, public contract
  addresses already published in [data/projects/](data/projects/)) does not
  need to be an environment variable — only genuine secrets do.
- If a secret is ever committed by mistake, treat it as compromised:
  rotate/revoke it immediately, then remove it from history, rather than
  relying on a follow-up commit alone.
