# Registry Item JSON Schema Documentation

## Overview

The `registry-item.json` schema defines custom registry items with properties for identification, dependencies, file organization, styling, and metadata.

## Core Properties

### Basic Identification
- **$schema**: Points to `https://ui.shadcn.com/schema/registry-item.json`
- **name**: Unique identifier for the registry item
- **title**: Human-readable, concise name
- **description**: Detailed explanation of the item's purpose
- **author**: Creator information (optional)

### Type Classification

Registry items are categorized using the `type` property:

| Type | Purpose |
|------|---------|
| `registry:block` | "Complex components with multiple files" |
| `registry:component` | Simple standalone components |
| `registry:lib` | Utility and library code |
| `registry:hook` | React hooks |
| `registry:ui` | "UI components and single-file primitives" |
| `registry:page` | Page or file-based routes |
| `registry:file` | Miscellaneous files |
| `registry:style` | Registry style definitions |
| `registry:theme` | Theme configurations |
| `registry:item` | Universal registry items |

## Dependency Management

### npm Dependencies
The `dependencies` array specifies npm packages with version syntax:
```json
{
  "dependencies": ["@radix-ui/react-accordion", "zod@3.0.0"]
}
```

### Registry Dependencies
The `registryDependencies` array references other registry items:
- Simple names: `["button", "input"]`
- Namespaced: `["@acme/input-form"]`
- Remote URLs: `["https://example.com/r/item.json"]`

The CLI automatically resolves remote dependencies.

## File Configuration

Files are specified with three properties:

- **path**: Source location in the registry
- **type**: File category matching registry types
- **target**: Destination in the project (required only for `registry:page` and `registry:file`)

Use `~` to reference project root (e.g., `~/config.js`).

## Styling and Theming

### CSS Variables
Define theme-aware variables in `cssVars`:
```json
{
  "cssVars": {
    "theme": { "font-heading": "Poppins, sans-serif" },
    "light": { "brand": "20 14.3% 4.1%" },
    "dark": { "brand": "20 14.3% 4.1%" }
  }
}
```

### CSS Rules
The `css` property adds styling layers:
- `@layer base`, `@layer components`
- `@utility` definitions
- `@keyframes` animations
- `@plugin` directives

### Legacy Tailwind Configuration
The deprecated `tailwind` property previously handled theme extensions; use `cssVars.theme` for Tailwind v4 projects instead.

## Environment and Documentation

### Environment Variables
```json
{
  "envVars": {
    "NEXT_PUBLIC_APP_URL": "http://localhost:4000"
  }
}
```

Variables are added to `.env.local` or `.env` without overwriting existing entries. Only use for development or example purposes.

### Documentation
The `docs` property displays custom installation guidance: "To get an OPENAI_API_KEY, sign up for an account at https://platform.openai.com."

## Organization and Metadata

- **categories**: Organize items by topic (e.g., `["sidebar", "dashboard"]`)
- **meta**: Custom key-value pairs for additional item information