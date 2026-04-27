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
| SSR/Pre-rendering | TanStack Start |
| Styling | Tailwind CSS v4 |
| Build Tool | Vite |
| Content | Velite (MDX collections), solid-mdx (MDX generation) |
| Variants | class-variance-authority (cva) |
| Pattern Matching | ts-pattern |

## Project Structure

```
src/
├── registry/
│   └── kobalte/
│       ├── ui/                 # UI component sources (single-file components)
│       ├── blocks/             # Block sources (multi-file compositions)
│       ├── examples/
│       │   ├── ui/             # Usage examples for UI components
│       │   └── blocks/         # Usage examples for blocks
│       └── hooks/              # Custom SolidJS hooks
├── components/                 # Website-specific components
├── routes/                     # TanStack Router file-based routes
├── pages/
│   ├── docs/                   # General documentation MDX pages
│   ├── ui/<primitive>/         # MDX docs for UI components
│   └── blocks/<primitive>/     # MDX docs for blocks
├── lib/                        # Utilities, types, Vite plugins
└── styles/                     # Additional style files

scripts/                        # Development scripts
```

### URL Structure

Components are organized by kind (`ui` or `blocks`) and served at:
- UI preview: `/ui/<component>`
- UI docs: `/ui/<component>/docs`
- Block preview: `/blocks/<slug>`
- Block docs: `/blocks/<slug>/docs`
- Preview iframe: `/preview/<kind>/<primitive>/<component>`

Velite collections in `velite.config.ts`: `docs` (general docs), `ui` (`src/pages/ui/**/*.mdx`), `blocks` (`src/pages/blocks/**/*.mdx`).

## Development Commands

**IMPORTANT**:Default to using Bun instead of Node.js.

```bash
# Install dependencies
bun install

# Start dev server (uses APP_PORT from .env)
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview

# Build registry for shadcn CLI
bun run r:build:kobalte
```

### Bun Specificities

- Use `bunx <package>` instead of `npx <package>`
- Bun automatically loads `.env`, so don't use dotenv

## Path Aliases

Configured in `tsconfig.json`

## Code Style

### Formatting (Biome)

Biome is used for linting and formatting. Configuration in `biome.json`

### Class Utilities

Use the `cn()` utility for merging Tailwind classes:

```tsx
import { cn } from "@/lib/utils";

<div class={cn("base-class", props.class)} />
```

### Git Specificities

Pre-commit hooks, configured in `lefthook.yml`

**IMPORTANT**: Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/) (enforced by commitlint).

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

### Pattern Matching

Use `ts-pattern` for pattern matching instead of `switch` statements:

```ts
import { match, P } from "ts-pattern";

const result = match(value)
  .with({ type: P.number() }, (n) => n * 2)
  .with({ type: P.string() }, (s) => s.toUpperCase())
  .exhaustive();
```

### Test Attributes

Components use `data-slot` attributes for E2E test selectors:

```tsx
<button data-slot="button">Click me</button>
```

## Testing

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

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

## Environment Variables

- `APP_PORT` - Development server port (auto-configured via `scripts/setup-dev-env.ts`)
- `CLOUDFLARE_R2_BUCKET_NAME` - Optional R2 bucket for uploads
- `CLOUDFLARE_R2_PUBLIC_DOMAIN` - Optional R2 public domain

## Behaviors

- When you fetch raw files, use `curl -s` instead of `WebFetch` tool
