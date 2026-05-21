# job-hunter

Personal job-search automation system.

## Prerequisites

- Node.js >= 20
- pnpm >= 9

## Setup

```bash
pnpm install
```

## Common scripts

```bash
pnpm build       # Build all packages
pnpm dev         # Run all packages in dev mode
pnpm typecheck   # Type-check all packages
pnpm lint        # Lint all packages
pnpm clean       # Remove build artifacts and node_modules
```

## Workspace layout

```
docs/       Architecture, per-prompt build log, ADRs
packages/   Shared libraries
apps/       Deployable applications (added in later prompts)
```

## Documentation

Start with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the system overview and 8-prompt roadmap, then dive into:

- [Per-prompt build log](docs/prompts/) — what each build step produced and why
- [Architecture decisions (ADRs)](docs/decisions/) — non-obvious technical choices explained
- [docs/README.md](docs/README.md) — full doc index

> Progress is tracked across the prompt sequence; each prompt is verification-gated.
