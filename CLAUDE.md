---
description: Zaidan - ShadCN UI Registry for SolidJS. Use Bun for all commands.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

# Zaidan Project Guide

## About This Project

Zaidan is a ShadCN UI registry for SolidJS - a collection of beautifully designed, accessible, and reusable components that bring the Shadcn UI experience to the SolidJS ecosystem.

- Built with [Kobalte](https://kobalte.dev) & [Corvu](https://corvu.dev) for accessible primitives
- Styled with [Tailwind CSS](https://tailwindcss.com) v4
- Components can be copied/pasted or installed via the shadcn CLI

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | SolidJS |
| UI Primitives | Kobalte, Corvu |
| Icons | Lucide Solid |
| Router | TanStack Solid Router (file-based routing) |
| SSR/Prerendering | TanStack Start |
| Styling | Tailwind CSS v4, tw-animate-css |
| Build Tool | Vite |
| Content | Velite (MDX collections), solid-mdx |
| Variants | class-variance-authority (cva) |
| Pattern Matching | ts-pattern |

## Project Structure

```
src/
├── registry/
│   ├── ui/           # Shadcn-style UI components (53 components)
│   ├── examples/     # Component usage examples
│   └── hooks/        # Custom SolidJS hooks
├── components/       # Website-specific components
├── routes/           # TanStack Router file-based routes
├── pages/            # MDX documentation pages (docs, ui docs)
├── lib/              # Utilities and Vite plugins
└── styles/           # Additional style files

tests/                # Playwright E2E tests (*.spec.ts)
scripts/              # Development scripts
```

## Development Commands

Default to using Bun instead of Node.js.

```bash
# Install dependencies
bun install

# Start dev server (uses APP_PORT from .env)
bun dev

# Build for production
bun build

# Preview production build
bun preview

# Build registry for shadcn CLI
bun registry:build

# Run E2E tests
bun playwright test

# Run specific test
bun playwright test tests/button.spec.ts
```

### Bun Alternatives

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>`
- Use `bunx <package>` instead of `npx <package>`
- Bun automatically loads `.env`, so don't use dotenv

## Path Aliases

Configured in `tsconfig.json`:

- `@/*` → `./src/*` - Main source imports
- `@velite` → `./.velite` - Generated content collections

## Code Style

### Formatting (Biome)

Biome is used for linting and formatting. Configuration in `biome.json`:

- Line width: 100 characters
- Indent: 2 spaces
- Double quotes for JS/TS strings
- Tailwind classes are auto-sorted via `useSortedClasses` rule

### Class Utilities

Use the `cn()` utility for merging Tailwind classes:

```tsx
import { cn } from "@/lib/utils";

<div class={cn("base-class", props.class)} />
```

### Git Hooks (Lefthook)

Pre-commit hooks run:
- `sort-package-json` - Sorts package.json
- `biome check --write` - Lints and formats staged files

Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/) (enforced by commitlint).

## Component Patterns

### Naming & Structure

- Components use PascalCase: `AlertDialog`, `DropdownMenu`
- Files use kebab-case: `alert-dialog.tsx`, `dropdown-menu.tsx`
- Export compound components: `AlertDialog.Root`, `AlertDialog.Trigger`, etc.

### Variants with CVA

Use `class-variance-authority` for component variants:

```tsx
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva("base-classes", {
  variants: {
    variant: {
      default: "variant-classes",
      destructive: "destructive-classes",
    },
    size: {
      default: "size-classes",
      sm: "small-classes",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});
```

### Test Attributes

Components use `data-slot` attributes for E2E test selectors:

```tsx
<button data-slot="button">Click me</button>
```

## Testing

### Playwright E2E Tests

Tests are in the `tests/` directory with `.spec.ts` extension.

```bash
# Run all tests
bun playwright test

# Run with UI
bun playwright test --ui

# Run specific test file
bun playwright test tests/dialog.spec.ts
```

### Test Selectors

Use `data-slot` attributes for reliable selectors:

```ts
await page.locator('[data-slot="dialog-trigger"]').click();
```

## Bun APIs

When building server-side functionality:

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- `Bun.$\`ls\`` instead of execa

## Environment Variables

- `APP_PORT` - Development server port (auto-configured via `scripts/setup-dev-env.ts`)
- `CLOUDFLARE_R2_BUCKET_NAME` - Optional R2 bucket for uploads
- `CLOUDFLARE_R2_PUBLIC_DOMAIN` - Optional R2 public domain

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `@kobalte/core` | Accessible UI primitives for SolidJS |
| `corvu` | Drawer, dialog, and other components |
| `@tanstack/solid-router` | File-based routing |
| `@tanstack/solid-start` | SSR and prerendering |
| `velite` | Type-safe content collections from MDX |
| `class-variance-authority` | Component variant definitions |
| `tailwind-merge` + `clsx` | Class name utilities |
| `ts-pattern` | Pattern matching library |

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
