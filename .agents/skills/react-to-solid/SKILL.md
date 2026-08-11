---
name: react-to-solid
description: React-to-SolidJS transformation patterns for porting shadcn-style React components, examples, docs snippets, and blocks into Zaidan. Use when converting React TSX, React hooks, Radix/Base UI/shadcn patterns, Next-style code, or React-specific dependencies to idiomatic SolidJS.
---

# React to SolidJS

Use this skill for the translation itself. Use
`.agents/skills/shadcn-to-zaidan/SKILL.md` for the workflow, source URLs, target
paths, registry updates, browser testing, and command choices.

## Load References Only When Needed

- Read `docs/base-ui-mapping.md` for `@base-ui/react-*`, `@radix-ui/*`, Base UI
  data attributes, or Base UI CSS variables.
- Read `docs/kobalte-patterns.md` when typing or composing Kobalte primitive
  parts.
- Read `docs/corvu-patterns.md` when using Corvu primitives.
- Read `docs/third-party-deps.md` when replacing React-specific third-party
  packages.

## Core Mappings

| React | SolidJS |
| --- | --- |
| `className` | `class` |
| `className?: string` | `class?: string` |
| Destructured props | `splitProps(props, [...])` |
| Destructured default props | `mergeProps(defaults, props)` before `splitProps` |
| `{condition && <El />}` | `<Show when={condition}><El /></Show>` |
| `items.map(...)` in JSX | `<For each={items}>{(item) => ...}</For>` |
| `useState` | `createSignal` or `createStore` |
| `useEffect` | `createEffect`, `onMount`, or `onCleanup` |
| `useMemo` | `createMemo` only for reactive derived values |
| `useCallback` | Usually remove |
| `forwardRef` | Usually remove |
| `React.ReactNode` | `JSX.Element` |
| `React.ComponentProps<"div">` | `ComponentProps<"div">` |
| `lucide-react` | `lucide-solid` |
| `next/image` | Native `<img>` unless local code has a wrapper |
| `next/link` | TanStack Router `Link` or native `<a>` based on local usage |

Use `e.currentTarget` for typed form events. Use signal calls such as `value()`;
do not treat signals like React state variables.

## Source-of-Truth and Dependency Policy

For Zaidan's shadcn release sync, the pinned Base UI component API, behavior,
slots, and styling contract are authoritative. Do not preserve an older Zaidan
API merely for backward compatibility. Record only unavoidable Solid-specific
divergences.

Choose an implementation foundation in this order:

1. Kobalte when it has an equivalent accessible primitive.
2. Corvu when Kobalte has no adequate equivalent and Corvu does.
3. Vanilla SolidJS when neither primitive library fits.

For other React-only packages, read `docs/third-party-deps.md`, search for an
actively maintained SolidJS flavor, and compare behavior/API coverage before
writing a local adapter. Never carry a React runtime dependency into registry
code merely because upstream imports it.

## Import Rewrites

```tsx
// Remove React imports:
import * as React from "react";

// Add Solid imports only when used:
import type { ComponentProps, JSX, ValidComponent } from "solid-js";
import { For, Show, createMemo, createSignal, mergeProps, splitProps } from "solid-js";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { cn } from "@/lib/utils";
```

Common path rewrites:

| React source path | Zaidan path |
| --- | --- |
| `@/registry/bases/base/lib/utils` | `@/lib/utils` |
| `@/registry/bases/base/ui/*` | `@/registry/kobalte/ui/*` |
| `@/registry/bases/base/hooks/*` | `@/registry/kobalte/hooks/*` |
| `@/registry/bases/base/blocks/*` | `@/registry/kobalte/blocks/*` |

## Props Pattern

Use `splitProps`; do not destructure props directly when values are used in JSX.

```tsx
import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type CardProps = ComponentProps<"div">;

const Card = (props: CardProps) => {
  const [local, others] = splitProps(props, ["class"]);

  return <div data-slot="card" class={cn("z-card", local.class)} {...others} />;
};
```

Use `mergeProps` first when defaults are needed:

```tsx
const mergedProps = mergeProps({ side: "top" } as TooltipProps, props);
const [local, others] = splitProps(mergedProps, ["class", "side"]);
```

Use Solid's `children()` helper when children must be inspected, normalized, or
reused.

## Primitive Pattern

Prefer Kobalte for accessible shadcn-style primitives. Use Corvu only when
Kobalte does not provide an adequate equivalent. Use vanilla SolidJS when
neither library fits.

```tsx
import * as ButtonPrimitive from "@kobalte/core/button";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type { ComponentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type ButtonProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  ButtonPrimitive.ButtonRootProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const Button = <T extends ValidComponent = "button">(props: ButtonProps<T>) => {
  const [local, others] = splitProps(props as ButtonProps, ["class"]);

  return (
    <ButtonPrimitive.Root
      data-slot="button"
      class={cn("z-button", local.class)}
      {...others}
    />
  );
};
```

Keep primitive imports inside wrapper components. In examples, docs, and blocks,
prefer existing Zaidan wrappers when they exist.

## Preservation Rules

- Preserve behavior, accessibility, public API, Tailwind classes, CSS variables,
  and `data-slot` attributes unless the Solid primitive requires an adaptation.
- Match nearby Zaidan files for naming, exports, data attributes, and types.
- Keep imports minimal.
- Prefer `cn()` from `@/lib/utils` for class merging.
- Replace upstream app-only helpers such as `IconPlaceholder` with the concrete
  Zaidan icon choice, normally `lucide-solid`.
- Preserve upstream semantic `cn-*` style markers as Zaidan `z-*` markers.
  Translate selectors, data attributes, and CSS variables to the actual
  Kobalte/Corvu DOM; do not assume a mechanical rename is sufficient.
- When a component changes, inspect and update its section in all eight Zaidan
  styles: Vega, Nova, Maia, Lyra, Mira, Luma, Sera, and Rhea.
- Verify state selectors in the browser. The Base UI mapping reference is a
  starting table, not proof that a selector matches the rendered primitive.
