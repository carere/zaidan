# Choosing Zaidan Components

Start from the interaction contract, then choose the smallest composition that
satisfies it. Verify every item against the current registry before returning
an install command.

## Contents

- [Actions and Status](#actions-and-status)
- [Forms and Selection](#forms-and-selection)
- [Overlays and Contextual Surfaces](#overlays-and-contextual-surfaces)
- [Navigation and Commands](#navigation-and-commands)
- [Content and Layout](#content-and-layout)
- [Conversation and Chat](#conversation-and-chat)
- [Rich and Specialized Interfaces](#rich-and-specialized-interfaces)
- [Common Compositions](#common-compositions)

## Actions and Status

| Need | Prefer | Notes |
| --- | --- | --- |
| Primary or secondary action | `button` | Use variants for emphasis, not separate action primitives. |
| Several adjacent actions | `button-group` | Use when actions belong to one compact control cluster. |
| Binary setting | `switch` | Best when the change takes effect immediately. |
| Pressed/unpressed tool | `toggle` | Use for toolbar state such as bold or mute. |
| Related toggles | `toggle-group` | Choose single or multiple selection behavior deliberately. |
| Short status or category | `badge` | Use for metadata, not a primary action. |
| Important inline feedback | `alert` | Persistent, contextual information inside the page. |
| Brief asynchronous feedback | `toast` | Mount the Toast host in every context that emits notifications. |
| Loading | `spinner`, `skeleton`, or `progress` | Spinner for indeterminate work, skeleton for content shape, progress for measurable completion. |
| No results or first-use state | `empty` | Compose with a clear next action when one exists. |

## Forms and Selection

| Need | Prefer | Distinction |
| --- | --- | --- |
| Short free text | `input` | Compose with `field` for label, description, and errors. |
| Long free text | `textarea` | Use when multiline entry is expected. |
| Input with prefix, suffix, or embedded action | `input-group` | Keep adornments semantically tied to the input. |
| Native, compact choice list | `native-select` | Prefer for simple mobile-friendly choices. |
| Styled finite choice list | `select` | Use when search or arbitrary entry is unnecessary. |
| Searchable large choice list | `combobox` | Use for filtering options or autocomplete behavior. |
| Independent yes/no choice | `checkbox` | Use several when choices are independent. |
| Exactly one choice in a visible set | `radio-group` | Prefer when users benefit from seeing all options. |
| Numeric range | `slider` | Pair with a visible value or input when precision matters. |
| Date choice | `calendar` | Application code owns parsing, constraints, and persistence. |
| One-time code | `input-otp` | Use for fixed-length verification input. |
| Form structure and validation copy | `field`, `label` | `field` is the richer composition; `label` is the basic primitive. |

## Overlays and Contextual Surfaces

| Need | Prefer | Distinction |
| --- | --- | --- |
| Focused modal task | `dialog` | Use for forms, details, or decisions requiring focus containment. |
| Destructive or irreversible confirmation | `alert-dialog` | Reserve for consequential confirmation, not ordinary messages. |
| Desktop side panel | `sheet` | Good for navigation, filters, or supporting detail. |
| Touch-oriented bottom/side panel | `drawer` | Prefer when drag and mobile ergonomics matter. |
| Small contextual controls | `popover` | Anchored, interactive content that is not a full task. |
| Supplemental preview on hover/focus | `hover-card` | Use for richer previews; essential content must remain reachable. |
| Short explanatory label | `tooltip` | Supplemental only; never hide required instructions exclusively here. |

## Navigation and Commands

| Need | Prefer | Notes |
| --- | --- | --- |
| Local action menu | `dropdown-menu` | Triggered menu for commands related to an object or area. |
| Right-click or long-press actions | `context-menu` | Provide another discoverable route for essential actions. |
| Application menu bar | `menubar` | Desktop-style persistent command categories. |
| Site or product navigation | `navigation-menu` | Use for structured navigation with optional rich panels. |
| Application side navigation | `sidebar` | Includes responsive supporting primitives. |
| Hierarchical location | `breadcrumb` | Show location, not step progress. |
| Peer sections in one view | `tabs` | Preserve meaningful state and URL semantics when appropriate. |
| Searchable command launcher | `command` | Application code supplies commands, filtering scope, and execution. |
| Paged data navigation | `pagination` | Pair with result counts or current-page context. |

## Content and Layout

| Need | Prefer | Notes |
| --- | --- | --- |
| One or more collapsible sections | `accordion` | Use when headings form a related set. |
| A single hide/show region | `collapsible` | Application code owns the surrounding context. |
| Grouped content surface | `card` | Avoid nesting cards when spacing or headings suffice. |
| Structured rows and columns | `table` | Add sorting, filtering, and virtualization in application code. |
| Resizable panes | `resizable` | Use for workspaces where users benefit from allocating space. |
| Scrollable bounded region | `scroll-area` | Prefer normal page scrolling unless a bounded region is intentional. |
| Fixed media ratio | `aspect-ratio` | Useful for previews, video, and image tiles. |
| Visual division | `separator` | Prefer whitespace when a visible boundary adds no meaning. |
| Repeating person or entity identity | `avatar` | Pair with text when identity cannot rely on imagery alone. |
| Repeating content row | `item` | Useful for lists with media, metadata, and actions. |
| Keyboard shortcut hint | `kbd` | Display only; the application still owns the key handler. |
| Styled markdown or rendered prose | `typeset` | A stylesheet, not a component. Wrap the rendered output in `typeset` plus a preset class. |

## Conversation and Chat

Chat surfaces split across four components and a block. Compose them; do not
reach for one where another owns the concern.

| Need | Prefer | Distinction |
| --- | --- | --- |
| The bubble surface itself | `bubble` | Variants, alignment, grouping, reactions, collapsible content. Scoped to the bubble. |
| A full turn in a conversation | `message` | Owns the avatar, alignment, header, and footer around the bubble. |
| Inline status or system note in a thread | `marker` | Status updates, system notes, bordered rows, labeled separators. |
| A file or image in a composer or thread | `attachment` | Media, name, metadata, upload state, and actions. |
| The scroll container for a transcript | `message-scroller` | A block; anchors turns, follows streamed output at the live edge, prepends history without displacing the visible row. |

## Rich and Specialized Interfaces

| Need | Prefer | Notes |
| --- | --- | --- |
| Slide-based content | `carousel` | Ensure controls and slide context remain keyboard accessible. |
| Data visualization | `chart` plus a `chart-*` block | Choose area, bar, line, pie, radar, radial, or tooltip examples from the data question. |
| Reordering items | `sortable` | A block; application code owns persistence and domain constraints. |
| Image cropping | `image-crop` | A block; application code owns upload, preview, and storage. |
| Multi-step question flow | `questionnaire` | A block; single-choice, multiple-choice, freeform, and skippable questions as one form. Use for clarification prompts, onboarding, surveys, and intake. |

## Common Compositions

- Settings form: `field` + `input`/`select`/`switch` + `button`.
- Searchable picker: `combobox`; add `field` when it is part of a form.
- Destructive row action: `dropdown-menu` + `alert-dialog` + notification.
- Mobile filters: `drawer` + form controls + `button`.
- Desktop filters: `sheet` or persistent layout + form controls.
- Admin data view: `table` + `input` or `combobox` + `pagination` +
  `dropdown-menu`.
- Command palette: `command` inside `dialog`.
- Dashboard: `card` + appropriate `chart-*` blocks + `skeleton`/`empty` states.
- Chat thread: `message-scroller` + `message` + `bubble` + `marker`, with
  `attachment` in the composer and `typeset` around rendered markdown.
- Dark mode: `color-mode` supplies `ColorModeProvider` and `useColorMode`; every
  theme item already ships its dark variant, so no second palette is needed.
- Responsive branching in application code: `use-mobile` (`useIsMobile`).

Recommend application-owned composition when no single component represents
the requested product pattern. Zaidan components supply UI behavior and source;
they do not replace routing, server state, form schemas, authorization, or
domain logic.
