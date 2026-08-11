# Base UI to Kobalte/Corvu Mapping Reference

Mapping reference for transforming Base UI (React) patterns to Kobalte and
Corvu (SolidJS) equivalents. This is used when converting shadcn components
that use `@base-ui/react-*` imports.

This table is intentionally a starting point, not an exhaustive selector
contract. Inspect the actual rendered DOM and installed primitive source/types
for every port. Component structure, state attributes, and CSS variables can
differ even when parts have similar names.

## Table of Contents

- [General Mapping Rules](#general-mapping-rules)
- [Data Attribute Mapping](#data-attribute-mapping)
- [CSS Variable Mapping](#css-variable-mapping)
- [Import Mapping](#import-mapping)
- [Style Semantic Marker Translation](#style-semantic-marker-translation)
- [Component-Specific Mappings](#component-specific-mappings)
- [Prop Mapping](#prop-mapping)
- [Render Pattern Mapping](#render-pattern-mapping)

## General Mapping Rules

| Base UI (React) | Kobalte (SolidJS) | Notes |
|---|---|---|
| `@base-ui/react-*` | `@kobalte/core/*` | Primary primitive library swap |
| `asChild` prop | `as` prop | Polymorphic rendering |
| `useRender` hook | Direct JSX rendering | See Render Pattern Mapping |
| `React.forwardRef` | Remove wrapper | SolidJS handles refs natively |
| `Slot` component | `as` prop on primitive | Kobalte's built-in polymorphism |

## Data Attribute Mapping

### State Attributes

| Base UI | Kobalte | Corvu | Context |
|---|---|---|---|
| `data-open` | `data-expanded` | `data-expanded` (Accordion) / `data-open` (Dialog) | Open/expanded state |
| `data-closed` | `data-closed` | `data-collapsed` (Accordion) / `data-closed` (Dialog) | Closed/collapsed state |
| `data-checked` | `data-checked` | N/A | Checked state (checkbox, switch) |
| `data-unchecked` | `data-unchecked` | N/A | Unchecked state |
| `data-pressed` | `data-pressed` | N/A | Toggle pressed state |
| `data-disabled` | `data-disabled` | `data-disabled` | Disabled state |
| `data-highlighted` | `data-highlighted` | N/A | Keyboard-focused item |
| `data-selected` | `data-selected` | N/A | Selected item |

### Validation Attributes

| Base UI | Kobalte | Context |
|---|---|---|
| `data-valid` | `data-valid` | Field is valid |
| `data-invalid` | `data-invalid` | Field is invalid |
| `data-required` | `data-required` | Field is required |
| `data-readonly` | `data-readonly` | Field is read-only |

### Select-Specific Attributes

| Base UI | Kobalte | Context |
|---|---|---|
| `data-popup-open` | `data-expanded` | Dropdown is open |
| `data-placeholder-shown` | `data-placeholder-shown` | Placeholder visible |

### Toast-Specific Attributes

Base Toast and Kobalte Toast use different lifecycle and swipe models. Port the
visual behavior rather than copying selectors verbatim.

| Base UI | Kobalte | Adaptation |
|---|---|---|
| `data-starting-style` | No direct equivalent | `data-opened` is persistent; use explicit enter state/animation when first-open behavior matters |
| `data-ending-style` | No direct equivalent | `data-closed` is persistent; use explicit exit state/animation when closing behavior matters |
| `data-swipe-direction="…"` | `data-swipe-direction="…"` | Same direction attribute |
| Base swipe movement variables | `--kb-toast-swipe-move-x`, `--kb-toast-swipe-move-y` | Rename transform inputs |
| Base swipe end variables | `--kb-toast-swipe-end-x`, `--kb-toast-swipe-end-y` | Rename exit transform inputs |
| Base progress variable | `--kb-toast-progress-fill-width` | Use on Kobalte `ProgressFill` |
| Base stacked index/offset/height variables | No direct equivalent | Recreate only if required for shadcn stack parity; verify against Kobalte Region/List behavior |

Kobalte Root also exposes `data-swipe="start|move|cancel|end"`. Base selectors
such as `data-limited` and `data-expanded` do not have automatic one-to-one
Kobalte equivalents and may require wrapper state.

## CSS Variable Mapping

### Accordion / Collapsible

| Base UI | Kobalte | Corvu |
|---|---|---|
| `--accordion-panel-height` | `--kb-accordion-content-height` | `--corvu-disclosure-content-height` |
| `--accordion-panel-width` | `--kb-accordion-content-width` | `--corvu-disclosure-content-width` |
| `--collapsible-panel-height` | `--kb-collapsible-content-height` | `--corvu-disclosure-content-height` |
| `--collapsible-panel-width` | `--kb-collapsible-content-width` | `--corvu-disclosure-content-width` |

### Popover / Select / Tooltip

| Base UI | Kobalte |
|---|---|
| `--anchor-width` | Use `sameWidth` prop on Kobalte |
| `--available-height` | Use `fitViewport` prop on Kobalte |
| `--transform-origin` | `--kb-popper-content-transform-origin` or `--kb-select-content-transform-origin` |

Do not translate `--available-height` to a prop inside authored Zaidan style
CSS. When a selector needs the computed value, use the primitive variable
actually exposed by the wrapper, commonly `--kb-popper-available-height`.

### Navigation Menu

| Base UI | Kobalte |
|---|---|
| `--navigation-menu-viewport-width` | `--kb-navigation-menu-viewport-width` |
| `--navigation-menu-viewport-height` | `--kb-navigation-menu-viewport-height` |

## Import Mapping

### Package-Level Mapping

| Base UI Import | Kobalte Import |
|---|---|
| `@base-ui/react/accordion` | `@kobalte/core/accordion` |
| `@base-ui/react/alert-dialog` | `@kobalte/core/alert-dialog` |
| `@base-ui/react/checkbox` | `@kobalte/core/checkbox` |
| `@base-ui/react/collapsible` | `@kobalte/core/collapsible` |
| `@base-ui/react/dialog` | `@kobalte/core/dialog` |
| `@base-ui/react/menu` | `@kobalte/core/dropdown-menu` |
| `@base-ui/react/popover` | `@kobalte/core/popover` |
| `@base-ui/react/progress` | `@kobalte/core/progress` |
| `@base-ui/react/radio-group` | `@kobalte/core/radio-group` |
| `@base-ui/react/select` | `@kobalte/core/select` |
| `@base-ui/react/separator` | `@kobalte/core/separator` |
| `@base-ui/react/slider` | `@kobalte/core/slider` |
| `@base-ui/react/switch` | `@kobalte/core/switch` |
| `@base-ui/react/tabs` | `@kobalte/core/tabs` |
| `@base-ui/react/toggle` | `@kobalte/core/toggle-button` |
| `@base-ui/react/toggle-group` | `@kobalte/core/toggle-group` |
| `@base-ui/react/tooltip` | `@kobalte/core/tooltip` |

### Components Mapping to Corvu

| Base UI Import | Corvu Import |
|---|---|
| N/A (vaul) | `@corvu/drawer` |
| N/A (react-resizable-panels) | `@corvu/resizable` |

### Toast

| Base UI Part | Kobalte Part | Notes |
|---|---|---|
| `Toast.Provider` | No direct equivalent | Kobalte uses its toaster state plus Region/List; adapter context may be needed for shadcn manager parity |
| `Toast.Portal` | `Portal` | Use Solid/Kobalte Portal around Region/List when required |
| `Toast.Viewport` | `Toast.Region` + `Toast.List` | No direct one-part equivalent |
| `Toast.Root` | `Toast.Root` | Kobalte requires the toast ID from its toaster state |
| `Toast.Content` | Native wrapper inside `Toast.Root` | No direct Kobalte part |
| `Toast.Title` | `Toast.Title` | Same semantic role |
| `Toast.Description` | `Toast.Description` | Same semantic role |
| `Toast.Action` | Button inside Root | No direct Kobalte action part |
| `Toast.Close` | `Toast.CloseButton` | Name/API change |
| `createToastManager` | `toaster` API or a Zaidan adapter | Kobalte exposes `show`, `update`, `promise`, `dismiss`, and `clear` |

When matching shadcn Base Toast, implement the shadcn public surface over
Kobalte rather than preserving `solid-sonner`. Verify host mounting, timeout
pause, Alt+T hotkey, close behavior, swipe, promise/update/dismiss behavior,
and reduced motion.

## Style Semantic Marker Translation

Upstream authored style sheets use semantic `.cn-*` markers. Zaidan uses
`.z-*` markers. The baseline conversion is:

1. Remove the outer upstream `.style-<name>` wrapper for the per-style file.
2. Rename `.cn-*` to `.z-*`.
3. Remove React Aria-only `*-aria` rules when no Zaidan DOM uses them.
4. Translate Base state attributes and CSS variables using this reference.
5. Compare every resulting selector with the rendered Kobalte/Corvu/Solid DOM.

Known non-mechanical cases include Combobox list/listbox naming, Navigation
Menu structure, Progress root/track placement, Corvu Calendar and Drawer,
Resizable handle-only styling, and OTP's Zaidan-specific input/caret wrappers.
Never preserve obsolete Vaul selectors such as
`data-[vaul-drawer-direction]` when the current Drawer uses Corvu.

## Component-Specific Mappings

### Accordion

| Base UI Part | Kobalte Part | Notes |
|---|---|---|
| `Accordion.Root` | `Accordion.Root` | Same |
| `Accordion.Item` | `Accordion.Item` | Same |
| `Accordion.Header` | `Accordion.Header` | Same |
| `Accordion.Trigger` | `Accordion.Trigger` | Same |
| `Accordion.Panel` | `Accordion.Content` | Name change: Panel -> Content |

### Dialog

| Base UI Part | Kobalte Part | Notes |
|---|---|---|
| `Dialog.Root` | `Dialog.Root` | Same |
| `Dialog.Trigger` | `Dialog.Trigger` | Same |
| `Dialog.Portal` | `Dialog.Portal` | Same |
| `Dialog.Backdrop` | `Dialog.Overlay` | Name change: Backdrop -> Overlay |
| `Dialog.Popup` | `Dialog.Content` | Name change: Popup -> Content |
| `Dialog.Close` | `Dialog.CloseButton` | Name change: Close -> CloseButton |
| `Dialog.Title` | `Dialog.Title` | Same |
| `Dialog.Description` | `Dialog.Description` | Same |

### Select

| Base UI Part | Kobalte Part | Notes |
|---|---|---|
| `Select.Root` | `Select.Root` | API differs significantly |
| `Select.Trigger` | `Select.Trigger` | Same |
| `Select.Value` | `Select.Value` | Same |
| `Select.Icon` | `Select.Icon` | Same |
| `Select.Portal` | `Select.Portal` | Same |
| `Select.Positioner` | N/A | Use placement props on Select.Content |
| `Select.Popup` | `Select.Content` | Name change: Popup -> Content |
| `Select.Listbox` | `Select.Listbox` | Same |
| `Select.Group` | `Select.Section` | Name change: Group -> Section |
| `Select.GroupLabel` | `Select.SectionLabel` (via `as`) | Different API |
| `Select.Option` | `Select.Item` | Name change: Option -> Item |
| `Select.OptionIndicator` | `Select.ItemIndicator` | Name change |

### Tabs

| Base UI Part | Kobalte Part | Notes |
|---|---|---|
| `Tabs.Root` | `Tabs.Root` | Same |
| `Tabs.List` | `Tabs.List` | Same |
| `Tabs.Tab` | `Tabs.Trigger` | Name change: Tab -> Trigger |
| `Tabs.TabIndicator` | `Tabs.Indicator` | Name change |
| `Tabs.Panel` | `Tabs.Content` | Name change: Panel -> Content |

### Menu / Dropdown Menu

| Base UI Part | Kobalte Part | Notes |
|---|---|---|
| `Menu.Root` | `DropdownMenu.Root` | Name change |
| `Menu.Trigger` | `DropdownMenu.Trigger` | Name change |
| `Menu.Portal` | `DropdownMenu.Portal` | Name change |
| `Menu.Positioner` | N/A | Use placement props |
| `Menu.Popup` | `DropdownMenu.Content` | Name change |
| `Menu.Item` | `DropdownMenu.Item` | Name change |
| `Menu.Separator` | `DropdownMenu.Separator` | Name change |
| `Menu.Group` | `DropdownMenu.Group` | Name change |
| `Menu.GroupLabel` | `DropdownMenu.GroupLabel` | Name change |
| `Menu.CheckboxItem` | `DropdownMenu.CheckboxItem` | Name change |
| `Menu.RadioGroup` | `DropdownMenu.RadioGroup` | Name change |
| `Menu.RadioItem` | `DropdownMenu.RadioItem` | Name change |
| `Menu.ItemIndicator` | `DropdownMenu.ItemIndicator` | Name change |
| `Menu.SubmenuTrigger` | `DropdownMenu.SubTrigger` | Name change |
| `Menu.Submenu` | `DropdownMenu.Sub` | Name change |

## Prop Mapping

### Common Prop Changes

| Base UI Prop | Kobalte Prop | Notes |
|---|---|---|
| `asChild` | `as` | Polymorphic rendering |
| `className` | `class` | Standard React -> SolidJS |
| `onOpenChange` | `onOpenChange` | Same |
| `open` | `open` | Same |
| `defaultOpen` | `defaultOpen` | Same |
| `disabled` | `disabled` | Same |
| `modal` | `modal` | Same |

### Select-Specific Props

| Base UI Prop | Kobalte Prop | Notes |
|---|---|---|
| `value` | `value` | Same |
| `defaultValue` | `defaultValue` | Same |
| `onValueChange` | `onChange` | Name change |
| `required` | `required` | Same |
| `name` | `name` | Same |
| N/A | `options` | Kobalte requires options array |
| N/A | `optionValue` | Key accessor for options |
| N/A | `optionTextValue` | Text for typeahead |
| N/A | `optionDisabled` | Disabled check for options |

## Render Pattern Mapping

### Base UI useRender -> SolidJS Direct JSX

Base UI uses a `useRender` hook pattern that must be converted to direct JSX in SolidJS:

**Base UI (React):**
```tsx
const Trigger = React.forwardRef(function Trigger(props, ref) {
  const { render, state, ...otherProps } = useRender({
    render: props.render,
    className: props.className,
    ref,
    defaultTagName: 'button',
    state: { open: context.open },
  });

  return render({ ...otherProps, onClick: handleClick });
});
```

**Kobalte (SolidJS):**
```tsx
const Trigger = (props: TriggerProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <PrimitiveTrigger
      class={cn("trigger-styles", local.class)}
      data-slot="trigger"
      {...others}
    />
  );
};
```

Key transformation rules for useRender:
1. The `defaultTagName` tells you what HTML element to use
2. The `state` object tells you what data attributes to apply
3. The `className` maps to `class` in SolidJS
4. Remove the `render` prop pattern entirely -- use direct JSX
5. Remove `ref` forwarding -- SolidJS handles refs natively
