# Kobalte Patterns Reference

Comprehensive reference for Kobalte component patterns used in Zaidan transformations. This document captures the common patterns, anatomy structures, and API conventions found across Kobalte components.

## Table of Contents

- [Overview](#overview)
- [Component Anatomy Pattern](#component-anatomy-pattern)
- [Rendered Elements Convention](#rendered-elements-convention)
- [Props Patterns](#props-patterns)
- [Data Attributes](#data-attributes)
- [CSS Variables](#css-variables)
- [Polymorphic Components](#polymorphic-components)
- [Component Examples](#component-examples)

## Overview

Kobalte is a UI toolkit for building accessible web apps and design systems with SolidJS. It provides low-level, unstyled, accessible primitives that follow WAI-ARIA design patterns. All components ship with zero styles, giving full control over appearance.

**Key principles:**
- **Accessible**: WAI-ARIA compliant, automatic ARIA attributes, focus management, keyboard navigation
- **Composable**: Granular access to each component part for wrapping and customization
- **Unstyled**: Zero default styles, works with any styling solution (Tailwind, CSS modules, etc.)

**Import pattern:**
```tsx
import * as ComponentName from "@kobalte/core/<component-name>";
// Example:
import * as Dialog from "@kobalte/core/dialog";
import * as Accordion from "@kobalte/core/accordion";
import * as Select from "@kobalte/core/select";
```

## Component Anatomy Pattern

Every Kobalte component follows a compound component pattern with a Root and multiple Part sub-components:

```tsx
<Component.Root>
  <Component.PartA />
  <Component.PartB>
    <Component.PartC />
  </Component.PartB>
</Component.Root>
```

The Root component is always the outermost wrapper. It manages state, provides context, and controls behavior. Parts are composable children that render specific UI elements.

### Common Anatomy Structures

**Simple (Accordion):**
```tsx
<Accordion.Root>
  <Accordion.Item>
    <Accordion.Header>
      <Accordion.Trigger />
    </Accordion.Header>
    <Accordion.Content />
  </Accordion.Item>
</Accordion.Root>
```

**Modal (Dialog):**
```tsx
<Dialog.Root>
  <Dialog.Trigger />
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content>
      <Dialog.CloseButton />
      <Dialog.Title />
      <Dialog.Description />
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

**Complex (Select):**
```tsx
<Select.Root>
  <Select.Label />
  <Select.Trigger>
    <Select.Value />
    <Select.Icon />
  </Select.Trigger>
  <Select.Portal>
    <Select.Content>
      <Select.Listbox />
    </Select.Content>
  </Select.Portal>
</Select.Root>
```

## Rendered Elements Convention

Each component part has a default rendered HTML element. The "Rendered Elements" section in Kobalte docs uses this convention:

| Value | Meaning |
|---|---|
| Native HTML tag (e.g., `div`, `button`, `h3`) | Renders that HTML element by default |
| Capital letter name (e.g., `Collapsible.Root`) | No primitive; wraps another Kobalte component |
| `none` | No DOM element; provides context only (e.g., Root components) |

### Common Default Elements by Component

**Accordion:**
| Part | Default Element |
|---|---|
| Accordion (Root) | `div` |
| Accordion.Item | `div` |
| Accordion.Header | `h3` |
| Accordion.Trigger | `button` |
| Accordion.Content | `div` |

**Dialog:**
| Part | Default Element |
|---|---|
| Dialog (Root) | `none` (context only) |
| Dialog.Trigger | `button` |
| Dialog.Portal | Portal (no DOM) |
| Dialog.Overlay | `div` |
| Dialog.Content | `div` |
| Dialog.CloseButton | `button` |
| Dialog.Title | `h2` |
| Dialog.Description | `p` |

**Select:**
| Part | Default Element |
|---|---|
| Select (Root) | `div` |
| Select.Trigger | `button` |
| Select.Value | `span` |
| Select.Icon | `span` |
| Select.Content | `div` |
| Select.Listbox | `ul` |
| Select.Item | `li` |
| Select.ItemLabel | `span` |

## Props Patterns

### Controlled vs Uncontrolled

Most Kobalte components support both modes:

```tsx
// Uncontrolled (initial value, component manages state):
<Accordion.Root defaultValue={["item-1"]}>

// Controlled (external state management):
const [value, setValue] = createSignal(["item-1"]);
<Accordion.Root value={value()} onChange={setValue}>
```

### Common Root Props

| Prop | Type | Description |
|---|---|---|
| `value` / `defaultValue` | varies | Controlled/uncontrolled state |
| `onChange` / `onValueChange` | callback | State change handler |
| `disabled` | `boolean` | Disable all interactions |
| `forceMount` | `boolean` | Force mount content (for animations) |
| `id` | `string` | Custom ID for ARIA generation |

### Polymorphic `as` Prop

All Kobalte component parts support the `as` prop for changing the rendered element:

```tsx
import type { PolymorphicProps } from "@kobalte/core/polymorphic";

// Change rendered element:
<Dialog.Title as="h3">My Title</Dialog.Title>

// Render as custom component:
<Dialog.Trigger as={MyButton}>Open</Dialog.Trigger>
```

### Event Handler Props (Dialog/Modal Components)

| Prop | Type | Description |
|---|---|---|
| `onOpenAutoFocus` | `(event: Event) => void` | Focus on open |
| `onCloseAutoFocus` | `(event: Event) => void` | Focus on close |
| `onEscapeKeyDown` | `(event: KeyboardEvent) => void` | Escape key handler |
| `onPointerDownOutside` | `(event) => void` | Outside click |
| `onFocusOutside` | `(event) => void` | Outside focus |
| `onInteractOutside` | `(event) => void` | Any outside interaction |

## Data Attributes

Kobalte uses `data-*` attributes for styling based on component state. These are applied to relevant component parts automatically.

### Universal Data Attributes

| Attribute | Meaning |
|---|---|
| `data-expanded` | Component is open/expanded |
| `data-closed` | Component is closed/collapsed |
| `data-disabled` | Component is disabled |
| `data-highlighted` | Item is keyboard-focused/highlighted |
| `data-selected` | Item is selected |

### Validation Data Attributes

| Attribute | Meaning |
|---|---|
| `data-valid` | Validation state is valid |
| `data-invalid` | Validation state is invalid |
| `data-required` | Field is required |
| `data-readonly` | Field is read-only |

### Component-Specific Data Attributes

**Select:**
- `data-placeholder-shown` -- Value component when placeholder is visible

**Note:** Always check the specific component's documentation page for component-specific data attributes, as they vary between components.

## CSS Variables

Kobalte exposes CSS custom properties prefixed with `--kb-` for animation and sizing:

### Accordion / Collapsible

| Variable | Description |
|---|---|
| `--kb-accordion-content-height` | Height of accordion content (for slide animation) |
| `--kb-accordion-content-width` | Width of accordion content |
| `--kb-collapsible-content-height` | Height of collapsible content |
| `--kb-collapsible-content-width` | Width of collapsible content |

### Select / Popover

| Variable | Description |
|---|---|
| `--kb-select-content-transform-origin` | Transform origin for origin-aware animations |
| `--kb-popper-content-transform-origin` | Transform origin for positioned content |

### Animation Example

```css
/* Accordion slide animation using Kobalte CSS variables */
.accordion-content {
  overflow: hidden;
  animation: slideUp 300ms cubic-bezier(0.87, 0, 0.13, 1);
}

.accordion-content[data-expanded] {
  animation: slideDown 300ms cubic-bezier(0.87, 0, 0.13, 1);
}

@keyframes slideDown {
  from { height: 0; }
  to { height: var(--kb-accordion-content-height); }
}

@keyframes slideUp {
  from { height: var(--kb-accordion-content-height); }
  to { height: 0; }
}
```

## Polymorphic Components

Kobalte uses `PolymorphicProps` from `@kobalte/core/polymorphic` for type-safe polymorphism:

```tsx
import type { ValidComponent } from "solid-js";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as DialogPrimitive from "@kobalte/core/dialog";

type DialogContentProps<T extends ValidComponent = "div"> =
  PolymorphicProps<T, DialogPrimitive.DialogContentProps> & {
    class?: string;
  };

const DialogContent = <T extends ValidComponent = "div">(
  props: DialogContentProps<T>
) => {
  const [local, others] = splitProps(props as DialogContentProps, ["class"]);
  return (
    <DialogPrimitive.Content
      class={cn("dialog-content-classes", local.class)}
      {...others}
    />
  );
};
```

## Component Examples

### Accordion (Zaidan Style)

```tsx
import * as AccordionPrimitive from "@kobalte/core/accordion";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type { ComponentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type AccordionItemProps<T extends ValidComponent = "div"> =
  PolymorphicProps<T, AccordionPrimitive.AccordionItemProps>;

const AccordionItem = <T extends ValidComponent = "div">(
  props: AccordionItemProps<T>
) => {
  const [local, others] = splitProps(props as AccordionItemProps, ["class"]);
  return (
    <AccordionPrimitive.Item
      class={cn("border-b", local.class)}
      data-slot="accordion-item"
      {...others}
    />
  );
};
```

### Dialog (Zaidan Style)

```tsx
import * as DialogPrimitive from "@kobalte/core/dialog";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type { ComponentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type DialogOverlayProps<T extends ValidComponent = "div"> =
  PolymorphicProps<T, DialogPrimitive.DialogOverlayProps> & {
    class?: string;
  };

const DialogOverlay = <T extends ValidComponent = "div">(
  props: DialogOverlayProps<T>
) => {
  const [local, others] = splitProps(props as DialogOverlayProps, ["class"]);
  return (
    <DialogPrimitive.Overlay
      class={cn(
        "data-expanded:animate-in data-closed:animate-out fixed inset-0 z-50 bg-black/80",
        local.class
      )}
      data-slot="dialog-overlay"
      {...others}
    />
  );
};
```

## Keyboard Navigation

Kobalte components follow WAI-ARIA keyboard patterns:

| Key | Common Behavior |
|---|---|
| Space / Enter | Activate trigger, toggle state |
| Tab | Move to next focusable element |
| Shift + Tab | Move to previous focusable element |
| Escape | Close overlay/dialog/dropdown |
| Arrow Down/Up | Navigate items vertically |
| Arrow Right/Left | Navigate items horizontally |
| Home / End | Jump to first/last item |

Keyboard navigation is built-in and does not require manual implementation.
