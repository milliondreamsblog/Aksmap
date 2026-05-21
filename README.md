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
packages/   Shared libraries
apps/       Deployable applications (added in later prompts)
```

> Architecture and progress tracked in conversation with Claude.
