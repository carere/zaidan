# TanStack Router: Search Params Documentation

## Overview

TanStack Router provides advanced URL search parameter handling, treating them as "application state" with sophisticated validation, typing, and transformation capabilities.

## Why Not Use URLSearchParams?

The native `URLSearchParams` API has limitations for modern applications:

- **Type limitations**: Assumes all params are strings
- **Structure constraints**: Designed for flat, simple structures
- **Serialization issues**: Each parse/stringify cycle loses referential integrity
- **Coupling problems**: Changes require simultaneous URL pathname updates

TanStack Router addresses these by enabling JSON-serializable data structures, flexible validation, immutability support, and independent search param updates.

## JSON-First Approach

Search params are automatically parsed from URL strings into structured JSON. Complex nested objects and arrays are URL-encoded while maintaining type information:

```
Navigation: { pageIndex: 3, includeCategories: ['electronics', 'gifts'] }
Results in: /shop?pageIndex=3&includeCategories=%5B%22electronics%22%2C%22gifts%22%5D
```

The first level remains flat and `URLSearchParams`-compatible for interoperability.

## Validation & Typing

### Core Pattern

Use the `validateSearch` option on routes to validate and type search params:

```tsx
validateSearch: (search: Record<string, unknown>): ProductSearch => ({
  page: Number(search?.page ?? 1),
  filter: (search.filter as string) || '',
})
```

### Validation Libraries

**Zod** (with adapter):
```tsx
import { zodValidator } from '@tanstack/zod-adapter'

const schema = z.object({
  page: z.number().default(1),
})

validateSearch: zodValidator(schema)
```

**Valibot**, **ArkType**, and **Effect/Schema** work without adapters as they implement Standard Schema.

### Error Handling

Use `.catch()` to provide defaults without interrupting user experience, or `.default()` to show errors via the route's `errorComponent`.

## Reading Search Params

### In Components

```tsx
const { page, filter } = Route.useSearch()
```

### Outside Route Components

```tsx
const routeApi = getRouteApi('/shop/products')
const search = routeApi.useSearch()
```

### Inheritance

Child routes automatically inherit parent search param types and can access them.

## Writing Search Params

### Link Component

```tsx
<Link search={(prev) => ({ page: prev.page + 1 })}>
  Next
</Link>
```

### Navigation

```tsx
navigate({ search: (prev) => ({ page: prev.page + 1 }) })
```

## Search Middlewares

Transform search params before link generation or navigation:

```tsx
search: {
  middlewares: [
    retainSearchParams(['rootValue']),
    stripSearchParams({ key: defaultValue })
  ]
}
```

Middlewares allow retaining specific params across navigation and removing params with default values from URLs.
