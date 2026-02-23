# Third-Party React-to-SolidJS Dependency Mapping

Detailed mapping of third-party React libraries to their SolidJS equivalents. This table is consulted during transformation when non-shadcn imports are encountered.

## Table of Contents

- [Dependency Mapping Table](#dependency-mapping-table)
- [Detailed Notes](#detailed-notes)
- [Handling Unmapped Dependencies](#handling-unmapped-dependencies)

## Dependency Mapping Table

| # | React Library | SolidJS Equivalent | Category |
|---|---|---|---|
| 1 | `framer-motion` | `solid-motionone` / CSS animations | Animation |
| 2 | `react-hook-form` | `@modular-forms/solid` | Forms |
| 3 | `zustand` | SolidJS signals + stores | State Management |
| 4 | `@radix-ui/*` | `@kobalte/core/*` | UI Primitives |
| 5 | `react-icons` | `lucide-solid` / `solid-icons` | Icons |
| 6 | `recharts` | `solid-chartjs` / direct Chart.js | Charts |
| 7 | `react-resizable-panels` | `@corvu/resizable` | Layout |
| 8 | `input-otp` | `input-otp` | Input |
| 9 | `vaul` | `@corvu/drawer` | Overlay |
| 10 | `sonner` | `solid-sonner` | Notifications |
| 11 | `embla-carousel-react` | `embla-carousel-solid` | Carousel |
| 12 | `cmdk` | `@kobalte/core/combobox` | Command Palette |
| 13 | `@tanstack/react-table` | `@tanstack/solid-table` | Data Tables |
| 14 | `@tanstack/react-virtual` | `@tanstack/solid-virtual` | Virtualization |
| 15 | `react-day-picker` | custom SolidJS calendar | Calendar |
| 16 | `next/image` | `<img>` with lazy loading | Framework |
| 17 | `next/link` | TanStack Router `<Link>` | Framework |

## Detailed Notes

### 1. framer-motion -> solid-motionone / CSS animations

**Package:** `solid-motionone` (npm: `solid-motionone`)

Framer Motion is the most common animation library in React shadcn components. The transformation strategy depends on complexity:

- **Simple animations** (fade, slide, scale): Use CSS keyframes and Tailwind `animate-*` utilities. This is preferred when possible as it avoids adding a dependency.
- **Complex animations** (spring physics, layout animations, gesture-based): Use `solid-motionone` which wraps Motion One for SolidJS.
- **Presence animations** (enter/exit): Use `solid-motionone`'s `Presence` component or Kobalte's built-in `data-expanded`/`data-closed` with CSS transitions.

```tsx
// React (framer-motion):
import { motion, AnimatePresence } from "framer-motion"
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

// SolidJS (solid-motionone):
import { Motion, Presence } from "solid-motionone"
<Presence>
  <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
</Presence>

// SolidJS (CSS alternative):
<div class="animate-in fade-in">
```

### 2. react-hook-form -> @modular-forms/solid

**Package:** `@modular-forms/solid`

React Hook Form manages form state, validation, and submission. The SolidJS equivalent is Modular Forms:

```tsx
// React:
import { useForm } from "react-hook-form"
const { register, handleSubmit } = useForm()

// SolidJS:
import { createForm } from "@modular-forms/solid"
const [form, { Form, Field }] = createForm()
```

Key differences:
- Modular Forms uses a declarative `<Field>` component pattern
- Validation is configured per-field via `validate` prop
- Form values are reactive signals

### 3. zustand -> SolidJS signals + stores

**No package needed** -- use SolidJS built-in primitives.

Zustand is a lightweight state management library. In SolidJS, native reactivity replaces it:

```tsx
// React (zustand):
import { create } from "zustand"
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}))

// SolidJS (signals for simple state):
import { createSignal } from "solid-js"
const [count, setCount] = createSignal(0)
const increment = () => setCount(c => c + 1)

// SolidJS (stores for complex nested state):
import { createStore } from "solid-js/store"
const [state, setState] = createStore({ count: 0, items: [] })
const increment = () => setState("count", c => c + 1)
```

### 4. @radix-ui/* -> @kobalte/core/*

**Package:** `@kobalte/core`

Radix UI primitives map directly to Kobalte. This is the primary UI primitive mapping and is covered extensively in the Base UI mapping. The component part names may differ -- always check the Kobalte documentation for the specific component.

### 5. react-icons -> lucide-solid / solid-icons

**Package:** `lucide-solid` (preferred) or `solid-icons`

Zaidan standardizes on `lucide-solid` for icons:

```tsx
// React:
import { Check, ChevronRight } from "lucide-react"

// SolidJS:
import { Check, ChevronRight } from "lucide-solid"
```

If the source uses `react-icons` with non-Lucide icon sets, use `solid-icons` which provides multiple icon packs.

### 6. recharts -> solid-chartjs / direct Chart.js

**Package:** `solid-chartjs` or `chart.js` directly

Recharts is React-specific. Options for SolidJS:
- `solid-chartjs`: SolidJS wrapper around Chart.js
- Direct Chart.js with `onMount` for imperative usage
- Consider if the chart is simple enough for a CSS/SVG solution

### 7. react-resizable-panels -> @corvu/resizable

**Package:** `@corvu/resizable`

Direct mapping. Corvu Resizable provides the same panel/handle pattern:

```tsx
// React:
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"

// SolidJS:
import Resizable from "@corvu/resizable"
// Resizable (root), Resizable.Panel, Resizable.Handle
```

### 8. input-otp -> input-otp

**Package:** `input-otp` (same package)

The `input-otp` package has a framework-agnostic core. The same package works in SolidJS, but the rendering adapter may need adjustment. Check if the package exports a SolidJS-specific entry point.

### 9. vaul -> @corvu/drawer

**Package:** `@corvu/drawer`

Vaul is a React drawer/bottom sheet. Corvu Drawer is the SolidJS equivalent:

```tsx
// React (vaul):
import { Drawer } from "vaul"

// SolidJS:
import Drawer from "@corvu/drawer"
```

The API is similar but uses Corvu conventions (data attributes, context hooks).

### 10. sonner -> solid-sonner

**Package:** `solid-sonner`

Toast notification library. The API is very similar:

```tsx
// React:
import { toast, Toaster } from "sonner"

// SolidJS:
import { toast, Toaster } from "solid-sonner"
```

### 11. embla-carousel-react -> embla-carousel-solid

**Package:** `embla-carousel-solid`

Embla Carousel has official framework adapters:

```tsx
// React:
import useEmblaCarousel from "embla-carousel-react"
const [emblaRef] = useEmblaCarousel()

// SolidJS:
import createEmblaCarousel from "embla-carousel-solid"
const [emblaRef] = createEmblaCarousel()
```

### 12. cmdk -> @kobalte/core/combobox

**Package:** `@kobalte/core` (combobox module)

The `cmdk` command palette maps to Kobalte's Combobox component. The API differs significantly -- the Kobalte Combobox is more general-purpose but can be styled to match cmdk's appearance:

```tsx
// React (cmdk):
import { Command } from "cmdk"
<Command>
  <Command.Input />
  <Command.List>
    <Command.Group heading="Suggestions">
      <Command.Item>Item</Command.Item>
    </Command.Group>
  </Command.List>
</Command>

// SolidJS (Kobalte):
import * as Combobox from "@kobalte/core/combobox"
<Combobox.Root>
  <Combobox.Control>
    <Combobox.Input />
  </Combobox.Control>
  <Combobox.Content>
    <Combobox.Listbox />
  </Combobox.Content>
</Combobox.Root>
```

### 13. @tanstack/react-table -> @tanstack/solid-table

**Package:** `@tanstack/solid-table`

TanStack Table has official SolidJS support:

```tsx
// React:
import { useReactTable } from "@tanstack/react-table"

// SolidJS:
import { createSolidTable } from "@tanstack/solid-table"
```

The core API is framework-agnostic; only the adapter hook changes.

### 14. @tanstack/react-virtual -> @tanstack/solid-virtual

**Package:** `@tanstack/solid-virtual`

TanStack Virtual has official SolidJS support:

```tsx
// React:
import { useVirtualizer } from "@tanstack/react-virtual"

// SolidJS:
import { createVirtualizer } from "@tanstack/solid-virtual"
```

### 15. react-day-picker -> custom SolidJS calendar

**No direct equivalent.** `react-day-picker` is React-specific. Options:
- Build a custom calendar component using Kobalte date primitives if available
- Port the calendar logic manually using SolidJS signals
- Use a headless calendar library that supports SolidJS
- Flag for human review if the calendar is complex

### 16. next/image -> `<img>` with lazy loading

**No package needed** -- use native HTML.

Next.js `Image` component provides optimization features. In SolidJS:

```tsx
// React (Next.js):
import Image from "next/image"
<Image src="/photo.jpg" alt="Photo" width={500} height={300} />

// SolidJS:
<img src="/photo.jpg" alt="Photo" width={500} height={300} loading="lazy" />
```

For advanced image optimization, consider using a CDN or image service.

### 17. next/link -> TanStack Router `<Link>`

**Package:** `@tanstack/solid-router` (already in Zaidan)

```tsx
// React (Next.js):
import Link from "next/link"
<Link href="/about">About</Link>

// SolidJS (TanStack Router):
import { Link } from "@tanstack/solid-router"
<Link to="/about">About</Link>
```

Note the prop change: `href` -> `to`.

## Handling Unmapped Dependencies

When encountering a dependency not in this table:

1. **Flag it** in the transformation report with the import path and usage context
2. **Search** for a SolidJS equivalent:
   - Check npm for `solid-*` or `*-solid` variants
   - Check if the library has a framework-agnostic core
   - Check the SolidJS ecosystem page: https://www.solidjs.com/ecosystem
3. **Evaluate options**:
   - If a direct SolidJS equivalent exists, use it
   - If the library is framework-agnostic, try using it directly
   - If the functionality is simple, reimplement using SolidJS primitives
   - If none of the above work, flag as requiring human review
4. **Document** the decision and any manual porting notes for future reference
