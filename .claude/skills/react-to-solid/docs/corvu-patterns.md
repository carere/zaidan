# Corvu Patterns Reference

Comprehensive reference for Corvu component patterns used in Zaidan transformations. Corvu provides unstyled, accessible SolidJS UI primitives that complement Kobalte.

## Table of Contents

- [Overview](#overview)
- [Component Anatomy Pattern](#component-anatomy-pattern)
- [DynamicProps and Polymorphism](#dynamicprops-and-polymorphism)
- [Data Attributes](#data-attributes)
- [CSS Variables](#css-variables)
- [Context Hooks](#context-hooks)
- [Component Examples](#component-examples)

## Overview

Corvu is an unstyled, customizable UI primitive library for SolidJS. It adheres to WAI-ARIA accessibility standards and provides full keyboard navigation support. Corvu is used in Zaidan for components not available in Kobalte, or where Corvu provides a better API.

**Key differences from Kobalte:**
- Uses `DynamicProps` instead of `PolymorphicProps`
- Data attributes prefixed with `data-corvu-` instead of just `data-`
- CSS variables prefixed with `--corvu-` instead of `--kb-`
- Uses `useContext()` hooks for accessing component state
- Supports `collapseBehavior: "remove" | "hide"` for content visibility

**Import pattern:**
```tsx
import Accordion from "@corvu/accordion";
import Dialog from "@corvu/dialog";
import Drawer from "@corvu/drawer";
import Resizable from "@corvu/resizable";
```

**Note:** Corvu uses default imports, not namespace imports like Kobalte.

## Component Anatomy Pattern

Corvu components use the same compound component pattern as Kobalte:

```tsx
<Component>
  <Component.PartA />
  <Component.PartB>
    <Component.PartC />
  </Component.PartB>
</Component>
```

### Accordion Anatomy

```tsx
<Accordion>
  <Accordion.Item>
    <Accordion.Trigger />
    <Accordion.Content />
  </Accordion.Item>
</Accordion>
```

Note: Corvu Accordion does not have a separate `Header` part. The trigger is a direct child of `Item`. Wrap in a heading element manually for semantics:

```tsx
<Accordion.Item>
  <h3>
    <Accordion.Trigger />
  </h3>
  <Accordion.Content />
</Accordion.Item>
```

### Dialog Anatomy

```tsx
<Dialog>
  <Dialog.Trigger />
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content>
      <Dialog.Close />
      <Dialog.Label />
      <Dialog.Description />
    </Dialog.Content>
  </Dialog.Portal>
</Dialog>
```

### Drawer Anatomy

The Drawer extends Dialog with drag/snap behavior:

```tsx
<Drawer>
  <Drawer.Trigger />
  <Drawer.Portal>
    <Drawer.Overlay />
    <Drawer.Content>
      <Drawer.Close />
      <Drawer.Label />
      <Drawer.Description />
    </Drawer.Content>
  </Drawer.Portal>
</Drawer>
```

### Resizable Anatomy

```tsx
<Resizable>
  <Resizable.Panel />
  <Resizable.Handle />
  <Resizable.Panel />
</Resizable>
```

## DynamicProps and Polymorphism

Corvu uses `DynamicProps` from `@corvu/utils/dynamic` for polymorphic components. This is the Corvu equivalent of Kobalte's `PolymorphicProps`.

```tsx
import type { DynamicProps } from "@corvu/utils/dynamic";

// The `as` prop changes the rendered element:
<Dialog.Trigger as="a" href="/link">
  Open
</Dialog.Trigger>

// Type definition pattern:
type DrawerContentProps = DynamicProps<"div", Drawer.ContentProps> & {
  class?: string;
};
```

### Key Difference from Kobalte

| Aspect | Kobalte | Corvu |
|---|---|---|
| Type utility | `PolymorphicProps<T, Props>` | `DynamicProps<Tag, Props>` |
| Import from | `@kobalte/core/polymorphic` | `@corvu/utils/dynamic` |
| Generic param | `ValidComponent` | HTML tag string or component |

## Data Attributes

Corvu prefixes all data attributes with `data-corvu-` for namespacing:

### Common Data Attributes

| Attribute | Meaning |
|---|---|
| `data-corvu-<component>-<part>` | Identifies the component part (e.g., `data-corvu-accordion-trigger`) |
| `data-expanded` | Component is open/expanded |
| `data-collapsed` | Component is closed/collapsed |
| `data-disabled` | Component is disabled |

### Accordion Data Attributes

**Trigger:**
- `data-corvu-accordion-trigger`
- `data-expanded` / `data-collapsed`
- `data-disabled`

**Content:**
- `data-corvu-accordion-content`
- `data-expanded` / `data-collapsed`

### Dialog Data Attributes

**Trigger:**
- `data-corvu-dialog-trigger`
- `data-open` / `data-closed`

**Overlay:**
- `data-corvu-dialog-overlay`
- `data-open` / `data-closed`

**Content:**
- `data-corvu-dialog-content`
- `data-open` / `data-closed`

**Close:**
- `data-corvu-dialog-close`

**Note:** Corvu Dialog uses `data-open`/`data-closed` while Corvu Accordion uses `data-expanded`/`data-collapsed`.

### Drawer Data Attributes

All Dialog data attributes plus:

| Attribute | Meaning |
|---|---|
| `data-side` | Which side the drawer is attached to (`top`, `right`, `bottom`, `left`) |
| `data-opening` | Drawer is in open animation |
| `data-closing` | Drawer is in close animation |
| `data-snapping` | Snapping to a snap point after drag release |
| `data-transitioning` | Any active transition |
| `data-resizing` | Height/width adjustment (requires `transitionResize: true`) |

### Disabling Drag on Elements

Use `data-corvu-no-drag` to prevent drag interactions on specific elements:

```tsx
<div data-corvu-no-drag>This content won't trigger drawer dragging</div>
```

## CSS Variables

### Accordion / Disclosure

| Variable | Description |
|---|---|
| `--corvu-disclosure-content-height` | Content height for slide animations |
| `--corvu-disclosure-content-width` | Content width for animations |

### Dialog / Drawer

| Variable | Description |
|---|---|
| `--scrollbar-width` | Scrollbar width (for preventing layout shift) |

### Animation Examples

**Accordion collapse animation:**
```css
[data-corvu-accordion-content][data-collapsed] {
  animation: collapse 200ms linear;
}

[data-corvu-accordion-content][data-expanded] {
  animation: expand 200ms linear;
}

@keyframes collapse {
  from { height: var(--corvu-disclosure-content-height); }
  to { height: 0px; }
}

@keyframes expand {
  from { height: 0px; }
  to { height: var(--corvu-disclosure-content-height); }
}
```

**Drawer transition with Tailwind:**
```tsx
<Drawer.Content
  class="data-transitioning:transition-transform data-transitioning:duration-500"
/>
```

**Drawer CSS transition:**
```css
[data-corvu-dialog-content][data-transitioning] {
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
  transition-duration: 500ms;
}
```

## Context Hooks

Corvu provides context hooks for accessing component state within children:

### Accordion Context

```tsx
// Root context
const ctx = Accordion.useContext();
// Properties: multiple, value, collapsible, disabled, orientation, loop,
//             textDirection, collapseBehavior

// Item context
const itemCtx = Accordion.useItemContext();
// Properties: value, disabled, triggerId
```

### Dialog Context

```tsx
const ctx = Dialog.useContext();
// Properties: open, setOpen, contentPresent, overlayPresent,
//             contentRef, overlayRef, dialogId, labelId, descriptionId
```

### Drawer Context

```tsx
const ctx = Drawer.useContext();
// All Dialog context properties PLUS:
// snapPoints, breakPoints, defaultSnapPoint, activeSnapPoint,
// setActiveSnapPoint, isDragging, isTransitioning, transitionState,
// openPercentage, translate, side, velocityCacheReset,
// allowSkippingSnapPoints, handleScrollableElements, transitionResize
```

### Drawer Root Children Props

The Drawer root accepts a callback receiving dynamic props:

```tsx
<Drawer>
  {(props) => (
    <Drawer.Overlay
      style={{
        "background-color": `rgb(0 0 0 / ${0.5 * props.openPercentage})`
      }}
    />
  )}
</Drawer>
```

## Component Examples

### Drawer (Zaidan Style)

Corvu Drawer maps from React `vaul` library:

```tsx
import Drawer from "@corvu/drawer";
import type { DynamicProps } from "@corvu/utils/dynamic";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type DrawerContentProps = DynamicProps<"div"> & {
  class?: string;
};

const DrawerContent = (props: DrawerContentProps) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <Drawer.Portal>
      <Drawer.Overlay
        class="fixed inset-0 z-50 bg-black/80"
        data-slot="drawer-overlay"
      />
      <Drawer.Content
        class={cn(
          "bg-background fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border",
          "data-transitioning:transition-transform data-transitioning:duration-500",
          local.class
        )}
        data-slot="drawer-content"
        {...others}
      >
        <div class="bg-muted mx-auto mt-4 h-2 w-25 rounded-full" />
        {local.children}
      </Drawer.Content>
    </Drawer.Portal>
  );
};
```

### Resizable (Zaidan Style)

Corvu Resizable maps from React `react-resizable-panels`:

```tsx
import Resizable from "@corvu/resizable";
import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type ResizablePanelGroupProps = ComponentProps<typeof Resizable>;

const ResizablePanelGroup = (props: ResizablePanelGroupProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <Resizable
      class={cn(
        "flex h-full w-full data-[orientation=vertical]:flex-col",
        local.class
      )}
      data-slot="resizable-panel-group"
      {...others}
    />
  );
};
```

## Corvu vs Kobalte Decision Guide

Use this to decide which library to use for a given component:

| Component | Kobalte | Corvu | Recommendation |
|---|---|---|---|
| Accordion | Yes | Yes | Kobalte (more mature) |
| Dialog | Yes | Yes | Kobalte (richer API) |
| Drawer | No | Yes | **Corvu** (only option) |
| Resizable | No | Yes | **Corvu** (only option) |
| Select | Yes | No | **Kobalte** (only option) |
| Tooltip | Yes | Yes | Kobalte (better positioning) |
| Toast | Yes | No | **Kobalte** (only option) |
| Combobox | Yes | No | **Kobalte** (only option) |

In general, prefer Kobalte unless the component is only available in Corvu or the React source uses a library that maps to Corvu (e.g., `vaul` -> `@corvu/drawer`, `react-resizable-panels` -> `@corvu/resizable`).
